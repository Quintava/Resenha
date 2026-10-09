// Normalização e rótulos compartilhados por preparação, partida, rankings e Mural.
export const canonicalSport = (sport) => (sport === "Futsal" ? "Futebol de Salão" : sport);

export const sportKind = (sport) =>
  ["Futebol", "Futebol Society", "Futebol de Salão"].includes(canonicalSport(sport))
    ? "football"
    : canonicalSport(sport) === "Vôlei"
      ? "volleyball"
      : canonicalSport(sport) === "Basquete"
        ? "basketball"
        : "other";

export const scoreWord = (sport, amount = 2) =>
  sportKind(sport) === "basketball"
    ? amount === 1
      ? "cesta"
      : "cestas"
    : sportKind(sport) === "volleyball"
      ? amount === 1
        ? "ponto"
        : "pontos"
      : amount === 1
        ? "gol"
        : "gols";

export const scoreAction = (sport) =>
  sportKind(sport) === "basketball" ? "Cesta" : sportKind(sport) === "volleyball" ? "Ponto" : "Gol";

export function starsFromScore(score, matches = 1) {
  // Cadastro sem partida não possui nível: zero estrelas significa "Sem avaliação".
  if (!matches) return 0;
  if (score >= 8.5) return 5;
  if (score >= 7.6) return 4;
  if (score >= 6.8) return 3;
  if (score >= 6) return 2;
  return 1;
}

// Reduz distorções de amostras pequenas aproximando a nota inicial da média do grupo.
export function adjustedRankingScore(score, matches, groupAverage = 6, referenceGames = 3) {
  const gameCount = Math.max(0, Number(matches) || 0);
  if (!gameCount) return 0;
  const average = Number.isFinite(Number(score)) ? Number(score) : 0;
  const reference = Number.isFinite(Number(groupAverage)) ? Number(groupAverage) : 6;
  const weight = Math.max(0, Number(referenceGames) || 0);
  return Number(((average * gameCount + reference * weight) / (gameCount + weight)).toFixed(1));
}
