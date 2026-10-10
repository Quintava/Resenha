import { CAREER_VERSION } from "../configuracao/configuracaoAplicativo";
import { canonicalSport, sportKind, starsFromScore } from "./esportes";

export function playerPerformance(match, playerId) {
  const isFootball = sportKind(match.sport) === "football";
  const points = pointsInMatch(match, playerId);
  const assists = isFootball
    ? (match.events || []).filter(
        (event) => event.type === "goal" && event.assistPlayerId === playerId,
      ).length
    : 0;
  const goalkeeperAssists = isFootball
    ? (match.events || []).filter(
        (event) =>
          event.type === "goal" && event.assistPlayerId === playerId && event.assistWasGoalkeeper,
      ).length
    : 0;
  const ownGoals = isFootball
    ? (match.events || []).filter(
        (event) => event.type === "own_goal" && event.playerId === playerId,
      ).length
    : 0;
  const missedPenalties = isFootball
    ? (match.events || []).filter(
        (event) => event.type === "missed_penalty" && event.playerId === playerId,
      ).length
    : 0;
  const teamIndex = (match.teams || []).findIndex((team) =>
    [...(team.starters || []), ...(team.bench || [])].some((player) => player.id === playerId),
  );
  const own = Number(match.score?.[teamIndex] || 0);
  const rival = Number(match.score?.[teamIndex === 0 ? 1 : 0] || 0);
  const resultBonus = teamIndex < 0 ? 0 : own > rival ? 0.35 : own === rival ? 0.15 : -0.15;
  const assistWeight = isFootball ? 0.3 : 0;
  const offensiveBonus = Math.min(
    2,
    points * 0.55 + assists * assistWeight + goalkeeperAssists * 0.2,
  );
  const automaticBonus = (match.events || [])
    .filter((event) => event.type === "automatic_bonus" && event.playerId === playerId)
    .reduce((total, event) => total + Number(event.bonusValue || 0), 0);
  const penalties = ownGoals * 0.4 + missedPenalties * 0.3;
  const attendanceBonus = match.managementMode === "academy" ? 0.2 : 0;
  const goalkeeper = isFootball
    ? goalkeeperPerformance(match, playerId)
    : {
        seconds: 0,
        minutes: 0,
        saves: 0,
        difficultSaves: 0,
        penaltySaves: 0,
        errors: 0,
        goalsConceded: 0,
        score: 0,
        adjustment: 0,
      };
  const score = Math.max(
    3,
    Math.min(
      10,
      Number(
        (
          6 +
          offensiveBonus +
          resultBonus -
          penalties +
          goalkeeper.adjustment +
          attendanceBonus +
          automaticBonus
        ).toFixed(1),
      ),
    ),
  );
  return {
    points,
    assists,
    goalkeeperAssists,
    ownGoals,
    missedPenalties,
    penalties,
    score,
    stars: starsFromScore(score),
    resultBonus,
    automaticBonus,
    offensiveBonus,
    attendanceBonus,
    goalkeeper,
  };
}

const eventTime = (event) => Number(event.elapsedSeconds || event.minute * 60 || 0);

const playersFromTeam = (team) => [...(team?.starters || []), ...(team?.bench || [])];

const winnerPlayerIds = (match) => {
  const first = Number(match.score?.[0] || 0);
  const second = Number(match.score?.[1] || 0);
  if (first === second) return new Set();
  return new Set(playersFromTeam(match.teams?.[first > second ? 0 : 1]).map((player) => player.id));
};

const playerWonMatch = (match, playerId) => winnerPlayerIds(match).has(playerId);

