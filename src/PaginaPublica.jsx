import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  Goal,
  LoaderCircle,
  MapPin,
  Medal,
  Shield,
  Sparkles,
  Trophy,
} from "lucide-react";
import { getPublicPage, HISTORY_PAGE_SIZE } from "./servicoDados";

const SPORTS = ["Futebol", "Futebol Society", "Futebol de Salão", "Vôlei", "Basquete"];
const sportKind = (sport) =>
  ["Futebol", "Futebol Society", "Futebol de Salão"].includes(sport)
    ? "football"
    : sport === "Vôlei"
      ? "volleyball"
      : sport === "Basquete"
        ? "basketball"
        : "other";
const scoreLabel = (sport) =>
  sportKind(sport) === "basketball"
    ? "Cestas"
    : sportKind(sport) === "volleyball"
      ? "Pontos"
      : "Gols";
const starsFromScore = (score) =>
  score >= 8.5 ? 5 : score >= 7.6 ? 4 : score >= 6.8 ? 3 : score >= 6 ? 2 : 1;

const rankingArtwork = {
  football: `${import.meta.env.BASE_URL}assets/ranking-futebol.webp`,
  volleyball: `${import.meta.env.BASE_URL}assets/ranking-volei.webp`,
  basketball: `${import.meta.env.BASE_URL}assets/ranking-basquete.webp`,
};
const brandLogo = `${import.meta.env.BASE_URL}assets/logo-resenha.webp`;

function eventLabel(event, sport) {
  const point =
    sportKind(sport) === "basketball"
      ? "Cesta"
      : sportKind(sport) === "volleyball"
        ? "Ponto"
        : "Gol";
  if (event.type === "goal") {
    const basketValue = Number(event.pointValue || 1);
    const basketLabel =
      sportKind(sport) === "basketball"
        ? ` de ${basketValue} ${basketValue === 1 ? "ponto" : "pontos"}`
        : "";
    return `${point}${basketLabel} de ${event.playerName}${event.assistPlayerName ? ` · assistência de ${event.assistPlayerName}` : ""}`;
  }
  if (event.type === "own_goal") return `Gol contra de ${event.playerName}`;
  if (event.type === "missed_penalty") return `Pênalti perdido por ${event.playerName}`;
  if (event.type === "sub") return `${event.playerIn} entrou · ${event.playerOut} saiu`;
  if (event.type === "position_change")
    return `Troca de função · ${event.playerOut} e ${event.playerIn}`;
  if (event.type === "goalkeeper_change") return `${event.playerIn} assumiu o gol`;
  if (event.type === "match_highlight") return `${event.playerName} foi o destaque da partida`;
  const goalkeeper = {
    goalkeeper_save: "Defesa",
    goalkeeper_difficult_save: "Defesa difícil",
    goalkeeper_penalty_save: "Pênalti defendido",
    goalkeeper_error: "Falha do goleiro",
  };
  return goalkeeper[event.type]
    ? `${goalkeeper[event.type]} · ${event.playerName}`
    : "Lance registrado";
}

