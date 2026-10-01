import { useState } from "react";
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  Goal,
  RotateCcw,
  Shield,
  Sparkles,
  X,
} from "lucide-react";

import { scoreAction } from "../../domain/sports";
import { Avatar } from "../common/Common";

export function MatchEventRow({ event, match, onUndo }) {
  const isGoal = event.type === "goal";
  const isOwnGoal = event.type === "own_goal";
  const isMissedPenalty = event.type === "missed_penalty";
  const isSubstitution = event.type === "sub";
  const isGoalkeeperChange = event.type === "goalkeeper_change";
  const isHighlight = event.type === "match_highlight";
  const goalkeeperLabels = {
    goalkeeper_save: "Defesa",
    goalkeeper_difficult_save: "Defesa difícil",
    goalkeeper_penalty_save: "Pênalti defendido",
    goalkeeper_error: "Falha do goleiro",
  };
  const isGoalkeeperAction = Boolean(goalkeeperLabels[event.type]);
  const canUndo = isGoal || isOwnGoal || isMissedPenalty || isGoalkeeperAction || isHighlight;
  const team = match.teams[event.teamIndex];
  const benefitedTeam = isOwnGoal ? match.teams[event.teamIndex === 0 ? 1 : 0] : team;

  return (
    <div className={`event-row ${event.type}`}>
      <span className="event-minute">{event.minute}&apos;</span>
      <span className={`event-icon ${team?.color || "green"}`}>
        {isHighlight ? (
          <Sparkles size={17} />
        ) : isSubstitution || isGoalkeeperChange ? (
          <ArrowDownUp size={17} />
        ) : isGoalkeeperAction ? (
          <Shield size={17} />
        ) : isMissedPenalty ? (
          <X size={17} />
        ) : (
          <Goal size={17} />
        )}
      </span>
      <div>
        {isGoal && (
          <>
            <strong>
              {scoreAction(match.sport)} de {event.playerName}
            </strong>
            <small>
              {event.assistPlayerName ? `Assistência de ${event.assistPlayerName} · ` : ""}
              {team?.name || "Time"}
            </small>
          </>
        )}
        {isOwnGoal && (
          <>
            <strong>Gol contra de {event.playerName}</strong>
            <small>-0,4 na avaliação · gol para {benefitedTeam?.name || "o adversário"}</small>
          </>
        )}
        {isMissedPenalty && (
          <>
            <strong>Pênalti perdido por {event.playerName}</strong>
            <small>-0,3 na avaliação · {team?.name || "Time"}</small>
          </>
        )}
        {isSubstitution && (
          <>
            <strong>Entrou {event.playerIn}</strong>
            <small>Saiu {event.playerOut}</small>
          </>
        )}
        {isGoalkeeperChange && (
          <>
            <strong>{event.playerIn} assumiu o gol</strong>
            <small>{event.playerOut} voltou para a linha ou banco</small>
          </>
        )}
        {isGoalkeeperAction && (
          <>
            <strong>
              {goalkeeperLabels[event.type]} · {event.playerName}
            </strong>
            <small>{team?.name || "Time"}</small>
          </>
        )}
        {isHighlight && (
          <>
            <strong>{event.playerName} foi o destaque</strong>
            <small>+0,30 na avaliação da partida</small>
          </>
        )}
      </div>
      {canUndo && (
        <button
          className="undo-score-button"
          type="button"
          onClick={onUndo}
          aria-label={`Anular lance de ${event.playerName}`}
        >
          <RotateCcw size={14} /> Anular
        </button>
      )}
    </div>
  );
}