// Materializa os bônus automáticos no encerramento para que app, carreira e Mural usem a mesma nota.
export function applyAutomaticBonuses(match, history = []) {
  if (!match) return match;
  const eventsWithoutOldBonuses = (match.events || []).filter(
    (event) => event.type !== "automatic_bonus",
  );
  const scoringEvents = [...eventsWithoutOldBonuses]
    .filter((event) => event.type === "goal")
    .sort((a, b) => eventTime(a) - eventTime(b));
  const bonuses = new Map();
  const addBonus = (playerId, playerName, bonusKind, bonusValue, bonusLabel) => {
    const key = `${playerId}:${bonusKind}`;
    if (!playerId || bonuses.has(key)) return;
    bonuses.set(key, {
      id: `bonus-${match.id}-${playerId}-${bonusKind}`,
      type: "automatic_bonus",
      playerId,
      playerName: playerName || "Jogador",
      bonusKind,
      bonusValue,
      bonusLabel,
      teamIndex: (match.teams || []).findIndex((team) =>
        playersFromTeam(team).some((player) => player.id === playerId),
      ),
      minute: Math.max(0, ...eventsWithoutOldBonuses.map((event) => Number(event.minute || 0))),
      elapsedSeconds: Math.max(0, ...eventsWithoutOldBonuses.map(eventTime)),
    });
  };

  // Duas participações ofensivas consecutivas: 2 gols, 2 assistências ou uma de cada.
  for (let index = 1; index < scoringEvents.length; index += 1) {
    const previous = scoringEvents[index - 1];
    const current = scoringEvents[index];
    const previousContributors = new Map(
      [
        [previous.playerId, previous.playerName],
        [previous.assistPlayerId, previous.assistPlayerName],
      ].filter(([id]) => Boolean(id)),
    );
    [
      [current.playerId, current.playerName],
      [current.assistPlayerId, current.assistPlayerName],
    ].forEach(([id, name]) => {
      if (id && previousContributors.has(id))
        addBonus(
          id,
          name || previousContributors.get(id),
          "offensive_sequence",
          0.3,
          sportKind(match.sport) === "volleyball"
            ? "Dois pontos seguidos"
            : sportKind(match.sport) === "basketball"
              ? "Duas cestas seguidas"
              : "Duas participações ofensivas seguidas",
        );
    });
  }

  // Duas defesas de pênalti na mesma partida geram um reconhecimento específico ao goleiro.
  const penaltySaves = new Map();
  eventsWithoutOldBonuses
    .filter((event) => event.type === "goalkeeper_penalty_save")
    .forEach((event) => {
      const current = penaltySaves.get(event.playerId) || { count: 0, name: event.playerName };
      penaltySaves.set(event.playerId, { ...current, count: current.count + 1 });
    });
  penaltySaves.forEach((value, playerId) => {
    if (value.count >= 2)
      addBonus(playerId, value.name, "two_penalty_saves", 0.5, "Duas defesas de pênalti");
  });

  // O bônus de sequência é individual e nasce apenas ao completar 3, 6, 9... vitórias na sessão.
  const currentWinners = winnerPlayerIds(match);
  const sessionMatches = (history || [])
    .filter((game) => game.sessionId && game.sessionId === match.sessionId)
    .sort((a, b) => Number(b.roundNumber || 0) - Number(a.roundNumber || 0));
  currentWinners.forEach((playerId) => {
    let previousWins = 0;
    for (const game of sessionMatches) {
      if (!playerWonMatch(game, playerId)) break;
      previousWins += 1;
    }
    const streak = previousWins + 1;
    if (streak >= 3 && streak % 3 === 0) {
      const player = (match.teams || [])
        .flatMap(playersFromTeam)
        .find((item) => item.id === playerId);
      addBonus(playerId, player?.name, "three_wins", 0.4, `${streak} vitórias seguidas`);
    }
  });

  return { ...match, events: [...bonuses.values(), ...eventsWithoutOldBonuses] };
}

