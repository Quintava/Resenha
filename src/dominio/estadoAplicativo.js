import {
  DEFAULT_GROUP_ID,
  initialState,
  SPORT_PRESETS,
  TEAM_META,
  USER_STORAGE_PREFIX,
} from "../configuracao/configuracaoAplicativo";
import { normalizeCareer } from "./estatisticasJogador";
import { canonicalSport } from "./esportes";

// Calcula a nota da partida com produção, resultado e penalidades individuais.
// Mantém o cadastro e todas as referências históricas consistentes após uma edição de nome.
export function renamePlayerInMatch(match, playerId, oldName, newName) {
  if (!match) return match;
  const teams = (match.teams || []).map((team) => ({
    ...team,
    starters: (team.starters || []).map((player) =>
      player.id === playerId ? { ...player, name: newName } : player,
    ),
    bench: (team.bench || []).map((player) =>
      player.id === playerId ? { ...player, name: newName } : player,
    ),
  }));
  const events = (match.events || []).map((event) => {
    if (
      [
        "goal",
        "own_goal",
        "missed_penalty",
        "goalkeeper_save",
        "goalkeeper_difficult_save",
        "goalkeeper_penalty_save",
        "goalkeeper_error",
        "match_highlight",
      ].includes(event.type) &&
      event.playerId === playerId
    )
      return { ...event, playerName: newName };
    if (event.type === "goal" && event.assistPlayerId === playerId)
      return { ...event, assistPlayerName: newName };
    if (event.type === "sub")
      return {
        ...event,
        playerOut: event.playerOut === oldName ? newName : event.playerOut,
        playerIn: event.playerIn === oldName ? newName : event.playerIn,
      };
    if (event.type === "goalkeeper_change")
      return {
        ...event,
        playerOut: event.playerOutId === playerId ? newName : event.playerOut,
        playerIn: event.playerInId === playerId ? newName : event.playerIn,
      };
    return event;
  });
  const reserveTeams = (match.reserveTeams || []).map((team) => ({
    ...team,
    starters: (team.starters || []).map((player) =>
      player.id === playerId ? { ...player, name: newName } : player,
    ),
    bench: (team.bench || []).map((player) =>
      player.id === playerId ? { ...player, name: newName } : player,
    ),
  }));
  return { ...match, teams, reserveTeams, events };
}

// Remove o jogador da escalação, da fila e dos lances, corrigindo também o placar.
export function removePlayerFromMatch(match, playerId) {
  if (!match) return match;
  const removedGoals = [0, 0];
  const events = (match.events || [])
    .map((event) => {
      if (event.type === "goal" && event.playerId === playerId) {
        removedGoals[event.teamIndex] += 1;
        return null;
      }
      if (event.type === "own_goal" && event.playerId === playerId) {
        removedGoals[event.teamIndex === 0 ? 1 : 0] += 1;
        return null;
      }
      if (
        [
          "missed_penalty",
          "goalkeeper_save",
          "goalkeeper_difficult_save",
          "goalkeeper_penalty_save",
          "goalkeeper_error",
          "match_highlight",
        ].includes(event.type) &&
        event.playerId === playerId
      )
        return null;
      if (event.type === "goal" && event.assistPlayerId === playerId)
        return { ...event, assistPlayerId: null, assistPlayerName: null };
      return event;
    })
    .filter(Boolean);
  const teams = (match.teams || []).map((team) => {
    const starters = (team.starters || []).filter((player) => player.id !== playerId);
    return {
      ...team,
      starters,
      bench: (team.bench || []).filter((player) => player.id !== playerId),
      goalkeeperId: team.goalkeeperId === playerId ? starters[0]?.id || null : team.goalkeeperId,
    };
  });
  const reserveTeams = (match.reserveTeams || []).map((team) => ({
    ...team,
    starters: (team.starters || []).filter((player) => player.id !== playerId),
    bench: (team.bench || []).filter((player) => player.id !== playerId),
  }));
  const score = (match.score || [0, 0]).map((value, index) =>
    Math.max(0, value - removedGoals[index]),
  );
  return {
    ...match,
    teams,
    reserveTeams,
    events,
    score,
    initialGoalkeeperIds: teams.map((team, index) =>
      match.initialGoalkeeperIds?.[index] === playerId
        ? team.goalkeeperId
        : match.initialGoalkeeperIds?.[index] || team.goalkeeperId,
    ),
  };
}

function normalizeMatchGoalkeepers(match) {
  if (!match) return match;
  const teams = (match.teams || []).map((team) => ({
    ...team,
    goalkeeperId:
      team.goalkeeperId && (team.starters || []).some((player) => player.id === team.goalkeeperId)
        ? team.goalkeeperId
        : team.starters?.[0]?.id || null,
  }));
  return {
    ...match,
    teams,
    initialGoalkeeperIds:
      Array.isArray(match.initialGoalkeeperIds) &&
      match.initialGoalkeeperIds.length === teams.length
        ? match.initialGoalkeeperIds
        : teams.map((team) => team.goalkeeperId),
  };
}

// Aceita dados de versões anteriores e garante que todos os campos atuais existam.
export function normalizeState(raw) {
  const saved = raw && typeof raw === "object" ? raw : {};
  const requestedSport = canonicalSport(saved.settings?.sport);
  const safeSport = Object.hasOwn(SPORT_PRESETS, requestedSport)
    ? requestedSport
    : initialState.settings.sport;
  const players = Array.isArray(saved.players)
    ? saved.players.map((player) => {
        const career = normalizeCareer(player.career);
        return career ? { ...player, career } : player;
      })
    : [];
  return {
    ...initialState,
    ...saved,
    profile: { displayName: String(saved.profile?.displayName || "").slice(0, 40) },
    settings: {
      ...initialState.settings,
      ...(saved.settings || {}),
      // Migra modalidades removidas ou desconhecidas salvas por versões antigas.
      sport: safeSport,
      teamNames: Array.isArray(saved.settings?.teamNames)
        ? saved.settings.teamNames
            .slice(0, TEAM_META.length)
            .map((name) => String(name || "").slice(0, 30))
        : [],
      hasFixedGoalkeepers:
        saved.settings?.hasFixedGoalkeepers ??
        (Array.isArray(saved.settings?.fixedGoalkeeperIds) &&
          saved.settings.fixedGoalkeeperIds.length > 0),
    },
    players,
    activeMatch: normalizeMatchGoalkeepers(saved.activeMatch),
    history: Array.isArray(saved.history) ? saved.history.map(normalizeMatchGoalkeepers) : [],
    trainingPlans: [],
    trainingHistory: [],
    activeTraining: null,
  };
}

export function readSaved(key) {
  if (typeof window === "undefined") return initialState;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return saved ? normalizeState(saved) : initialState;
  } catch {
    return initialState;
  }
}

export const legacyUserStorageKey = (userId) => `${USER_STORAGE_PREFIX}:${userId}`;
export const userStorageKey = (userId, groupId = DEFAULT_GROUP_ID) =>
  `${USER_STORAGE_PREFIX}:${userId}:group:${groupId}`;

export const hasSavedContent = (saved) =>
  saved.players.length > 0 || saved.history.length > 0 || Boolean(saved.activeMatch);
