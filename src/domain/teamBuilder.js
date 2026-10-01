import { TEAM_META } from "../config/appConfig";

// Sorteio Fisher-Yates para não favorecer a ordem original do cadastro.
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Distribui atletas entre 2 e 6 times. No modo equilibrado, usa a nota média acumulada.
export function drawTeams(players, mode, startersPerTeam, teamCount = 2) {
  const fixedGoalkeepers = shuffle(players.filter((player) => player.fixedGoalkeeper));
  let ordered = shuffle(players.filter((player) => !player.fixedGoalkeeper));
  if (mode === "balanced")
    ordered = ordered.sort(
      (a, b) => b.balanceScore - a.balanceScore || b.evaluatedGames - a.evaluatedGames,
    );
  const teams = TEAM_META.slice(0, teamCount).map((meta) => ({ ...meta, starters: [], bench: [] }));
  fixedGoalkeepers.forEach((player, index) => teams[index % teams.length].starters.push(player));
  ordered.forEach((player, index) => {
    let target = index % teams.length;
    if (mode === "balanced") {
      const counts = teams.map((team) => team.starters.length + team.bench.length);
      const totals = teams.map((team) =>
        [...team.starters, ...team.bench].reduce((sum, item) => sum + item.balanceScore, 0),
      );
      const smallestCount = Math.min(...counts);
      target = counts
        .map((count, teamIndex) => ({ teamIndex, count, total: totals[teamIndex] }))
        .filter((item) => item.count === smallestCount)
        .sort((a, b) => a.total - b.total)[0].teamIndex;
    }
    const list = teams[target].starters.length < startersPerTeam ? "starters" : "bench";
    teams[target][list].push(player);
  });
  return teams;
}

// Garante que o goleiro escolhido esteja em jogo e guarda quem começa a rodada na posição.
export function prepareGoalkeepers(teams) {
  return teams.map((team) => {
    const chosen = [...team.starters, ...team.bench].find((player) => player.fixedGoalkeeper);
    let starters = [...team.starters];
    let bench = [...team.bench];
    if (chosen && bench.some((player) => player.id === chosen.id) && starters.length) {
      const outgoing = starters[starters.length - 1];
      starters = starters.map((player) => (player.id === outgoing.id ? chosen : player));
      bench = bench.map((player) => (player.id === chosen.id ? outgoing : player));
    }
    return { ...team, starters, bench, goalkeeperId: chosen?.id || starters[0]?.id || null };
  });
}

// Constrói os times conforme a escolha manual feita na tela de preparação.
export function buildManualTeams(players, assignments, startersPerTeam, teamCount = 2) {
  const teams = TEAM_META.slice(0, teamCount).map((meta) => ({ ...meta, starters: [], bench: [] }));
  players.forEach((player) => {
    const target = assignments[player.id];
    if (!Number.isInteger(target) || target < 0 || target >= teamCount) return;
    const list = teams[target].starters.length < startersPerTeam ? "starters" : "bench";
    teams[target][list].push(player);
  });
  return teams;
}

export function substitutionBench(match, teamIndex) {
  if (!match) return [];
  return match.sharedBench
    ? match.teams.flatMap((team, sourceTeamIndex) =>
        team.bench.map((player) => ({ ...player, sourceTeamIndex })),
      )
    : (match.teams[teamIndex]?.bench || []).map((player) => ({
        ...player,
        sourceTeamIndex: teamIndex,
      }));
}