// Reconstrói os períodos no gol a partir do goleiro inicial e de cada troca registrada.
function goalkeeperMinutesInMatch(match, playerId) {
  const playedSeconds = Math.max(
    Number(match.durationSeconds || 0) - Number(match.remainingSeconds || 0),
    ...(match.events || []).map((event) => Number(event.elapsedSeconds || event.minute * 60 || 0)),
    0,
  );
  let seconds = 0;
  (match.teams || []).forEach((team, teamIndex) => {
    let currentId = match.initialGoalkeeperIds?.[teamIndex] || team.goalkeeperId;
    let startedAt = 0;
    [...(match.events || [])]
      .filter((event) => event.type === "goalkeeper_change" && event.teamIndex === teamIndex)
      .sort((a, b) => Number(a.elapsedSeconds || 0) - Number(b.elapsedSeconds || 0))
      .forEach((event) => {
        const changedAt = Math.min(
          playedSeconds,
          Number(event.elapsedSeconds || event.minute * 60 || 0),
        );
        if (currentId === playerId) seconds += Math.max(0, changedAt - startedAt);
        currentId = event.playerInId;
        startedAt = changedAt;
      });
    if (currentId === playerId) seconds += Math.max(0, playedSeconds - startedAt);
  });
  return { seconds, playedSeconds };
}

// A nota do goleiro considera atuação real na posição e é proporcional ao tempo no gol.
function goalkeeperPerformance(match, playerId) {
  const { seconds, playedSeconds } = goalkeeperMinutesInMatch(match, playerId);
  const events = match.events || [];
  const saves = events.filter(
    (event) =>
      ["goalkeeper_save", "goalkeeper_difficult_save", "goalkeeper_penalty_save"].includes(
        event.type,
      ) && event.playerId === playerId,
  ).length;
  const difficultSaves = events.filter(
    (event) => event.type === "goalkeeper_difficult_save" && event.playerId === playerId,
  ).length;
  const penaltySaves = events.filter(
    (event) => event.type === "goalkeeper_penalty_save" && event.playerId === playerId,
  ).length;
  const errors = events.filter(
    (event) => event.type === "goalkeeper_error" && event.playerId === playerId,
  ).length;
  const goalsConceded = events.filter(
    (event) => ["goal", "own_goal"].includes(event.type) && event.goalkeeperId === playerId,
  ).length;
  if (!seconds)
    return {
      seconds: 0,
      minutes: 0,
      saves,
      difficultSaves,
      penaltySaves,
      errors,
      goalsConceded,
      score: 0,
      adjustment: 0,
    };
  const share = playedSeconds ? seconds / playedSeconds : 0;
  const normalSaves = Math.max(0, saves - difficultSaves - penaltySaves);
  const adjustment =
    normalSaves * 0.12 +
    difficultSaves * 0.3 +
    penaltySaves * 0.7 -
    errors * 0.45 -
    Math.min(0.4, goalsConceded * 0.08) +
    (goalsConceded === 0 && share >= 0.5 ? 0.4 * share : 0);
  return {
    seconds,
    minutes: Number((seconds / 60).toFixed(1)),
    saves,
    difficultSaves,
    penaltySaves,
    errors,
    goalsConceded,
    score: Math.max(3, Math.min(10, Number((6 + adjustment).toFixed(1)))),
    adjustment,
  };
}

// O acumulado fica no cadastro para não depender das páginas de histórico já carregadas.
function emptyCareerStats() {
  return {
    games: 0,
    points: 0,
    assists: 0,
    evaluationTotal: 0,
    evaluationAverage: 0,
    stars: 0,
    goalkeeperAppearances: 0,
    goalkeeperSeconds: 0,
    goalkeeperEvaluationSeconds: 0,
    goalkeeperEvaluationAverage: 0,
    goalkeeperSaves: 0,
    goalkeeperDifficultSaves: 0,
    goalkeeperPenaltySaves: 0,
    goalkeeperGoalsConceded: 0,
    goalkeeperErrors: 0,
  };
}

export function emptyCareer() {
  return {
    version: CAREER_VERSION,
    ...emptyCareerStats(),
    sports: {},
    updatedAt: null,
  };
}

