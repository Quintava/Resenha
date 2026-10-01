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
  if (!matches) return 1;
  if (score >= 8.5) return 5;
  if (score >= 7.6) return 4;
  if (score >= 6.8) return 3;
  if (score >= 6) return 2;
  return 1;
}
