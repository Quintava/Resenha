"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownUp,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  CirclePlay,
  Clock3,
  Cloud,
  CloudOff,
  Copy,
  Download,
  Eye,
  EyeOff,
  Globe2,
  Goal,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  Medal,
  Menu,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
  UserPlus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { supabase, supabaseConfigured } from "../supabase";
import { downloadBlankStudentForm, downloadStudentForm } from "../utilitarios/fichaAtletaPdf";
import {
  canonicalSport,
  scoreAction,
  scoreWord,
  sportKind,
  starsFromScore,
} from "../dominio/esportes";
import {
  TelaAutenticacao,
  TelaConfiguracaoAutenticacao,
  TelaRecuperacaoSenha,
} from "../componentes/autenticacao/TelasAutenticacao";
import {
  Avatar,
  EstadoVazio,
  Modal,
  Modo,
  Paginacao,
  AvatarPerfil,
  Estrelas,
  AlternadorTema,
} from "../componentes/comuns/ComponentesComuns";
import {
  TabelaDesempenho,
  PainelRanking,
  Resumo,
} from "../componentes/estatisticas/ComponentesRanking";
import {
  LinhaEventoPartida,
  PontuadoresPartida,
  CartaoTime,
  PlacarTime,
} from "../componentes/partida/ComponentesPartida";
import {
  BarraGrupos,
  RodapeSite,
  BarraSuperior,
} from "../componentes/estrutura/EstruturaAplicativo";
import { ControleMensalidades } from "../componentes/treinador/ControleMensalidades";
import {
  initialState,
  ACTIVE_GROUP_PREFIX,
  DEFAULT_GROUP_ID,
  LEGACY_STORAGE_KEY,
  MIGRATION_OWNER_KEY,
  PLAYER_PAGE_SIZE,
  SPORT_PRESETS,
  TEAM_META,
  THEME_KEY,
  TRAINING_DAYS,
} from "../configuracao/configuracaoAplicativo";
import {
  exerciseSeconds,
  exerciseTargetLabel,
  formatTime,
  formatTrainingDuration,
  minuteOf,
  monthKey,
  thisMonth,
  uid,
} from "../utilitarios/tempo";
import {
  PASSWORD_MIN_LENGTH,
  friendlyAuthError,
  normalizeEmail,
  passwordIssue,
  safeLocalStorageSet,
} from "../utilitarios/seguranca";
import {
  applyMatchToCareers,
  buildPlayerStats,
  emptyCareer,
  normalizeCareer,
  playerPerformance,
  playerWasInMatch,
  pointsInMatch,
  rebuildPlayerCareers,
} from "../dominio/estatisticasJogador";
import {
  buildManualTeams,
  drawTeams,
  prepareGoalkeepers,
  shortTeamName,
  substitutionBench,
} from "../dominio/montagemTimes";
import {
  hasSavedContent,
  legacyUserStorageKey,
  normalizeState,
  readSaved,
  removePlayerFromMatch,
  renamePlayerInMatch,
  userStorageKey,
} from "../dominio/estadoAplicativo";
import {
  addUpcomingGame,
  changeGroupMode,
  createGroup,
  deleteGroup,
  deleteUpcomingGame,
  getPublicSettings,
  HISTORY_PAGE_SIZE,
  loadAllHistory,
  loadMoreHistory,
  loadWorkspace,
  listGroups,
  renameGroup,
  saveWorkspace,
  setPublicEnabled,
} from "../servicoDados";

const PaginaPublica = lazy(() => import("../PaginaPublica"));
const brandIconSrc = `${import.meta.env.BASE_URL}assets/logo-resenha.webp`;
const appBaseUrl = new URL(import.meta.env.BASE_URL, window.location.href).href;

const monthlyDueDate = (month, dueDay) => {
  if (!month || !dueDay) return "";
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return `${month}-${String(Math.min(lastDay, Math.max(1, Number(dueDay)))).padStart(2, "0")}`;
};

const calculateAge = (birthDate) => {
  if (!birthDate) return "";
  const [year, month, day] = String(birthDate).split("-").map(Number);
  if (!year || !month || !day) return "";
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day))
    age -= 1;
  return age >= 0 ? String(age) : "";
};