// Faixa sob o placar inspirada em transmissões, com autor e minuto de cada pontuação.
export function MatchScorers({ match }) {
  const scoringEvents = [...(match.events || [])]
    .filter((event) => ["goal", "own_goal"].includes(event.type))
    .reverse();
  const action = scoreAction(match.sport);

  return (
    <div className="match-scorers">
      <header>
        <Goal size={16} />
        <strong>{action}s da partida</strong>
      </header>
      <div className="match-scorers-sides">
        {match.teams.map((team, teamIndex) => {
          const teamEvents = scoringEvents.filter((event) =>
            event.type === "own_goal"
              ? (event.teamIndex === 0 ? 1 : 0) === teamIndex
              : event.teamIndex === teamIndex,
          );
          return (
            <section className={`match-scorers-team ${team.color}`} key={team.id || team.name}>
              <small>{team.name}</small>
              {teamEvents.length ? (
                <div className="scorer-list">
                  {teamEvents.map((event) => (
                    <div className="scorer-line" key={event.id}>
                      <span className="scorer-ball" aria-hidden="true">
                        <Goal size={14} />
                      </span>
                      <span>
                        <strong>
                          {event.playerName}
                          {event.type === "own_goal" ? " (contra)" : ""}
                        </strong>
                        {event.assistPlayerName && <small>Assist. {event.assistPlayerName}</small>}
                      </span>
                      <b>{event.minute}&apos;</b>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Nenhuma pontuação</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function TeamScore({ team, score }) {
  return (
    <div className={`team-score ${team.color}`}>
      <span className="team-badge">{team.short}</span>
      <div>
        <small>{team.name}</small>
        <strong>{score}</strong>
      </div>
    </div>
  );
}

export function TeamCard({
  team,
  scoreLabel,
  onGoal,
  onOwnGoal,
  onMissedPenalty,
  showFootballActions,
  onSub,
  onGoalkeeperChange,
  onGoalkeeperAction,
  onHighlight,
  hasAvailableBench,
  sharedBench,
}) {
  const [openPlayerId, setOpenPlayerId] = useState(null);
  const runPlayerAction = (action) => {
    action();
    setOpenPlayerId(null);
  };

  return (
    <article className={`team-card ${team.color}`}>
      <header>
        <div>
          <span className="team-dot" />
          <h2>{team.name}</h2>
        </div>
        <small>Toque no jogador para registrar um lance</small>
      </header>
      <div className="roster-title">
        <span>Em jogo</span>
        <small>{team.starters.length} jogadores</small>
      </div>
      <div className="roster-list">
        {team.starters.map((player) => {
          const isGoalkeeper = showFootballActions && player.id === team.goalkeeperId;
          const menuOpen = openPlayerId === player.id;
          return (
            <div className={`player-action-row ${menuOpen ? "open" : ""}`} key={player.id}>
              <button
                className="player-action-trigger"
                type="button"
                onClick={() =>
                  setOpenPlayerId((current) => (current === player.id ? null : player.id))
                }
                aria-expanded={menuOpen}
              >
                <Avatar name={player.name} />
                <strong>{player.name}</strong>
                <span className={`field-status ${isGoalkeeper ? "goalkeeper" : ""}`}>
                  {isGoalkeeper ? "GOLEIRO" : "LINHA"}
                </span>
                <ChevronDown size={17} />
              </button>
              {menuOpen && (
                <div className={`player-action-menu ${isGoalkeeper ? "goalkeeper-actions" : ""}`}>
                  <small>{isGoalkeeper ? "Ações do goleiro" : "Ações do jogador"}</small>
                  <div>
                    <button
                      type="button"
                      onClick={() => runPlayerAction(() => onHighlight(player.id))}
                    >
                      <Sparkles size={15} /> Destaque da partida
                    </button>
                    <button type="button" onClick={() => runPlayerAction(() => onGoal(player.id))}>
                      <Goal size={15} /> Registrar {scoreLabel.toLowerCase()}
                    </button>
                    {isGoalkeeper && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            runPlayerAction(() => onGoalkeeperAction("goalkeeper_save"))
                          }
                        >
                          <Shield size={15} /> Defesa
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            runPlayerAction(() => onGoalkeeperAction("goalkeeper_difficult_save"))
                          }
                        >
                          <Shield size={15} /> Defesa difícil
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            runPlayerAction(() => onGoalkeeperAction("goalkeeper_penalty_save"))
                          }
                        >
                          <Check size={15} /> Pegou pênalti
                        </button>
                        <button
                          className="negative-action"
                          type="button"
                          onClick={() =>
                            runPlayerAction(() => onGoalkeeperAction("goalkeeper_error"))
                          }
                        >
                          <X size={15} /> Falha
                        </button>
                        <button type="button" onClick={() => runPlayerAction(onGoalkeeperChange)}>
                          <ArrowDownUp size={15} /> Trocar goleiro
                        </button>
                      </>
                    )}
                    {showFootballActions && (
                      <>
                        <button
                          className="negative-action"
                          type="button"
                          onClick={() => runPlayerAction(() => onOwnGoal(player.id))}
                        >
                          <Goal size={15} /> Gol contra
                        </button>
                        <button
                          className="negative-action"
                          type="button"
                          onClick={() => runPlayerAction(() => onMissedPenalty(player.id))}
                        >
                          <X size={15} /> Pênalti perdido
                        </button>
                      </>
                    )}
                    {!isGoalkeeper && hasAvailableBench && (
                      <button type="button" onClick={() => runPlayerAction(() => onSub(player.id))}>
                        <ArrowDownUp size={15} /> Substituir jogador
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!sharedBench && (
        <div className="bench-box">
          <div className="roster-title">
            <span>Banco</span>
            <small>{team.bench.length} jogadores</small>
          </div>
          {team.bench.length ? (
            team.bench.map((player) => (
              <div className="roster-player bench-player" key={player.id}>
                <Avatar name={player.name} />
                <strong>{player.name}</strong>
              </div>
            ))
          ) : (
            <p className="empty-bench">Nenhum reserva neste time.</p>
          )}
        </div>
      )}
    </article>
  );
}
