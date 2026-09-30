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
import { getPublicPage, HISTORY_PAGE_SIZE } from "./dataService";

const SPORTS = ["Futebol", "Futebol Society", "Futebol de Salão", "Vôlei", "Basquete", "Handebol"];
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

function eventLabel(event, sport) {
  const point =
    sportKind(sport) === "basketball"
      ? "Cesta"
      : sportKind(sport) === "volleyball"
        ? "Ponto"
        : "Gol";
  if (event.type === "goal")
    return `${point} de ${event.playerName}${event.assistPlayerName ? ` · assistência de ${event.assistPlayerName}` : ""}`;
  if (event.type === "own_goal") return `Gol contra de ${event.playerName}`;
  if (event.type === "missed_penalty") return `Pênalti perdido por ${event.playerName}`;
  if (event.type === "sub") return `${event.playerIn} entrou · ${event.playerOut} saiu`;
  if (event.type === "goalkeeper_change") return `${event.playerIn} assumiu o gol`;
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

export default function PublicPage({ slug }) {
  // A modalidade pertence ao link compartilhado; visitantes não podem alterá-la.
  const requestedSport =
    new URLSearchParams(window.location.search).get("esporte") || "Futebol de Salão";
  const sport = SPORTS.includes(requestedSport) ? requestedSport : "Futebol de Salão";
  const [content, setContent] = useState(null);
  const [status, setStatus] = useState("loading");
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setStatus("loading");
    getPublicPage(slug, 0, sport)
      .then((value) => {
        setContent(value);
        setStatus(value ? "ready" : "missing");
      })
      .catch(() => setStatus("error"));
  }, [slug, sport]);

  const highlights = useMemo(() => {
    const ranking = content?.ranking || [];
    const best = (field) =>
      [...ranking].sort((a, b) => Number(b[field] || 0) - Number(a[field] || 0))[0];
    return [
      {
        label: "Líder geral",
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
        player: best("saves"),
        value: (player) => `${player.saves || 0} defesas`,
        icon: <Shield size={20} />,
      },
    ];
  }, [content, sport]);

  const loadMore = async () => {
    setLoadingMore(true);
    const next = await getPublicPage(slug, content.results.length, sport);
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
        <p>Carregando o Mural da Resenha…</p>
      </main>
    );
  if (status !== "ready")
    return (
      <main className="public-page public-loading">
        <Goal size={38} />
        <h1>Mural indisponível</h1>
        <p>O link não existe ou o mural foi desativado.</p>
      </main>
    );

  const football = sportKind(sport) === "football";
  const upcoming = content.upcoming.filter((game) => game.sport === sport);
  return (
    <main className="public-page">
      <header className="public-header public-header-v2">
        <span className="brand-mark">
          <Goal size={25} />
        </span>
        <div>
          <small>A TABELA OFICIAL DA ZOEIRA</small>
          <h1>Mural da Resenha</h1>
          <p>{sport} · números, histórias e aquela disputa saudável.</p>
        </div>
        <span className="public-sport-badge">{sport}</span>
      </header>

      {content.ranking.length > 0 && (
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
          <header>
            <Trophy size={21} />
            <div>
              <small>CLASSIFICAÇÃO · {sport.toUpperCase()}</small>
              <h2>Ranking da galera</h2>
            </div>
          </header>
          {content.ranking.length ? (
            <div className="public-table-wrap">
              <table className="public-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nome</th>
                    <th>{scoreLabel(sport)}</th>
                    {football && <th>Assist.</th>}
                    <th>Jogos</th>
                    <th>Média/jogo</th>
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {content.ranking.map((player, index) => {
                    const bottom =
                      content.ranking.length > 5 && index >= content.ranking.length - 3;
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
                        <td>{player.goals}</td>
                        {football && <td>{player.assists}</td>}
                        <td>{player.games}</td>
                        <td>
                          <b>{Number(player.average || 0).toFixed(2)}</b>
                        </td>
                        <td>
                          <b>{Number(player.evaluation).toFixed(1)}</b>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Nenhuma partida de {sport} registrada.</p>
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
            <div className="public-result-list">
              {content.results.map((game) => (
                <details className="public-result-details" key={game.id}>
                  <summary>
                    <span>
                      {new Date(game.finishedAt || game.date).toLocaleDateString("pt-BR")}
                    </span>
                    <strong>
                      {game.teams?.[0]?.short || "T1"} {game.score?.[0] || 0} ×{" "}
                      {game.score?.[1] || 0} {game.teams?.[1]?.short || "T2"}
                    </strong>
                    <small>Partida {game.roundNumber || "—"}</small>
                    <ChevronDown size={17} />
                  </summary>
                  <div className="public-event-timeline">
                    {(game.events || []).length ? (
                      [...game.events].reverse().map((event) => (
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
              ))}
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
      <footer className="site-footer">
        <strong>Resenha</strong>
        <span>Criado e desenvolvido por Adriel Alves Quintava.</span>
        <small>Projeto em evolução — feito para a resenha ficar ainda melhor.</small>
      </footer>
    </main>
  );
}
