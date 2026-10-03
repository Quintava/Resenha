import { supabase } from "./supabase";

export const HISTORY_PAGE_SIZE = 10;
const SAFE_SPORTS = new Set([
  "Futebol",
  "Futebol Society",
  "Futebol de Salão",
  "Vôlei",
  "Basquete",
]);

// Guarda a última versão conhecida de cada bloco para evitar gravações repetidas.
const fingerprints = new Map();
const json = (value) => JSON.stringify(value ?? null);
const fail = (error) => {
  if (error) throw error;
};
const validUserId = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
const validGroupId = (value) => /^[a-zA-Z0-9-]{1,128}$/.test(String(value || ""));
const fingerprintKey = (userId, groupId) => `${userId}:${groupId}`;
const assertGroup = (groupId) => {
  if (!validGroupId(groupId)) throw new Error("Grupo inválido");
};

function assertSafeWrite(userId, state) {
  if (!validUserId(userId)) throw new Error("Sessão inválida");
  if (!state || !Array.isArray(state.players) || !Array.isArray(state.history))
    throw new Error("Dados inválidos");
  if (state.players.length > 500 || state.history.length > 2000)
    throw new Error("Limite de dados excedido");
  if (json(coreOf(state)).length > 2_000_000) throw new Error("Cadastro muito grande");
}
const withoutEvents = (match) => (match ? { ...match, events: undefined } : null);
const activePayload = (match) => (match ? { ...match, events: undefined, score: undefined } : null);

// Dados pequenos e de uso geral permanecem em uma única linha por usuário.
const coreOf = (state) => ({
  profile: state.profile,
  players: state.players,
  settings: state.settings,
});
const eventsOf = (state) => {
  const result = [];
  if (state.activeMatch)
    (state.activeMatch.events || []).forEach((event) =>
      result.push({ matchId: state.activeMatch.id, event }),
    );
  (state.history || []).forEach((match) =>
    (match.events || []).forEach((event) => result.push({ matchId: match.id, event })),
  );
  return result;
};
const eventKey = (matchId, id) => `${matchId}:${id}`;
const eventRow = (userId, groupId, matchId, event) => ({
  user_id: userId,
  group_id: groupId,
  match_id: matchId,
  id: event.id,
  event_type: event.type,
  player_id: event.playerId || null,
  player_name: event.playerName || null,
  assist_player_id: event.assistPlayerId || null,
  assist_player_name: event.assistPlayerName || null,
  payload: event,
});

// Atualiza as impressões digitais somente depois de uma leitura ou gravação válida.
function remember(userId, groupId, state) {
  fingerprints.set(fingerprintKey(userId, groupId), {
    core: json(coreOf(state)),
    active: json(activePayload(state.activeMatch)),
    matches: new Map((state.history || []).map((match) => [match.id, json(withoutEvents(match))])),
    events: new Map(
      eventsOf(state).map(({ matchId, event }) => [eventKey(matchId, event.id), json(event)]),
    ),
  });
}

// Reconstrói a súmula de cada partida a partir das linhas individuais de eventos.
function attachEvents(matches, eventRows) {
  const grouped = new Map();
  (eventRows || []).forEach((row) => {
    const list = grouped.get(row.match_id) || [];
    list.push(row.payload);
    grouped.set(row.match_id, list);
  });
  return matches.map((row) => ({
    ...row.payload,
    events: (grouped.get(row.id) || []).sort((a, b) => String(b.id).localeCompare(String(a.id))),
  }));
}

// Busca somente uma página do histórico e depois carrega os lances dessas partidas.
async function fetchMatchPage(userId, groupId, offset = 0) {
  const { data: fetched, error } = await supabase
    .from("user_matches")
    .select("id,payload,finished_at")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .order("finished_at", { ascending: false })
    .range(offset, offset + HISTORY_PAGE_SIZE);
  fail(error);
  const rows = (fetched || []).slice(0, HISTORY_PAGE_SIZE);
  const ids = (rows || []).map((row) => row.id);
  let eventRows = [];
  if (ids.length) {
    const response = await supabase
      .from("user_match_events")
      .select("match_id,payload")
      .eq("user_id", userId)
      .eq("group_id", groupId)
      .in("match_id", ids);
    fail(response.error);
    eventRows = response.data || [];
  }
  return {
    history: attachEvents(rows, eventRows),
    hasMore: (fetched || []).length > HISTORY_PAGE_SIZE,
  };
}