const maskPhone = (value) => {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

// Rótulos usados no histórico expandido das partidas salvas.
const historicalEventLabel = (event, sport) => {
  if (event.type === "goal") {
    const points = sportKind(sport) === "basketball" ? ` (${event.pointValue || 1} pts)` : "";
    const assist = event.assistPlayerName ? ` · assistência de ${event.assistPlayerName}` : "";
    return `${scoreAction(sport)} de ${event.playerName}${points}${assist}`;
  }
  if (event.type === "own_goal") return `Gol contra de ${event.playerName}`;
  if (event.type === "missed_penalty") return `Pênalti perdido por ${event.playerName}`;
  if (event.type === "goalkeeper_save") return `Defesa de ${event.playerName}`;
  if (event.type === "goalkeeper_difficult_save") return `Defesa difícil de ${event.playerName}`;
  if (event.type === "goalkeeper_penalty_save") return `Pênalti defendido por ${event.playerName}`;
  if (event.type === "goalkeeper_error") return `Falha do goleiro ${event.playerName}`;
  if (event.type === "sub") return `Entrou ${event.playerIn} · saiu ${event.playerOut}`;
  if (event.type === "position_change")
    return `Troca de posição entre ${event.playerOut} e ${event.playerIn}`;
  if (event.type === "goalkeeper_change") return `${event.playerIn} assumiu o gol`;
  if (event.type === "match_highlight") return `${event.playerName} foi o destaque da partida`;
  if (event.type === "score_adjustment") return "Correção manual do placar";
  return "Lance registrado";
};

export default function AplicativoResenha() {
  // Estado principal da conta e navegação.
  const [data, setData] = useState(initialState);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("setup");
  const [groups, setGroups] = useState([]);
  const [workspaceMode, setWorkspaceMode] = useState("amateur");
  const [groupCreationMode, setGroupCreationMode] = useState("amateur");
  const [activeGroupId, setActiveGroupId] = useState(DEFAULT_GROUP_ID);
  const [groupsReady, setGroupsReady] = useState(false);
  const [groupLoadError, setGroupLoadError] = useState("");
  const [groupLoadAttempt, setGroupLoadAttempt] = useState(0);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupBusy, setGroupBusy] = useState(false);
  const [settingsAdminMode, setSettingsAdminMode] = useState("amateur");
  const [settingsGroupEdit, setSettingsGroupEdit] = useState(null);
  const [playerDetails, setPlayerDetails] = useState(null);
  const [playerDetailsTab, setPlayerDetailsTab] = useState("student");
  const [matchInfoOpen, setMatchInfoOpen] = useState(false);

  // Formulários e controles da preparação/partida.
  const [playerName, setPlayerName] = useState("");
  const [playerPage, setPlayerPage] = useState(1);
  const [goalTeam, setGoalTeam] = useState(null);
  const [goalScorer, setGoalScorer] = useState("");
  const [goalAssist, setGoalAssist] = useState("");
  const [basketPoints, setBasketPoints] = useState(1);
  const [incident, setIncident] = useState(null);
  const [incidentPlayer, setIncidentPlayer] = useState("");
  const [subTeam, setSubTeam] = useState(null);
  const [selectedOut, setSelectedOut] = useState("");
  const [selectedIn, setSelectedIn] = useState("");
  const [teamSwapSide, setTeamSwapSide] = useState(null);
  const [goalkeeperTeam, setGoalkeeperTeam] = useState(null);
  const [goalkeeperCandidate, setGoalkeeperCandidate] = useState("");
  const [matchMessage, setMatchMessage] = useState("");

  // Filtros de estatísticas e preferências visuais.
  const [month, setMonth] = useState(thisMonth());
  const [statsSport, setStatsSport] = useState("Futebol de Salão");
  const [statsSection, setStatsSection] = useState("ranking");
  const [rankingScope, setRankingScope] = useState("overall");
  const [rankingRole, setRankingRole] = useState("line");
  const [rankingMatchId, setRankingMatchId] = useState("");
  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem(THEME_KEY) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );

  // Autenticação, perfil e menus.
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationWelcomeOpen, setNotificationWelcomeOpen] = useState(false);
  const [readNotificationSignature, setReadNotificationSignature] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingMatch, setEditingMatch] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [currentPasswordConfirm, setCurrentPasswordConfirm] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [setupMessage, setSetupMessage] = useState("");
  const [manualAssignments, setManualAssignments] = useState({});
  const [goalkeeperPickerOpen, setGoalkeeperPickerOpen] = useState(false);

  // Evolução mensal e modo treino.
  const [evolutionPlayerId, setEvolutionPlayerId] = useState("");
  const [evolutionMonth, setEvolutionMonth] = useState(thisMonth());
  const [trainingName, setTrainingName] = useState("");
  const [trainingStatsMonth, setTrainingStatsMonth] = useState(thisMonth());
  const [trainingDays, setTrainingDays] = useState([]);
  const [trainingExercises, setTrainingExercises] = useState([]);
  const [exerciseDraft, setExerciseDraft] = useState({
    name: "",
    mode: "time",
    target: 30,
    unit: "seconds",
  });

  // Login, recuperação de senha e status de sincronização.
  const [authMode, setAuthMode] = useState("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryConfirm, setRecoveryConfirm] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState(supabaseConfigured ? "offline" : "local");
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Configuração do Mural da Resenha.
  const [publicConfig, setPublicConfig] = useState({ page: null, games: [] });
  const [publicDraft, setPublicDraft] = useState({
    title: "Pelada da semana",
    sport: "Futebol de Salão",
    scheduled_at: "",
    location: "",
  });

  // Referências que não precisam causar uma nova renderização.
  const nameInput = useRef(null);
  const importInput = useRef(null);
  const profileMenuRef = useRef(null);
  const appMenuRef = useRef(null);
  const notificationsRef = useRef(null);
  const dataRef = useRef(initialState);
  const dirtyRef = useRef(false);
  const syncingRef = useRef(false);
  const finishingRef = useRef(false);
  const authSubmittingRef = useRef(false);
  const cloudLoadedUser = useRef(null);
  const viewAfterGroupSwitchRef = useRef(null);
  const activeGroup = groups.find((group) => group.id === activeGroupId) || groups[0];
  const visibleGroups = groups.filter(
    (group) => (group.management_mode || "amateur") === workspaceMode,
  );
  const cloudWorkspaceKey = session?.user ? `${session.user.id}:${activeGroupId}` : null;

  // Atalhos do estado precisam existir antes dos cálculos derivados abaixo.
  const match = data.activeMatch;
  // Mantido apenas para migração silenciosa de contas antigas; o modo treino saiu da interface.
  const activeTraining = data.activeTraining;

  // Dados derivados usados por mais de uma tela.
  const activePlayers = useMemo(
    () => data.players.filter((player) => !player.suspended),
    [data.players],
  );
  const suspendedPlayerIds = useMemo(
    () => new Set(data.players.filter((player) => player.suspended).map((player) => player.id)),
    [data.players],
  );
  const playerStats = useMemo(
    () => buildPlayerStats(activePlayers, data.history, data.settings.sport),
    [activePlayers, data.history, data.settings.sport],
  );
  const managedPlayers = useMemo(() => {
    const players = new Map(
      data.players.map((player) => [
        player.id,
        { ...player, registered: true, totalPoints: 0, totalAssists: 0 },
      ]),
    );
    data.history.forEach((game) =>
      (game.events || [])
        .filter((event) => event.type === "goal")
        .forEach((event) => {
          const current = players.get(event.playerId) || {
            id: event.playerId,
            name: event.playerName,
            registered: false,
            totalPoints: 0,
            totalAssists: 0,
          };
          players.set(event.playerId, { ...current, totalPoints: current.totalPoints + 1 });
          if (event.assistPlayerId) {
            const assistant = players.get(event.assistPlayerId) || {
              id: event.assistPlayerId,
              name: event.assistPlayerName,
              registered: false,
              totalPoints: 0,
              totalAssists: 0,
            };
            players.set(event.assistPlayerId, {
              ...assistant,
              totalAssists: assistant.totalAssists + 1,
            });
          }
        }),
    );
    return [...players.values()]
      .filter((player) => !suspendedPlayerIds.has(player.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.players, data.history, suspendedPlayerIds]);
  const playerPageCount = Math.max(1, Math.ceil(activePlayers.length / PLAYER_PAGE_SIZE));
  const visiblePlayers = useMemo(
    () => activePlayers.slice((playerPage - 1) * PLAYER_PAGE_SIZE, playerPage * PLAYER_PAGE_SIZE),
    [activePlayers, playerPage],
  );
  const displayName =
    data.profile?.displayName?.trim() ||
    session?.user?.user_metadata?.display_name ||
    session?.user?.email?.split("@")[0] ||
    "Usuário";
  const attendanceConfigured = Array.isArray(data.settings.attendanceIds);
  const presentPlayers = useMemo(
    () =>
      activePlayers.filter(
        (player) => !attendanceConfigured || data.settings.attendanceIds.includes(player.id),
      ),
    [activePlayers, data.settings.attendanceIds, attendanceConfigured],
  );
  const academyNotifications = useMemo(() => {
    if (workspaceMode !== "academy") return [];
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const currentMonth = today.slice(0, 7);
    const birthdayKey = today.slice(5);
    const alerts = [];
    const dueDateForMonth = (month, day) => {
      const [year, monthNumber] = String(month).split("-").map(Number);
      const lastDay = new Date(year, monthNumber, 0).getDate();
      return `${month}-${pad(Math.min(lastDay, Math.max(1, Number(day) || 1)))}`;
    };

    data.players
      .filter((player) => !player.suspended)
      .forEach((player) => {
        const profile = player.academyProfile || {};
        if (profile.birthDate?.slice(5) === birthdayKey) {
          alerts.push({
            id: `birthday-${player.id}-${today}`,
            type: "birthday",
            title: `Aniversário de ${player.name}`,
            message: "Hoje é aniversário deste aluno.",
            date: today,
            dateLabel: "Hoje",
          });
        }

        if (profile.tuitionType === "scholarship100") return;
        const history = Array.isArray(profile.paymentHistory) ? profile.paymentHistory : [];
        const pendingRecords = history
          .filter((record) => {
            if (record.paid) return false;
            const fallbackDue =
              record.month && profile.dueDay ? dueDateForMonth(record.month, profile.dueDay) : "";
            const dueDate = record.dueDate || fallbackDue;
            return dueDate && dueDate < today;
          })
          .map((record) => ({
            ...record,
            resolvedDueDate: record.dueDate || dueDateForMonth(record.month, profile.dueDay),
          }))
          .sort((a, b) => b.resolvedDueDate.localeCompare(a.resolvedDueDate));

        let overdue = pendingRecords[0];
        const hasCurrentMonth = history.some((record) => record.month === currentMonth);
        const automaticDueDate = profile.dueDay
          ? dueDateForMonth(currentMonth, profile.dueDay)
          : "";
        if (!overdue && !hasCurrentMonth && automaticDueDate && automaticDueDate < today) {
          overdue = {
            id: `automatic-${currentMonth}`,
            month: currentMonth,
            resolvedDueDate: automaticDueDate,
          };
        }
        if (overdue) {
          alerts.push({
            id: `payment-${player.id}-${overdue.id || overdue.month}`,
            type: "payment",
            title: `Mensalidade vencida`,
            message: `${player.name} possui a mensalidade de ${overdue.month || "um mês anterior"} pendente.`,
            date: overdue.resolvedDueDate,
            dateLabel: `Venceu em ${overdue.resolvedDueDate.split("-").reverse().join("/")}`,
          });
        }
      });

    return alerts.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  }, [data.players, workspaceMode]);
  const academyNotificationSignature = academyNotifications
    .map((notification) => notification.id)
    .join("|");
  const unreadNotifications =
    academyNotificationSignature && readNotificationSignature !== academyNotificationSignature
      ? academyNotifications.length
      : 0;
  const evolutionPlayer =
    managedPlayers.find((player) => player.id === evolutionPlayerId) || managedPlayers[0] || null;
  const evolutionGames = useMemo(() => {
    if (!evolutionPlayer) return [];
    return data.history
      .filter(
        (game) =>
          monthKey(game.finishedAt || game.date) === evolutionMonth &&
          playerWasInMatch(game, evolutionPlayer.id),
      )
      .map((game) => {
        const points = pointsInMatch(game, evolutionPlayer.id);
        const assists =
          sportKind(game.sport) === "football"
            ? (game.events || []).filter(
                (event) => event.type === "goal" && event.assistPlayerId === evolutionPlayer.id,
              ).length
            : 0;
        const performance = playerPerformance(game, evolutionPlayer.id);
        return { game, points, assists, rating: performance.stars, evaluation: performance.score };
      });
  }, [data.history, evolutionMonth, evolutionPlayer]);
  const evolutionPoints = evolutionGames.reduce((sum, item) => sum + item.points, 0);
  const evolutionAssists = evolutionGames.reduce((sum, item) => sum + item.assists, 0);
  const evolutionAverage = evolutionGames.length ? evolutionPoints / evolutionGames.length : 0;
  const trainingMonthSessions = useMemo(
    () =>
      (data.trainingHistory || []).filter(
        (training) => monthKey(training.finishedAt) === trainingStatsMonth,
      ),
    [data.trainingHistory, trainingStatsMonth],
  );
  const trainingCompletedExercises = trainingMonthSessions
    .flatMap((training) => training.exercises || [])
    .filter((exercise) => exercise.completed || exercise.completedAt);
  const trainingTimeSeconds = trainingCompletedExercises
    .filter((exercise) => exercise.mode === "time")
    .reduce((sum, exercise) => sum + exerciseSeconds(exercise), 0);
  const trainingRepetitions = trainingCompletedExercises
    .filter((exercise) => exercise.mode === "reps")
    .reduce((sum, exercise) => sum + (Number(exercise.target) || 0), 0);
  const trainingPlanRanking = useMemo(() => {
    const totals = new Map();
    trainingMonthSessions.forEach((training) =>
      totals.set(training.name, (totals.get(training.name) || 0) + 1),
    );
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [trainingMonthSessions]);
  const completedTrainingExercises =
    activeTraining?.exercises.filter((exercise) => exercise.completed).length || 0;
  const activeTrainingProgress = activeTraining?.exercises.length
    ? (completedTrainingExercises / activeTraining.exercises.length) * 100
    : 0;
  const publicPageUrl = publicConfig.page
    ? `${appBaseUrl}?publico=${publicConfig.page.slug}` +
      `&esporte=${encodeURIComponent(statsSport)}`
    : "";

  // Fecha menus flutuantes ao clicar fora ou pressionar Esc.
  useEffect(() => {
    const closeMenu = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target))
        setProfileMenuOpen(false);
      if (appMenuRef.current && !appMenuRef.current.contains(event.target)) setAppMenuOpen(false);
      if (notificationsRef.current && !notificationsRef.current.contains(event.target))
        setNotificationsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setAppMenuOpen(false);
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (!ready || workspaceMode !== "academy" || academyNotifications.length === 0) {
      setNotificationWelcomeOpen(false);
      return;
    }
    const today = new Date().toLocaleDateString("en-CA");
    const signature = `${today}:${academyNotifications.map((notification) => notification.id).join("|")}`;
    const storageKey = `resenha:academy-alerts:${activeGroupId}`;
    if (localStorage.getItem(storageKey) !== signature) {
      setNotificationWelcomeOpen(true);
      localStorage.setItem(storageKey, signature);
    }
  }, [academyNotifications, activeGroupId, ready, workspaceMode]);

  useEffect(() => {
    if (workspaceMode !== "academy") {
      setReadNotificationSignature("");
      return;
    }
    setReadNotificationSignature(
      localStorage.getItem(`resenha:academy-alerts-read:${activeGroupId}`) || "",
    );
  }, [academyNotificationSignature, activeGroupId, workspaceMode]);

  const markAcademyNotificationsAsRead = () => {
    setReadNotificationSignature(academyNotificationSignature);
    localStorage.setItem(
      `resenha:academy-alerts-read:${activeGroupId}`,
      academyNotificationSignature,
    );
  };

  // Mantém as seleções e a paginação válidas quando os jogadores mudam.
  useEffect(() => {
    if (!evolutionPlayerId && managedPlayers[0]) setEvolutionPlayerId(managedPlayers[0].id);
    else if (evolutionPlayerId && !managedPlayers.some((player) => player.id === evolutionPlayerId))
      setEvolutionPlayerId(managedPlayers[0]?.id || "");
  }, [evolutionPlayerId, managedPlayers]);

  useEffect(() => {
    if (playerPage > playerPageCount) setPlayerPage(playerPageCount);
  }, [playerPage, playerPageCount]);

  // Salva uma cópia local imediatamente; a nuvem é atualizada em segundo plano.
  useEffect(() => {
    if (ready && session?.user) {
      const cached = safeLocalStorageSet(
        userStorageKey(session.user.id, activeGroupId),
        JSON.stringify(data),
      );
      dataRef.current = data;
      dirtyRef.current = true;
      if (!cached) setSyncStatus("error");
    }
  }, [data, ready, session?.user?.id, activeGroupId]);

  // Aplica e guarda o tema escolhido.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    safeLocalStorageSet(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const requestedSport = canonicalSport(data.settings.sport);
    setStatsSport(
      Object.hasOwn(SPORT_PRESETS, requestedSport) ? requestedSport : initialState.settings.sport,
    );
  }, [data.settings.sport]);

  useEffect(() => {
    const academySports = ["Futebol", "Futebol Society", "Futebol de Salão"];
    if (workspaceMode === "academy" && !academySports.includes(canonicalSport(data.settings.sport)))
      changeSport("Futebol de Salão");
  }, [workspaceMode, data.settings.sport]);

  // Observa login, logout e links de recuperação de senha do Supabase.
  useEffect(() => {
    if (!supabaseConfigured) {
      setAuthReady(true);
      return undefined;
    }
    supabase.auth
      .getSession()
      .then(({ data: authData }) => setSession(authData.session))
      .catch(() => setAuthMessage("Não foi possível verificar a sessão. Confira a conexão."))
      .finally(() => setAuthReady(true));
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
        setAuthMessage("");
      }
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Lista os espaços esportivos da conta e restaura o último grupo usado.
  useEffect(() => {
    if (!authReady || !session?.user || !supabaseConfigured) {
      setGroupsReady(false);
      return;
    }
    let cancelled = false;
    setReady(false);
    setGroupLoadError("");
    Promise.race([
      listGroups(session.user.id),
      new Promise((_, reject) =>
        window.setTimeout(() => reject(new Error("O banco demorou demais para responder.")), 15000),
      ),
    ])
      .then((items) => {
        if (cancelled) return;
        const remembered = localStorage.getItem(`${ACTIVE_GROUP_PREFIX}:${session.user.id}`);
        const selected = items.some((item) => item.id === remembered)
          ? remembered
          : items[0]?.id || DEFAULT_GROUP_ID;
        const selectedGroup = items.find((item) => item.id === selected);
        setGroups(items);
        setActiveGroupId(selected);
        setWorkspaceMode(selectedGroup?.management_mode || "amateur");
        setGroupsReady(true);
        setGroupLoadError("");
      })
      .catch((error) => {
        if (cancelled) return;
        const detail = String(error?.message || "Erro desconhecido");
        setGroupsReady(false);
        setGroupLoadError(
          detail.includes("user_groups") || detail.includes("schema cache")
            ? "A atualização do banco ainda não foi aplicada. Execute o novo supabase/schema.sql completo no SQL Editor."
            : `Não foi possível abrir os grupos: ${detail}`,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, session?.user?.id, groupLoadAttempt]);

  // Carrega primeiro a cópia local e migra dados das versões antigas apenas uma vez.
  useEffect(() => {
    if (!authReady || !session?.user || !groupsReady) {
      setReady(false);
      cloudLoadedUser.current = null;
      return;
    }
    const key = userStorageKey(session.user.id, activeGroupId);
    let saved = readSaved(key);
    if (activeGroupId === DEFAULT_GROUP_ID && !hasSavedContent(saved)) {
      const previousCache = readSaved(legacyUserStorageKey(session.user.id));
      if (hasSavedContent(previousCache)) saved = previousCache;
    }
    const migrationOwner = localStorage.getItem(MIGRATION_OWNER_KEY);
    if (!hasSavedContent(saved) && !migrationOwner) {
      const legacy = readSaved(LEGACY_STORAGE_KEY);
      if (hasSavedContent(legacy)) {
        saved = legacy;
        localStorage.setItem(MIGRATION_OWNER_KEY, session.user.id);
      }
    }
    if (saved.players.some((player) => !normalizeCareer(player.career))) {
      saved = { ...saved, players: rebuildPlayerCareers(saved.players, saved.history) };
    }
    setData(saved);
    dataRef.current = saved;
    const requestedView = viewAfterGroupSwitchRef.current;
    setView(requestedView || (saved.activeMatch ? "match" : "setup"));
    viewAfterGroupSwitchRef.current = null;
    setReady(true);
  }, [authReady, session?.user?.id, groupsReady, activeGroupId]);

  // Atualiza o estado local com os dados protegidos e paginados da nuvem.
  useEffect(() => {
    if (!ready || !session?.user || !supabaseConfigured) {
      cloudLoadedUser.current = null;
      return undefined;
    }
    let cancelled = false;
    const loadCloud = async () => {
      setSyncStatus("loading");
      try {
        const loaded = await loadWorkspace(session.user.id, activeGroupId, initialState);
        if (cancelled) return;
        let cloudData = normalizeState(loaded.state);
        if (cloudData.players.some((player) => !normalizeCareer(player.career))) {
          const completeHistory = await loadAllHistory(session.user.id, activeGroupId);
          cloudData = {
            ...cloudData,
            players: rebuildPlayerCareers(cloudData.players, completeHistory),
          };
          await saveWorkspace(session.user.id, activeGroupId, cloudData);
        }
        setData(cloudData);
        dataRef.current = cloudData;
        setHistoryHasMore(loaded.hasMore);
        dirtyRef.current = false;
        cloudLoadedUser.current = cloudWorkspaceKey;
        setSyncStatus("synced");
      } catch (error) {
        if (cancelled) return;
        setSyncStatus("error");
        setAuthMessage(
          `Não foi possível carregar a nuvem. Execute o novo schema.sql: ${error.message}`,
        );
      }
    };
    loadCloud();
    return () => {
      cancelled = true;
    };
  }, [ready, session?.user?.id, activeGroupId, cloudWorkspaceKey]);

  // O serviço compara impressões digitais para enviar somente o que mudou.
  const syncNow = useCallback(async () => {
    if (
      !supabaseConfigured ||
      !session?.user ||
      syncingRef.current ||
      cloudLoadedUser.current !== cloudWorkspaceKey
    )
      return;
    syncingRef.current = true;
    setSyncStatus("syncing");
    try {
      await saveWorkspace(session.user.id, activeGroupId, dataRef.current);
      dirtyRef.current = false;
      setSyncStatus("synced");
    } catch (error) {
      setSyncStatus("error");
      setAuthMessage(`Falha ao sincronizar: ${error.message}`);
    }
    syncingRef.current = false;
  }, [session?.user?.id, activeGroupId, cloudWorkspaceKey]);

  // Sincroniza periodicamente sem fazer requisições quando não há alterações.
  useEffect(() => {
    if (!session?.user || !supabaseConfigured) return undefined;
    const interval = window.setInterval(() => {
      if (dirtyRef.current) syncNow();
    }, 3000);
    return () => window.clearInterval(interval);
  }, [session?.user?.id, syncNow]);

  // No celular, sinaliza perda de rede e tenta enviar alterações assim que a conexão retornar.
  useEffect(() => {
    const handleOffline = () => setSyncStatus("offline");
    const handleOnline = () => {
      if (dirtyRef.current) syncNow();
      else if (session?.user) setSyncStatus("synced");
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [session?.user?.id, syncNow]);

  // Cronômetro regressivo da partida.
  useEffect(() => {
    if (!data.activeMatch?.running || data.activeMatch.remainingSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setData((current) => {
        if (!current.activeMatch?.running) return current;
        const next = Math.max(0, current.activeMatch.remainingSeconds - 1);
        return {
          ...current,
          activeMatch: { ...current.activeMatch, remainingSeconds: next, running: next > 0 },
        };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [data.activeMatch?.running]);

  // Cronômetro independente do exercício ativo no modo treino.
  useEffect(() => {
    if (!data.activeTraining?.runningExerciseId) return;
    const timer = window.setInterval(() => {
      setData((current) => {
        const training = current.activeTraining;
        if (!training?.runningExerciseId) return current;
        let finished = false;
        const exercises = training.exercises.map((exercise) => {
          if (exercise.id !== training.runningExerciseId) return exercise;
          const remainingSeconds = Math.max(
            0,
            (exercise.remainingSeconds ?? exerciseSeconds(exercise)) - 1,
          );
          if (remainingSeconds === 0) finished = true;
          return { ...exercise, remainingSeconds };
        });
        return {
          ...current,
          activeTraining: {
            ...training,
            exercises,
            runningExerciseId: finished ? null : training.runningExerciseId,
          },
        };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [data.activeTraining?.runningExerciseId]);

  // Cadastro e preparação da resenha.
  const addPlayer = useCallback(
    (rawName = playerName) => {
      const name = String(rawName).trim().slice(0, 60);
      if (!name) return { ok: false, error: "Informe o nome do jogador." };
      if (data.players.some((player) => player.name.toLowerCase() === name.toLowerCase()))
        return { ok: false, error: "Este jogador já está na lista." };
      const player = { id: uid(), name, career: emptyCareer() };
      setData((current) => ({
        ...current,
        players: [...current.players, player],
        settings: {
          ...current.settings,
          attendanceIds: Array.isArray(current.settings.attendanceIds)
            ? [...current.settings.attendanceIds, player.id]
            : current.settings.attendanceIds,
        },
      }));
      setPlayerPage(Math.ceil((data.players.length + 1) / PLAYER_PAGE_SIZE));
      setPlayerName("");
      nameInput.current?.focus();
      return { ok: true, player };
    },
    [data.players, playerName],
  );

  const togglePlayerSuspension = (playerId) => {
    setData((current) => {
      const player = current.players.find((item) => item.id === playerId);
      const suspended = !player?.suspended;
      return {
        ...current,
        players: current.players.map((item) =>
          item.id === playerId ? { ...item, suspended } : item,
        ),
        settings: {
          ...current.settings,
          attendanceIds: suspended
            ? (current.settings.attendanceIds || []).filter((id) => id !== playerId)
            : current.settings.attendanceIds,
        },
      };
    });
  };

  const openPlayerDetails = (player) => {
    setSettingsMessage("");
    setPlayerDetailsTab("student");
    const profile = player.academyProfile || {};
    const currentMonth = new Date().toISOString().slice(0, 7);
    setPlayerDetails({
      playerId: player.id,
      name: player.name || "",
      nickname: profile.nickname || "",
      age: calculateAge(profile.birthDate) || profile.age || "",
      birthDate: profile.birthDate || "",
      category: profile.category || "",
      primaryPosition: profile.primaryPosition || "",
      secondaryPosition: profile.secondaryPosition || "",
      dominantFoot: profile.dominantFoot || "",
      email: profile.email || "",
      // Perfis antigos guardavam a altura em centímetros (ex.: 175).
      // A interface atual sempre apresenta o valor em metros (ex.: 1,75).
      height: (() => {
        const storedHeight = Number(String(profile.height || "").replace(",", "."));
        if (!Number.isFinite(storedHeight) || storedHeight <= 0) return "";
        const heightInMeters = storedHeight > 3 ? storedHeight / 100 : storedHeight;
        return heightInMeters.toFixed(2).replace(".", ",");
      })(),
      weight: profile.weight || "",
      experience: profile.experience || "",
      medicalRestrictions: profile.medicalRestrictions || "",
      allergies: profile.allergies || "",
      bloodType: profile.bloodType || "",
      continuousMedication: profile.continuousMedication || "",
      emergencyName: profile.emergencyName || "",
      emergencyPhone: profile.emergencyPhone || "",
      tuitionType: profile.tuitionType || "paying",
      monthlyFee: profile.monthlyFee ?? "",
      dueDay: profile.dueDay || "",
      paymentHistory: Array.isArray(profile.paymentHistory) ? profile.paymentHistory : [],
      paymentDraft: {
        month: currentMonth,
        dueDate: monthlyDueDate(currentMonth, profile.dueDay),
        paid: false,
        paidAt: "",
      },
    });
  };

  const openNewAcademyPlayer = () => {
    setSettingsMessage("");
    setPlayerDetailsTab("student");
    const currentMonth = new Date().toISOString().slice(0, 7);
    const defaultDueDay = data.settings.academyDueDay || "";
    setPlayerDetails({
      playerId: null,
      name: "",
      nickname: "",
      age: "",
      birthDate: "",
      category: "",
      primaryPosition: "",
      secondaryPosition: "",
      dominantFoot: "",
      email: "",
      height: "",
      weight: "",
      experience: "",
      medicalRestrictions: "",
      allergies: "",
      bloodType: "",
      continuousMedication: "",
      emergencyName: "",
      emergencyPhone: "",
      tuitionType: "paying",
      monthlyFee: data.settings.academyMonthlyFee ?? "",
      dueDay: defaultDueDay,
      paymentHistory: [],
      paymentDraft: {
        month: currentMonth,
        dueDate: monthlyDueDate(currentMonth, defaultDueDay),
        paid: false,
        paidAt: "",
      },
    });
  };

  const savePaymentRecord = () => {
    const draft = playerDetails?.paymentDraft;
    if (!draft?.month) {
      setSettingsMessage("Selecione o mês da mensalidade.");
      return;
    }
    const fullValue = Math.max(0, Number(playerDetails.monthlyFee) || 0);
    const multiplier =
      playerDetails.tuitionType === "scholarship100"
        ? 0
        : playerDetails.tuitionType === "scholarship50"
          ? 0.5
          : 1;
    const record = {
      id: uid(),
      month: draft.month,
      dueDate: draft.dueDate || "",
      amount: Number((fullValue * multiplier).toFixed(2)),
      paid: Boolean(draft.paid) || multiplier === 0,
      paidAt: draft.paid || multiplier === 0 ? draft.paidAt || "" : "",
    };
    setPlayerDetails((current) => ({
      ...current,
      paymentHistory: [
        ...(current.paymentHistory || []).filter((item) => item.month !== record.month),
        record,
      ],
    }));
    setSettingsMessage("Mensalidade registrada na ficha. Salve a ficha para confirmar.");
  };

  const saveAcademyTuitionDefaults = () => {
    const value = String(playerDetails?.monthlyFee ?? "");
    const dueDay = String(playerDetails?.dueDay || "");
    if (!value || Number(value) < 0 || !dueDay || Number(dueDay) < 1 || Number(dueDay) > 31) {
      setSettingsMessage("Informe um valor válido e um dia de vencimento entre 1 e 31.");
      return;
    }
    setData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        academyMonthlyFee: value,
        academyDueDay: dueDay,
      },
    }));
    setSettingsMessage("Valor e vencimento definidos como padrão do Modo Treinador.");
  };

  const removePaymentRecord = (recordId) => {
    setPlayerDetails((current) => ({
      ...current,
      paymentHistory: (current.paymentHistory || []).filter((item) => item.id !== recordId),
    }));
  };

  // Atualiza uma mensalidade diretamente na visão anual, sem recriar os demais meses.
  const updateAnnualPayment = (month, paid, paidAt = null) => {
    setPlayerDetails((current) => {
      if (!current) return current;
      const existing = (current.paymentHistory || []).find((item) => item.month === month);
      const multiplier =
        current.tuitionType === "scholarship100"
          ? 0
          : current.tuitionType === "scholarship50"
            ? 0.5
            : 1;
      const today = new Date().toISOString().slice(0, 10);
      const record = {
        id: existing?.id || uid(),
        month,
        dueDate: existing?.dueDate || monthlyDueDate(month, current.dueDay),
        amount: Number(((Number(current.monthlyFee) || 0) * multiplier).toFixed(2)),
        paid: Boolean(paid),
        paidAt: paid ? (paidAt ?? existing?.paidAt ?? today) || today : "",
      };
      return {
        ...current,
        paymentHistory: [
          ...(current.paymentHistory || []).filter((item) => item.month !== month),
          record,
        ],
      };
    });
    setSettingsMessage("Mensalidade atualizada. Salve a ficha para confirmar.");
  };

  const updateAnnualPaymentDate = (month, paidAt) => updateAnnualPayment(month, true, paidAt);

  const savePlayerDetails = (event) => {
    event.preventDefault();
    if (!playerDetails) return;
    const { playerId, name, paymentDraft: _paymentDraft, ...profileDraft } = playerDetails;
    const safeName = name.trim().slice(0, 60);
    const normalizedEmail = String(profileDraft.email || "")
      .trim()
      .toLowerCase()
      .slice(0, 254);
    const rawHeight = String(profileDraft.height || "")
      .trim()
      .replace(".", ",");
    const heightNumber = Number(rawHeight.replace(",", "."));
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setSettingsMessage("Informe um e-mail válido para o atleta ou responsável.");
      return;
    }
    if (rawHeight && (!Number.isFinite(heightNumber) || heightNumber < 0.5 || heightNumber > 2.5)) {
      setSettingsMessage("Informe a altura em metros, por exemplo: 1,75.");
      return;
    }
    const academyProfile = {
      ...profileDraft,
      email: normalizedEmail,
      height: rawHeight ? heightNumber.toFixed(2).replace(".", ",") : "",
    };
    const original = data.players.find((player) => player.id === playerId);
    if (!safeName) return;
    if (
      data.players.some(
        (player) => player.id !== playerId && player.name.toLowerCase() === safeName.toLowerCase(),
      )
    ) {
      setSettingsMessage("Já existe um jogador com esse nome.");
      return;
    }
    if (!original) {
      const newPlayer = { id: uid(), name: safeName, career: emptyCareer(), academyProfile };
      setData((current) => ({
        ...current,
        players: [...current.players, newPlayer],
        settings: {
          ...current.settings,
          attendanceIds: [...(current.settings.attendanceIds || []), newPlayer.id],
        },
      }));
      setPlayerPage(Math.ceil((data.players.length + 1) / PLAYER_PAGE_SIZE));
      setPlayerDetails(null);
      setSettingsMessage("Aluno cadastrado com sucesso.");
      return;
    }
    setData((current) => ({
      ...current,
      players: current.players.map((player) =>
        player.id === playerId ? { ...player, name: safeName, academyProfile } : player,
      ),
      activeMatch: renamePlayerInMatch(current.activeMatch, playerId, original.name, safeName),
      history: current.history.map((game) =>
        renamePlayerInMatch(game, playerId, original.name, safeName),
      ),
    }));
    setPlayerDetails(null);
    setSettingsMessage("Ficha do jogador atualizada.");
  };

  const startMatch = useCallback(() => {
    setSetupMessage("");
    if (presentPlayers.length < 2) {
      setSetupMessage("Marque pelo menos 2 jogadores presentes.");
      return { ok: false, error: "Marque pelo menos 2 jogadores presentes." };
    }
    const durationSeconds = data.settings.duration * 60;
    const teamCount = Math.max(2, Math.min(TEAM_META.length, Number(data.settings.teamCount) || 2));
    const ratedPlayers = presentPlayers.map(({ academyProfile: _privateProfile, ...player }) => ({
      ...player,
      rating: playerStats.get(player.id)?.rating || 1,
      balanceScore: playerStats.get(player.id)?.balanceScore || 6,
      evaluatedGames: playerStats.get(player.id)?.matches || 0,
      fixedGoalkeeper: (data.settings.fixedGoalkeeperIds || []).includes(player.id),
    }));
    if (ratedPlayers.length < teamCount) {
      setSetupMessage(`Marque pelo menos ${teamCount} jogadores para formar ${teamCount} times.`);
      return { ok: false, error: "Jogadores insuficientes." };
    }
    if (
      data.settings.drawMode === "manual" &&
      ratedPlayers.some(
        (player) =>
          !Number.isInteger(manualAssignments[player.id]) ||
          manualAssignments[player.id] < 0 ||
          manualAssignments[player.id] >= teamCount,
      )
    ) {
      setSetupMessage("Escolha o time de todos os jogadores presentes.");
      return { ok: false, error: "Escolha um time para todos os jogadores presentes." };
    }
    if (
      data.settings.drawMode === "manual" &&
      !Array.from({ length: teamCount }, (_, teamIndex) => teamIndex).every((teamIndex) =>
        ratedPlayers.some((player) => manualAssignments[player.id] === teamIndex),
      )
    ) {
      setSetupMessage("A divisão manual precisa ter pelo menos um jogador em cada time.");
      return { ok: false, error: "Escolha pelo menos um jogador para cada time." };
    }
    if (data.settings.drawMode === "manual") {
      const goalkeeperTeams = ratedPlayers
        .filter((player) => player.fixedGoalkeeper)
        .map((player) => manualAssignments[player.id]);
      if (new Set(goalkeeperTeams).size !== goalkeeperTeams.length) {
        setSetupMessage("Na divisão manual, coloque cada goleiro fixo em um time diferente.");
        return { ok: false, error: "Goleiros fixos no mesmo time." };
      }
    }
    const allTeams = prepareGoalkeepers(
      data.settings.drawMode === "manual"
        ? buildManualTeams(
            ratedPlayers,
            manualAssignments,
            data.settings.startersPerTeam,
            teamCount,
            data.settings.teamNames,
          )
        : drawTeams(ratedPlayers, data.settings.drawMode, data.settings.startersPerTeam, teamCount),
    );
    const match = {
      id: uid(),
      sessionId: uid(),
      roundNumber: 1,
      date: new Date().toISOString(),
      sport: data.settings.sport,
      managementMode: workspaceMode,
      durationSeconds,
      remainingSeconds: durationSeconds,
      running: false,
      attendanceIds: ratedPlayers.map((player) => player.id),
      teams: allTeams.slice(0, 2),
      reserveTeams: allTeams.slice(2),
      sharedBench: Boolean(data.settings.sharedBench),
      initialGoalkeeperIds: allTeams.slice(0, 2).map((team) => team.goalkeeperId),
      score: [0, 0],
      events: [],
    };
    setData((current) => ({ ...current, activeMatch: match }));
    setMatchMessage(
      allTeams.length > 2
        ? `${allTeams.length} times prontos. As equipes aguardam na ordem de entrada.`
        : "Escalação mantida para as próximas partidas desta sessão.",
    );
    setView("match");
    return { ok: true, matchId: match.id };
  }, [data.settings, manualAssignments, playerStats, presentPlayers, workspaceMode]);

  // Cada pontuação vira um evento individual, inclusive para a sincronização incremental.
  const registerGoal = useCallback((teamIndex, playerId, assistPlayerId = "", pointValue = 1) => {
    let result = { ok: false, error: "Jogador não encontrado." };
    setData((current) => {
      const match = current.activeMatch;
      const player = match?.teams[teamIndex]?.starters.find((item) => item.id === playerId);
      const assistPlayer = match?.teams[teamIndex]?.starters.find(
        (item) => item.id === assistPlayerId,
      );
      if (!match || !player) return current;
      const score = [...match.score];
      const scoreValue =
        sportKind(match.sport) === "basketball" && Number(pointValue) === 3 ? 3 : 1;
      score[teamIndex] += scoreValue;
      const event = {
        id: uid(),
        type: "goal",
        teamIndex,
        playerId,
        playerName: player.name,
        assistPlayerId: assistPlayer?.id || null,
        assistPlayerName: assistPlayer?.name || null,
        assistWasGoalkeeper: Boolean(
          assistPlayer?.id && assistPlayer.id === match.teams[teamIndex].goalkeeperId,
        ),
        pointValue: scoreValue,
        minute: minuteOf(match),
        elapsedSeconds: match.durationSeconds - match.remainingSeconds,
        goalkeeperId: match.teams[teamIndex === 0 ? 1 : 0]?.goalkeeperId || null,
      };
      result = { ok: true, player: player.name, score };
      return { ...current, activeMatch: { ...match, score, events: [event, ...match.events] } };
    });
    setGoalTeam(null);
    setGoalScorer("");
    setGoalAssist("");
    setBasketPoints(1);
    return result;
  }, []);

  // Registra penalidades individuais; o gol contra também altera o placar adversário.
  const registerIncident = useCallback((type, teamIndex, playerId) => {
    setData((current) => {
      const match = current.activeMatch;
      const player = match?.teams[teamIndex]?.starters.find((item) => item.id === playerId);
      if (!match || !player || !["own_goal", "missed_penalty"].includes(type)) return current;
      const score = [...match.score];
      if (type === "own_goal") score[teamIndex === 0 ? 1 : 0] += 1;
      const event = {
        id: uid(),
        type,
        teamIndex,
        playerId: player.id,
        playerName: player.name,
        minute: minuteOf(match),
        elapsedSeconds: match.durationSeconds - match.remainingSeconds,
        goalkeeperId: type === "own_goal" ? match.teams[teamIndex]?.goalkeeperId || null : null,
      };
      return { ...current, activeMatch: { ...match, score, events: [event, ...match.events] } };
    });
    setIncident(null);
    setIncidentPlayer("");
  }, []);

  // Integrações opcionais do ambiente não interferem no uso normal pelo navegador.
  useEffect(() => {
    const context = typeof document === "undefined" ? null : document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool) => {
      try {
        Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {});
      } catch {}
    };
    register({
      name: "add_player",
      title: "Adicionar jogador",
      description: "Adiciona um participante à organização selecionada.",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: ({ name }) => addPlayer(name),
    });
    register({
      name: "start_match",
      title: "Sortear times e iniciar jogo",
      description: "Sorteia os dois times e abre a partida.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => startMatch(),
    });
    register({
      name: "record_goal",
      title: "Registrar gol",
      description: "Registra um gol de um titular na partida atual.",
      inputSchema: {
        type: "object",
        properties: { teamIndex: { type: "number", enum: [0, 1] }, playerId: { type: "string" } },
        required: ["teamIndex", "playerId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: ({ teamIndex, playerId }) => registerGoal(teamIndex, playerId),
    });
    return () => lifecycle.abort();
  }, [addPlayer, registerGoal, startMatch]);

  // Configuração, presença, cronômetro e substituições individuais.
  const updateSettings = (field, value) =>
    setData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [field]: value,
        fixedGoalkeeperIds:
          field === "teamCount"
            ? (current.settings.fixedGoalkeeperIds || []).slice(0, Number(value))
            : current.settings.fixedGoalkeeperIds || [],
      },
    }));
  const updateManualTeamName = (teamIndex, value) =>
    setData((current) => {
      const teamNames = [...(current.settings.teamNames || [])];
      teamNames[teamIndex] = String(value || "").slice(0, 30);
      return {
        ...current,
        settings: { ...current.settings, teamNames },
      };
    });
  const changeSport = (sport) => {
    const safeSport = Object.hasOwn(SPORT_PRESETS, sport) ? sport : initialState.settings.sport;
    const preset = SPORT_PRESETS[safeSport];
    setData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        sport: safeSport,
        startersPerTeam: preset.players,
        duration: preset.duration,
      },
    }));
    setStatsSport(safeSport);
  };
  const toggleAttendance = (playerId) =>
    setData((current) => {
      const currentIds = Array.isArray(current.settings.attendanceIds)
        ? current.settings.attendanceIds
        : current.players.map((player) => player.id);
      const attendanceIds = currentIds.includes(playerId)
        ? currentIds.filter((id) => id !== playerId)
        : [...currentIds, playerId];
      return {
        ...current,
        settings: {
          ...current.settings,
          attendanceIds,
          fixedGoalkeeperIds: (current.settings.fixedGoalkeeperIds || []).filter((id) =>
            attendanceIds.includes(id),
          ),
        },
      };
    });
  const setAllAttendance = (present) =>
    setData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        attendanceIds: present ? current.players.map((player) => player.id) : [],
        fixedGoalkeeperIds: present ? current.settings.fixedGoalkeeperIds || [] : [],
      },
    }));
  const toggleFixedGoalkeeper = (playerId) =>
    setData((current) => {
      const ids = current.settings.fixedGoalkeeperIds || [];
      if (ids.includes(playerId))
        return {
          ...current,
          settings: {
            ...current.settings,
            fixedGoalkeeperIds: ids.filter((id) => id !== playerId),
          },
        };
      const limit = Math.max(2, Number(current.settings.teamCount) || 2);
      if (ids.length >= limit) {
        setSetupMessage(`Escolha no máximo ${limit} goleiros fixos, um para cada time.`);
        return current;
      }
      setSetupMessage("");
      return {
        ...current,
        settings: { ...current.settings, fixedGoalkeeperIds: [...ids, playerId] },
      };
    });
  const setFixedGoalkeeperMode = (enabled) => {
    setData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        hasFixedGoalkeepers: enabled,
        fixedGoalkeeperIds: enabled ? current.settings.fixedGoalkeeperIds || [] : [],
      },
    }));
    setGoalkeeperPickerOpen(enabled);
    setSetupMessage("");
  };
  const toggleTimer = () =>
    setData((current) =>
      !current.activeMatch || current.activeMatch.remainingSeconds === 0
        ? current
        : {
            ...current,
            activeMatch: { ...current.activeMatch, running: !current.activeMatch.running },
          },
    );
  const resetTimer = () =>
    setData((current) => ({
      ...current,
      activeMatch: current.activeMatch
        ? {
            ...current.activeMatch,
            remainingSeconds: current.activeMatch.durationSeconds,
            running: false,
          }
        : null,
    }));

  const openSubstitution = (teamIndex, playerOutId = "") => {
    const match = data.activeMatch;
    const team = match?.teams[teamIndex];
    const availableBench = substitutionBench(match, teamIndex);
    setSubTeam(teamIndex);
    setSelectedOut(playerOutId || team?.starters[0]?.id || "");
    setSelectedIn(
      availableBench[0]?.id ||
        team?.starters.find((player) => player.id !== (playerOutId || team?.starters[0]?.id))?.id ||
        "",
    );
  };

  const confirmSubstitution = () => {
    setData((current) => {
      const match = current.activeMatch;
      if (!match || subTeam === null || !selectedOut || !selectedIn) return current;
      const out = match.teams[subTeam].starters.find((player) => player.id === selectedOut);
      const fieldCandidate = match.teams[subTeam].starters.find(
        (player) => player.id === selectedIn && player.id !== selectedOut,
      );
      const incomingOption = substitutionBench(match, subTeam).find(
        (player) => player.id === selectedIn,
      );
      if (!out || (!incomingOption && !fieldCandidate)) return current;

      // Dois atletas que já estão em campo apenas trocam de função. Se um deles ocupa o gol,
      // transfere a função de goleiro e preserva a escalação completa.
      if (fieldCandidate) {
        const teams = match.teams.map((team) => ({
          ...team,
          starters: [...team.starters],
          bench: [...team.bench],
        }));
        const currentGoalkeeperId = teams[subTeam].goalkeeperId;
        let nextGoalkeeperId = currentGoalkeeperId;
        if (currentGoalkeeperId === out.id) nextGoalkeeperId = fieldCandidate.id;
        else if (currentGoalkeeperId === fieldCandidate.id) nextGoalkeeperId = out.id;
        teams[subTeam].goalkeeperId = nextGoalkeeperId;
        const elapsedSeconds = match.durationSeconds - match.remainingSeconds;
        const positionEvent = {
          id: uid(),
          type: "position_change",
          teamIndex: subTeam,
          playerOutId: out.id,
          playerOut: out.name,
          playerInId: fieldCandidate.id,
          playerIn: fieldCandidate.name,
          minute: minuteOf(match),
          elapsedSeconds,
        };
        const goalkeeperEvent =
          nextGoalkeeperId !== currentGoalkeeperId
            ? {
                ...positionEvent,
                id: uid(),
                type: "goalkeeper_change",
                playerOutId: currentGoalkeeperId,
                playerOut: match.teams[subTeam].starters.find(
                  (player) => player.id === currentGoalkeeperId,
                )?.name,
                playerInId: nextGoalkeeperId,
                playerIn: match.teams[subTeam].starters.find(
                  (player) => player.id === nextGoalkeeperId,
                )?.name,
              }
            : null;
        return {
          ...current,
          activeMatch: {
            ...match,
            teams,
            events: [positionEvent, ...(goalkeeperEvent ? [goalkeeperEvent] : []), ...match.events],
          },
        };
      }
      const { sourceTeamIndex, ...incoming } = incomingOption;
      const teams = match.teams.map((team) => ({
        ...team,
        starters: [...team.starters],
        bench: [...team.bench],
      }));
      teams[sourceTeamIndex].bench = teams[sourceTeamIndex].bench.filter(
        (player) => player.id !== selectedIn,
      );
      teams[subTeam].starters = teams[subTeam].starters.map((player) =>
        player.id === selectedOut ? incoming : player,
      );
      teams[subTeam].bench.push(out);
      if (teams[subTeam].goalkeeperId === selectedOut) teams[subTeam].goalkeeperId = incoming.id;
      const event = {
        id: uid(),
        type: "sub",
        teamIndex: subTeam,
        playerOut: out.name,
        playerIn: incoming.name,
        minute: minuteOf(match),
        elapsedSeconds: match.durationSeconds - match.remainingSeconds,
      };
      const goalkeeperEvent =
        match.teams[subTeam].goalkeeperId === selectedOut
          ? {
              id: uid(),
              type: "goalkeeper_change",
              teamIndex: subTeam,
              playerOutId: out.id,
              playerOut: out.name,
              playerInId: incoming.id,
              playerIn: incoming.name,
              minute: minuteOf(match),
              elapsedSeconds: match.durationSeconds - match.remainingSeconds,
            }
          : null;
      return {
        ...current,
        activeMatch: {
          ...match,
          teams,
          events: [event, ...(goalkeeperEvent ? [goalkeeperEvent] : []), ...match.events],
        },
      };
    });
    setSubTeam(null);
  };

  const openGoalkeeperChange = (teamIndex) => {
    const match = data.activeMatch;
    const team = match?.teams[teamIndex];
    const availableBench = substitutionBench(match, teamIndex);
    setGoalkeeperTeam(teamIndex);
    setGoalkeeperCandidate(
      [...(team?.starters || []), ...availableBench].find(
        (player) => player.id !== team?.goalkeeperId,
      )?.id || "",
    );
  };

  // Troca o goleiro com um atleta da linha ou coloca um reserva diretamente em jogo.
  const confirmGoalkeeperChange = () => {
    setData((current) => {
      const match = current.activeMatch;
      if (!match || goalkeeperTeam === null || !goalkeeperCandidate) return current;
      const team = match.teams[goalkeeperTeam];
      const currentGoalkeeper = team.starters.find((player) => player.id === team.goalkeeperId);
      const lineCandidate = team.starters.find((player) => player.id === goalkeeperCandidate);
      const benchCandidate = substitutionBench(match, goalkeeperTeam).find(
        (player) => player.id === goalkeeperCandidate,
      );
      if (!currentGoalkeeper || (!lineCandidate && !benchCandidate)) return current;
      const candidateOption = lineCandidate || benchCandidate;
      const { sourceTeamIndex: candidateSourceTeam, ...candidate } = candidateOption;
      if (candidate.id === currentGoalkeeper.id) return current;
      const teams = match.teams.map((item) => ({
        ...item,
        starters: [...item.starters],
        bench: [...item.bench],
      }));
      if (benchCandidate) {
        teams[candidateSourceTeam].bench = teams[candidateSourceTeam].bench.filter(
          (player) => player.id !== candidate.id,
        );
        teams[goalkeeperTeam].starters = teams[goalkeeperTeam].starters.map((player) =>
          player.id === currentGoalkeeper.id ? candidate : player,
        );
        teams[goalkeeperTeam].bench.push(currentGoalkeeper);
      }
      teams[goalkeeperTeam].goalkeeperId = candidate.id;
      const event = {
        id: uid(),
        type: "goalkeeper_change",
        teamIndex: goalkeeperTeam,
        playerOutId: currentGoalkeeper.id,
        playerOut: currentGoalkeeper.name,
        playerInId: candidate.id,
        playerIn: candidate.name,
        minute: minuteOf(match),
        elapsedSeconds: match.durationSeconds - match.remainingSeconds,
      };
      return { ...current, activeMatch: { ...match, teams, events: [event, ...match.events] } };
    });
    setGoalkeeperTeam(null);
    setGoalkeeperCandidate("");
  };

  const registerGoalkeeperAction = (teamIndex, type) =>
    setData((current) => {
      const match = current.activeMatch;
      const team = match?.teams[teamIndex];
      const goalkeeper = team?.starters.find((player) => player.id === team.goalkeeperId);
      if (!match || !goalkeeper) return current;
      const event = {
        id: uid(),
        type,
        teamIndex,
        playerId: goalkeeper.id,
        playerName: goalkeeper.name,
        minute: minuteOf(match),
        elapsedSeconds: match.durationSeconds - match.remainingSeconds,
      };
      return { ...current, activeMatch: { ...match, events: [event, ...match.events] } };
    });

  // Mantém apenas um destaque por partida e registra a escolha junto dos demais lances.
  const registerMatchHighlight = (teamIndex, playerId) =>
    setData((current) => {
      const match = current.activeMatch;
      const player = match?.teams[teamIndex]?.starters.find((item) => item.id === playerId);
      if (!match || !player) return current;
      const event = {
        id: uid(),
        type: "match_highlight",
        teamIndex,
        playerId: player.id,
        playerName: player.name,
        minute: minuteOf(match),
        elapsedSeconds: match.durationSeconds - match.remainingSeconds,
      };
      return {
        ...current,
        activeMatch: {
          ...match,
          events: [event, ...match.events.filter((item) => item.type !== "match_highlight")],
        },
      };
    });

  const undoMatchEvent = (eventId) =>
    setData((current) => {
      const match = current.activeMatch;
      const event = match?.events.find((item) => item.id === eventId);
      if (!match || !event) return current;
      const score = [...match.score];
      if (event.type === "goal")
        score[event.teamIndex] = Math.max(
          0,
          score[event.teamIndex] - Number(event.pointValue || 1),
        );
      if (event.type === "own_goal") {
        const benefitedTeam = event.teamIndex === 0 ? 1 : 0;
        score[benefitedTeam] = Math.max(0, score[benefitedTeam] - 1);
      }
      return {
        ...current,
        activeMatch: {
          ...match,
          score,
          events: match.events.filter((item) => item.id !== eventId),
        },
      };
    });

  // Salva a rodada e abre a próxima sem apagar escalação, banco ou times de fora.
  const finishMatch = () => {
    if (!data.activeMatch || finishingRef.current) return;
    finishingRef.current = true;
    const finished = { ...data.activeMatch, running: false, finishedAt: new Date().toISOString() };
    const nextMatch = {
      ...data.activeMatch,
      id: uid(),
      roundNumber: (data.activeMatch.roundNumber || 1) + 1,
      date: new Date().toISOString(),
      remainingSeconds: data.activeMatch.durationSeconds,
      running: false,
      score: [0, 0],
      events: [],
      initialGoalkeeperIds: data.activeMatch.teams.map((team) => team.goalkeeperId),
    };
    setData((current) => ({
      ...current,
      players: applyMatchToCareers(current.players, finished, 1),
      history: [finished, ...current.history],
      activeMatch: nextMatch,
    }));
    setMatchMessage(
      `Partida ${finished.roundNumber || 1} salva. A escalação foi mantida; faça as próximas trocas manualmente.`,
    );
    setView("match");
    window.setTimeout(() => {
      finishingRef.current = false;
    }, 600);
  };

  // O time substituído retorna para a fila na posição do time que entrou.
  const swapFullTeam = (reserveId) => {
    setData((current) => {
      const match = current.activeMatch;
      if (!match || teamSwapSide === null) return current;
      const reserveIndex = (match.reserveTeams || []).findIndex((team) => team.id === reserveId);
      if (reserveIndex < 0) return current;
      const teams = [...match.teams];
      const reserveTeams = [...match.reserveTeams];
      const outgoing = teams[teamSwapSide];
      teams[teamSwapSide] = reserveTeams[reserveIndex];
      reserveTeams[reserveIndex] = outgoing;
      return {
        ...current,
        activeMatch: {
          ...match,
          teams,
          reserveTeams,
          initialGoalkeeperIds: teams.map((team) => team.goalkeeperId),
        },
      };
    });
    setMatchMessage("Time completo trocado. A fila de times de fora foi atualizada.");
    setTeamSwapSide(null);
  };

  // Salva a partida em andamento, quando houve jogo, e encerra a sessão atual.
  const endSession = () => {
    if (!data.activeMatch || finishingRef.current) return;
    const played =
      data.activeMatch.events.length > 0 ||
      data.activeMatch.score.some((value) => value > 0) ||
      data.activeMatch.remainingSeconds < data.activeMatch.durationSeconds;
    const message = played
      ? "Salvar esta partida e encerrar a sessão de hoje?"
      : "Encerrar a sessão? Esta partida vazia não será salva.";
    if (!window.confirm(message)) return;
    finishingRef.current = true;
    setData((current) => {
      const activeMatch = current.activeMatch;
      if (!activeMatch) return current;
      if (!played) return { ...current, activeMatch: null };
      const finished = { ...activeMatch, running: false, finishedAt: new Date().toISOString() };
      return {
        ...current,
        players: applyMatchToCareers(current.players, finished, 1),
        history: [finished, ...current.history],
        activeMatch: null,
      };
    });
    setMatchMessage("");
    setView("setup");
    window.setTimeout(() => {
      finishingRef.current = false;
    }, 600);
  };

  // Criação, execução e histórico dos treinos pessoais.
  const addTrainingExercise = () => {
    const name = exerciseDraft.name.trim();
    const target = Math.max(1, Number(exerciseDraft.target) || 1);
    if (!name) return;
    setTrainingExercises((current) => [
      ...current,
      {
        id: uid(),
        name,
        mode: exerciseDraft.mode,
        target,
        unit: exerciseDraft.mode === "time" ? exerciseDraft.unit : null,
      },
    ]);
    setExerciseDraft({
      name: "",
      mode: exerciseDraft.mode,
      target: exerciseDraft.mode === "time" ? 30 : 10,
      unit: exerciseDraft.unit,
    });
  };

  const saveTrainingPlan = (event) => {
    event.preventDefault();
    const name = trainingName.trim();
    if (!name || trainingExercises.length === 0) {
      setSettingsMessage("Dê um nome ao treino e adicione pelo menos um exercício.");
      return;
    }
    const plan = {
      id: uid(),
      name,
      days: trainingDays,
      exercises: trainingExercises,
      createdAt: new Date().toISOString(),
    };
    setData((current) => ({ ...current, trainingPlans: [...(current.trainingPlans || []), plan] }));
    setTrainingName("");
    setTrainingDays([]);
    setTrainingExercises([]);
    setSettingsMessage("Treino salvo no cronograma.");
  };

  const startTraining = (plan) => {
    const exercises = plan.exercises.map((exercise) => ({
      ...exercise,
      completed: false,
      remainingSeconds: exerciseSeconds(exercise),
    }));
    setData((current) => ({
      ...current,
      activeTraining: {
        id: uid(),
        planId: plan.id,
        name: plan.name,
        exercises,
        runningExerciseId: null,
        startedAt: new Date().toISOString(),
      },
    }));
    setView("training");
  };

  const toggleTrainingExerciseDone = (exerciseId) =>
    setData((current) => {
      if (!current.activeTraining) return current;
      const exercises = current.activeTraining.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              completed: !exercise.completed,
              completedAt: !exercise.completed ? new Date().toISOString() : null,
            }
          : exercise,
      );
      return {
        ...current,
        activeTraining: {
          ...current.activeTraining,
          exercises,
          runningExerciseId:
            current.activeTraining.runningExerciseId === exerciseId
              ? null
              : current.activeTraining.runningExerciseId,
        },
      };
    });
  const toggleTrainingTimer = (exerciseId) =>
    setData((current) => {
      const training = current.activeTraining;
      const exercise = training?.exercises.find((item) => item.id === exerciseId);
      if (!training || !exercise || exercise.completed || (exercise.remainingSeconds ?? 0) <= 0)
        return current;
      return {
        ...current,
        activeTraining: {
          ...training,
          runningExerciseId: training.runningExerciseId === exerciseId ? null : exerciseId,
        },
      };
    });
  const resetTrainingTimer = (exerciseId) =>
    setData((current) => {
      if (!current.activeTraining) return current;
      const exercises = current.activeTraining.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, remainingSeconds: exerciseSeconds(exercise) }
          : exercise,
      );
      return {
        ...current,
        activeTraining: {
          ...current.activeTraining,
          exercises,
          runningExerciseId:
            current.activeTraining.runningExerciseId === exerciseId
              ? null
              : current.activeTraining.runningExerciseId,
        },
      };
    });
  const finishTraining = () =>
    setData((current) => {
      const training = current.activeTraining;
      if (!training) return current;
      const finished = {
        id: training.id,
        planId: training.planId,
        name: training.name,
        startedAt: training.startedAt,
        finishedAt: new Date().toISOString(),
        exercises: training.exercises,
      };
      return {
        ...current,
        activeTraining: null,
        trainingHistory: [finished, ...(current.trainingHistory || [])],
      };
    });
  const cancelTraining = () => {
    if (!window.confirm("Encerrar este treino sem registrar os exercícios restantes?")) return;
    setData((current) => ({ ...current, activeTraining: null }));
  };
  const deleteTrainingPlan = (planId) => {
    if (!window.confirm("Excluir este treino do cronograma? O histórico realizado será mantido."))
      return;
    setData((current) => ({
      ...current,
      trainingPlans: (current.trainingPlans || []).filter((plan) => plan.id !== planId),
    }));
  };

  // As três visões usam a mesma nota: partida, média do mês e carreira da modalidade.
  const sportMatches = useMemo(
    () =>
      data.history.filter((match) => canonicalSport(match.sport) === canonicalSport(statsSport)),
    [data.history, statsSport],
  );
  const monthMatches = useMemo(
    () => sportMatches.filter((match) => monthKey(match.finishedAt || match.date) === month),
    [sportMatches, month],
  );
  const rankingData = useMemo(() => {
    const players = new Map();
    monthMatches.forEach((match) => {
      const roster = [
        ...new Map(
          [...(match.teams || []), ...(match.reserveTeams || [])]
            .flatMap((team) => [...(team.starters || []), ...(team.bench || [])])
            .map((player) => [player.id, player]),
        ).values(),
      ];
      roster.forEach((player) => {
        const item = players.get(player.id) || {
          id: player.id,
          name: player.name,
          goals: 0,
          assists: 0,
          saves: 0,
          goalkeeperAppearances: 0,
          goalkeeperEvaluationTotal: 0,
          games: 0,
          evaluationTotal: 0,
        };
        const performance = playerPerformance(match, player.id);
        item.games += 1;
        item.goals += performance.points;
        item.assists += performance.assists;
        item.saves += performance.goalkeeper.saves;
        if (performance.goalkeeper.seconds > 0) {
          item.goalkeeperAppearances += 1;
          item.goalkeeperEvaluationTotal += performance.goalkeeper.score;
        }
        item.evaluationTotal += performance.score;
        players.set(player.id, item);
      });
    });
    return [...players.values()]
      .filter((player) => !suspendedPlayerIds.has(player.id))
      .map((player) => {
        const evaluation = player.games
          ? Number((player.evaluationTotal / player.games).toFixed(1))
          : 0;
        return {
          ...player,
          total:
            sportKind(statsSport) === "football" ? player.goals + player.assists : player.goals,
          saveAverage: player.goalkeeperAppearances
            ? player.saves / player.goalkeeperAppearances
            : 0,
          goalkeeperEvaluation: player.goalkeeperAppearances
            ? Number((player.goalkeeperEvaluationTotal / player.goalkeeperAppearances).toFixed(1))
            : 0,
          evaluation,
          stars: starsFromScore(evaluation, player.games),
        };
      });
  }, [monthMatches, suspendedPlayerIds]);
  const monthlyRanking = useMemo(
    () =>
      [...rankingData].sort(
        (a, b) =>
          b.evaluation - a.evaluation ||
          b.total - a.total ||
          b.goals - a.goals ||
          a.name.localeCompare(b.name),
      ),
    [rankingData],
  );
  const overallRanking = useMemo(() => {
    const sport = canonicalSport(statsSport);
    return activePlayers
      .map((player) => {
        const career = normalizeCareer(player.career)?.sports?.[sport];
        if (!career?.games) return null;
        return {
          id: player.id,
          name: player.name,
          goals: career.points,
          assists: career.assists,
          saves: career.goalkeeperSaves,
          goalkeeperAppearances: career.goalkeeperAppearances || 0,
          goalkeeperEvaluation: Number((career.goalkeeperEvaluationAverage || 0).toFixed(1)),
          saveAverage: career.goalkeeperAppearances
            ? career.goalkeeperSaves / career.goalkeeperAppearances
            : 0,
          games: career.games,
          total:
            sportKind(statsSport) === "football" ? career.points + career.assists : career.points,
          evaluation: Number(career.evaluationAverage.toFixed(1)),
          stars: career.stars,
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.evaluation - a.evaluation ||
          b.total - a.total ||
          b.saves - a.saves ||
          a.name.localeCompare(b.name),
      );
  }, [activePlayers, statsSport]);
  const selectedRankingMatch = useMemo(
    () => sportMatches.find((match) => match.id === rankingMatchId) || sportMatches[0] || null,
    [sportMatches, rankingMatchId],
  );
  const matchRanking = useMemo(() => {
    if (!selectedRankingMatch) return [];
    const roster = [
      ...new Map(
        [...(selectedRankingMatch.teams || []), ...(selectedRankingMatch.reserveTeams || [])]
          .flatMap((team) => [...(team.starters || []), ...(team.bench || [])])
          .map((player) => [player.id, player]),
      ).values(),
    ];
    return roster
      .filter((player) => !suspendedPlayerIds.has(player.id))
      .map((player) => {
        const performance = playerPerformance(selectedRankingMatch, player.id);
        return {
          id: player.id,
          name: player.name,
          goals: performance.points,
          assists: performance.assists,
          saves: performance.goalkeeper.saves,
          goalkeeperAppearances: performance.goalkeeper.seconds > 0 ? 1 : 0,
          goalkeeperEvaluation: performance.goalkeeper.score,
          saveAverage: performance.goalkeeper.saves,
          games: 1,
          total:
            sportKind(statsSport) === "football"
              ? performance.points + performance.assists
              : performance.points,
          evaluation: performance.score,
          stars: performance.stars,
        };
      })
      .sort(
        (a, b) =>
          b.evaluation - a.evaluation ||
          b.total - a.total ||
          b.saves - a.saves ||
          a.name.localeCompare(b.name),
      );
  }, [selectedRankingMatch, suspendedPlayerIds]);
  const displayedRanking =
    rankingScope === "match"
      ? matchRanking
      : rankingScope === "month"
        ? monthlyRanking
        : overallRanking;
  const displayedGoalkeeperRanking = [...displayedRanking]
    .filter((player) => player.goalkeeperAppearances > 0)
    .sort(
      (a, b) =>
        b.goalkeeperEvaluation - a.goalkeeperEvaluation ||
        b.saves - a.saves ||
        a.name.localeCompare(b.name),
    );
  const displayedRoleRanking =
    sportKind(statsSport) === "football" && rankingRole === "goalkeeper"
      ? displayedGoalkeeperRanking
      : displayedRanking;
  const goalsRanking = useMemo(
    () =>
      [...rankingData]
        .filter((player) => player.goals > 0)
        .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name)),
    [rankingData],
  );
  const assistsRanking = useMemo(
    () =>
      [...rankingData]
        .filter((player) => player.assists > 0)
        .sort((a, b) => b.assists - a.assists || a.name.localeCompare(b.name)),
    [rankingData],
  );

  // Autenticação e recuperação de acesso.
  const submitAuth = async (event) => {
    event.preventDefault();
    if (!supabaseConfigured || authSubmittingRef.current) return;
    authSubmittingRef.current = true;
    setAuthBusy(true);
    setAuthMessage("");
    try {
      if (!navigator.onLine) throw new Error("offline");
      const credentials = { email: normalizeEmail(authEmail), password: authPassword };
      if (!credentials.email) {
        setAuthMessage("Informe um e-mail válido.");
        return;
      }
      if (authMode === "signup") {
        const issue = passwordIssue(authPassword);
        if (issue) {
          setAuthMessage(issue);
          return;
        }
        if (authPassword !== authPasswordConfirm) {
          setAuthMessage("As senhas digitadas não são iguais.");
          return;
        }
      }
      const result =
        authMode === "signup"
          ? await supabase.auth.signUp({
              ...credentials,
              options: { emailRedirectTo: appBaseUrl },
            })
          : await supabase.auth.signInWithPassword(credentials);
      if (result.error) {
        setAuthMessage(friendlyAuthError(result.error, "Não foi possível acessar a conta."));
        return;
      }
      setAuthPassword("");
      setAuthPasswordConfirm("");
      if (authMode === "signup" && !result.data.session) {
        setAuthMessage("Cadastro criado. Confirme o e-mail recebido e depois entre na conta.");
      } else {
        setAuthMessage("Conta conectada. Os dados estão sendo sincronizados.");
      }
    } catch (error) {
      setAuthMessage(
        error?.message === "offline"
          ? "Sem conexão com a internet. Verifique a rede e tente novamente."
          : "Não foi possível conectar. Verifique a internet e tente novamente.",
      );
    } finally {
      setAuthBusy(false);
      authSubmittingRef.current = false;
    }
  };

  const sendPasswordReset = async () => {
    const email = normalizeEmail(authEmail);
    if (!email) {
      setAuthMessage("Digite seu e-mail para receber o link de recuperação.");
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    try {
      if (!navigator.onLine) throw new Error("offline");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: appBaseUrl,
      });
      setAuthMessage(
        error
          ? friendlyAuthError(error, "Não foi possível enviar o e-mail agora.")
          : "Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.",
      );
    } catch {
      setAuthMessage("Sem conexão com a internet. Tente novamente quando a rede voltar.");
    } finally {
      setAuthBusy(false);
    }
  };

  const submitRecoveryPassword = async (event) => {
    event.preventDefault();
    const issue = passwordIssue(recoveryPassword);
    if (issue) {
      setAuthMessage(issue);
      return;
    }
    if (recoveryPassword !== recoveryConfirm) {
      setAuthMessage("As senhas digitadas não são iguais.");
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password: recoveryPassword });
      if (error) {
        setAuthMessage(friendlyAuthError(error, "Não foi possível redefinir a senha."));
        return;
      }
      await supabase.auth.signOut();
      setPasswordRecovery(false);
      setRecoveryPassword("");
      setRecoveryConfirm("");
      setAuthMessage("Senha alterada com sucesso. Entre novamente com a nova senha.");
    } catch {
      setAuthMessage("Falha de conexão. Tente novamente.");
    } finally {
      setAuthBusy(false);
    }
  };

  // Perfil e administração dos registros esportivos.
  const openProfile = () => {
    setProfileName(displayName);
    setProfileMessage("");
    setProfileMenuOpen(false);
    setProfileOpen(true);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const nextName = profileName.trim();
    if (!nextName) {
      setProfileMessage("Informe o nome que deve aparecer no aplicativo.");
      return;
    }
    setAuthBusy(true);
    const { error } = await supabase.auth.updateUser({ data: { display_name: nextName } });
    setAuthBusy(false);
    if (error) {
      setProfileMessage(error.message);
      return;
    }
    setData((current) => ({ ...current, profile: { displayName: nextName } }));
    setProfileMessage("Perfil atualizado com sucesso.");
  };

  const savePlayerName = () => {
    const nextName = editingPlayer?.name?.trim().slice(0, 60);
    const original = data.players.find((player) => player.id === editingPlayer?.id);
    if (!original || !nextName) return;
    if (
      data.players.some(
        (player) =>
          player.id !== original.id && player.name.toLowerCase() === nextName.toLowerCase(),
      )
    ) {
      setSettingsMessage("Já existe um jogador com esse nome.");
      return;
    }
    setData((current) => ({
      ...current,
      players: current.players.map((player) =>
        player.id === original.id ? { ...player, name: nextName } : player,
      ),
      activeMatch: renamePlayerInMatch(current.activeMatch, original.id, original.name, nextName),
      history: current.history.map((game) =>
        renamePlayerInMatch(game, original.id, original.name, nextName),
      ),
    }));
    setEditingPlayer(null);
    setSettingsMessage(`${original.name} foi alterado para ${nextName}.`);
  };

  const deletePlayerEverywhere = (player) => {
    if (
      !window.confirm(
        `Excluir ${player.name} do cadastro e remover suas pontuações do histórico? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    setData((current) => ({
      ...current,
      players: current.players.filter((item) => item.id !== player.id),
      settings: {
        ...current.settings,
        attendanceIds: Array.isArray(current.settings.attendanceIds)
          ? current.settings.attendanceIds.filter((id) => id !== player.id)
          : current.settings.attendanceIds,
        fixedGoalkeeperIds: (current.settings.fixedGoalkeeperIds || []).filter(
          (id) => id !== player.id,
        ),
      },
      activeMatch: removePlayerFromMatch(current.activeMatch, player.id),
      history: current.history.map((game) => removePlayerFromMatch(game, player.id)),
    }));
    setSettingsMessage(`${player.name} e suas pontuações foram excluídos.`);
  };

  const openMatchEditor = (game) => {
    setEditingMatch({
      id: game.id,
      date: new Date(game.finishedAt || game.date).toLocaleDateString("sv-SE"),
      sport: game.sport,
      score0: game.score?.[0] || 0,
      score1: game.score?.[1] || 0,
    });
    setSettingsMessage("");
  };

  const saveMatchEdit = (event) => {
    event.preventDefault();
    if (!editingMatch) return;
    const nextDate = new Date(`${editingMatch.date}T12:00:00`).toISOString();
    setData((current) => {
      const previousMatch = current.history.find((game) => game.id === editingMatch.id);
      if (!previousMatch) return current;
      const updatedMatch = {
        ...previousMatch,
        sport: editingMatch.sport,
        date: nextDate,
        finishedAt: nextDate,
        score: [
          Math.max(0, Number(editingMatch.score0) || 0),
          Math.max(0, Number(editingMatch.score1) || 0),
        ],
      };
      const withoutPreviousEvaluation = applyMatchToCareers(current.players, previousMatch, -1);
      return {
        ...current,
        players: applyMatchToCareers(withoutPreviousEvaluation, updatedMatch, 1),
        history: current.history.map((game) => (game.id === editingMatch.id ? updatedMatch : game)),
      };
    });
    setEditingMatch(null);
    setSettingsMessage(
      "Partida atualizada. A artilharia continua baseada nos autores registrados na súmula.",
    );
  };

  const deleteMatch = (game) => {
    const date = new Date(game.finishedAt || game.date).toLocaleDateString("pt-BR");
    if (
      !window.confirm(
        `Excluir a partida de ${date}? As pontuações desse jogo também sairão do ranking.`,
      )
    )
      return;
    setData((current) => ({
      ...current,
      players: applyMatchToCareers(current.players, game, -1),
      history: current.history.filter((item) => item.id !== game.id),
    }));
    setSettingsMessage("Partida e pontuações removidas do histórico.");
  };

  // Segurança da conta e encerramento da sessão autenticada.
  const changeLoggedPassword = async (event) => {
    event.preventDefault();
    if (!currentPassword) {
      setSettingsMessage("Informe a senha atual.");
      return;
    }
    if (currentPassword !== currentPasswordConfirm) {
      setSettingsMessage("As confirmações da senha atual não são iguais.");
      return;
    }
    const issue = passwordIssue(newPassword);
    if (issue) {
      setSettingsMessage(issue);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setSettingsMessage("As senhas digitadas não são iguais.");
      return;
    }
    setAuthBusy(true);
    try {
      // O Supabase não valida `current_password` em updateUser; a reautenticação precisa ser explícita.
      const email = session?.user?.email;
      if (!email) throw new Error("missing-email");
      const verification = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verification.error) {
        setSettingsMessage("A senha atual está incorreta.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setSettingsMessage(friendlyAuthError(error, "Não foi possível alterar a senha."));
        return;
      }
      setCurrentPassword("");
      setCurrentPasswordConfirm("");
      setNewPassword("");
      setConfirmNewPassword("");
      setSettingsMessage("Senha alterada com sucesso.");
    } catch {
      setSettingsMessage("Falha de conexão. Tente novamente.");
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    const signedUserId = session?.user?.id;
    if (dirtyRef.current) await syncNow();
    await supabase.auth.signOut();
    if (signedUserId) localStorage.removeItem(userStorageKey(signedUserId, activeGroupId));
    setProfileMenuOpen(false);
    setProfileOpen(false);
    setData(initialState);
    dataRef.current = initialState;
    dirtyRef.current = false;
    cloudLoadedUser.current = null;
    setReady(false);
    setSyncStatus("offline");
    setAuthMessage("");
    setView("setup");
  };

  const switchGroup = async (nextGroupId, force = false) => {
    if (!nextGroupId || nextGroupId === activeGroupId || (groupBusy && !force)) return;
    setGroupBusy(true);
    if (dirtyRef.current) await syncNow();
    cloudLoadedUser.current = null;
    dirtyRef.current = false;
    setReady(false);
    setPublicConfig({ page: null, games: [] });
    setSettingsMessage("");
    viewAfterGroupSwitchRef.current = view;
    setActiveGroupId(nextGroupId);
    safeLocalStorageSet(`${ACTIVE_GROUP_PREFIX}:${session.user.id}`, nextGroupId);
    setPlayerPage(1);
    setGroupBusy(false);
  };

  const submitNewGroup = async (event) => {
    event.preventDefault();
    if (groupBusy) return;
    setGroupBusy(true);
    try {
      if (dirtyRef.current) await syncNow();
      const created = await createGroup(session.user.id, groupName, groupCreationMode);
      setGroups((current) => [...current, created]);
      setGroupName("");
      setGroupModalOpen(false);
      setGroupBusy(false);
      setWorkspaceMode(created.management_mode || groupCreationMode);
      await switchGroup(created.id, true);
    } catch (error) {
      setSettingsMessage(`Não foi possível criar o grupo: ${error.message}`);
    } finally {
      setGroupBusy(false);
    }
  };

  const selectWorkspaceMode = async (nextMode) => {
    const matchingGroups = groups.filter(
      (group) => (group.management_mode || "amateur") === nextMode,
    );
    if (!matchingGroups.length) {
      setGroupCreationMode(nextMode);
      setGroupName("");
      setGroupModalOpen(true);
      return;
    }
    setWorkspaceMode(nextMode);
    await switchGroup(matchingGroups[0].id);
  };

  const saveManagedGroup = async (event) => {
    event.preventDefault();
    if (!settingsGroupEdit) return;
    try {
      let updated = await renameGroup(
        session.user.id,
        settingsGroupEdit.id,
        settingsGroupEdit.name,
      );
      if ((updated.management_mode || "amateur") !== settingsGroupEdit.management_mode) {
        updated = await changeGroupMode(
          session.user.id,
          settingsGroupEdit.id,
          settingsGroupEdit.management_mode,
        );
      }
      setGroups((current) => current.map((group) => (group.id === updated.id ? updated : group)));
      if (updated.id === activeGroupId) {
        setWorkspaceMode(updated.management_mode || "amateur");
        setSettingsAdminMode(updated.management_mode || "amateur");
      }
      setSettingsGroupEdit(null);
      setSettingsMessage("Organização atualizada.");
    } catch (error) {
      setSettingsMessage(`Não foi possível salvar: ${error.message}`);
    }
  };

  const selectSettingsManagement = async (mode) => {
    setSettingsAdminMode(mode);
    setSettingsGroupEdit(null);
    const firstGroup = groups.find((group) => (group.management_mode || "amateur") === mode);
    if (firstGroup && firstGroup.id !== activeGroupId) {
      setWorkspaceMode(mode);
      await switchGroup(firstGroup.id);
    }
  };

  const deleteManagedGroup = async (group) => {
    if (!window.confirm(`Excluir “${group.name}” e todos os dados vinculados?`)) return;
    try {
      const fallback = groups.find((item) => item.id !== group.id);
      await deleteGroup(session.user.id, group.id);
      setGroups((current) => current.filter((item) => item.id !== group.id));
      setSettingsGroupEdit(null);
      if (group.id === activeGroupId && fallback) {
        setWorkspaceMode(fallback.management_mode || "amateur");
        await switchGroup(fallback.id, true);
      }
      setSettingsMessage("Organização excluída.");
    } catch (error) {
      setSettingsMessage(`Não foi possível excluir: ${error.message}`);
    }
  };

  // Paginação do histórico e administração do Mural público.
  const fetchMoreHistory = async () => {
    if (!session?.user || historyLoading || !historyHasMore) return;
    setHistoryLoading(true);
    try {
      const page = await loadMoreHistory(
        session.user.id,
        activeGroupId,
        dataRef.current.history.length,
      );
      setData((current) => ({
        ...current,
        history: [
          ...current.history,
          ...page.history.filter((game) => !current.history.some((item) => item.id === game.id)),
        ],
      }));
      setHistoryHasMore(page.hasMore);
    } catch (error) {
      setSettingsMessage(`Não foi possível carregar partidas antigas: ${error.message}`);
    }
    setHistoryLoading(false);
  };

  const refreshPublicConfig = useCallback(async () => {
    if (!session?.user) return;
    try {
      setPublicConfig(
        await getPublicSettings(
          session.user.id,
          activeGroupId,
          activeGroup?.name || "Portal esportivo",
        ),
      );
    } catch (error) {
      setSettingsMessage(`Não foi possível carregar a página pública: ${error.message}`);
    }
  }, [activeGroup?.name, activeGroupId, session?.user?.id]);

  useEffect(() => {
    if ((view === "mural" || view === "stats") && ready) refreshPublicConfig();
  }, [ready, refreshPublicConfig, view]);

  const togglePublicPage = async () => {
    const enabled = !publicConfig.page?.enabled;
    await setPublicEnabled(session.user.id, activeGroupId, enabled);
    setPublicConfig((current) => ({ ...current, page: { ...current.page, enabled } }));
    setSettingsMessage(
      enabled
        ? "Página pública ativada. O link permite somente leitura."
        : "Página pública desativada.",
    );
  };

  const saveUpcomingGame = async (event) => {
    event.preventDefault();
    if (!publicDraft.title.trim() || !publicDraft.scheduled_at) return;
    try {
      await addUpcomingGame(session.user.id, activeGroupId, {
        title: publicDraft.title.trim(),
        sport: publicDraft.sport,
        scheduled_at: new Date(publicDraft.scheduled_at).toISOString(),
        location: publicDraft.location.trim(),
      });
      setPublicDraft((current) => ({ ...current, scheduled_at: "", location: "" }));
      await refreshPublicConfig();
      setSettingsMessage("Próximo jogo adicionado à página pública.");
    } catch (error) {
      setSettingsMessage(`Não foi possível adicionar o jogo: ${error.message}`);
    }
  };

  const removeUpcomingGame = async (id) => {
    await deleteUpcomingGame(session.user.id, activeGroupId, id);
    await refreshPublicConfig();
  };

  const copyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicPageUrl);
      setSettingsMessage("Link público copiado.");
    } catch {
      setSettingsMessage(`Copie este endereço: ${publicPageUrl}`);
    }
  };

  const openPublicRanking = () => {
    if (!publicConfig.page?.enabled) {
      setSettingsMessage("Ative o portal público para compartilhar a classificação.");
      setView("mural");
      return;
    }
    window.open(publicPageUrl, "_blank", "noopener,noreferrer");
  };

  // O backup é completo; a importação valida estrutura e limites antes de substituir os dados.
  const exportBackup = async () => {
    let backup = dataRef.current;
    try {
      backup = { ...backup, history: await loadAllHistory(session.user.id, activeGroupId) };
    } catch {}
    const file = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resenha-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("Arquivo muito grande");
      const imported = JSON.parse(await file.text());
      const validPlayer = (player) =>
        player &&
        typeof player.id === "string" &&
        typeof player.name === "string" &&
        player.name.trim().length > 0 &&
        player.name.length <= 60;
      const validMatch = (game) =>
        game &&
        typeof game.id === "string" &&
        Array.isArray(game.score) &&
        game.score.length === 2 &&
        Array.isArray(game.teams) &&
        game.teams.length === 2 &&
        game.teams.every((team) => Array.isArray(team?.starters) && Array.isArray(team?.bench)) &&
        Array.isArray(game.events);
      if (
        !Array.isArray(imported.players) ||
        !imported.players.every(validPlayer) ||
        !Array.isArray(imported.history) ||
        !imported.history.every(validMatch) ||
        !imported.settings ||
        typeof imported.settings !== "object"
      )
        throw new Error("Arquivo incompatível");
      if (
        imported.players.length > 500 ||
        imported.history.length > 2000 ||
        (imported.trainingPlans || []).length > 200
      )
        throw new Error("Limites excedidos");
      if (!window.confirm("Substituir os dados atuais pelos dados deste backup?")) return;
      const nextData = {
        ...initialState,
        ...imported,
        profile: { displayName: String(imported.profile?.displayName || "").slice(0, 40) },
        players: imported.players.map((player) => ({
          ...player,
          name: player.name.trim().slice(0, 60),
        })),
        settings: { ...initialState.settings, ...imported.settings },
        activeMatch:
          imported.activeMatch && validMatch(imported.activeMatch) ? imported.activeMatch : null,
        trainingPlans: [],
        trainingHistory: [],
        activeTraining: null,
      };
      setData(nextData);
      dataRef.current = nextData;
      dirtyRef.current = true;
      setAuthMessage("Backup importado com sucesso.");
    } catch {
      setAuthMessage("O arquivo selecionado não é um backup válido deste aplicativo.");
    }
  };

  const syncLabel = {
    local: "Configuração pendente",
    offline: "Conectando...",
    loading: "Carregando...",
    syncing: "Salvando...",
    synced: "Nuvem sincronizada",
    error: "Erro na nuvem",
  }[syncStatus];
  const publicSlug = new URLSearchParams(window.location.search).get("publico");

  // Portas de entrada da aplicação: configuração, mural, login e recuperação.
  if (!supabaseConfigured)
    return <TelaConfiguracaoAutenticacao theme={theme} setTheme={setTheme} />;
  if (publicSlug)
    return (
      <Suspense fallback={<main className="app-shell loading">Carregando página pública…</main>}>
        <PaginaPublica slug={publicSlug} />
      </Suspense>
    );
  if (!authReady) return <main className="app-shell loading">Verificando acesso…</main>;
  if (passwordRecovery)
    return (
      <TelaRecuperacaoSenha
        password={recoveryPassword}
        setPassword={setRecoveryPassword}
        confirm={recoveryConfirm}
        setConfirm={setRecoveryConfirm}
        message={authMessage}
        busy={authBusy}
        onSubmit={submitRecoveryPassword}
        onBack={() => {
          supabase.auth.signOut();
          setPasswordRecovery(false);
          setAuthMessage("");
        }}
        theme={theme}
        setTheme={setTheme}
      />
    );
  if (!session)
    return (
      <TelaAutenticacao
        mode={authMode}
        setMode={setAuthMode}
        email={authEmail}
        setEmail={setAuthEmail}
        password={authPassword}
        setPassword={setAuthPassword}
        passwordConfirm={authPasswordConfirm}
        setPasswordConfirm={setAuthPasswordConfirm}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        message={authMessage}
        busy={authBusy}
        onSubmit={submitAuth}
        onForgot={sendPasswordReset}
        theme={theme}
        setTheme={setTheme}
      />
    );
  if (!ready)
    return (
      <main className="app-shell loading">
        {groupLoadError ? (
          <section className="startup-error" role="alert">
            <span>
              <CloudOff size={28} />
            </span>
            <div>
              <small>FALHA AO ABRIR O RESENHA</small>
              <h1>Não foi possível carregar os dados</h1>
              <p>{groupLoadError}</p>
            </div>
            <div className="startup-error-actions">
              <button
                className="button primary"
                onClick={() => setGroupLoadAttempt((value) => value + 1)}
              >
                <RefreshCw size={18} /> Tentar novamente
              </button>
              <button className="button secondary" onClick={() => supabase.auth.signOut()}>
                <LogOut size={18} /> Sair da conta
              </button>
            </div>
          </section>
        ) : (
          <div className="startup-loading">
            <RefreshCw className="spin" size={24} /> Preparando o QResenha…
          </div>
        )}
      </main>
    );
  const currentRankingKind = sportKind(statsSport);
  const primaryRanking = displayedRoleRanking;
  const displayedScores = displayedRoleRanking.reduce((sum, player) => sum + player.goals, 0);
  const displayedGames =
    rankingScope === "match"
      ? selectedRankingMatch
        ? 1
        : 0
      : rankingScope === "month"
        ? monthMatches.length
        : sportMatches.length;
  const academyPositions =
    canonicalSport(data.settings.sport) === "Futebol de Salão"
      ? ["Goleiro", "Fixo", "Ala", "Pivô"]
      : canonicalSport(data.settings.sport) === "Futebol Society"
        ? ["Goleiro", "Zagueiro", "Ala", "Volante", "Meia", "Atacante"]
        : ["Goleiro", "Lateral", "Zagueiro", "Volante", "Meia", "Ponta", "Atacante"];
  const academyCategories = [
    ...new Set([
      ...groups
        .filter((group) => (group.management_mode || "amateur") === "academy")
        .map((group) => group.name),
      ...data.players.map((player) => player.academyProfile?.category).filter(Boolean),
    ]),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const playersInCurrentMatch = match
    ? [
        ...new Map(
          match.teams
            .flatMap((team) => [...team.starters, ...team.bench])
            .map((player) => [player.id, player]),
        ).values(),
      ]
    : [];

  // Interface autenticada principal.
  return (
    <main className="app-shell">
      <BarraSuperior
        view={view}
        hasMatch={Boolean(match)}
        onNavigate={(nextView) => {
          if (nextView === "mural") setSettingsMessage("");
          setView(nextView);
          setAppMenuOpen(false);
        }}
        menuOpen={appMenuOpen}
        setMenuOpen={setAppMenuOpen}
        menuRef={appMenuRef}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        profileRef={profileMenuRef}
        profileOpen={profileMenuOpen}
        setProfileOpen={setProfileMenuOpen}
        displayName={displayName}
        email={session.user.email}
        onOpenProfile={openProfile}
        onOpenSettings={() => {
          setProfileMenuOpen(false);
          setSettingsMessage("");
          setSettingsAdminMode(workspaceMode);
          setView("settings");
        }}
        onOpenPassword={() => {
          setProfileMenuOpen(false);
          setSettingsMessage("");
          setCurrentPassword("");
          setCurrentPasswordConfirm("");
          setNewPassword("");
          setConfirmNewPassword("");
          setView("password");
        }}
        onSignOut={signOut}
        academyMode={workspaceMode === "academy"}
        notifications={academyNotifications}
        notificationsOpen={notificationsOpen}
        setNotificationsOpen={setNotificationsOpen}
        notificationsRef={notificationsRef}
        unreadNotifications={unreadNotifications}
        onNotificationsRead={markAcademyNotificationsAsRead}
      />

      {view !== "settings" && (
        <BarraGrupos
          groups={visibleGroups}
          activeGroupId={activeGroupId}
          onChange={switchGroup}
          onCreate={() => {
            setGroupCreationMode(workspaceMode);
            setGroupName("");
            setGroupModalOpen(true);
          }}
          busy={groupBusy}
          managementMode={workspaceMode}
          onModeChange={selectWorkspaceMode}
        />
      )}

      <div className="page-wrap">
        {view === "setup" && (
          <section className="view-grid setup-grid">
            <div className="main-column">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">PASSO 1</span>
                  <h1>Quem vai jogar hoje?</h1>
                </div>
                <span className="count-pill">{activePlayers.length} ativos</span>
              </div>
              {workspaceMode === "academy" ? (
                <div className="academy-add-actions">
                  <button
                    className="button primary academy-add-button"
                    type="button"
                    onClick={openNewAcademyPlayer}
                  >
                    <UserPlus size={19} /> Adicionar aluno
                  </button>
                  <button
                    className="button secondary academy-blank-form-button"
                    type="button"
                    onClick={downloadBlankStudentForm}
                  >
                    <Download size={18} /> Ficha cadastro
                  </button>
                </div>
              ) : (
                <form
                  className="add-player"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addPlayer();
                  }}
                >
                  <div className="field grow">
                    <label htmlFor="player-name">Nome do jogador</label>
                    <input
                      ref={nameInput}
                      id="player-name"
                      maxLength="60"
                      value={playerName}
                      onChange={(event) => setPlayerName(event.target.value)}
                      placeholder="Ex.: João"
                      autoComplete="off"
                    />
                  </div>
                  <button className="button primary add-button" type="submit">
                    <UserPlus size={19} /> Adicionar
                  </button>
                </form>
              )}
              <div className="attendance-toolbar">
                <div>
                  <Check size={18} />
                  <span>
                    <strong>Presença de hoje</strong>
                    <small>
                      {presentPlayers.length} de {activePlayers.length} confirmados
                    </small>
                  </span>
                </div>
                <div>
                  <button type="button" onClick={() => setAllAttendance(true)}>
                    Todos
                  </button>
                  <button type="button" onClick={() => setAllAttendance(false)}>
                    Nenhum
                  </button>
                </div>
              </div>
              <div className="player-list">
                {activePlayers.length === 0 ? (
                  <EstadoVazio
                    icon={<Users size={28} />}
                    title="A lista ainda está vazia"
                    text="Adicione os amigos que vão participar do jogo."
                  />
                ) : (
                  visiblePlayers.map((player, index) => {
                    const stats = playerStats.get(player.id);
                    const present = presentPlayers.some((item) => item.id === player.id);
                    return (
                      <article
                        className={`player-row ${present ? "is-present" : "is-absent"}`}
                        key={player.id}
                      >
                        <Avatar name={player.name} />
                        <div className="player-info">
                          <strong>{player.name}</strong>
                          <span>
                            Jogador #
                            {String((playerPage - 1) * PLAYER_PAGE_SIZE + index + 1).padStart(
                              2,
                              "0",
                            )}{" "}
                            · {stats.matches} {stats.matches === 1 ? "presença" : "presenças"} ·{" "}
                            {stats.totalPoints} {scoreWord(data.settings.sport, stats.totalPoints)}
                          </span>
                        </div>
                        <div className="player-rating">
                          <Estrelas
                            rating={stats.rating}
                            label={`Nível geral: ${stats.rating} de 5`}
                          />
                          <small>
                            {stats.label} · média geral{" "}
                            {stats.matches ? stats.evaluation.toFixed(1) : "—"}
                          </small>
                          {stats.lastRating !== null && <em>Último jogo: {stats.lastRating}★</em>}
                        </div>
                        <div className="player-row-actions">
                          {workspaceMode === "academy" && (
                            <button
                              className="button secondary player-info-button"
                              type="button"
                              onClick={() => openPlayerDetails(player)}
                              aria-label={`Abrir ficha de ${player.name}`}
                            >
                              <UserRound size={16} /> Ficha
                            </button>
                          )}
                          <button
                            className={`presence-button ${present ? "present" : ""}`}
                            type="button"
                            onClick={() => toggleAttendance(player.id)}
                            aria-pressed={present}
                          >
                            {present ? (
                              <>
                                <Check size={15} /> Presente
                              </>
                            ) : (
                              "Ausente"
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
              {activePlayers.length > PLAYER_PAGE_SIZE && (
                <Paginacao page={playerPage} pageCount={playerPageCount} onChange={setPlayerPage} />
              )}
            </div>
            <aside className="config-card">
              <div className="section-heading compact">
                <div>
                  <span className="eyebrow">PASSO 2</span>
                  <h2>Configurar partida</h2>
                </div>
                <Sparkles size={21} />
              </div>
              <div className="field">
                <label htmlFor="sport">Esporte</label>
                <select
                  id="sport"
                  value={canonicalSport(data.settings.sport)}
                  onChange={(event) => changeSport(event.target.value)}
                >
                  {Object.keys(SPORT_PRESETS)
                    .filter(
                      (sport) =>
                        workspaceMode !== "academy" ||
                        ["Futebol", "Futebol Society", "Futebol de Salão"].includes(sport),
                    )
                    .map((sport) => (
                      <option key={sport}>{sport}</option>
                    ))}
                </select>
              </div>
              <div className="three-fields">
                <div className="field">
                  <label htmlFor="duration">Tempo de jogo</label>
                  <div className="input-suffix">
                    <input
                      id="duration"
                      type="number"
                      min="1"
                      max="120"
                      value={data.settings.duration}
                      onChange={(event) =>
                        updateSettings("duration", Math.max(1, Number(event.target.value)))
                      }
                    />
                    <span>min</span>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="starters">Em jogo por time</label>
                  <input
                    id="starters"
                    type="number"
                    min="1"
                    max="11"
                    value={data.settings.startersPerTeam}
                    onChange={(event) =>
                      updateSettings("startersPerTeam", Math.max(1, Number(event.target.value)))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="team-count">Total de times</label>
                  <select
                    id="team-count"
                    value={data.settings.teamCount || 2}
                    onChange={(event) => updateSettings("teamCount", Number(event.target.value))}
                  >
                    {TEAM_META.map((team, index) => (
                      <option key={team.id} value={index + 1} disabled={index === 0}>
                        {index + 1} {index === 0 ? "time" : "times"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <fieldset className="mode-group">
                <legend>Divisão dos times</legend>
                <Modo
                  active={data.settings.drawMode === "balanced"}
                  onClick={() => updateSettings("drawMode", "balanced")}
                  icon={<Shield size={19} />}
                  title="Equilibrado"
                  text="Usa o desempenho geral"
                />
                <Modo
                  active={data.settings.drawMode === "random"}
                  onClick={() => updateSettings("drawMode", "random")}
                  icon={<Sparkles size={19} />}
                  title="Aleatório"
                  text="Sem considerar nível"
                />
                <Modo
                  active={data.settings.drawMode === "manual"}
                  onClick={() => updateSettings("drawMode", "manual")}
                  icon={<Users size={19} />}
                  title="Manual"
                  text="Escolha cada time"
                />
              </fieldset>
              <label className="shared-bench-option">
                <input
                  type="checkbox"
                  checked={Boolean(data.settings.sharedBench)}
                  onChange={(event) => updateSettings("sharedBench", event.target.checked)}
                />
                <span className="shared-bench-check">
                  {data.settings.sharedBench && <Check size={15} />}
                </span>
                <span>
                  <strong>Banco compartilhado</strong>
                  <small>
                    Marcado: qualquer reserva pode entrar nos dois times. Desmarcado: cada time usa
                    somente os próprios reservas.
                  </small>
                </span>
              </label>
              <fieldset className="goalkeeper-picker">
                <legend>
                  Goleiro fixo de hoje <small>(opcional)</small>
                </legend>
                <div className="field goalkeeper-mode-field">
                  <label htmlFor="fixed-goalkeeper-mode">Vai ter goleiro fixo?</label>
                  <select
                    id="fixed-goalkeeper-mode"
                    value={data.settings.hasFixedGoalkeepers ? "yes" : "no"}
                    onChange={(event) => setFixedGoalkeeperMode(event.target.value === "yes")}
                  >
                    <option value="no">Não, vai ter rodízio</option>
                    <option value="yes">Sim, escolher goleiros</option>
                  </select>
                </div>
                {data.settings.hasFixedGoalkeepers && (
                  <div className="goalkeeper-select-menu">
                    <button
                      type="button"
                      className="goalkeeper-select-trigger"
                      onClick={() => setGoalkeeperPickerOpen((current) => !current)}
                      aria-expanded={goalkeeperPickerOpen}
                    >
                      <span>
                        <Shield size={17} />
                        {(data.settings.fixedGoalkeeperIds || []).length
                          ? `${data.settings.fixedGoalkeeperIds.length} goleiro(s) selecionado(s)`
                          : "Selecionar os goleiros"}
                      </span>
                      <ChevronDown size={17} />
                    </button>
                    {goalkeeperPickerOpen && (
                      <div className="goalkeeper-option-list">
                        {presentPlayers.length ? (
                          presentPlayers.map((player) => {
                            const selected = (data.settings.fixedGoalkeeperIds || []).includes(
                              player.id,
                            );
                            return (
                              <label key={player.id}>
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleFixedGoalkeeper(player.id)}
                                />
                                <Avatar name={player.name} />
                                <span>{player.name}</span>
                                {selected && <Check size={16} />}
                              </label>
                            );
                          })
                        ) : (
                          <p>Marque os jogadores presentes para escolher os goleiros.</p>
                        )}
                      </div>
                    )}
                    <small>
                      Escolha até um por time. Eles começarão no gol e serão separados no sorteio.
                    </small>
                  </div>
                )}
              </fieldset>
              {data.settings.drawMode === "manual" && (
                <div className="manual-teams">
                  <header>
                    <strong>Divisão manual</strong>
                    <small>Nomeie os times e distribua os presentes</small>
                  </header>
                  <div className="manual-team-names">
                    {TEAM_META.slice(0, data.settings.teamCount || 2).map((team, teamIndex) => (
                      <label key={team.id}>
                        <span className={`manual-team-color ${team.color}`} aria-hidden="true" />
                        <span>Time {teamIndex + 1}</span>
                        <input
                          type="text"
                          maxLength="30"
                          value={data.settings.teamNames?.[teamIndex] || ""}
                          onChange={(event) => updateManualTeamName(teamIndex, event.target.value)}
                          placeholder={team.name}
                          aria-label={`Nome do time ${teamIndex + 1}`}
                        />
                      </label>
                    ))}
                  </div>
                  {presentPlayers.map((player) => (
                    <div className="manual-player" key={player.id}>
                      <span>{player.name}</span>
                      <div>
                        {TEAM_META.slice(0, data.settings.teamCount || 2).map((team, teamIndex) => (
                          <button
                            type="button"
                            key={team.id}
                            className={`${team.color} ${manualAssignments[player.id] === teamIndex ? "active" : ""}`}
                            onClick={() =>
                              setManualAssignments((current) => ({
                                ...current,
                                [player.id]: teamIndex,
                              }))
                            }
                            title={data.settings.teamNames?.[teamIndex]?.trim() || team.name}
                          >
                            {shortTeamName(data.settings.teamNames?.[teamIndex], team.short)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="config-summary">
                <Clock3 size={18} />
                <span>
                  <strong>{data.settings.duration} minutos</strong> ·{" "}
                  {data.settings.startersPerTeam} em jogo · {data.settings.teamCount || 2} times ·{" "}
                  {data.settings.sharedBench ? "banco geral" : "reservas por time"}
                </span>
              </div>
              <button
                className="button primary large full"
                onClick={startMatch}
                disabled={presentPlayers.length < 2}
              >
                {data.settings.drawMode === "manual"
                  ? "Confirmar times e abrir jogo"
                  : "Sortear times e abrir jogo"}{" "}
                <ChevronRight size={20} />
              </button>
              {(presentPlayers.length < 2 || setupMessage) && (
                <p className="helper error-helper">
                  {setupMessage || "Marque pelo menos 2 jogadores presentes."}
                </p>
              )}
            </aside>
          </section>
        )}

        {view === "match" && match && (
          <section className="match-view">
            <div className="session-bar">
              <div>
                <span className="eyebrow">SESSÃO EM ANDAMENTO</span>
                <strong>Partida {match.roundNumber || 1}</strong>
                <small>
                  {matchMessage || "A escalação continuará salva quando esta partida terminar."}
                </small>
              </div>
              <span className="bench-status">
                <ArrowDownUp size={15} />
                {match.sharedBench ? "Banco geral" : "Reservas por time"}
              </span>
              {workspaceMode === "academy" && (
                <button
                  className="button secondary player-information-trigger"
                  onClick={() => setMatchInfoOpen(true)}
                >
                  <UserRound size={16} /> Informações dos jogadores
                </button>
              )}
            </div>
            <section className="match-score-hero" aria-label="Placar da partida">
              <div className="scoreboard">
                <PlacarTime team={match.teams[0]} score={match.score[0]} />
                <div className="timer-panel">
                  <span className={match.running ? "live-label" : "live-label paused"}>
                    {match.running
                      ? "EM JOGO"
                      : match.remainingSeconds === 0
                        ? "FIM DO TEMPO"
                        : "PAUSADO"}
                  </span>
                  <strong className={match.remainingSeconds <= 60 ? "ending" : ""}>
                    {formatTime(match.remainingSeconds)}
                  </strong>
                  <div className="timer-actions">
                    <button className="button timer-button" onClick={toggleTimer}>
                      {match.running ? <CirclePause size={19} /> : <CirclePlay size={19} />}
                      {match.running ? "Pausar" : "Iniciar"}
                    </button>
                    <button
                      className="icon-button"
                      onClick={resetTimer}
                      aria-label="Reiniciar cronômetro"
                    >
                      <RotateCcw size={18} />
                    </button>
                  </div>
                </div>
                <PlacarTime team={match.teams[1]} score={match.score[1]} />
              </div>
              <PontuadoresPartida match={match} />
            </section>
            {(match.reserveTeams || []).length > 0 && (
              <section className="reserve-teams">
                <header>
                  <div>
                    <span className="eyebrow">FILA DE EQUIPES</span>
                    <h2>Times de fora</h2>
                  </div>
                  <small>
                    {match.events.length || match.running
                      ? "Salve a partida atual antes de trocar um time completo."
                      : "Troque um lado inteiro sem refazer a escalação."}
                  </small>
                </header>
                <div>
                  {match.reserveTeams.map((team) => (
                    <article className={`reserve-team ${team.color}`} key={team.id}>
                      <span className="team-dot" />
                      <div>
                        <strong>{team.name}</strong>
                        <small>
                          {team.starters.length + team.bench.length} jogadores ·{" "}
                          {team.starters.map((player) => player.name).join(", ")}
                        </small>
                      </div>
                      <div>
                        <button
                          className="button secondary"
                          disabled={Boolean(match.events.length || match.running)}
                          onClick={() => setTeamSwapSide(0)}
                        >
                          Entra no lado esquerdo
                        </button>
                        <button
                          className="button secondary"
                          disabled={Boolean(match.events.length || match.running)}
                          onClick={() => setTeamSwapSide(1)}
                        >
                          Entra no lado direito
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
            {match.sharedBench && (
              <section className="shared-bench-roster">
                <header>
                  <div>
                    <span className="eyebrow">BANCO GERAL</span>
                    <h2>Reservas disponíveis para os dois times</h2>
                  </div>
                  <small>As trocas continuam sendo feitas manualmente ao tocar no jogador.</small>
                </header>
                <div>
                  {substitutionBench(match, 0).length ? (
                    substitutionBench(match, 0).map((player) => (
                      <span key={player.id}>
                        <Avatar name={player.name} />
                        <strong>{player.name}</strong>
                      </span>
                    ))
                  ) : (
                    <p>Nenhum jogador está no banco neste momento.</p>
                  )}
                </div>
              </section>
            )}
            <div className="match-grid">
              {match.teams.map((team, teamIndex) => (
                <CartaoTime
                  key={team.name}
                  team={team}
                  scoreLabel={scoreAction(match.sport)}
                  onGoal={(playerId) => {
                    setGoalTeam(teamIndex);
                    setGoalScorer(playerId);
                    setGoalAssist("");
                    setBasketPoints(1);
                  }}
                  onOwnGoal={(playerId) => {
                    setIncident({ type: "own_goal", teamIndex });
                    setIncidentPlayer(playerId);
                  }}
                  onMissedPenalty={(playerId) => {
                    setIncident({ type: "missed_penalty", teamIndex });
                    setIncidentPlayer(playerId);
                  }}
                  showFootballActions={sportKind(match.sport) === "football"}
                  hasAvailableBench={substitutionBench(match, teamIndex).length > 0}
                  sharedBench={match.sharedBench}
                  onSub={(playerId) => openSubstitution(teamIndex, playerId)}
                  onGoalkeeperChange={() => openGoalkeeperChange(teamIndex)}
                  onGoalkeeperAction={(type) => registerGoalkeeperAction(teamIndex, type)}
                  onHighlight={(playerId) => registerMatchHighlight(teamIndex, playerId)}
                />
              ))}
              <aside className="events-card">
                <header>
                  <h2>Lances do jogo</h2>
                  <span className="event-count">{match.events.length}</span>
                </header>
                <div className="events-list">
                  {match.events.length === 0 ? (
                    <div className="empty-events">
                      <Activity size={25} />
                      <span>As pontuações e trocas aparecerão aqui.</span>
                    </div>
                  ) : (
                    match.events.map((event) => (
                      <LinhaEventoPartida
                        event={event}
                        match={match}
                        onUndo={() => undoMatchEvent(event.id)}
                        key={event.id}
                      />
                    ))
                  )}
                </div>
                <div className="finish-actions compact-finish-actions">
                  <button className="button primary" onClick={finishMatch}>
                    <Check size={16} /> Finalizar partida
                  </button>
                  <button className="button secondary danger-finish" onClick={endSession}>
                    <X size={16} /> Encerrar sessão
                  </button>
                </div>
              </aside>
            </div>
          </section>
        )}

        {view === "stats" && (
          <section className="stats-view">
            <div className="section-heading stats-heading">
              <div>
                <span className="eyebrow">ESTATÍSTICAS DA RESENHA</span>
                <h1>Classificação de {statsSport}</h1>
                <p className="section-description">
                  Cada modalidade tem sua própria tabela e seus próprios números.
                </p>
              </div>
              <div className="stats-filters">
                <select value={statsSport} onChange={(event) => setStatsSport(event.target.value)}>
                  {Object.keys(SPORT_PRESETS)
                    .filter(
                      (sport) =>
                        workspaceMode !== "academy" ||
                        ["Futebol", "Futebol Society", "Futebol de Salão"].includes(sport),
                    )
                    .map((sport) => (
                      <option key={sport}>{sport}</option>
                    ))}
                </select>
                <label className="month-picker">
                  <CalendarDays size={18} />
                  <input
                    type="month"
                    value={month}
                    onChange={(event) => setMonth(event.target.value)}
                  />
                </label>
              </div>
            </div>
            <nav className="stats-sections" aria-label="Tipos de estatística">
              <button
                className={statsSection === "ranking" ? "active" : ""}
                onClick={() => setStatsSection("ranking")}
              >
                <Trophy size={18} /> Classificação
              </button>
              <button
                className={statsSection === "scorers" ? "active" : ""}
                onClick={() => setStatsSection("scorers")}
              >
                <Goal size={18} />{" "}
                {currentRankingKind === "football" ? "Gols, assistências e defesas" : "Pontuadores"}
              </button>
              <button
                className={statsSection === "results" ? "active" : ""}
                onClick={() => setStatsSection("results")}
              >
                <CalendarDays size={18} /> Resultados
              </button>
            </nav>
            {statsSection === "ranking" && (
              <>
                <div className="ranking-filter-row">
                  <nav className="ranking-scopes" aria-label="Período da classificação">
                    <button
                      className={rankingScope === "overall" ? "active" : ""}
                      onClick={() => setRankingScope("overall")}
                    >
                      Carreira
                    </button>
                    <button
                      className={rankingScope === "month" ? "active" : ""}
                      onClick={() => setRankingScope("month")}
                    >
                      Média mensal
                    </button>
                    <button
                      className={rankingScope === "match" ? "active" : ""}
                      onClick={() => setRankingScope("match")}
                    >
                      Por partida
                    </button>
                  </nav>
                  {currentRankingKind === "football" && (
                    <nav className="ranking-role-switch" aria-label="Função dos atletas">
                      <button
                        className={rankingRole === "line" ? "active" : ""}
                        onClick={() => setRankingRole("line")}
                      >
                        Jogadores de linha
                      </button>
                      <button
                        className={rankingRole === "goalkeeper" ? "active" : ""}
                        onClick={() => setRankingRole("goalkeeper")}
                      >
                        Goleiros
                      </button>
                    </nav>
                  )}
                </div>
                {rankingScope === "match" && (
                  <label className="ranking-match-picker">
                    <span>Partida analisada</span>
                    <select
                      value={selectedRankingMatch?.id || ""}
                      onChange={(event) => setRankingMatchId(event.target.value)}
                    >
                      {sportMatches.map((game) => (
                        <option value={game.id} key={game.id}>
                          {new Date(game.finishedAt || game.date).toLocaleDateString("pt-BR")} ·{" "}
                          {game.teams?.[0]?.short || "T1"} {game.score?.[0] || 0} ×{" "}
                          {game.score?.[1] || 0} {game.teams?.[1]?.short || "T2"}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="summary-strip">
                  <Resumo
                    icon={<Trophy size={20} />}
                    label={
                      rankingScope === "match"
                        ? "Melhor da partida"
                        : rankingScope === "month"
                          ? "Líder do mês"
                          : "Líder da carreira"
                    }
                    value={primaryRanking[0]?.name || "—"}
                  />
                  <Resumo
                    icon={<Goal size={20} />}
                    label={
                      currentRankingKind === "football" && rankingRole === "goalkeeper"
                        ? "Defesas na seleção"
                        : `${scoreAction(statsSport)}s na seleção`
                    }
                    value={
                      currentRankingKind === "football" && rankingRole === "goalkeeper"
                        ? primaryRanking[0]?.saves || 0
                        : displayedScores
                    }
                  />
                  <Resumo
                    icon={<CalendarDays size={20} />}
                    label="Partidas consideradas"
                    value={displayedGames}
                  />
                </div>
                <article className="ranking-table-card">
                  <header>
                    <div>
                      <span className="eyebrow">DESEMPENHO CONSOLIDADO</span>
                      <h2>
                        {rankingScope === "match"
                          ? "Avaliação da partida"
                          : rankingScope === "month"
                            ? "Desempenho mensal"
                            : "Ranking geral"}
                      </h2>
                    </div>
                    <button className="button secondary" onClick={openPublicRanking}>
                      <Globe2 size={17} /> Abrir portal público
                    </button>
                  </header>
                  <p className="rating-explanation">
                    <Shield size={16} /> A nota de cada partida começa em 6,0. Vitória vale +0,35,
                    empate +0,15 e cada {scoreAction(statsSport).toLowerCase()} +0,55.
                    {currentRankingKind === "football" && " Assistência vale +0,30."}
                    {workspaceMode === "academy" && " A presença vale +0,20."} O bônus ofensivo é
                    limitado a +2,0
                    {currentRankingKind === "football" && "; ações de goleiro têm pesos próprios"}.
                  </p>
                  <TabelaDesempenho
                    ranking={displayedRoleRanking.map((player) => {
                      const profile = data.players.find(
                        (item) => item.id === player.id,
                      )?.academyProfile;
                      return {
                        ...player,
                        category: profile?.category || "",
                        primaryPosition: profile?.primaryPosition || "",
                      };
                    })}
                    sport={statsSport}
                    academy={workspaceMode === "academy"}
                    viewMode={currentRankingKind === "football" ? rankingRole : "line"}
                  />
                </article>
              </>
            )}
            {statsSection === "scorers" && (
              <div
                className={`ranking-panels ${currentRankingKind === "football" ? "three" : "single"}`}
              >
                {currentRankingKind === "football" ? (
                  <>
                    <PainelRanking
                      title="Participações"
                      eyebrow="GOLS + ASSISTÊNCIAS"
                      ranking={[...rankingData].sort(
                        (a, b) => b.total - a.total || b.goals - a.goals,
                      )}
                      valueKey="total"
                      valueLabel="participações"
                    />
                    <PainelRanking
                      title="Assistências"
                      eyebrow="GARÇONS DO MÊS"
                      ranking={assistsRanking}
                      valueKey="assists"
                      valueLabel="assistências"
                    />
                    <PainelRanking
                      title="Gols"
                      eyebrow="ARTILHARIA"
                      ranking={goalsRanking}
                      valueKey="goals"
                      valueLabel="gols"
                    />
                    <PainelRanking
                      title="Defesas"
                      eyebrow="PAREDÕES DO MÊS"
                      ranking={[...rankingData]
                        .filter((player) => player.saves > 0)
                        .sort((a, b) => b.saves - a.saves || a.name.localeCompare(b.name))}
                      valueKey="saves"
                      valueLabel="defesas"
                    />
                  </>
                ) : (
                  <PainelRanking
                    title={
                      currentRankingKind === "basketball"
                        ? "Cestinhas do mês"
                        : currentRankingKind === "volleyball"
                          ? "Pontuadores do mês"
                          : "Artilheiros do mês"
                    }
                    eyebrow="RANKING"
                    ranking={goalsRanking}
                    valueKey="goals"
                    valueLabel={
                      currentRankingKind === "basketball"
                        ? "cestas"
                        : currentRankingKind === "volleyball"
                          ? "pontos"
                          : "gols"
                    }
                  />
                )}
              </div>
            )}
            {statsSection === "results" && (
              <article className="history-card stats-history">
                <header>
                  <div>
                    <span className="eyebrow">HISTÓRICO</span>
                    <h2>Jogos de {statsSport} no mês</h2>
                  </div>
                </header>
                {monthMatches.length === 0 ? (
                  <EstadoVazio
                    icon={<CalendarDays size={28} />}
                    title="Nenhum jogo nesta seleção"
                    text="Altere o mês ou carregue partidas anteriores."
                  />
                ) : (
                  <div className="history-list">
                    {monthMatches.map((game) => (
                      <details className="history-details" key={game.id}>
                        <summary className="history-row">
                          <div className="history-date">
                            <strong>
                              {new Date(game.finishedAt || game.date).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </strong>
                            <small>
                              {canonicalSport(game.sport)} ·{" "}
                              {
                                (
                                  game.attendanceIds ||
                                  game.teams.flatMap((team) => [...team.starters, ...team.bench])
                                ).length
                              }{" "}
                              presentes
                            </small>
                          </div>
                          <div className="history-score">
                            <span>{game.teams[0].short}</span>
                            <strong>
                              {game.score[0]} <i>×</i> {game.score[1]}
                            </strong>
                            <span>{game.teams[1].short}</span>
                            <ChevronDown className="history-chevron" size={17} />
                          </div>
                        </summary>
                        <div className="history-events">
                          {(game.events || []).length ? (
                            [...game.events]
                              .sort(
                                (a, b) =>
                                  Number(a.elapsedSeconds || a.minute * 60 || 0) -
                                  Number(b.elapsedSeconds || b.minute * 60 || 0),
                              )
                              .map((event) => (
                                <div className="history-event" key={event.id}>
                                  <time>{event.minute || 0}&apos;</time>
                                  <span>{historicalEventLabel(event, game.sport)}</span>
                                </div>
                              ))
                          ) : (
                            <p>Nenhum lance foi registrado nesta partida.</p>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                )}
                {historyHasMore && (
                  <button
                    className="button secondary history-load-more"
                    onClick={fetchMoreHistory}
                    disabled={historyLoading}
                  >
                    <RefreshCw size={17} />{" "}
                    {historyLoading ? "Carregando…" : `Carregar mais ${HISTORY_PAGE_SIZE} partidas`}
                  </button>
                )}
              </article>
            )}
          </section>
        )}

        {view === "evolution" && (
          <section className="evolution-view">
            <div className="evolution-hero">
              <div>
                <span className="eyebrow">DESEMPENHO INDIVIDUAL</span>
                <h1>Evolução mensal</h1>
                <p>
                  Escolha o atleta e o período para visualizar presença, produção e nível em cada
                  partida.
                </p>
              </div>
              <div className="evolution-selector-card">
                <AvatarPerfil name={evolutionPlayer?.name || "Atleta"} large />
                <label>
                  <span>
                    <UserRound size={15} /> Atleta
                  </span>
                  <select
                    value={evolutionPlayer?.id || ""}
                    onChange={(event) => setEvolutionPlayerId(event.target.value)}
                    disabled={!managedPlayers.length}
                  >
                    {managedPlayers.length ? (
                      managedPlayers.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                        </option>
                      ))
                    ) : (
                      <option>Nenhum jogador</option>
                    )}
                  </select>
                </label>
                <label>
                  <span>
                    <CalendarDays size={15} /> Período
                  </span>
                  <input
                    type="month"
                    value={evolutionMonth}
                    onChange={(event) => setEvolutionMonth(event.target.value)}
                  />
                </label>
              </div>
            </div>
            {!evolutionPlayer ? (
              <article className="settings-card">
                <EstadoVazio
                  icon={<TrendingUp size={30} />}
                  title="Nenhum jogador disponível"
                  text="Cadastre jogadores e encerre partidas para acompanhar a evolução."
                />
              </article>
            ) : (
              <>
                <div className="summary-strip evolution-summary">
                  <Resumo
                    icon={<CalendarDays size={20} />}
                    label="Presenças no mês"
                    value={evolutionGames.length}
                  />
                  <Resumo icon={<Goal size={20} />} label="Pontuações" value={evolutionPoints} />
                  <Resumo
                    icon={<Sparkles size={20} />}
                    label="Assistências"
                    value={evolutionAssists}
                  />
                  <Resumo
                    icon={<TrendingUp size={20} />}
                    label="Média por partida"
                    value={evolutionAverage.toFixed(1)}
                  />
                </div>
                <div className="evolution-grid">
                  <article className="evolution-profile-card">
                    <AvatarPerfil name={evolutionPlayer.name} large />
                    <div>
                      <span className="eyebrow">NÍVEL GERAL</span>
                      <h2>{evolutionPlayer.name}</h2>
                      <Estrelas
                        rating={playerStats.get(evolutionPlayer.id)?.rating || 1}
                        label="Nível geral do jogador"
                      />
                      <p>
                        {playerStats.get(evolutionPlayer.id)?.label || ratingLabel(1)} · avaliação{" "}
                        {playerStats.get(evolutionPlayer.id)?.evaluation?.toFixed(1) || "—"}
                      </p>
                    </div>
                  </article>
                  <article className="evolution-chart-card">
                    <header>
                      <div>
                        <span className="eyebrow">POR PARTIDA</span>
                        <h2>Produção no mês</h2>
                      </div>
                    </header>
                    {evolutionGames.length === 0 ? (
                      <EstadoVazio
                        icon={<BarChart3 size={28} />}
                        title="Sem partidas neste mês"
                        text="As presenças e o desempenho aparecerão depois de uma partida salva."
                      />
                    ) : (
                      <div className="evolution-game-list">
                        {evolutionGames.map(({ game, points, assists, rating, evaluation }) => (
                          <div className="evolution-game-row" key={game.id}>
                            <div>
                              <strong>
                                {new Date(game.finishedAt || game.date).toLocaleDateString(
                                  "pt-BR",
                                  { day: "2-digit", month: "short" },
                                )}
                              </strong>
                              <small>
                                {canonicalSport(game.sport)} · nota {evaluation.toFixed(1)}
                              </small>
                            </div>
                            <div className="performance-bars">
                              <span style={{ "--bar": `${Math.min(100, points * 20)}%` }}>
                                <i />
                                {points} {scoreWord(game.sport, points)}
                              </span>
                              {sportKind(game.sport) === "football" && (
                                <span
                                  className="assist-bar"
                                  style={{ "--bar": `${Math.min(100, assists * 25)}%` }}
                                >
                                  <i />
                                  {assists} assist.
                                </span>
                              )}
                            </div>
                            <Estrelas
                              rating={rating}
                              label={`Nível da partida: ${rating} estrelas`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                </div>
              </>
            )}
          </section>
        )}

        {false && view === "training" && (
          <section className="training-view">
            <div className="section-heading settings-heading">
              <div>
                <span className="eyebrow">PREPARAÇÃO FÍSICA</span>
                <h1>Modo treino</h1>
                <p>
                  Monte rotinas por tempo ou repetições, organize os dias e registre o que foi
                  concluído.
                </p>
              </div>
              <Dumbbell size={29} />
            </div>
            {settingsMessage && (
              <p className="settings-message" role="status">
                {settingsMessage}
              </p>
            )}
            {activeTraining ? (
              <article className="active-training-card training-checklist-card">
                <header>
                  <div>
                    <span className="live-label">TREINO EM ANDAMENTO</span>
                    <h2>{activeTraining.name}</h2>
                    <p>
                      {completedTrainingExercises} de {activeTraining.exercises.length} exercícios
                      concluídos
                    </p>
                  </div>
                  <button className="text-button danger-text" onClick={cancelTraining}>
                    Cancelar treino
                  </button>
                </header>
                <div className="training-exercise-checklist">
                  {activeTraining.exercises.map((exercise, index) => {
                    const running = activeTraining.runningExerciseId === exercise.id;
                    const remaining = exercise.remainingSeconds ?? exerciseSeconds(exercise);
                    return (
                      <article
                        className={
                          exercise.completed
                            ? "training-exercise-row completed"
                            : "training-exercise-row"
                        }
                        key={exercise.id}
                      >
                        <label className="exercise-checkbox">
                          <input
                            type="checkbox"
                            checked={Boolean(exercise.completed)}
                            onChange={() => toggleTrainingExerciseDone(exercise.id)}
                          />
                          <span>
                            <Check size={15} />
                          </span>
                        </label>
                        <div className="exercise-main">
                          <small>EXERCÍCIO {index + 1}</small>
                          <strong>{exercise.name}</strong>
                          <em>{exerciseTargetLabel(exercise)}</em>
                        </div>
                        {exercise.mode === "time" ? (
                          <>
                            <b className={remaining === 0 ? "timer-finished" : ""}>
                              {formatTime(remaining)}
                            </b>
                            <div className="exercise-timer-controls">
                              <button
                                className="icon-button"
                                onClick={() => toggleTrainingTimer(exercise.id)}
                                disabled={exercise.completed || remaining === 0}
                                aria-label={running ? "Pausar cronômetro" : "Iniciar cronômetro"}
                              >
                                {running ? <CirclePause size={18} /> : <CirclePlay size={18} />}
                              </button>
                              <button
                                className="icon-button"
                                onClick={() => resetTrainingTimer(exercise.id)}
                                disabled={exercise.completed}
                                aria-label="Reiniciar cronômetro"
                              >
                                <RotateCcw size={17} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <b className="reps-value">
                            {exercise.target}
                            <small> rep.</small>
                          </b>
                        )}
                      </article>
                    );
                  })}
                </div>
                <div className="training-progress">
                  <i
                    style={{
                      width: `${activeTrainingProgress}%`,
                    }}
                  />
                </div>
                <button
                  className="button primary large full"
                  onClick={finishTraining}
                  disabled={!activeTraining.exercises.some((exercise) => exercise.completed)}
                >
                  <Check size={18} /> Finalizar e registrar treino
                </button>
              </article>
            ) : (
              <div className="training-layout">
                <article className="settings-card training-builder">
                  <header>
                    <span>
                      <Plus size={20} />
                    </span>
                    <div>
                      <h2>Criar treino</h2>
                      <p>Adicione exercícios e escolha os dias planejados.</p>
                    </div>
                  </header>
                  <form onSubmit={saveTrainingPlan}>
                    <div className="field">
                      <label htmlFor="training-name">Nome do treino</label>
                      <input
                        id="training-name"
                        value={trainingName}
                        onChange={(event) => setTrainingName(event.target.value)}
                        placeholder="Ex.: Condicionamento de terça"
                      />
                    </div>
                    <fieldset className="day-picker">
                      <legend>Dias do cronograma</legend>
                      {TRAINING_DAYS.map((day) => (
                        <button
                          type="button"
                          key={day}
                          className={trainingDays.includes(day) ? "active" : ""}
                          onClick={() =>
                            setTrainingDays((current) =>
                              current.includes(day)
                                ? current.filter((item) => item !== day)
                                : [...current, day],
                            )
                          }
                        >
                          {day}
                        </button>
                      ))}
                    </fieldset>
                    <div className="exercise-composer">
                      <div className="field grow">
                        <label htmlFor="exercise-name">Exercício</label>
                        <input
                          id="exercise-name"
                          value={exerciseDraft.name}
                          onChange={(event) =>
                            setExerciseDraft({ ...exerciseDraft, name: event.target.value })
                          }
                          placeholder="Ex.: Agachamento"
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="exercise-mode">Controle</label>
                        <select
                          id="exercise-mode"
                          value={exerciseDraft.mode}
                          onChange={(event) =>
                            setExerciseDraft({
                              ...exerciseDraft,
                              mode: event.target.value,
                              target: event.target.value === "time" ? 30 : 10,
                            })
                          }
                        >
                          <option value="time">Tempo</option>
                          <option value="reps">Repetições</option>
                        </select>
                      </div>
                      <div className="field target-field">
                        <label htmlFor="exercise-target">Quantidade</label>
                        <input
                          id="exercise-target"
                          type="number"
                          min="1"
                          value={exerciseDraft.target}
                          onChange={(event) =>
                            setExerciseDraft({ ...exerciseDraft, target: event.target.value })
                          }
                        />
                      </div>
                      {exerciseDraft.mode === "time" && (
                        <div className="field unit-field">
                          <label htmlFor="exercise-unit">Unidade</label>
                          <select
                            id="exercise-unit"
                            value={exerciseDraft.unit}
                            onChange={(event) =>
                              setExerciseDraft({ ...exerciseDraft, unit: event.target.value })
                            }
                          >
                            <option value="seconds">Segundos</option>
                            <option value="minutes">Minutos</option>
                            <option value="hours">Horas</option>
                          </select>
                        </div>
                      )}
                      <button
                        className="icon-button add-exercise"
                        type="button"
                        onClick={addTrainingExercise}
                        aria-label="Adicionar exercício"
                      >
                        <Plus size={19} />
                      </button>
                    </div>
                    {trainingExercises.length > 0 && (
                      <div className="draft-exercises">
                        {trainingExercises.map((exercise, index) => (
                          <div key={exercise.id}>
                            <b>{index + 1}</b>
                            <span>
                              <strong>{exercise.name}</strong>
                              <small>{exerciseTargetLabel(exercise)}</small>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setTrainingExercises((current) =>
                                  current.filter((item) => item.id !== exercise.id),
                                )
                              }
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      className="button primary large full"
                      disabled={!trainingName.trim() || !trainingExercises.length}
                    >
                      <Save size={18} /> Salvar no cronograma
                    </button>
                  </form>
                </article>
                <div className="training-side">
                  <article className="settings-card">
                    <header>
                      <span>
                        <ClipboardList size={20} />
                      </span>
                      <div>
                        <h2>Meus treinos</h2>
                        <p>Escolha uma rotina para começar.</p>
                      </div>
                      <b>{(data.trainingPlans || []).length}</b>
                    </header>
                    {(data.trainingPlans || []).length === 0 ? (
                      <EstadoVazio
                        icon={<Dumbbell size={28} />}
                        title="Nenhum treino criado"
                        text="Monte sua primeira rotina ao lado."
                      />
                    ) : (
                      <div className="training-plan-list">
                        {data.trainingPlans.map((plan) => (
                          <div className="training-plan" key={plan.id}>
                            <div>
                              <strong>{plan.name}</strong>
                              <small>
                                {plan.exercises.length} exercícios ·{" "}
                                {plan.days?.length ? plan.days.join(", ") : "sem dias definidos"}
                              </small>
                            </div>
                            <button className="button primary" onClick={() => startTraining(plan)}>
                              <CirclePlay size={16} /> Iniciar
                            </button>
                            <button
                              className="icon-button danger"
                              onClick={() => deleteTrainingPlan(plan.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                  <article className="settings-card training-history-card">
                    <header>
                      <span>
                        <Check size={20} />
                      </span>
                      <div>
                        <h2>Atividades concluídas</h2>
                        <p>Registro dos treinos realizados.</p>
                      </div>
                    </header>
                    {(data.trainingHistory || []).length === 0 ? (
                      <p className="training-empty-text">Nenhum treino concluído ainda.</p>
                    ) : (
                      <div className="training-history">
                        {data.trainingHistory.slice(0, 8).map((training) => (
                          <div key={training.id}>
                            <Check size={15} />
                            <span>
                              <strong>{training.name}</strong>
                              <small>
                                {new Date(training.finishedAt).toLocaleDateString("pt-BR")} ·{" "}
                                {
                                  (training.exercises || []).filter(
                                    (exercise) => exercise.completed || exercise.completedAt,
                                  ).length
                                }{" "}
                                concluídos
                              </small>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                </div>
              </div>
            )}
          </section>
        )}

        {false && view === "training-stats" && (
          <section className="training-stats-view">
            <div className="section-heading stats-heading training-stats-heading">
              <div>
                <span className="eyebrow">EVOLUÇÃO PESSOAL</span>
                <h1>Estatísticas de treino</h1>
                <p className="section-description">
                  Acompanhe a frequência, o volume e os exercícios concluídos.
                </p>
              </div>
              <label className="month-picker">
                <CalendarDays size={18} />
                <input
                  type="month"
                  value={trainingStatsMonth}
                  onChange={(event) => setTrainingStatsMonth(event.target.value)}
                />
              </label>
            </div>
            <div className="summary-strip evolution-summary">
              <Resumo
                icon={<Dumbbell size={20} />}
                label="Treinos realizados"
                value={trainingMonthSessions.length}
              />
              <Resumo
                icon={<Check size={20} />}
                label="Exercícios concluídos"
                value={trainingCompletedExercises.length}
              />
              <Resumo
                icon={<Clock3 size={20} />}
                label="Tempo planejado"
                value={formatTrainingDuration(trainingTimeSeconds)}
              />
              <Resumo
                icon={<Activity size={20} />}
                label="Repetições"
                value={trainingRepetitions}
              />
            </div>
            <div className="training-stats-grid">
              <article className="settings-card">
                <header>
                  <span>
                    <TrendingUp size={20} />
                  </span>
                  <div>
                    <h2>Frequência por treino</h2>
                    <p>Quantas vezes cada rotina foi registrada no mês.</p>
                  </div>
                </header>
                {trainingPlanRanking.length === 0 ? (
                  <EstadoVazio
                    icon={<BarChart3 size={28} />}
                    title="Sem treinos neste mês"
                    text="Finalize um treino para começar o acompanhamento."
                  />
                ) : (
                  <div className="training-frequency-list">
                    {trainingPlanRanking.map(([name, total], index) => (
                      <div key={name}>
                        <b>{index + 1}</b>
                        <span>
                          <strong>{name}</strong>
                          <i>
                            <em
                              style={{
                                width: `${Math.max(8, (total / trainingPlanRanking[0][1]) * 100)}%`,
                              }}
                            />
                          </i>
                        </span>
                        <strong>{total}x</strong>
                      </div>
                    ))}
                  </div>
                )}
              </article>
              <article className="settings-card">
                <header>
                  <span>
                    <ClipboardList size={20} />
                  </span>
                  <div>
                    <h2>Sessões do mês</h2>
                    <p>Detalhes dos treinos registrados.</p>
                  </div>
                </header>
                {trainingMonthSessions.length === 0 ? (
                  <p className="training-empty-text">Nenhuma sessão encontrada.</p>
                ) : (
                  <div className="training-session-list">
                    {trainingMonthSessions.map((training) => {
                      const completed = (training.exercises || []).filter(
                        (exercise) => exercise.completed || exercise.completedAt,
                      );
                      return (
                        <div key={training.id}>
                          <span className="match-date-badge">
                            {new Date(training.finishedAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                          <div>
                            <strong>{training.name}</strong>
                            <small>
                              {completed.length} de {(training.exercises || []).length} exercícios
                              concluídos
                            </small>
                          </div>
                          <b>
                            {completed.length === (training.exercises || []).length
                              ? "Completo"
                              : "Parcial"}
                          </b>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            </div>
          </section>
        )}

        {view === "mural" && (
          <section className="mural-view">
            <div className="mural-hero">
              <div>
                <span className="eyebrow">GESTÃO E TRANSPARÊNCIA</span>
                <h1>Portal público</h1>
                <p>Publique classificações, agenda e resultados em um ambiente somente leitura.</p>
              </div>
              <Globe2 size={46} />
            </div>
            {settingsMessage && (
              <p className="settings-message" role="status">
                {settingsMessage}
              </p>
            )}
            <article className="settings-card public-settings-card">
              <header>
                <span>
                  <Globe2 size={20} />
                </span>
                <div>
                  <h2>Compartilhar portal</h2>
                  <p>O link é público, mas continua estritamente em modo de leitura.</p>
                </div>
                {publicConfig.page && (
                  <b className={`public-status ${publicConfig.page.enabled ? "enabled" : ""}`}>
                    {publicConfig.page.enabled ? "No ar" : "Desativado"}
                  </b>
                )}
              </header>
              {publicConfig.page && (
                <>
                  <div className="field public-owner-sport">
                    <label htmlFor="public-share-sport">Modalidade exibida neste link</label>
                    <select
                      id="public-share-sport"
                      value={statsSport}
                      onChange={(event) => setStatsSport(event.target.value)}
                    >
                      {Object.keys(SPORT_PRESETS)
                        .filter(
                          (sport) =>
                            workspaceMode !== "academy" ||
                            ["Futebol", "Futebol Society", "Futebol de Salão"].includes(sport),
                        )
                        .map((sport) => (
                          <option key={sport}>{sport}</option>
                        ))}
                    </select>
                    <small>
                      Ao trocar, copie novamente o endereço. O visitante verá somente esta
                      modalidade.
                    </small>
                  </div>
                  <div className="public-link-row">
                    <code>{publicPageUrl}</code>
                    <button className="button secondary" onClick={copyPublicLink}>
                      <Copy size={16} /> Copiar link
                    </button>
                    <button
                      className={`button ${publicConfig.page.enabled ? "secondary" : "primary"}`}
                      onClick={togglePublicPage}
                    >
                      {publicConfig.page.enabled ? "Tirar do ar" : "Colocar no ar"}
                    </button>
                  </div>
                  <form className="upcoming-form" onSubmit={saveUpcomingGame}>
                    <div className="field">
                      <label htmlFor="public-game-title">Nome do próximo jogo</label>
                      <input
                        id="public-game-title"
                        maxLength="80"
                        value={publicDraft.title}
                        onChange={(event) =>
                          setPublicDraft({ ...publicDraft, title: event.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="public-game-sport">Esporte</label>
                      <select
                        id="public-game-sport"
                        value={publicDraft.sport}
                        onChange={(event) =>
                          setPublicDraft({ ...publicDraft, sport: event.target.value })
                        }
                      >
                        {Object.keys(SPORT_PRESETS)
                          .filter(
                            (sport) =>
                              workspaceMode !== "academy" ||
                              ["Futebol", "Futebol Society", "Futebol de Salão"].includes(sport),
                          )
                          .map((sport) => (
                            <option key={sport}>{sport}</option>
                          ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="public-game-date">Data e horário</label>
                      <input
                        id="public-game-date"
                        type="datetime-local"
                        required
                        value={publicDraft.scheduled_at}
                        onChange={(event) =>
                          setPublicDraft({ ...publicDraft, scheduled_at: event.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="public-game-location">Local opcional</label>
                      <input
                        id="public-game-location"
                        maxLength="120"
                        value={publicDraft.location}
                        onChange={(event) =>
                          setPublicDraft({ ...publicDraft, location: event.target.value })
                        }
                        placeholder="Ex.: Quadra do bairro"
                      />
                    </div>
                    <button className="button primary">
                      <Plus size={17} /> Adicionar à agenda
                    </button>
                  </form>
                  <div className="upcoming-manage-list">
                    {publicConfig.games.map((game) => (
                      <div key={game.id}>
                        <CalendarDays size={17} />
                        <span>
                          <strong>{game.title}</strong>
                          <small>
                            {new Date(game.scheduled_at).toLocaleString("pt-BR")} · {game.sport}
                            {game.location ? ` · ${game.location}` : ""}
                          </small>
                        </span>
                        <button
                          className="icon-button danger"
                          onClick={() => removeUpcomingGame(game.id)}
                          aria-label={`Excluir ${game.title}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </article>
          </section>
        )}

        {view === "password" && (
          <section className="password-page">
            <button className="recovery-back" type="button" onClick={() => setView("setup")}>
              <ArrowLeft size={17} /> Voltar
            </button>
            <article className="settings-card password-change-card">
              <span className="auth-lock">
                <KeyRound size={23} />
              </span>
              <h1>Trocar senha</h1>
              <p>Digite a senha atual duas vezes e depois confirme a nova senha.</p>
              {settingsMessage && (
                <p className="settings-message" role="status">
                  {settingsMessage}
                </p>
              )}
              <form onSubmit={changeLoggedPassword}>
                <div className="field">
                  <label htmlFor="current-password">Senha atual</label>
                  <input
                    id="current-password"
                    type="password"
                    required
                    maxLength="128"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="current-password-confirm">Repita a senha atual</label>
                  <input
                    id="current-password-confirm"
                    type="password"
                    required
                    maxLength="128"
                    autoComplete="current-password"
                    value={currentPasswordConfirm}
                    onChange={(event) => setCurrentPasswordConfirm(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="new-logged-password">Nova senha</label>
                  <input
                    id="new-logged-password"
                    type="password"
                    minLength={PASSWORD_MIN_LENGTH}
                    maxLength="128"
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="confirm-logged-password">Repita a nova senha</label>
                  <input
                    id="confirm-logged-password"
                    type="password"
                    minLength={PASSWORD_MIN_LENGTH}
                    maxLength="128"
                    required
                    autoComplete="new-password"
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                  />
                </div>
                <button className="button primary large full" disabled={authBusy}>
                  <Save size={18} /> {authBusy ? "Validando..." : "Confirmar troca de senha"}
                </button>
              </form>
            </article>
          </section>
        )}

        {view === "settings" && (
          <section className="settings-view">
            <div className="section-heading settings-heading">
              <div>
                <span className="eyebrow">ADMINISTRAÇÃO</span>
                <h1>Configurações</h1>
                <p>Gerencie a conta, os jogadores do ranking e o histórico de partidas.</p>
              </div>
              <Settings size={28} />
            </div>
            {settingsMessage && (
              <p className="settings-message" role="status">
                {settingsMessage}
              </p>
            )}
            <article className="settings-card account-settings compact-account">
              <header>
                <span>
                  <UserRound size={20} />
                </span>
                <div>
                  <h2>Perfil da conta</h2>
                  <p>Nome exibido no aplicativo.</p>
                </div>
              </header>
              <div className="settings-profile">
                <AvatarPerfil name={displayName} large icon />
                <div>
                  <strong>{displayName}</strong>
                  <small>{session.user.email}</small>
                </div>
                <button className="button secondary" onClick={openProfile}>
                  <Pencil size={17} /> Editar perfil
                </button>
              </div>
            </article>
            <article className="settings-card organization-admin-card">
              <header>
                <span>
                  <Users size={20} />
                </span>
                <div>
                  <h2>Organizações</h2>
                  <p>Administre os grupos de cada área sem sair das configurações.</p>
                </div>
                <b>{groups.length}/20</b>
              </header>
              <div className="settings-mode-tabs" role="tablist" aria-label="Área de gestão">
                <button
                  className={settingsAdminMode === "amateur" ? "active" : ""}
                  onClick={() => selectSettingsManagement("amateur")}
                >
                  Amador
                </button>
                <button
                  className={settingsAdminMode === "academy" ? "active" : ""}
                  onClick={() => selectSettingsManagement("academy")}
                >
                  Treinador
                </button>
              </div>
              <div className="organization-admin-list">
                {groups
                  .filter((group) => (group.management_mode || "amateur") === settingsAdminMode)
                  .map((group) => (
                    <div className="organization-admin-row" key={group.id}>
                      {settingsGroupEdit?.id === group.id ? (
                        <form className="organization-edit-form" onSubmit={saveManagedGroup}>
                          <input
                            value={settingsGroupEdit.name}
                            maxLength="60"
                            required
                            onChange={(event) =>
                              setSettingsGroupEdit({
                                ...settingsGroupEdit,
                                name: event.target.value,
                              })
                            }
                          />
                          <select
                            value={settingsGroupEdit.management_mode}
                            onChange={(event) =>
                              setSettingsGroupEdit({
                                ...settingsGroupEdit,
                                management_mode: event.target.value,
                              })
                            }
                          >
                            <option value="amateur">Amador</option>
                            <option value="academy">Treinador</option>
                          </select>
                          <button className="button primary" type="submit">
                            <Save size={16} /> Salvar
                          </button>
                          <button
                            className="icon-button"
                            type="button"
                            onClick={() => setSettingsGroupEdit(null)}
                            aria-label="Cancelar"
                          >
                            <X size={17} />
                          </button>
                        </form>
                      ) : (
                        <>
                          <div>
                            <strong>{group.name}</strong>
                            <small>
                              {group.id === activeGroupId
                                ? "Em uso agora"
                                : settingsAdminMode === "academy"
                                  ? "Grupo de atletas"
                                  : "Grupo amador"}
                            </small>
                          </div>
                          <div className="manage-actions">
                            {group.id !== activeGroupId && (
                              <button
                                className="button secondary compact"
                                onClick={() => {
                                  setWorkspaceMode(group.management_mode || "amateur");
                                  switchGroup(group.id);
                                }}
                              >
                                Administrar
                              </button>
                            )}
                            <button
                              className="icon-button"
                              onClick={() =>
                                setSettingsGroupEdit({
                                  ...group,
                                  management_mode: group.management_mode || "amateur",
                                })
                              }
                              aria-label={`Editar ${group.name}`}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="icon-button danger"
                              disabled={groups.length <= 1}
                              onClick={() => deleteManagedGroup(group)}
                              aria-label={`Excluir ${group.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                {!groups.some(
                  (group) => (group.management_mode || "amateur") === settingsAdminMode,
                ) && (
                  <p className="organization-empty">Nenhuma organização cadastrada nesta área.</p>
                )}
              </div>
              <button
                className="button secondary"
                onClick={() => {
                  setGroupCreationMode(settingsAdminMode);
                  setGroupName("");
                  setGroupModalOpen(true);
                }}
              >
                <Plus size={17} /> Adicionar{" "}
                {settingsAdminMode === "academy" ? "grupo de atletas" : "grupo amador"}
              </button>
            </article>
            <article className="settings-card cloud-settings-card">
              <header>
                <span>
                  <Cloud size={20} />
                </span>
                <div>
                  <h2>Sincronização e backup</h2>
                  <p>Controle a cópia protegida da conta e faça backups quando precisar.</p>
                </div>
                <b className={`sync-badge ${syncStatus}`}>{syncLabel}</b>
              </header>
              <div className="account-line">
                <span>
                  <Cloud size={20} />
                  <span>
                    <small>Conta conectada</small>
                    <strong>{session.user.email}</strong>
                  </span>
                </span>
              </div>
              {authMessage && (
                <p className="cloud-message" role="status">
                  {authMessage}
                </p>
              )}
              <div className="cloud-settings-actions">
                <button
                  className="button secondary"
                  onClick={syncNow}
                  disabled={syncStatus === "syncing" || syncStatus === "loading"}
                >
                  <RefreshCw size={18} /> Sincronizar agora
                </button>
                <button className="button secondary" onClick={exportBackup}>
                  <Download size={17} /> Exportar backup
                </button>
                <button className="button secondary" onClick={() => importInput.current?.click()}>
                  <Upload size={17} /> Importar backup
                </button>
                <input
                  ref={importInput}
                  type="file"
                  accept="application/json,.json"
                  onChange={importBackup}
                  hidden
                />
              </div>
              <small className="security-note">
                <Shield size={15} /> Cada usuário acessa somente os próprios dados. Backups
                importados são validados e limitados a 2 MB.
              </small>
            </article>
            <article className="settings-card manage-card">
              <header>
                <span>
                  <Users size={20} />
                </span>
                <div>
                  <h2>Jogadores e ranking</h2>
                  <p>
                    Alterar um nome atualiza o cadastro, as escalações e a artilharia. Excluir
                    também remove as pontuações do histórico.
                  </p>
                </div>
                <b>{data.players.length}</b>
              </header>
              {data.players.length === 0 ? (
                <EstadoVazio
                  icon={<Users size={27} />}
                  title="Nenhum jogador cadastrado"
                  text="Os jogadores adicionados aparecerão aqui."
                />
              ) : (
                <div className="manage-list">
                  {data.players.map((player) => (
                    <div
                      className={`manage-row ${player.suspended ? "is-suspended" : ""}`}
                      key={player.id}
                    >
                      <Avatar name={player.name} />
                      {editingPlayer?.id === player.id ? (
                        <input
                          autoFocus
                          maxLength="60"
                          value={editingPlayer.name}
                          onChange={(event) =>
                            setEditingPlayer({ ...editingPlayer, name: event.target.value })
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") savePlayerName();
                            if (event.key === "Escape") setEditingPlayer(null);
                          }}
                          aria-label={`Novo nome de ${player.name}`}
                        />
                      ) : (
                        <div>
                          <strong>{player.name}</strong>
                          <small>
                            {player.suspended
                              ? "Suspenso · fora das seleções e classificações"
                              : `Ativo · nível ${playerStats.get(player.id)?.rating || 1}★`}
                          </small>
                        </div>
                      )}
                      <div className="manage-actions">
                        {editingPlayer?.id === player.id ? (
                          <>
                            <button
                              className="icon-button save-action"
                              onClick={savePlayerName}
                              aria-label="Salvar nome"
                            >
                              <Check size={17} />
                            </button>
                            <button
                              className="icon-button"
                              onClick={() => setEditingPlayer(null)}
                              aria-label="Cancelar edição"
                            >
                              <X size={17} />
                            </button>
                          </>
                        ) : (
                          <>
                            {workspaceMode === "academy" && (
                              <button
                                className="icon-button"
                                onClick={() => openPlayerDetails(player)}
                                aria-label={`Abrir ficha de ${player.name}`}
                              >
                                <UserRound size={16} />
                              </button>
                            )}
                            <button
                              className="icon-button"
                              onClick={() => {
                                setEditingPlayer({ id: player.id, name: player.name });
                                setSettingsMessage("");
                              }}
                              aria-label={`Editar ${player.name}`}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className={`button suspension-button ${player.suspended ? "reactivate" : ""}`}
                              onClick={() => togglePlayerSuspension(player.id)}
                            >
                              {player.suspended ? "Reativar" : "Suspender"}
                            </button>
                          </>
                        )}
                        <button
                          className="icon-button danger"
                          onClick={() => deletePlayerEverywhere(player)}
                          aria-label={`Excluir ${player.name}`}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
            <article className="settings-card manage-card">
              <header>
                <span>
                  <CalendarDays size={20} />
                </span>
                <div>
                  <h2>Histórico de partidas</h2>
                  <p>Edite informações do jogo ou exclua uma partida e suas pontuações.</p>
                </div>
                <b>{data.history.length}</b>
              </header>
              {data.history.length === 0 ? (
                <EstadoVazio
                  icon={<CalendarDays size={27} />}
                  title="Nenhuma partida salva"
                  text="As partidas encerradas aparecerão aqui."
                />
              ) : (
                <div className="manage-list match-manage-list">
                  {data.history.map((game) => (
                    <div className="manage-row match-manage-row" key={game.id}>
                      <span className="match-date-badge">
                        {new Date(game.finishedAt || game.date).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                      <div>
                        <strong>{game.sport}</strong>
                        <small>
                          {game.teams?.[0]?.short || "Time 1"} {game.score?.[0] || 0} ×{" "}
                          {game.score?.[1] || 0} {game.teams?.[1]?.short || "Time 2"} ·{" "}
                          {(game.events || []).filter((event) => event.type === "goal").length}{" "}
                          pontuações registradas
                        </small>
                      </div>
                      <div className="manage-actions">
                        <button
                          className="icon-button"
                          onClick={() => openMatchEditor(game)}
                          aria-label="Editar partida"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button danger"
                          onClick={() => deleteMatch(game)}
                          aria-label="Excluir partida"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
            {historyHasMore && (
              <button
                className="button secondary settings-load-more"
                onClick={fetchMoreHistory}
                disabled={historyLoading}
              >
                <RefreshCw size={17} />{" "}
                {historyLoading
                  ? "Carregando partidas…"
                  : `Carregar mais ${HISTORY_PAGE_SIZE} partidas antigas`}
              </button>
            )}
            <button className="button logout-button" onClick={signOut}>
              <LogOut size={18} /> Sair da conta
            </button>
          </section>
        )}
      </div>

      <RodapeSite />

      {notificationWelcomeOpen && workspaceMode === "academy" && (
        <Modal
          onClose={() => setNotificationWelcomeOpen(false)}
          icon={
            <img
              className="notification-modal-emblem"
              src={brandIconSrc}
              alt=""
              aria-hidden="true"
            />
          }
          color="green"
          title="Avisos do Modo Treinador"
          text="Confira as informações que precisam de atenção hoje. Elas também ficam disponíveis no sino do cabeçalho."
        >
          <div className="notification-welcome-list">
            {academyNotifications.map((notification) => (
              <article className={`notification-item ${notification.type}`} key={notification.id}>
                <div>
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                  <small>{notification.dateLabel}</small>
                </div>
              </article>
            ))}
          </div>
          <button
            className="button primary full"
            type="button"
            onClick={() => setNotificationWelcomeOpen(false)}
          >
            Entendi
          </button>
        </Modal>
      )}

      {matchInfoOpen && !playerDetails && (
        <Modal
          onClose={() => setMatchInfoOpen(false)}
          icon={<Users size={25} />}
          color="green"
          title="Informações dos jogadores"
          text="Selecione um jogador em campo ou no banco. Os dados desta área são privados."
        >
          <div className="match-player-info-list">
            {playersInCurrentMatch.map((matchPlayer) => {
              const registered = data.players.find((player) => player.id === matchPlayer.id);
              return (
                <button
                  key={matchPlayer.id}
                  onClick={() => registered && openPlayerDetails(registered)}
                  disabled={!registered}
                >
                  <Avatar name={matchPlayer.name} />
                  <span>
                    <strong>{matchPlayer.name}</strong>
                    <small>
                      {registered?.academyProfile?.primaryPosition ||
                        "Ficha técnica não preenchida"}
                    </small>
                  </span>
                  <ChevronRight size={17} />
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {playerDetails && (
        <Modal
          onClose={() => setPlayerDetails(null)}
          icon={<UserRound size={25} />}
          color="green"
          title={playerDetails.playerId ? "Ficha técnica e de segurança" : "Cadastrar aluno"}
          text="Informações privadas para apoio ao treinador. Nada desta ficha é publicado no portal."
        >
          <form className="academy-player-form" onSubmit={savePlayerDetails}>
            <nav className="academy-form-tabs" aria-label="Seções da ficha">
              <button
                type="button"
                className={playerDetailsTab === "student" ? "active" : ""}
                onClick={() => setPlayerDetailsTab("student")}
              >
                Dados do aluno
              </button>
              <button
                type="button"
                className={playerDetailsTab === "health" ? "active" : ""}
                onClick={() => setPlayerDetailsTab("health")}
              >
                Saúde e segurança
              </button>
              <button
                type="button"
                className={playerDetailsTab === "tuition" ? "active" : ""}
                onClick={() => setPlayerDetailsTab("tuition")}
              >
                Mensalidade
              </button>
            </nav>

            {playerDetailsTab === "student" && (
              <section className="academy-tab-panel">
                <h3>Dados técnicos e de jogo</h3>
                <div className="two-fields">
                  <div className="field">
                    <label htmlFor="academy-name">Nome</label>
                    <input
                      id="academy-name"
                      value={playerDetails.name}
                      maxLength="60"
                      required
                      onChange={(e) => setPlayerDetails({ ...playerDetails, name: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="academy-nickname">Apelido</label>
                    <input
                      id="academy-nickname"
                      value={playerDetails.nickname}
                      maxLength="40"
                      onChange={(e) =>
                        setPlayerDetails({ ...playerDetails, nickname: e.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="academy-birth">Data de nascimento</label>
                    <input
                      id="academy-birth"
                      type="date"
                      value={playerDetails.birthDate}
                      onChange={(e) =>
                        setPlayerDetails({
                          ...playerDetails,
                          birthDate: e.target.value,
                          age: calculateAge(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="academy-age">Idade</label>
                    <input
                      id="academy-age"
                      type="number"
                      min="3"
                      max="99"
                      value={calculateAge(playerDetails.birthDate)}
                      readOnly
                      aria-readonly="true"
                      placeholder="Calculada automaticamente"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="academy-category">Categoria</label>
                    <select
                      id="academy-category"
                      value={playerDetails.category}
                      onChange={(e) =>
                        setPlayerDetails({ ...playerDetails, category: e.target.value })
                      }
                    >
                      <option value="">Selecione uma categoria</option>
                      {academyCategories.map((category) => (
                        <option value={category} key={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="academy-primary-position">Posição principal</label>
                    <select
                      id="academy-primary-position"
                      value={playerDetails.primaryPosition}
                      onChange={(e) =>
                        setPlayerDetails({ ...playerDetails, primaryPosition: e.target.value })
                      }
                    >
                      <option value="">Selecione</option>
                      {academyPositions.map((position) => (
                        <option key={position}>{position}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="academy-secondary-position">Posição secundária</label>
                    <select
                      id="academy-secondary-position"
                      value={playerDetails.secondaryPosition}
                      onChange={(e) =>
                        setPlayerDetails({ ...playerDetails, secondaryPosition: e.target.value })
                      }
                    >
                      <option value="">Nenhuma</option>
                      {academyPositions.map((position) => (
                        <option key={position}>{position}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="academy-foot">Pé dominante</label>
                    <select
                      id="academy-foot"
                      value={playerDetails.dominantFoot}
                      onChange={(e) =>
                        setPlayerDetails({ ...playerDetails, dominantFoot: e.target.value })
                      }
                    >
                      <option value="">Selecione</option>
                      <option>Destro</option>
                      <option>Canhoto</option>
                      <option>Ambidestro</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="academy-email">E-mail do atleta ou responsável</label>
                    <input
                      id="academy-email"
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      maxLength="254"
                      value={playerDetails.email}
                      onChange={(event) =>
                        setPlayerDetails({ ...playerDetails, email: event.target.value })
                      }
                      placeholder="nome@email.com"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="academy-height">Altura (m)</label>
                    <input
                      id="academy-height"
                      type="text"
                      inputMode="decimal"
                      maxLength="4"
                      value={playerDetails.height}
                      onChange={(event) =>
                        setPlayerDetails({
                          ...playerDetails,
                          height: event.target.value.replace(/[^0-9,.]/g, "").slice(0, 4),
                        })
                      }
                      placeholder="Ex.: 1,75"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="academy-weight">Peso (kg)</label>
                    <input
                      id="academy-weight"
                      type="number"
                      min="10"
                      max="250"
                      step="0.1"
                      value={playerDetails.weight}
                      onChange={(e) =>
                        setPlayerDetails({ ...playerDetails, weight: e.target.value })
                      }
                    />
                  </div>
                </div>
              </section>
            )}
            {playerDetailsTab === "health" && (
              <section className="academy-tab-panel">
                <h3>Saúde e segurança</h3>
                <div className="two-fields">
                  <div className="field">
                    <label htmlFor="academy-restrictions">Restrições médicas</label>
                    <textarea
                      id="academy-restrictions"
                      value={playerDetails.medicalRestrictions}
                      maxLength="500"
                      onChange={(e) =>
                        setPlayerDetails({ ...playerDetails, medicalRestrictions: e.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="academy-allergies">Alergias</label>
                    <textarea
                      id="academy-allergies"
                      value={playerDetails.allergies}
                      maxLength="500"
                      onChange={(e) =>
                        setPlayerDetails({ ...playerDetails, allergies: e.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="academy-blood">Tipo sanguíneo</label>
                    <select
                      id="academy-blood"
                      value={playerDetails.bloodType}
                      onChange={(e) =>
                        setPlayerDetails({ ...playerDetails, bloodType: e.target.value })
                      }
                    >
                      <option value="">Não informado</option>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="academy-medication">Medicamentos contínuos</label>
                    <input
                      id="academy-medication"
                      value={playerDetails.continuousMedication}
                      maxLength="200"
                      onChange={(e) =>
                        setPlayerDetails({ ...playerDetails, continuousMedication: e.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="academy-emergency-name">Contato de emergência</label>
                    <input
                      id="academy-emergency-name"
                      value={playerDetails.emergencyName}
                      maxLength="80"
                      onChange={(e) =>
                        setPlayerDetails({ ...playerDetails, emergencyName: e.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="academy-emergency-phone">Telefone de emergência</label>
                    <input
                      id="academy-emergency-phone"
                      type="tel"
                      value={playerDetails.emergencyPhone}
                      maxLength="15"
                      inputMode="tel"
                      placeholder="(00) 00000-0000"
                      onChange={(e) =>
                        setPlayerDetails({
                          ...playerDetails,
                          emergencyPhone: maskPhone(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </section>
            )}
            {playerDetailsTab === "tuition" && (
              <section className="academy-tab-panel">
                <h3>Mensalidade</h3>
                <div className="tuition-default-bar">
                  <div>
                    <small>Padrão do grupo</small>
                    <strong>
                      {data.settings.academyMonthlyFee
                        ? Number(data.settings.academyMonthlyFee).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        : "Valor não definido"}
                      {data.settings.academyDueDay
                        ? ` · vencimento dia ${data.settings.academyDueDay}`
                        : ""}
                    </strong>
                  </div>
                  <button
                    className="button secondary compact"
                    type="button"
                    onClick={saveAcademyTuitionDefaults}
                  >
                    Salvar como padrão
                  </button>
                </div>
                {settingsMessage && (
                  <p className="form-message tuition-message">{settingsMessage}</p>
                )}
                <div className="two-fields tuition-fields">
                  <div className="field">
                    <label htmlFor="academy-tuition-type">Categoria de pagamento</label>
                    <select
                      id="academy-tuition-type"
                      value={playerDetails.tuitionType || "paying"}
                      onChange={(e) =>
                        setPlayerDetails({ ...playerDetails, tuitionType: e.target.value })
                      }
                    >
                      <option value="paying">Pagante</option>
                      <option value="scholarship50">Bolsista 50%</option>
                      <option value="scholarship100">Bolsista 100%</option>
                    </select>
                    <small className="field-hint">
                      Valor deste aluno:{" "}
                      {(
                        (Number(playerDetails.monthlyFee) || 0) *
                        (playerDetails.tuitionType === "scholarship100"
                          ? 0
                          : playerDetails.tuitionType === "scholarship50"
                            ? 0.5
                            : 1)
                      ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </small>
                  </div>
                  <div className="field">
                    <label htmlFor="academy-monthly-fee">Valor integral da mensalidade</label>
                    <input
                      id="academy-monthly-fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={playerDetails.monthlyFee}
                      onChange={(e) =>
                        setPlayerDetails({ ...playerDetails, monthlyFee: e.target.value })
                      }
                      placeholder="0,00"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="academy-due-day">Dia de vencimento</label>
                    <input
                      id="academy-due-day"
                      type="number"
                      min="1"
                      max="31"
                      value={playerDetails.dueDay}
                      onChange={(e) =>
                        setPlayerDetails({ ...playerDetails, dueDay: e.target.value })
                      }
                      placeholder="Ex.: 10"
                    />
                  </div>
                </div>

                <ControleMensalidades
                  profile={playerDetails}
                  onToggle={updateAnnualPayment}
                  onPaidAtChange={updateAnnualPaymentDate}
                />
              </section>
            )}
            <p className="private-data-note">
              <Shield size={15} /> Dados restritos à conta autenticada e não exibidos no portal
              público.
            </p>
            <div className="academy-form-actions">
              <button
                className="button secondary large"
                type="button"
                onClick={() =>
                  downloadStudentForm({
                    name: playerDetails.name,
                    academyProfile: playerDetails,
                  })
                }
              >
                <Download size={18} /> Exportar ficha em PDF
              </button>
              <button className="button primary large">
                <Save size={18} /> {playerDetails.playerId ? "Salvar ficha" : "Cadastrar aluno"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {groupModalOpen && (
        <Modal
          onClose={() => !groupBusy && setGroupModalOpen(false)}
          icon={<Users size={25} />}
          color="green"
          title="Criar novo grupo"
          text={`Este espaço será criado no modo ${groupCreationMode === "academy" ? "Treinador" : "Amador"}, com dados totalmente independentes.`}
        >
          <form onSubmit={submitNewGroup}>
            <div className="field">
              <label htmlFor="new-group-name">
                {groupCreationMode === "academy" ? "Nome do grupo de atletas" : "Nome do grupo"}
              </label>
              <input
                id="new-group-name"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                maxLength="60"
                placeholder={
                  groupCreationMode === "academy" ? "Ex.: Turma Sub-12" : "Ex.: Quinta à noite"
                }
                autoFocus
                required
              />
            </div>
            <button className="button primary large full" disabled={groupBusy}>
              <Plus size={18} /> {groupBusy ? "Criando..." : "Criar grupo"}
            </button>
          </form>
        </Modal>
      )}

      {goalTeam !== null && match && (
        <Modal
          onClose={() => {
            setGoalTeam(null);
            setGoalScorer("");
            setGoalAssist("");
          }}
          icon={<Goal size={25} />}
          color={match.teams[goalTeam].color}
          title={`Registrar ${scoreAction(match.sport).toLowerCase()}`}
          text={`Informe quem marcou e, se houver, quem deu a assistência pelo ${match.teams[goalTeam].name}.`}
        >
          <div className="goal-fields">
            <div className="field">
              <label htmlFor="goal-scorer">Autor</label>
              <select
                id="goal-scorer"
                value={goalScorer}
                onChange={(event) => {
                  setGoalScorer(event.target.value);
                  if (event.target.value === goalAssist) setGoalAssist("");
                }}
              >
                <option value="">Selecione o jogador</option>
                {match.teams[goalTeam].starters.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>
            {sportKind(match.sport) === "football" && (
              <div className="field">
                <label htmlFor="goal-assist">Assistência (opcional)</label>
                <select
                  id="goal-assist"
                  value={goalAssist}
                  onChange={(event) => setGoalAssist(event.target.value)}
                >
                  <option value="">Sem assistência</option>
                  {match.teams[goalTeam].starters
                    .filter((player) => player.id !== goalScorer)
                    .map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
            {sportKind(match.sport) === "basketball" && (
              <div className="field">
                <label htmlFor="basket-points">Valor da cesta</label>
                <select
                  id="basket-points"
                  value={basketPoints}
                  onChange={(event) => setBasketPoints(Number(event.target.value))}
                >
                  <option value="1">1 ponto</option>
                  <option value="3">3 pontos</option>
                </select>
              </div>
            )}
            <button
              className="button primary large full"
              disabled={!goalScorer}
              onClick={() =>
                registerGoal(
                  goalTeam,
                  goalScorer,
                  sportKind(match.sport) === "football" ? goalAssist : "",
                  sportKind(match.sport) === "basketball" ? basketPoints : 1,
                )
              }
            >
              <Goal size={18} /> Confirmar {scoreAction(match.sport).toLowerCase()}
            </button>
          </div>
        </Modal>
      )}
      {incident && match && (
        <Modal
          onClose={() => {
            setIncident(null);
            setIncidentPlayer("");
          }}
          icon={incident.type === "own_goal" ? <Goal size={25} /> : <X size={25} />}
          color={match.teams[incident.teamIndex].color}
          title={
            incident.type === "own_goal" ? "Registrar gol contra" : "Registrar pênalti perdido"
          }
          text={
            incident.type === "own_goal"
              ? "Selecione o jogador responsável. O gol será somado ao time adversário e descontará 0,5 da avaliação."
              : "Selecione quem perdeu o pênalti. O placar não será alterado e a avaliação terá desconto de 0,3."
          }
        >
          <div className="goal-fields">
            <div className="field">
              <label htmlFor="incident-player">Jogador</label>
              <select
                id="incident-player"
                value={incidentPlayer}
                onChange={(event) => setIncidentPlayer(event.target.value)}
              >
                <option value="">Selecione o jogador</option>
                {match.teams[incident.teamIndex].starters.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="button primary large full"
              disabled={!incidentPlayer}
              onClick={() => registerIncident(incident.type, incident.teamIndex, incidentPlayer)}
            >
              {incident.type === "own_goal" ? <Goal size={18} /> : <X size={18} />}
              Confirmar {incident.type === "own_goal" ? "gol contra" : "pênalti perdido"}
            </button>
          </div>
        </Modal>
      )}
      {subTeam !== null && match && (
        <Modal
          onClose={() => setSubTeam(null)}
          icon={<ArrowDownUp size={25} />}
          color={match.teams[subTeam].color}
          title="Fazer substituição"
          text={
            match.sharedBench
              ? `Escolha uma troca com o banco geral ou entre atletas que já estão em campo para alterar funções.`
              : `Escolha uma troca com o banco ou entre atletas que já estão em campo para alterar funções.`
          }
        >
          <div className="sub-fields">
            <div className="field">
              <label htmlFor="player-out">Sai de quadra</label>
              <select
                id="player-out"
                value={selectedOut}
                onChange={(event) => {
                  const nextOut = event.target.value;
                  setSelectedOut(nextOut);
                  if (selectedIn === nextOut) {
                    setSelectedIn(
                      match.teams[subTeam].starters.find((player) => player.id !== nextOut)?.id ||
                        substitutionBench(match, subTeam)[0]?.id ||
                        "",
                    );
                  }
                }}
              >
                {match.teams[subTeam].starters.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>
            <ArrowDownUp size={21} />
            <div className="field">
              <label htmlFor="player-in">Entra ou assume a posição</label>
              <select
                id="player-in"
                value={selectedIn}
                onChange={(event) => setSelectedIn(event.target.value)}
              >
                {match.teams[subTeam].starters
                  .filter((player) => player.id !== selectedOut)
                  .map((player) => (
                    <option key={`field-${player.id}`} value={player.id}>
                      {player.name} · em campo
                      {player.id === match.teams[subTeam].goalkeeperId ? " (goleiro)" : ""}
                    </option>
                  ))}
                {substitutionBench(match, subTeam).map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} · banco
                    {match.sharedBench
                      ? ` · ${match.teams[player.sourceTeamIndex]?.short || "Banco"}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            className="button primary large full"
            disabled={!selectedIn || selectedIn === selectedOut}
            onClick={confirmSubstitution}
          >
            Confirmar troca
          </button>
        </Modal>
      )}
      {goalkeeperTeam !== null && match && (
        <Modal
          onClose={() => setGoalkeeperTeam(null)}
          icon={<Shield size={25} />}
          color={match.teams[goalkeeperTeam].color}
          title="Trocar goleiro"
          text={
            match.sharedBench
              ? "Escolha alguém da linha ou do banco geral. Se estiver no banco, entra no time e o goleiro atual sai."
              : "Escolha um jogador da linha ou do banco. Se estiver no banco, ele entra e o goleiro atual sai."
          }
        >
          <div className="field">
            <label htmlFor="goalkeeper-candidate">Novo goleiro</label>
            <select
              id="goalkeeper-candidate"
              value={goalkeeperCandidate}
              onChange={(event) => setGoalkeeperCandidate(event.target.value)}
            >
              {[
                ...match.teams[goalkeeperTeam].starters,
                ...substitutionBench(match, goalkeeperTeam),
              ]
                .filter((player) => player.id !== match.teams[goalkeeperTeam].goalkeeperId)
                .map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                    {match.sharedBench && Number.isInteger(player.sourceTeamIndex)
                      ? ` · ${match.teams[player.sourceTeamIndex]?.short || "Banco"}`
                      : ""}
                  </option>
                ))}
            </select>
          </div>
          <button
            className="button primary large full"
            disabled={!goalkeeperCandidate}
            onClick={confirmGoalkeeperChange}
          >
            <Shield size={18} /> Confirmar novo goleiro
          </button>
        </Modal>
      )}
      {teamSwapSide !== null && match && (
        <Modal
          onClose={() => setTeamSwapSide(null)}
          icon={<Users size={25} />}
          color="green"
          title="Trocar o time completo"
          text={`Escolha o time de fora que vai substituir ${match.teams[teamSwapSide].name}. O time que sair volta para a fila.`}
        >
          <div className="reserve-choice-list">
            {(match.reserveTeams || []).map((team) => (
              <button
                type="button"
                key={team.id}
                className={`reserve-choice ${team.color}`}
                onClick={() => swapFullTeam(team.id)}
              >
                <span className="team-dot" />
                <div>
                  <strong>{team.name}</strong>
                  <small>{team.starters.length + team.bench.length} jogadores</small>
                </div>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </Modal>
      )}
      {profileOpen && (
        <Modal
          onClose={() => setProfileOpen(false)}
          icon={<UserRound size={25} />}
          color="green"
          title="Meu perfil"
          text="Personalize o nome exibido na conta."
        >
          <form className="profile-form" onSubmit={saveProfile}>
            <div className="profile-initial-preview">
              <AvatarPerfil name={profileName || displayName} large icon />
              <span>
                <strong>Perfil da conta</strong>
                <small>Ícone padrão de usuário.</small>
              </span>
            </div>
            <div className="field">
              <label htmlFor="profile-name">Nome exibido</label>
              <input
                id="profile-name"
                maxLength="40"
                required
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                placeholder="Como deseja aparecer"
              />
            </div>
            {profileMessage && (
              <p className="cloud-message" role="status">
                {profileMessage}
              </p>
            )}
            <button className="button primary large full" disabled={authBusy}>
              <Save size={18} /> {authBusy ? "Salvando..." : "Salvar perfil"}
            </button>
          </form>
        </Modal>
      )}
      {editingMatch && (
        <Modal
          onClose={() => setEditingMatch(null)}
          icon={<CalendarDays size={25} />}
          color="green"
          title="Editar partida"
          text="A edição do placar corrige o resultado. O ranking continua sendo calculado pelos autores registrados na súmula."
        >
          <form className="edit-match-form" onSubmit={saveMatchEdit}>
            <div className="two-fields">
              <div className="field">
                <label htmlFor="edit-match-date">Data</label>
                <input
                  id="edit-match-date"
                  type="date"
                  required
                  value={editingMatch.date}
                  onChange={(event) =>
                    setEditingMatch({ ...editingMatch, date: event.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="edit-match-sport">Esporte</label>
                <select
                  id="edit-match-sport"
                  value={canonicalSport(editingMatch.sport)}
                  onChange={(event) =>
                    setEditingMatch({ ...editingMatch, sport: event.target.value })
                  }
                >
                  {Object.keys(SPORT_PRESETS).map((sport) => (
                    <option key={sport}>{sport}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="edit-score-fields">
              <div className="field">
                <label htmlFor="edit-score-one">Time 1</label>
                <input
                  id="edit-score-one"
                  type="number"
                  min="0"
                  value={editingMatch.score0}
                  onChange={(event) =>
                    setEditingMatch({ ...editingMatch, score0: event.target.value })
                  }
                />
              </div>
              <b>×</b>
              <div className="field">
                <label htmlFor="edit-score-two">Time 2</label>
                <input
                  id="edit-score-two"
                  type="number"
                  min="0"
                  value={editingMatch.score1}
                  onChange={(event) =>
                    setEditingMatch({ ...editingMatch, score1: event.target.value })
                  }
                />
              </div>
            </div>
            <button className="button primary large full">
              <Save size={18} /> Salvar alterações
            </button>
          </form>
        </Modal>
      )}
    </main>
  );
}