function normalizeCareerStats(stats) {
  const source = stats || {};
  const games = Math.max(0, Number(source.games) || 0);
  const evaluationTotal = Math.max(0, Number(source.evaluationTotal) || 0);
  const goalkeeperSeconds = Math.max(0, Number(source.goalkeeperSeconds) || 0);
  const goalkeeperEvaluationSeconds = Math.max(0, Number(source.goalkeeperEvaluationSeconds) || 0);
  return {
    ...emptyCareerStats(),
    ...source,
    games,
    points: Math.max(0, Number(source.points) || 0),
    assists: Math.max(0, Number(source.assists) || 0),
    evaluationTotal,
    evaluationAverage: games ? evaluationTotal / games : 0,
    stars: starsFromScore(games ? evaluationTotal / games : 0, games),
    goalkeeperAppearances: Math.max(0, Number(source.goalkeeperAppearances) || 0),
    goalkeeperSeconds,
    goalkeeperEvaluationSeconds,
    goalkeeperEvaluationAverage: goalkeeperSeconds
      ? goalkeeperEvaluationSeconds / goalkeeperSeconds
      : 0,
    goalkeeperSaves: Math.max(0, Number(source.goalkeeperSaves) || 0),
    goalkeeperDifficultSaves: Math.max(0, Number(source.goalkeeperDifficultSaves) || 0),
    goalkeeperPenaltySaves: Math.max(0, Number(source.goalkeeperPenaltySaves) || 0),
    goalkeeperGoalsConceded: Math.max(0, Number(source.goalkeeperGoalsConceded) || 0),
    goalkeeperErrors: Math.max(0, Number(source.goalkeeperErrors) || 0),
  };
}

export function normalizeCareer(career) {
  if (!career || career.version !== CAREER_VERSION) return null;
  const sports = Object.fromEntries(
    Object.entries(career.sports || {}).map(([sport, stats]) => [
      canonicalSport(sport),
      normalizeCareerStats(stats),
    ]),
  );
  return {
    ...emptyCareer(),
    ...career,
    ...normalizeCareerStats(career),
    sports,
  };
}

function addPerformanceToCareerStats(stats, performance, direction) {
  const current = normalizeCareerStats(stats);
  const games = Math.max(0, current.games + direction);
  const evaluationTotal = Math.max(
    0,
    Number((current.evaluationTotal + performance.score * direction).toFixed(4)),
  );
  const goalkeeper = performance.goalkeeper;
  const goalkeeperSeconds = Math.max(0, current.goalkeeperSeconds + goalkeeper.seconds * direction);
  const goalkeeperEvaluationSeconds = Math.max(
    0,
    current.goalkeeperEvaluationSeconds + goalkeeper.score * goalkeeper.seconds * direction,
  );
  return {
    ...current,
    games,
    points: Math.max(0, current.points + performance.points * direction),
    assists: Math.max(0, current.assists + performance.assists * direction),
    evaluationTotal,
    evaluationAverage: games ? evaluationTotal / games : 0,
    stars: starsFromScore(games ? evaluationTotal / games : 0, games),
    goalkeeperAppearances: Math.max(
      0,
      current.goalkeeperAppearances + (goalkeeper.seconds > 0 ? direction : 0),
    ),
    goalkeeperSeconds,
    goalkeeperEvaluationSeconds,
    goalkeeperEvaluationAverage: goalkeeperSeconds
      ? goalkeeperEvaluationSeconds / goalkeeperSeconds
      : 0,
    goalkeeperSaves: Math.max(0, current.goalkeeperSaves + goalkeeper.saves * direction),
    goalkeeperDifficultSaves: Math.max(
      0,
      current.goalkeeperDifficultSaves + goalkeeper.difficultSaves * direction,
    ),
    goalkeeperPenaltySaves: Math.max(
      0,
      current.goalkeeperPenaltySaves + goalkeeper.penaltySaves * direction,
    ),
    goalkeeperGoalsConceded: Math.max(
      0,
      current.goalkeeperGoalsConceded + goalkeeper.goalsConceded * direction,
    ),
    goalkeeperErrors: Math.max(0, current.goalkeeperErrors + goalkeeper.errors * direction),
  };
}

