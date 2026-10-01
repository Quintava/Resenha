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
import {
  canonicalSport,
  scoreAction,
  scoreWord,
  sportKind,
  starsFromScore,
} from "../domain/sports";
import {
  AuthScreen,
  AuthSetupRequired,
  PasswordRecoveryScreen,
} from "../components/auth/AuthScreens";
import {
  Avatar,
  Empty,
  Modal,
  Mode,
  Pagination,
  ProfileAvatar,
  Stars,
  ThemeToggle,
} from "../components/common/Common";
import { PerformanceTable, RankingPanel, Summary } from "../components/stats/RankingComponents";
import {
  MatchEventRow,
  MatchScorers,
  TeamCard,
  TeamScore,
} from "../components/match/MatchComponents";
import { SiteFooter, Topbar } from "../components/layout/AppLayout";
import {
  initialState,
  LEGACY_STORAGE_KEY,
  MIGRATION_OWNER_KEY,
  PLAYER_PAGE_SIZE,
  SPORT_PRESETS,
  TEAM_META,
  THEME_KEY,
  TRAINING_DAYS,
} from "../config/appConfig";
import {
  exerciseSeconds,
  exerciseTargetLabel,
  formatTime,
  formatTrainingDuration,
  minuteOf,
  monthKey,
  thisMonth,
  uid,
} from "../utils/time";
import {
  applyMatchToCareers,
  buildPlayerStats,
  emptyCareer,
  normalizeCareer,
  playerPerformance,
  playerWasInMatch,
  pointsInMatch,
  rebuildPlayerCareers,
} from "../domain/playerStats";
import {
  buildManualTeams,
  drawTeams,
  prepareGoalkeepers,
  substitutionBench,
} from "../domain/teamBuilder";
import {
  hasSavedContent,
  normalizeState,
  readSaved,
  removePlayerFromMatch,
  renamePlayerInMatch,
  userStorageKey,
} from "../domain/appState";
import {
  addUpcomingGame,
  deleteUpcomingGame,
  getPublicSettings,
  HISTORY_PAGE_SIZE,
  loadAllHistory,
  loadMoreHistory,
  loadWorkspace,
  saveWorkspace,
  setPublicEnabled,
} from "../dataService";

const PublicPage = lazy(() => import("../PublicPage"));

