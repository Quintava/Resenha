// Preferências locais e compatibilidade com versões anteriores do Resenha.
export const LEGACY_STORAGE_KEY = "pelada-da-semana-v4";
export const USER_STORAGE_PREFIX = "pelada-da-semana-user";
export const MIGRATION_OWNER_KEY = "pelada-da-semana-legacy-owner";
export const THEME_KEY = "pelada-da-semana-theme";
export const DEFAULT_GROUP_ID = "default";
export const ACTIVE_GROUP_PREFIX = "resenha-active-group";

// A ordem define quais times entram primeiro em quadra.
export const TEAM_META = [
  { id: "blue", name: "Time Azul", short: "AZL", color: "blue" },
  { id: "orange", name: "Time Laranja", short: "LRJ", color: "orange" },
  { id: "green", name: "Time Verde", short: "VRD", color: "green" },
  { id: "purple", name: "Time Roxo", short: "RXO", color: "purple" },
  { id: "red", name: "Time Vermelho", short: "VRM", color: "red" },
  { id: "yellow", name: "Time Amarelo", short: "AMR", color: "yellow" },
];

// Sugestões editáveis de duração e jogadores em quadra.
export const SPORT_PRESETS = {
  Futebol: { players: 11, duration: 20 },
  "Futebol Society": { players: 5, duration: 10 },
  "Futebol de Salão": { players: 5, duration: 10 },
  Vôlei: { players: 2, duration: 15 },
  Basquete: { players: 5, duration: 10 },
};

export const PLAYER_PAGE_SIZE = 10;
export const CAREER_VERSION = 4;
// Evita que uma única atuação coloque um atleta novo no topo da carreira.
export const MINIMUM_CAREER_GAMES = 3;
// Peso de referência usado para estabilizar a média nas primeiras partidas.
export const RANKING_REFERENCE_GAMES = 3;
export const TRAINING_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Modelo central de dados de cada conta.
export const initialState = {
  profile: { displayName: "" },
  players: [],
  settings: {
    sport: "Futebol de Salão",
    duration: 10,
    startersPerTeam: 5,
    teamCount: 2,
    teamNames: [],
    drawMode: "balanced",
    sharedBench: false,
    attendanceIds: [],
    hasFixedGoalkeepers: false,
    fixedGoalkeeperIds: [],
    academyMonthlyFee: "",
    academyDueDay: "",
  },
  activeMatch: null,
  history: [],
  trainingPlans: [],
  trainingHistory: [],
  activeTraining: null,
};