// Soma ou remove a contribuição de uma partida sem precisar reenviar todo o histórico.
export function applyMatchToCareers(players, match, direction = 1) {
  if (!match) return players;
  return players.map((player) => {
    if (!playerWasInMatch(match, player.id)) return player;
    const current = normalizeCareer(player.career) || emptyCareer();
    const performance = playerPerformance(match, player.id);
    const sport = canonicalSport(match.sport);
    return {
      ...player,
      career: {
        version: CAREER_VERSION,
        ...addPerformanceToCareerStats(current, performance, direction),
        sports: {
          ...(current.sports || {}),
          [sport]: addPerformanceToCareerStats(current.sports?.[sport], performance, direction),
        },
        updatedAt: new Date().toISOString(),
      },
    };
  });
}

// Migração única dos cadastros antigos usando todas as partidas existentes.
export function rebuildPlayerCareers(players, history) {
  return (history || []).reduce(
    (currentPlayers, match) => applyMatchToCareers(currentPlayers, match, 1),
    players.map((player) => ({ ...player, career: emptyCareer() })),
  );
}

const ratingLabel = (rating) =>
  ["Sem avaliação", "Em evolução", "Regular", "Destaque", "Craque", "Elite"][rating];

export function playerWasInMatch(match, playerId) {
  if (Array.isArray(match.attendanceIds)) return match.attendanceIds.includes(playerId);
  return [...(match.teams || []), ...(match.reserveTeams || [])].some((team) =>
    [...(team.starters || []), ...(team.bench || [])].some((player) => player.id === playerId),
  );
}

export function pointsInMatch(match, playerId) {
  return (match.events || [])
    .filter((event) => event.type === "goal" && event.playerId === playerId)
    .reduce((total, event) => total + Number(event.pointValue || 1), 0);
}

// Consolida presença, produção e avaliação geral de cada jogador.
export function buildPlayerStats(players, history, selectedSport) {
  const sport = canonicalSport(selectedSport);
  const sportHistory = history.filter((match) => canonicalSport(match.sport) === sport);
  const lastMatch = sportHistory[0] || null;
  return new Map(
    players.map((player) => {
      const loadedMatches = sportHistory.filter((match) => playerWasInMatch(match, player.id));
      const performances = loadedMatches.map((match) => playerPerformance(match, player.id));
      const career = normalizeCareer(player.career);
      const sportCareer = career?.sports?.[sport];
      const matches = sportCareer?.games ?? loadedMatches.length;
      const totalPoints =
        sportCareer?.points ?? performances.reduce((sum, item) => sum + item.points, 0);
      const totalAssists =
        sportCareer?.assists ?? performances.reduce((sum, item) => sum + item.assists, 0);
      const average = matches ? totalPoints / matches : 0;
      const evaluation =
        sportCareer?.evaluationAverage ??
        (performances.length
          ? performances.reduce((sum, item) => sum + item.score, 0) / performances.length
          : 0);
      const lastPerformance =
        lastMatch && playerWasInMatch(lastMatch, player.id)
          ? playerPerformance(lastMatch, player.id)
          : null;
      const recent = performances.slice(0, 10);
      const recentAverage = recent.length
        ? recent.reduce((sum, item) => sum + item.score, 0) / recent.length
        : evaluation;
      const stabilizedAverage = matches ? (evaluation * matches + 18) / (matches + 3) : 0;
      const balanceScore = matches
        ? Number((recentAverage * 0.7 + stabilizedAverage * 0.3).toFixed(2))
        : 0;
      const rating = sportCareer?.stars ?? starsFromScore(evaluation, matches);
      return [
        player.id,
        {
          matches,
          totalPoints,
          totalAssists,
          average,
          evaluation,
          recentAverage,
          balanceScore,
          lastPoints: lastPerformance?.points ?? null,
          lastRating: lastPerformance?.stars ?? null,
          rating,
          label: ratingLabel(rating),
          goalkeeper: {
            appearances: sportCareer?.goalkeeperAppearances || 0,
            minutes: Number(((sportCareer?.goalkeeperSeconds || 0) / 60).toFixed(1)),
            evaluation: sportCareer?.goalkeeperEvaluationAverage || 0,
            saves: sportCareer?.goalkeeperSaves || 0,
          },
        },
      ];
    }),
  );
}