// Carrega núcleo, partida ativa e primeira página em paralelo.
// Caso encontre o formato antigo app_state, faz a migração sem apagar o original.
export async function loadWorkspace(userId, groupId, defaults) {
  if (!validUserId(userId)) throw new Error("Sessão inválida");
  assertGroup(groupId);
  const [coreResult, activeResult, page] = await Promise.all([
    supabase
      .from("user_core")
      .select("data")
      .eq("user_id", userId)
      .eq("group_id", groupId)
      .maybeSingle(),
    supabase
      .from("user_active_matches")
      .select("payload")
      .eq("user_id", userId)
      .eq("group_id", groupId)
      .maybeSingle(),
    fetchMatchPage(userId, groupId, 0),
  ]);
  fail(coreResult.error);
  fail(activeResult.error);
  let core = coreResult.data?.data;
  let activeMatch = activeResult.data?.payload || null;
  let history = page.history;

  if (!core && groupId === "default") {
    const { data: legacy, error } = await supabase
      .from("app_state")
      .select("data")
      .eq("user_id", userId)
      .maybeSingle();
    fail(error);
    if (legacy?.data) {
      const migrated = {
        ...defaults,
        ...legacy.data,
        profile: { ...defaults.profile, ...(legacy.data.profile || {}) },
        settings: { ...defaults.settings, ...(legacy.data.settings || {}) },
      };
      await saveWorkspace(userId, groupId, migrated, true);
      core = coreOf(migrated);
      activeMatch = migrated.activeMatch || null;
      history = (migrated.history || []).slice(0, HISTORY_PAGE_SIZE);
      page.hasMore = (migrated.history || []).length > HISTORY_PAGE_SIZE;
    }
  }

  if (activeMatch) {
    const { data: activeEvents, error } = await supabase
      .from("user_match_events")
      .select("payload")
      .eq("user_id", userId)
      .eq("group_id", groupId)
      .eq("match_id", activeMatch.id);
    fail(error);
    const events = (activeEvents || []).map((row) => row.payload);
    const score = events.reduce(
      (total, event) => {
        if (event.type === "goal" && (event.teamIndex === 0 || event.teamIndex === 1))
          total[event.teamIndex] += 1;
        if (event.type === "own_goal" && (event.teamIndex === 0 || event.teamIndex === 1))
          total[event.teamIndex === 0 ? 1 : 0] += 1;
        return total;
      },
      [0, 0],
    );
    activeMatch = { ...activeMatch, score, events };
  }
  const state = {
    ...defaults,
    ...(core || {}),
    profile: { ...defaults.profile, ...(core?.profile || {}) },
    settings: { ...defaults.settings, ...(core?.settings || {}) },
    activeMatch,
    history,
  };
  remember(userId, groupId, state);
  return { state, hasMore: page.hasMore };
}

// Acrescenta partidas antigas à tela sem repetir o que já foi carregado.
export async function loadMoreHistory(userId, groupId, offset) {
  const page = await fetchMatchPage(userId, groupId, offset);
  const previous = fingerprints.get(fingerprintKey(userId, groupId));
  if (previous) {
    page.history.forEach((match) => {
      previous.matches.set(match.id, json(withoutEvents(match)));
      (match.events || []).forEach((event) =>
        previous.events.set(eventKey(match.id, event.id), json(event)),
      );
    });
  }
  return page;
}

// Usado no backup para incluir todas as páginas, e não apenas as dez visíveis.
export async function loadAllHistory(userId, groupId) {
  const all = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const page = await fetchMatchPage(userId, groupId, offset);
    all.push(...page.history);
    hasMore = page.hasMore;
    offset += HISTORY_PAGE_SIZE;
  }
  return all;
}