export default function PaginaPublica({ slug }) {
  // A modalidade pertence ao link compartilhado; visitantes não podem alterá-la.
  const requestedSport =
    new URLSearchParams(window.location.search).get("esporte") || "Futebol de Salão";
  const sport = SPORTS.includes(requestedSport) ? requestedSport : "Futebol de Salão";
  const [content, setContent] = useState(null);
  const [status, setStatus] = useState("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingScope, setRankingScope] = useState("career");
  const [rankingRole, setRankingRole] = useState("line");
  const [rankingMonth, setRankingMonth] = useState("");
  const [rankingMatchId, setRankingMatchId] = useState("");
  const [selectedResultId, setSelectedResultId] = useState("");

  useEffect(() => {
    if (!content) setStatus("loading");
    else setRankingLoading(true);
    getPublicPage(slug, 0, sport, rankingMonth, rankingMatchId)
      .then((value) => {
        setContent(value);
        if (!rankingMonth && value?.selected_month) setRankingMonth(value.selected_month);
        if (!rankingMatchId && value?.selected_match_id) setRankingMatchId(value.selected_match_id);
        setStatus(value ? "ready" : "missing");
      })
      .catch(() => setStatus("error"))
      .finally(() => setRankingLoading(false));
    // `content` não entra nas dependências para evitar uma nova busca após cada resposta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, sport, rankingMonth, rankingMatchId]);

  const baseRanking = useMemo(() => {
    if (!content) return [];
    if (rankingScope === "month") return content.monthly_ranking || [];
    if (rankingScope === "match") return content.match_ranking || [];
    return content.ranking || [];
  }, [content, rankingScope]);

  const activeRanking = useMemo(() => {
    if (sportKind(sport) !== "football" || rankingRole === "line") return baseRanking;
    return [...baseRanking]
      .filter((player) => Number(player.saves || 0) > 0)
      .sort(
        (a, b) =>
          Number(b.saves || 0) - Number(a.saves || 0) ||
          Number(b.evaluation || 0) - Number(a.evaluation || 0),
      );
  }, [baseRanking, rankingRole, sport]);

  const highlights = useMemo(() => {
    const ranking = baseRanking;
    const best = (field) =>
      [...ranking].sort((a, b) => Number(b[field] || 0) - Number(a[field] || 0))[0];
    const bestPositive = (field) => {
      const player = best(field);
      return Number(player?.[field] || 0) > 0 ? player : null;
    };
    return [
      {
        label:
          rankingScope === "match"
            ? "Melhor da partida"
            : rankingScope === "month"
              ? "Líder do mês"
              : "Líder geral",
        player: best("evaluation"),
        value: (player) => `${Number(player.evaluation).toFixed(1)} de nota`,
        icon: <Trophy size={20} />,
      },
      {
        label: `Mais ${scoreLabel(sport).toLowerCase()}`,
        player: best("goals"),
        value: (player) => `${player.goals} ${scoreLabel(sport).toLowerCase()}`,
        icon: <Goal size={20} />,
      },
      ...(sportKind(sport) === "football"
        ? [
            {
              label: "Garçom da turma",
              player: best("assists"),
              value: (player) => `${player.assists} assistências`,
              icon: <Sparkles size={20} />,
            },
          ]
        : []),
      {
        label: "Paredão",
        player: bestPositive("saves"),
        value: (player) => `${player.saves || 0} defesas`,
        icon: <Shield size={20} />,
      },
    ];
  }, [baseRanking, rankingScope, sport]);

  const selectedResult = useMemo(() => {
    if (!content?.results?.length) return null;
    return content.results.find((game) => game.id === selectedResultId) || content.results[0];
  }, [content?.results, selectedResultId]);

  const loadMore = async () => {
    setLoadingMore(true);
    const next = await getPublicPage(
      slug,
      content.results.length,
      sport,
      rankingMonth,
      rankingMatchId,
    );
    setContent((current) => ({
      ...current,
      results: [...current.results, ...next.results],
      has_more: next.has_more,
    }));
    setLoadingMore(false);
  };

  if (status === "loading")
    return (
      <main className="public-page public-loading">
        <LoaderCircle className="spin" />
        <p>Carregando o portal esportivo…</p>
      </main>
    );
  if (status !== "ready")
    return (
      <main className="public-page public-loading">
        <Goal size={38} />
        <h1>Portal indisponível</h1>
        <p>O link não existe ou a publicação foi desativada.</p>
      </main>
    );

  const football = sportKind(sport) === "football";
  const upcoming = content.upcoming.filter((game) => game.sport === sport);
  return (
    <main className="public-page">
      <header className="public-header public-header-v2">
        <span className="brand-mark">
          <img src={brandLogo} alt="" aria-hidden="true" />
        </span>
        <div>
          <small>DESEMPENHO E RESULTADOS</small>
          <h1>{content.page?.title || "Portal esportivo"}</h1>
          <p>{sport} · classificação, agenda e histórico de partidas.</p>
        </div>
        <span className="public-sport-badge">{sport}</span>
      </header>

      {activeRanking.length > 0 && (
        <section className="public-highlights" aria-label="Destaques da modalidade">
          {highlights.map(
            ({ label, player, value, icon }) =>
              player && (
                <article key={label}>
                  <span>{icon}</span>
                  <small>{label}</small>
                  <strong>{player.name}</strong>
                  <em>{value(player)}</em>
                </article>
              ),
          )}
        </section>
      )}

      <section className="public-grid public-grid-v2">
        <article className="public-card public-ranking">
          {rankingArtwork[sportKind(sport)] && (
            <figure className={`public-ranking-art ${sportKind(sport)}`}>
              <img
                src={rankingArtwork[sportKind(sport)]}
                alt={`Atletas representando o ranking de ${sport}`}
                width="1200"
                height="800"
              />
            </figure>
          )}
          <header>
            <Trophy size={21} />
            <div>
              <small>CLASSIFICAÇÃO · {sport.toUpperCase()}</small>
              <h2>
                {rankingScope === "career"
                  ? "Carreira da galera"
                  : rankingScope === "month"
                    ? "Média mensal"
                    : "Ranking da partida"}
              </h2>
            </div>
          </header>
          <div className="ranking-filter-row">
            <nav className="public-ranking-scopes" aria-label="Tipo de ranking">
              <button
                className={rankingScope === "career" ? "active" : ""}
                onClick={() => setRankingScope("career")}
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
            {football && (
              <nav className="public-ranking-scopes ranking-role-switch" aria-label="Função">
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
          {rankingScope === "month" && (
            <label className="public-ranking-filter">
              <span>Mês da classificação</span>
              <select
                value={rankingMonth}
                onChange={(event) => setRankingMonth(event.target.value)}
              >
                {(content.ranking_months || []).map((month) => (
                  <option value={month} key={month}>
                    {new Date(`${month}-02T12:00:00`).toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </option>
                ))}
              </select>
            </label>
          )}
          {rankingScope === "match" && (
            <label className="public-ranking-filter">
              <span>Partida da classificação</span>
              <select
                value={rankingMatchId}
                onChange={(event) => setRankingMatchId(event.target.value)}
              >
                {(content.ranking_matches || []).map((game) => (
                  <option value={game.id} key={game.id}>
                    {new Date(game.finished_at).toLocaleDateString("pt-BR")} · {game.team_a || "T1"}{" "}
                    {game.score_a || 0} × {game.score_b || 0} {game.team_b || "T2"}
                  </option>
                ))}
              </select>
            </label>
          )}
          {rankingLoading && (
            <p className="public-ranking-loading">
              <LoaderCircle className="spin" size={16} /> Atualizando classificação…
            </p>
          )}
          {activeRanking.length ? (
            <div className="public-table-wrap">
              <table className="public-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nome</th>
                    {rankingRole !== "goalkeeper" && <th>{scoreLabel(sport)}</th>}
                    {football && rankingRole !== "goalkeeper" && <th>Assist.</th>}
                    {football && rankingRole === "goalkeeper" && <th>Defesas</th>}
                    {football && rankingRole === "goalkeeper" && <th>Def./jogo</th>}
                    <th>Jogos</th>
                    <th>Média/jogo</th>
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRanking.map((player, index) => {
                    const bottom = activeRanking.length > 5 && index >= activeRanking.length - 3;
                    return (
                      <tr
                        className={`${index < 3 ? `podium podium-${index + 1}` : ""} ${bottom ? "bottom-rank" : ""}`}
                        key={player.id}
                      >
                        <td>{index < 3 ? <Medal size={16} /> : index + 1}</td>
                        <td>
                          <span className="avatar">{player.name.slice(0, 2).toUpperCase()}</span>
                          <strong>{player.name}</strong>
                        </td>
                        {rankingRole !== "goalkeeper" && <td>{player.goals}</td>}
                        {football && rankingRole !== "goalkeeper" && <td>{player.assists}</td>}
                        {football && rankingRole === "goalkeeper" && <td>{player.saves || 0}</td>}
                        {football && rankingRole === "goalkeeper" && (
                          <td>{Number(player.save_average || 0).toFixed(1)}</td>
                        )}
                        <td>{player.games}</td>
                        <td>
                          <b>{Number(player.average || 0).toFixed(2)}</b>
                        </td>
                        <td>
                          <span className="table-evaluation">
                            <b>{Number(player.evaluation).toFixed(1)}</b>
                            <small>{"★".repeat(starsFromScore(Number(player.evaluation)))}</small>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Nenhuma partida encontrada para esta classificação.</p>
          )}
        </article>

        <article className="public-card public-upcoming-card">
          <header>
            <CalendarDays size={21} />
            <div>
              <small>AGENDA DA GALERA</small>
              <h2>Próxima resenha</h2>
            </div>
          </header>
          {upcoming.length ? (
            <>
              <section className="next-game-featured">
                <span className="next-game-date">
                  <small>
                    {new Date(upcoming[0].scheduled_at).toLocaleDateString("pt-BR", {
                      weekday: "short",
                    })}
                  </small>
                  <b>
                    {new Date(upcoming[0].scheduled_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                    })}
                  </b>
                  <em>
                    {new Date(upcoming[0].scheduled_at).toLocaleDateString("pt-BR", {
                      month: "short",
                    })}
                  </em>
                </span>
                <div className="next-game-info">
                  <span className="next-game-live">PRÓXIMO JOGO</span>
                  <h3>{upcoming[0].title}</h3>
                  <div>
                    <span>
                      <Clock3 size={15} />
                      {new Date(upcoming[0].scheduled_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {upcoming[0].location && (
                      <span>
                        <MapPin size={15} /> {upcoming[0].location}
                      </span>
                    )}
                  </div>
                  <strong>{sport}</strong>
                </div>
              </section>
              {upcoming.length > 1 && (
                <div className="next-games-list">
                  <small>DEPOIS DESSA</small>
                  {upcoming.slice(1).map((game) => (
                    <div className="upcoming-public-row" key={game.id}>
                      <span className="public-date">
                        <b>
                          {new Date(game.scheduled_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                          })}
                        </b>
                        <small>
                          {new Date(game.scheduled_at).toLocaleDateString("pt-BR", {
                            month: "short",
                          })}
                        </small>
                      </span>
                      <div>
                        <strong>{game.title}</strong>
                        <small>
                          {new Date(game.scheduled_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p>Nenhum próximo jogo informado.</p>
          )}
        </article>

        <article className="public-card public-results">
          <header>
            <Goal size={21} />
            <div>
              <small>HISTÓRICO · {sport.toUpperCase()}</small>
              <h2>Partidas e súmulas</h2>
            </div>
          </header>
          {content.results.length ? (
            <div className="public-result-selector">
              <label className="public-ranking-filter">
                <span>Escolha uma partida</span>
                <select
                  value={selectedResult?.id || ""}
                  onChange={(event) => setSelectedResultId(event.target.value)}
                >
                  {content.results.map((game) => (
                    <option value={game.id} key={game.id}>
                      {new Date(game.finishedAt || game.date).toLocaleDateString("pt-BR")} ·{" "}
                      {game.teams?.[0]?.short || "T1"} {game.score?.[0] || 0} ×{" "}
                      {game.score?.[1] || 0} {game.teams?.[1]?.short || "T2"}
                    </option>
                  ))}
                </select>
              </label>
              {selectedResult && (
                <details className="public-result-details" open>
                  <summary>
                    <span>
                      {new Date(
                        selectedResult.finishedAt || selectedResult.date,
                      ).toLocaleDateString("pt-BR")}
                    </span>
                    <strong>
                      {selectedResult.teams?.[0]?.short || "T1"} {selectedResult.score?.[0] || 0} ×{" "}
                      {selectedResult.score?.[1] || 0} {selectedResult.teams?.[1]?.short || "T2"}
                    </strong>
                    <small>Partida {selectedResult.roundNumber || "—"}</small>
                    <ChevronDown size={17} />
                  </summary>
                  <div className="public-event-timeline">
                    {(selectedResult.events || []).length ? (
                      [...selectedResult.events].reverse().map((event) => (
                        <div key={event.id}>
                          <b>{event.minute || 1}&apos;</b>
                          <span>{eventLabel(event, sport)}</span>
                        </div>
                      ))
                    ) : (
                      <p>Esta partida não possui lances registrados.</p>
                    )}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <p>Nenhuma partida encerrada nesta modalidade.</p>
          )}
          {content.has_more && (
            <button className="button secondary full" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Carregando…" : `Carregar mais ${HISTORY_PAGE_SIZE}`}
            </button>
          )}
        </article>
      </section>
      <section className="public-scoring-guide" aria-labelledby="scoring-guide-title">
        <header>
          <Shield size={22} />
          <div>
            <small>REGRA TRANSPARENTE</small>
            <h2 id="scoring-guide-title">Como a nota é calculada</h2>
          </div>
        </header>
        <p>
          Todo jogador começa cada partida com nota <strong>6,0</strong>. A nota final fica entre
          3,0 e 10,0 e entra na média do mês e na média geral da modalidade.
        </p>
        <div className="scoring-guide-grid">
          <article>
            <strong>Resultado e ataque</strong>
            <span>Vitória +0,35 · empate +0,15 · derrota −0,15</span>
            <span>{scoreLabel(sport).slice(0, -1)} +0,55 · destaque +0,30</span>
            {football && (
              <span>Assistência +0,30 · assistência do goleiro +0,50 · bônus máximo +2,0</span>
            )}
          </article>
          {football && (
            <article>
              <strong>Goleiro</strong>
              <span>Defesa +0,12 · difícil +0,30 · pênalti +0,70</span>
              <span>Sem sofrer gol até +0,40 · gol sofrido −0,08 (máx. −0,40)</span>
              <span>Falha −0,45</span>
            </article>
          )}
          <article>
            <strong>Penalidades</strong>
            <span>Gol contra −0,40 · pênalti perdido −0,30</span>
            <span>As médias e o ranking são separados por modalidade.</span>
          </article>
        </div>
        <p className="scoring-guide-note">
          Para equilibrar os times, o QResenha combina 70% da média das últimas partidas com 30% da
          média geral estabilizada. Assim, uma atuação isolada pesa, mas não distorce todo o
          histórico.
        </p>
      </section>
      <footer className="site-footer">
        <strong>QResenha</strong>
        <span>Criado e desenvolvido por Adriel Alves Quintava.</span>
        <small>Projeto em evolução — feito para a resenha ficar ainda melhor.</small>
      </footer>
    </main>
  );
}