export default function ResenhaApp() {
  // Estado principal da conta e navegação.
  const [data, setData] = useState(initialState);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("setup");

  // Formulários e controles da preparação/partida.
  const [playerName, setPlayerName] = useState("");
  const [playerPage, setPlayerPage] = useState(1);
  const [goalTeam, setGoalTeam] = useState(null);
  const [goalScorer, setGoalScorer] = useState("");
  const [goalAssist, setGoalAssist] = useState("");
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
  const [profileName, setProfileName] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingMatch, setEditingMatch] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
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
  const dataRef = useRef(initialState);
  const dirtyRef = useRef(false);
  const syncingRef = useRef(false);
  const finishingRef = useRef(false);
  const authSubmittingRef = useRef(false);
  const cloudLoadedUser = useRef(null);

  // Atalhos do estado precisam existir antes dos cálculos derivados abaixo.
  const match = data.activeMatch;
  // Mantido apenas para migração silenciosa de contas antigas; o modo treino saiu da interface.
  const activeTraining = data.activeTraining;

  // Dados derivados usados por mais de uma tela.
  const playerStats = useMemo(
    () => buildPlayerStats(data.players, data.history, data.settings.sport),
    [data.players, data.history, data.settings.sport],
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
    return [...players.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [data.players, data.history]);
  const playerPageCount = Math.max(1, Math.ceil(data.players.length / PLAYER_PAGE_SIZE));
  const visiblePlayers = useMemo(
    () => data.players.slice((playerPage - 1) * PLAYER_PAGE_SIZE, playerPage * PLAYER_PAGE_SIZE),
    [data.players, playerPage],
  );
  const displayName =
    data.profile?.displayName?.trim() ||
    session?.user?.user_metadata?.display_name ||
    session?.user?.email?.split("@")[0] ||
    "Usuário";
  const attendanceConfigured = Array.isArray(data.settings.attendanceIds);
  const presentPlayers = useMemo(
    () =>
      data.players.filter(
        (player) => !attendanceConfigured || data.settings.attendanceIds.includes(player.id),
      ),
    [data.players, data.settings.attendanceIds, attendanceConfigured],
  );
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
        const assists = (game.events || []).filter(
          (event) => event.type === "goal" && event.assistPlayerId === evolutionPlayer.id,
        ).length;
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
    ? `${window.location.origin}${import.meta.env.BASE_URL}?publico=${publicConfig.page.slug}` +
      `&esporte=${encodeURIComponent(statsSport)}`
    : "";

  // Fecha menus flutuantes ao clicar fora ou pressionar Esc.
  useEffect(() => {
    const closeMenu = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target))
        setProfileMenuOpen(false);
      if (appMenuRef.current && !appMenuRef.current.contains(event.target)) setAppMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setAppMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

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
      localStorage.setItem(userStorageKey(session.user.id), JSON.stringify(data));
      dataRef.current = data;
      dirtyRef.current = true;
    }
  }, [data, ready, session?.user?.id]);

  // Aplica e guarda o tema escolhido.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setStatsSport(canonicalSport(data.settings.sport));
  }, [data.settings.sport]);

  // Observa login, logout e links de recuperação de senha do Supabase.
  useEffect(() => {
    if (!supabaseConfigured) {
      setAuthReady(true);
      return undefined;
    }
    supabase.auth.getSession().then(({ data: authData }) => {
      setSession(authData.session);
      setAuthReady(true);
    });
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

  // Carrega primeiro a cópia local e migra dados das versões antigas apenas uma vez.
  useEffect(() => {
    if (!authReady || !session?.user) {
      setReady(false);
      cloudLoadedUser.current = null;
      return;
    }
    const key = userStorageKey(session.user.id);
    let saved = readSaved(key);
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
    setView(saved.activeMatch ? "match" : "setup");
    setReady(true);
  }, [authReady, session?.user?.id]);

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
        const loaded = await loadWorkspace(session.user.id, initialState);
        if (cancelled) return;
        let cloudData = normalizeState(loaded.state);
        if (cloudData.players.some((player) => !normalizeCareer(player.career))) {
          const completeHistory = await loadAllHistory(session.user.id);
          cloudData = {
            ...cloudData,
            players: rebuildPlayerCareers(cloudData.players, completeHistory),
          };
          await saveWorkspace(session.user.id, cloudData);
        }
        setData(cloudData);
        dataRef.current = cloudData;
        if (cloudData.activeMatch) setView("match");
        setHistoryHasMore(loaded.hasMore);
        dirtyRef.current = false;
        cloudLoadedUser.current = session.user.id;
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
  }, [ready, session?.user?.id]);

  // O serviço compara impressões digitais para enviar somente o que mudou.
  const syncNow = useCallback(async () => {
    if (
      !supabaseConfigured ||
      !session?.user ||
      syncingRef.current ||
      cloudLoadedUser.current !== session.user.id
    )
      return;
    syncingRef.current = true;
    setSyncStatus("syncing");
    try {
      await saveWorkspace(session.user.id, dataRef.current);
      dirtyRef.current = false;
      setSyncStatus("synced");
    } catch (error) {
      setSyncStatus("error");
      setAuthMessage(`Falha ao sincronizar: ${error.message}`);
    }
    syncingRef.current = false;
  }, [session?.user?.id]);

  // Sincroniza periodicamente sem fazer requisições quando não há alterações.
  useEffect(() => {
    if (!session?.user || !supabaseConfigured) return undefined;
    const interval = window.setInterval(() => {
      if (dirtyRef.current) syncNow();
    }, 3000);
    return () => window.clearInterval(interval);
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

  const startMatch = useCallback(() => {
    setSetupMessage("");
    if (presentPlayers.length < 2) {
      setSetupMessage("Marque pelo menos 2 jogadores presentes.");
      return { ok: false, error: "Marque pelo menos 2 jogadores presentes." };
    }
    const durationSeconds = data.settings.duration * 60;
    const teamCount = Math.max(2, Math.min(TEAM_META.length, Number(data.settings.teamCount) || 2));
    const ratedPlayers = presentPlayers.map((player) => ({
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
          )
        : drawTeams(ratedPlayers, data.settings.drawMode, data.settings.startersPerTeam, teamCount),
    );
    const match = {
      id: uid(),
      sessionId: uid(),
      roundNumber: 1,
      date: new Date().toISOString(),
      sport: data.settings.sport,
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
        ? `${allTeams.length} times prontos. Os times de fora ficam na fila da resenha.`
        : "Escalação salva para as próximas partidas desta resenha.",
    );
    setView("match");
    return { ok: true, matchId: match.id };
  }, [data.settings, manualAssignments, playerStats, presentPlayers]);

  // Cada pontuação vira um evento individual, inclusive para a sincronização incremental.
  const registerGoal = useCallback((teamIndex, playerId, assistPlayerId = "") => {
    let result = { ok: false, error: "Jogador não encontrado." };
    setData((current) => {
      const match = current.activeMatch;
      const player = match?.teams[teamIndex]?.starters.find((item) => item.id === playerId);
      const assistPlayer = match?.teams[teamIndex]?.starters.find(
        (item) => item.id === assistPlayerId,
      );
      if (!match || !player) return current;
      const score = [...match.score];
      score[teamIndex] += 1;
      const event = {
        id: uid(),
        type: "goal",
        teamIndex,
        playerId,
        playerName: player.name,
        assistPlayerId: assistPlayer?.id || null,
        assistPlayerName: assistPlayer?.name || null,
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
      description: "Adiciona um jogador à lista do Resenha.",
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
  const changeSport = (sport) => {
    const preset = SPORT_PRESETS[sport];
    setData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        sport,
        startersPerTeam: preset.players,
        duration: preset.duration,
      },
    }));
    setStatsSport(sport);
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
    setSelectedIn(availableBench[0]?.id || "");
  };

  const confirmSubstitution = () => {
    setData((current) => {
      const match = current.activeMatch;
      if (!match || subTeam === null || !selectedOut || !selectedIn) return current;
      const out = match.teams[subTeam].starters.find((player) => player.id === selectedOut);
      const incomingOption = substitutionBench(match, subTeam).find(
        (player) => player.id === selectedIn,
      );
      if (!out || !incomingOption) return current;
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
      if (event.type === "goal") score[event.teamIndex] = Math.max(0, score[event.teamIndex] - 1);
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

  // Salva a partida em andamento, quando houve jogo, e encerra toda a resenha.
  const endSession = () => {
    if (!data.activeMatch || finishingRef.current) return;
    const played =
      data.activeMatch.events.length > 0 ||
      data.activeMatch.score.some((value) => value > 0) ||
      data.activeMatch.remainingSeconds < data.activeMatch.durationSeconds;
    const message = played
      ? "Salvar esta partida e encerrar a resenha de hoje?"
      : "Encerrar a resenha? Esta partida vazia não será salva.";
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
          games: 0,
          evaluationTotal: 0,
        };
        const performance = playerPerformance(match, player.id);
        item.games += 1;
        item.goals += performance.points;
        item.assists += performance.assists;
        item.saves += performance.goalkeeper.saves;
        item.evaluationTotal += performance.score;
        players.set(player.id, item);
      });
    });
    return [...players.values()].map((player) => {
      const evaluation = player.games
        ? Number((player.evaluationTotal / player.games).toFixed(1))
        : 0;
      return {
        ...player,
        total: player.goals + player.assists,
        saveAverage: player.games ? player.saves / player.games : 0,
        evaluation,
        stars: starsFromScore(evaluation, player.games),
      };
    });
  }, [monthMatches]);
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
    return data.players
      .map((player) => {
        const career = normalizeCareer(player.career)?.sports?.[sport];
        if (!career?.games) return null;
        return {
          id: player.id,
          name: player.name,
          goals: career.points,
          assists: career.assists,
          saves: career.goalkeeperSaves,
          saveAverage: career.goalkeeperSaves / career.games,
          games: career.games,
          total: career.points + career.assists,
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
  }, [data.players, statsSport]);
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
      .map((player) => {
        const performance = playerPerformance(selectedRankingMatch, player.id);
        return {
          id: player.id,
          name: player.name,
          goals: performance.points,
          assists: performance.assists,
          saves: performance.goalkeeper.saves,
          saveAverage: performance.goalkeeper.saves,
          games: 1,
          total: performance.points + performance.assists,
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
  }, [selectedRankingMatch]);
  const displayedRanking =
    rankingScope === "match"
      ? matchRanking
      : rankingScope === "month"
        ? monthlyRanking
        : overallRanking;
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
    const credentials = { email: authEmail.trim(), password: authPassword };
    const result =
      authMode === "signup"
        ? await supabase.auth.signUp({
            ...credentials,
            options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
          })
        : await supabase.auth.signInWithPassword(credentials);
    setAuthBusy(false);
    authSubmittingRef.current = false;
    if (result.error) {
      setAuthMessage(result.error.message);
      return;
    }
    setAuthPassword("");
    if (authMode === "signup" && !result.data.session) {
      setAuthMessage("Cadastro criado. Confirme o e-mail recebido e depois entre na conta.");
    } else {
      setAuthMessage("Conta conectada. Os dados estão sendo sincronizados.");
    }
  };

  const sendPasswordReset = async () => {
    const email = authEmail.trim();
    if (!email) {
      setAuthMessage("Digite seu e-mail para receber o link de recuperação.");
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
    });
    setAuthBusy(false);
    setAuthMessage(
      error
        ? error.message
        : "Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.",
    );
  };

  const submitRecoveryPassword = async (event) => {
    event.preventDefault();
    if (recoveryPassword.length < 6) {
      setAuthMessage("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (recoveryPassword !== recoveryConfirm) {
      setAuthMessage("As senhas digitadas não são iguais.");
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    const { error } = await supabase.auth.updateUser({ password: recoveryPassword });
    if (!error) await supabase.auth.signOut();
    setAuthBusy(false);
    if (error) {
      setAuthMessage(error.message);
      return;
    }
    setPasswordRecovery(false);
    setRecoveryPassword("");
    setRecoveryConfirm("");
    setAuthMessage("Senha alterada com sucesso. Entre novamente com a nova senha.");
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
    const original = managedPlayers.find((player) => player.id === editingPlayer?.id);
    if (!original || !nextName) return;
    if (
      managedPlayers.some(
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
    if (newPassword.length < 6) {
      setSettingsMessage("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setSettingsMessage("As senhas digitadas não são iguais.");
      return;
    }
    setAuthBusy(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    });
    setAuthBusy(false);
    if (error) {
      setSettingsMessage(
        error.message.toLowerCase().includes("current")
          ? "A senha atual está incorreta."
          : "Não foi possível alterar a senha. Tente novamente.",
      );
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setSettingsMessage("Senha alterada com sucesso.");
  };

  const signOut = async () => {
    if (dirtyRef.current) await syncNow();
    await supabase.auth.signOut();
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

  // Paginação do histórico e administração do Mural público.
  const fetchMoreHistory = async () => {
    if (!session?.user || historyLoading || !historyHasMore) return;
    setHistoryLoading(true);
    try {
      const page = await loadMoreHistory(session.user.id, dataRef.current.history.length);
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
      setPublicConfig(await getPublicSettings(session.user.id, "Mural da Resenha"));
    } catch (error) {
      setSettingsMessage(`Não foi possível carregar a página pública: ${error.message}`);
    }
  }, [displayName, session?.user?.id]);

  useEffect(() => {
    if ((view === "mural" || view === "stats") && ready) refreshPublicConfig();
  }, [ready, refreshPublicConfig, view]);

  const togglePublicPage = async () => {
    const enabled = !publicConfig.page?.enabled;
    await setPublicEnabled(session.user.id, enabled);
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
      await addUpcomingGame(session.user.id, {
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
    await deleteUpcomingGame(session.user.id, id);
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
      setSettingsMessage("Ative o Mural da Resenha para compartilhar o ranking.");
      setView("mural");
      return;
    }
    window.open(publicPageUrl, "_blank", "noopener,noreferrer");
  };

  // O backup é completo; a importação valida estrutura e limites antes de substituir os dados.
  const exportBackup = async () => {
    let backup = dataRef.current;
    try {
      backup = { ...backup, history: await loadAllHistory(session.user.id) };
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
  if (!supabaseConfigured) return <AuthSetupRequired theme={theme} setTheme={setTheme} />;
  if (publicSlug)
    return (
      <Suspense fallback={<main className="app-shell loading">Carregando página pública…</main>}>
        <PublicPage slug={publicSlug} />
      </Suspense>
    );
  if (!authReady) return <main className="app-shell loading">Verificando acesso…</main>;
  if (passwordRecovery)
    return (
      <PasswordRecoveryScreen
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
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        email={authEmail}
        setEmail={setAuthEmail}
        password={authPassword}
        setPassword={setAuthPassword}
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
  if (!ready) return <main className="app-shell loading">Preparando o Resenha…</main>;
  const currentRankingKind = sportKind(statsSport);
  const primaryRanking = displayedRanking;
  const displayedScores = displayedRanking.reduce((sum, player) => sum + player.goals, 0);
  const displayedGames =
    rankingScope === "match"
      ? selectedRankingMatch
        ? 1
        : 0
      : rankingScope === "month"
        ? monthMatches.length
        : sportMatches.length;

  // Interface autenticada principal.
  return (
    <main className="app-shell">
      <Topbar
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
          setView("settings");
        }}
        onOpenPassword={() => {
          setProfileMenuOpen(false);
          setSettingsMessage("");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmNewPassword("");
          setView("password");
        }}
        onSignOut={signOut}
      />

      <div className="page-wrap">
        {view === "setup" && (
          <section className="view-grid setup-grid">
            <div className="main-column">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">PASSO 1</span>
                  <h1>Quem vai jogar hoje?</h1>
                </div>
                <span className="count-pill">{data.players.length} cadastrados</span>
              </div>
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
              <div className="attendance-toolbar">
                <div>
                  <Check size={18} />
                  <span>
                    <strong>Presença de hoje</strong>
                    <small>
                      {presentPlayers.length} de {data.players.length} confirmados
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
                {data.players.length === 0 ? (
                  <Empty
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
                          <Stars
                            rating={stats.rating}
                            label={`Nível geral: ${stats.rating} de 5`}
                          />
                          <small>
                            {stats.label} · média geral{" "}
                            {stats.matches ? stats.evaluation.toFixed(1) : "—"}
                          </small>
                          {stats.lastRating !== null && <em>Último jogo: {stats.lastRating}★</em>}
                        </div>
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
                      </article>
                    );
                  })
                )}
              </div>
              {data.players.length > PLAYER_PAGE_SIZE && (
                <Pagination
                  page={playerPage}
                  pageCount={playerPageCount}
                  onChange={setPlayerPage}
                />
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
                  {Object.keys(SPORT_PRESETS).map((sport) => (
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
                <Mode
                  active={data.settings.drawMode === "balanced"}
                  onClick={() => updateSettings("drawMode", "balanced")}
                  icon={<Shield size={19} />}
                  title="Equilibrado"
                  text="Usa o desempenho geral"
                />
                <Mode
                  active={data.settings.drawMode === "random"}
                  onClick={() => updateSettings("drawMode", "random")}
                  icon={<Sparkles size={19} />}
                  title="Aleatório"
                  text="Sem considerar nível"
                />
                <Mode
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
                  <strong>Banco geral da resenha</strong>
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
                    <small>Defina o time dos presentes</small>
                  </header>
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
                          >
                            {team.short}
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
                <span className="eyebrow">RESENHA EM ANDAMENTO</span>
                <strong>Partida {match.roundNumber || 1}</strong>
                <small>
                  {matchMessage || "A escalação continuará salva quando esta partida terminar."}
                </small>
              </div>
              <span className="bench-status">
                <ArrowDownUp size={15} />
                {match.sharedBench ? "Banco geral" : "Reservas por time"}
              </span>
            </div>
            <section className="match-score-hero" aria-label="Placar da partida">
              <div className="scoreboard">
                <TeamScore team={match.teams[0]} score={match.score[0]} />
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
                <TeamScore team={match.teams[1]} score={match.score[1]} />
              </div>
              <MatchScorers match={match} />
            </section>
            {(match.reserveTeams || []).length > 0 && (
              <section className="reserve-teams">
                <header>
                  <div>
                    <span className="eyebrow">FILA DA RESENHA</span>
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
                <TeamCard
                  key={team.name}
                  team={team}
                  scoreLabel={scoreAction(match.sport)}
                  onGoal={(playerId) => {
                    setGoalTeam(teamIndex);
                    setGoalScorer(playerId);
                    setGoalAssist("");
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
                      <MatchEventRow
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
                    <X size={16} /> Finalizar resenha
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
                  {Object.keys(SPORT_PRESETS).map((sport) => (
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
                {currentRankingKind === "football" ? "Gols e assistências" : "Pontuadores"}
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
                  <Summary
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
                  <Summary
                    icon={<Goal size={20} />}
                    label={`${scoreAction(statsSport)}s na seleção`}
                    value={displayedScores}
                  />
                  <Summary
                    icon={<CalendarDays size={20} />}
                    label="Partidas consideradas"
                    value={displayedGames}
                  />
                </div>
                <article className="ranking-table-card">
                  <header>
                    <div>
                      <span className="eyebrow">TABELA OFICIAL DA ZOEIRA</span>
                      <h2>
                        {rankingScope === "match"
                          ? "Avaliação da partida"
                          : rankingScope === "month"
                            ? "Desempenho mensal"
                            : "Ranking geral"}
                      </h2>
                    </div>
                    <button className="button secondary" onClick={openPublicRanking}>
                      <Globe2 size={17} /> Abrir no Mural
                    </button>
                  </header>
                  <p className="rating-explanation">
                    <Shield size={16} /> A nota de cada partida começa em 6,0. Vitória vale +0,35,
                    empate +0,15, cada {scoreAction(statsSport).toLowerCase()} +0,55 e assistência
                    +0,30. O bônus ofensivo é limitado a +2,0; ações de goleiro têm pesos próprios.
                  </p>
                  <PerformanceTable ranking={displayedRanking} sport={statsSport} />
                </article>
              </>
            )}
            {statsSection === "scorers" && (
              <div
                className={`ranking-panels ${currentRankingKind === "football" ? "three" : "single"}`}
              >
                {currentRankingKind === "football" ? (
                  <>
                    <RankingPanel
                      title="Participações"
                      eyebrow="GOLS + ASSISTÊNCIAS"
                      ranking={[...rankingData].sort(
                        (a, b) => b.total - a.total || b.goals - a.goals,
                      )}
                      valueKey="total"
                      valueLabel="participações"
                    />
                    <RankingPanel
                      title="Assistências"
                      eyebrow="GARÇONS DO MÊS"
                      ranking={assistsRanking}
                      valueKey="assists"
                      valueLabel="assistências"
                    />
                    <RankingPanel
                      title="Gols"
                      eyebrow="ARTILHARIA"
                      ranking={goalsRanking}
                      valueKey="goals"
                      valueLabel="gols"
                    />
                  </>
                ) : (
                  <RankingPanel
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
                  <Empty
                    icon={<CalendarDays size={28} />}
                    title="Nenhum jogo nesta seleção"
                    text="Altere o mês ou carregue partidas anteriores."
                  />
                ) : (
                  <div className="history-list">
                    {monthMatches.map((game) => (
                      <div className="history-row" key={game.id}>
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
                        </div>
                      </div>
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
                <ProfileAvatar name={evolutionPlayer?.name || "Atleta"} large />
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
                <Empty
                  icon={<TrendingUp size={30} />}
                  title="Nenhum jogador disponível"
                  text="Cadastre jogadores e encerre partidas para acompanhar a evolução."
                />
              </article>
            ) : (
              <>
                <div className="summary-strip evolution-summary">
                  <Summary
                    icon={<CalendarDays size={20} />}
                    label="Presenças no mês"
                    value={evolutionGames.length}
                  />
                  <Summary icon={<Goal size={20} />} label="Pontuações" value={evolutionPoints} />
                  <Summary
                    icon={<Sparkles size={20} />}
                    label="Assistências"
                    value={evolutionAssists}
                  />
                  <Summary
                    icon={<TrendingUp size={20} />}
                    label="Média por partida"
                    value={evolutionAverage.toFixed(1)}
                  />
                </div>
                <div className="evolution-grid">
                  <article className="evolution-profile-card">
                    <ProfileAvatar name={evolutionPlayer.name} large />
                    <div>
                      <span className="eyebrow">NÍVEL GERAL</span>
                      <h2>{evolutionPlayer.name}</h2>
                      <Stars
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
                      <Empty
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
                            <Stars rating={rating} label={`Nível da partida: ${rating} estrelas`} />
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
                      <Empty
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
              <Summary
                icon={<Dumbbell size={20} />}
                label="Treinos realizados"
                value={trainingMonthSessions.length}
              />
              <Summary
                icon={<Check size={20} />}
                label="Exercícios concluídos"
                value={trainingCompletedExercises.length}
              />
              <Summary
                icon={<Clock3 size={20} />}
                label="Tempo planejado"
                value={formatTrainingDuration(trainingTimeSeconds)}
              />
              <Summary
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
                  <Empty
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
                <span className="eyebrow">A TABELA OFICIAL DA ZOEIRA</span>
                <h1>Mural da Resenha</h1>
                <p>Escolha a modalidade, publique o link e deixe a classificação falar por si.</p>
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
                  <h2>Compartilhar o Mural</h2>
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
                      {Object.keys(SPORT_PRESETS).map((sport) => (
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
                        {Object.keys(SPORT_PRESETS).map((sport) => (
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
              <p>Confirme a senha atual e informe a nova senha duas vezes.</p>
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
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="new-logged-password">Nova senha</label>
                  <input
                    id="new-logged-password"
                    type="password"
                    minLength="6"
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
                    minLength="6"
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
                <ProfileAvatar name={displayName} large />
                <div>
                  <strong>{displayName}</strong>
                  <small>{session.user.email}</small>
                </div>
                <button className="button secondary" onClick={openProfile}>
                  <Pencil size={17} /> Editar perfil
                </button>
              </div>
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
                <b>{managedPlayers.length}</b>
              </header>
              {managedPlayers.length === 0 ? (
                <Empty
                  icon={<Users size={27} />}
                  title="Nenhum jogador cadastrado"
                  text="Os jogadores adicionados aparecerão aqui."
                />
              ) : (
                <div className="manage-list">
                  {managedPlayers.map((player) => (
                    <div className="manage-row" key={player.id}>
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
                            {player.totalPoints} pontos · {player.totalAssists} assistências
                            {player.registered
                              ? ` · nível ${playerStats.get(player.id)?.rating || 1}★`
                              : " · somente no ranking"}
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
                <Empty
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

      <SiteFooter />

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
            <button
              className="button primary large full"
              disabled={!goalScorer}
              onClick={() =>
                registerGoal(
                  goalTeam,
                  goalScorer,
                  sportKind(match.sport) === "football" ? goalAssist : "",
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
              ? `Escolha quem sai do ${match.teams[subTeam].name}. O banco geral está disponível para os dois times.`
              : `Escolha quem sai e quem entra no ${match.teams[subTeam].name}.`
          }
        >
          <div className="sub-fields">
            <div className="field">
              <label htmlFor="player-out">Sai de quadra</label>
              <select
                id="player-out"
                value={selectedOut}
                onChange={(event) => setSelectedOut(event.target.value)}
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
              <label htmlFor="player-in">Entra no jogo</label>
              <select
                id="player-in"
                value={selectedIn}
                onChange={(event) => setSelectedIn(event.target.value)}
              >
                {substitutionBench(match, subTeam).map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                    {match.sharedBench
                      ? ` · ${match.teams[player.sourceTeamIndex]?.short || "Banco"}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button className="button primary large full" onClick={confirmSubstitution}>
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
          text="Personalize o nome exibido no Resenha. A inicial é criada automaticamente."
        >
          <form className="profile-form" onSubmit={saveProfile}>
            <div className="profile-initial-preview">
              <ProfileAvatar name={profileName || displayName} large />
              <span>
                <strong>Inicial do perfil</strong>
                <small>Gerada automaticamente a partir do nome.</small>
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