// Sincronização incremental:
// - núcleo e partida ativa somente quando mudam;
// - partidas encerradas em linhas próprias;
// - cada gol ou substituição em sua própria linha.
export async function saveWorkspace(userId, groupId, state, force = false) {
  assertSafeWrite(userId, state);
  assertGroup(groupId);
  const previous = fingerprints.get(fingerprintKey(userId, groupId)) || {
    core: "",
    active: "",
    matches: new Map(),
    events: new Map(),
  };
  const now = new Date().toISOString();
  const core = coreOf(state);
  if (force || previous.core !== json(core))
    fail(
      (
        await supabase
          .from("user_core")
          .upsert({ user_id: userId, group_id: groupId, data: core, updated_at: now })
      ).error,
    );

  const active = activePayload(state.activeMatch);
  if (force || previous.active !== json(active)) {
    if (active)
      fail(
        (
          await supabase
            .from("user_active_matches")
            .upsert({ user_id: userId, group_id: groupId, payload: active, updated_at: now })
        ).error,
      );
    else
      fail(
        (
          await supabase
            .from("user_active_matches")
            .delete()
            .eq("user_id", userId)
            .eq("group_id", groupId)
        ).error,
      );
  }

  const currentMatches = new Map((state.history || []).map((match) => [match.id, match]));
  const changedMatches = [...currentMatches.values()].filter(
    (match) => force || previous.matches.get(match.id) !== json(withoutEvents(match)),
  );
  if (changedMatches.length)
    fail(
      (
        await supabase.from("user_matches").upsert(
          changedMatches.map((match) => ({
            user_id: userId,
            group_id: groupId,
            id: match.id,
            payload: withoutEvents(match),
            finished_at: match.finishedAt || match.date || now,
            updated_at: now,
          })),
        )
      ).error,
    );
  const removedMatches = [...previous.matches.keys()].filter((id) => !currentMatches.has(id));
  if (removedMatches.length)
    fail(
      (
        await supabase
          .from("user_matches")
          .delete()
          .eq("user_id", userId)
          .eq("group_id", groupId)
          .in("id", removedMatches)
      ).error,
    );

  const currentEvents = new Map(
    eventsOf(state).map((item) => [eventKey(item.matchId, item.event.id), item]),
  );
  const changedEvents = [...currentEvents.values()].filter(
    ({ matchId, event }) =>
      force || previous.events.get(eventKey(matchId, event.id)) !== json(event),
  );
  if (changedEvents.length)
    fail(
      (
        await supabase
          .from("user_match_events")
          .upsert(
            changedEvents.map(({ matchId, event }) => eventRow(userId, groupId, matchId, event)),
          )
      ).error,
    );
  const removedEvents = [...previous.events.keys()].filter((key) => !currentEvents.has(key));
  for (const key of removedEvents) {
    const separator = key.lastIndexOf(":");
    const matchId = key.slice(0, separator);
    const id = key.slice(separator + 1);
    fail(
      (
        await supabase
          .from("user_match_events")
          .delete()
          .eq("user_id", userId)
          .eq("group_id", groupId)
          .eq("match_id", matchId)
          .eq("id", id)
      ).error,
    );
  }
  remember(userId, groupId, state);
}

// Cada grupo é um espaço esportivo independente dentro da mesma conta.
export async function listGroups(userId) {
  if (!validUserId(userId)) throw new Error("Sessão inválida");
  let { data, error } = await supabase
    .from("user_groups")
    .select("id,name,management_mode,created_at,updated_at")
    .eq("user_id", userId)
    .order("created_at");
  fail(error);
  if (!data?.length) {
    const response = await supabase
      .from("user_groups")
      .insert({
        user_id: userId,
        id: "default",
        name: "Grupo principal",
        management_mode: "amateur",
      })
      .select("id,name,management_mode,created_at,updated_at")
      .single();
    fail(response.error);
    data = [response.data];
  }
  return data;
}

export async function createGroup(userId, name, managementMode = "amateur") {
  const safeName = String(name || "")
    .trim()
    .slice(0, 60);
  if (!safeName) throw new Error("Informe o nome do grupo");
  if (!["amateur", "academy"].includes(managementMode)) throw new Error("Modo inválido");
  const existing = await listGroups(userId);
  if (existing.length >= 20) throw new Error("Limite de 20 grupos por conta atingido");
  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from("user_groups")
    .insert({ user_id: userId, id, name: safeName, management_mode: managementMode })
    .select("id,name,management_mode,created_at,updated_at")
    .single();
  fail(error);
  return data;
}

export async function renameGroup(userId, groupId, name) {
  assertGroup(groupId);
  const safeName = String(name || "")
    .trim()
    .slice(0, 60);
  if (!safeName) throw new Error("Informe o nome do grupo");
  const { data, error } = await supabase
    .from("user_groups")
    .update({ name: safeName, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", groupId)
    .select("id,name,management_mode,created_at,updated_at")
    .single();
  fail(error);
  return data;
}

export async function changeGroupMode(userId, groupId, managementMode) {
  assertGroup(groupId);
  if (!["amateur", "academy"].includes(managementMode)) throw new Error("Modo inválido");
  const { data, error } = await supabase
    .from("user_groups")
    .update({ management_mode: managementMode, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", groupId)
    .select("id,name,management_mode,created_at,updated_at")
    .single();
  fail(error);
  return data;
}

export async function deleteGroup(userId, groupId) {
  assertGroup(groupId);
  const groups = await listGroups(userId);
  if (groups.length <= 1) throw new Error("Mantenha pelo menos um grupo na conta");
  for (const table of [
    "user_match_events",
    "user_matches",
    "user_active_matches",
    "user_core",
    "upcoming_games",
    "public_pages",
  ]) {
    const response = await supabase
      .from(table)
      .delete()
      .eq("user_id", userId)
      .eq("group_id", groupId);
    fail(response.error);
  }
  fail((await supabase.from("user_groups").delete().eq("user_id", userId).eq("id", groupId)).error);
  fingerprints.delete(fingerprintKey(userId, groupId));
}

// Administração autenticada do Mural da Resenha.
export async function getPublicSettings(userId, groupId, title) {
  const { data, error } = await supabase.rpc("ensure_public_page", {
    page_title: title,
    target_group_id: groupId,
  });
  fail(error);
  const { data: games, error: gamesError } = await supabase
    .from("upcoming_games")
    .select("*")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .order("scheduled_at");
  fail(gamesError);
  return { page: data, games: games || [] };
}
export async function setPublicEnabled(userId, groupId, enabled) {
  fail(
    (
      await supabase
        .from("public_pages")
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("group_id", groupId)
    ).error,
  );
}
export async function addUpcomingGame(userId, groupId, game) {
  fail(
    (await supabase.from("upcoming_games").insert({ user_id: userId, group_id: groupId, ...game }))
      .error,
  );
}
export async function deleteUpcomingGame(userId, groupId, id) {
  fail(
    (
      await supabase
        .from("upcoming_games")
        .delete()
        .eq("user_id", userId)
        .eq("group_id", groupId)
        .eq("id", id)
    ).error,
  );
}

// Única leitura anônima do projeto. A função SQL aplica o modo somente leitura e o filtro.
export async function getPublicPage(
  slug,
  offset = 0,
  sport = "Futebol de Salão",
  month = null,
  matchId = null,
) {
  if (!/^[a-f0-9]{12,32}$/i.test(String(slug || ""))) return null;
  if (!SAFE_SPORTS.has(sport)) return null;
  const safeOffset = Math.min(Math.max(Number(offset) || 0, 0), 10000);
  const safeMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || "")) ? month : null;
  const safeMatchId = String(matchId || "").slice(0, 128) || null;
  const { data, error } = await supabase.rpc("get_public_resenha", {
    target_slug: slug,
    result_offset: safeOffset,
    result_limit: HISTORY_PAGE_SIZE,
    target_sport: sport,
    target_month: safeMonth,
    target_match_id: safeMatchId,
  });
  fail(error);
  return data;
}
