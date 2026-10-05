import { Medal, Trophy } from "lucide-react";
import { scoreAction, sportKind, starsFromScore } from "../../dominio/esportes";
import { Avatar, EstadoVazio } from "../comuns/ComponentesComuns";

export function PainelRanking({ title, eyebrow, ranking, valueKey, valueLabel }) {
  return (
    <article className="ranking-card">
      <header>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <Medal size={23} />
      </header>
      {ranking.length === 0 ? (
        <EstadoVazio
          icon={<Trophy size={27} />}
          title="Sem pontuações"
          text="Os resultados aparecerão depois de uma partida salva."
        />
      ) : (
        <div className="ranking-list">
          {ranking.map((player, index) => (
            <div className={`ranking-row rank-${index + 1}`} key={player.id}>
              <span className="rank-number">{index + 1}</span>
              <Avatar name={player.name} />
              <strong>{player.name}</strong>
              <div className="goal-total">
                <b>{player[valueKey]}</b>
                <small>{valueLabel}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export function TabelaDesempenho({ ranking, sport, academy = false, viewMode = "line" }) {
  if (!ranking.length)
    return (
      <EstadoVazio
        icon={<Trophy size={27} />}
        title="Sem partidas neste período"
        text="Salve uma partida para montar a classificação."
      />
    );
  const football = sportKind(sport) === "football";
  const goalkeeperView = football && viewMode === "goalkeeper";
  return (
    <div className="performance-table-wrap">
      <table className="performance-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Nome</th>
            {!goalkeeperView && <th>{scoreAction(sport)}s</th>}
            {football && !goalkeeperView && <th>Assist.</th>}
            {goalkeeperView && <th>Defesas</th>}
            {goalkeeperView && <th>Def./jogo</th>}
            <th>{goalkeeperView ? "Jogos no gol" : "Jogos"}</th>
            <th>Avaliação</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((player, index) => {
            const bottom =
              ranking.length > 5 && index >= ranking.length - Math.min(3, ranking.length);
            return (
              <tr
                key={player.id}
                className={`${index < 3 ? `podium podium-${index + 1}` : ""} ${bottom ? "bottom-rank" : ""}`}
              >
                <td>
                  <b>{index + 1}</b>
                </td>
                <td>
                  <span className="table-player">
                    <Avatar name={player.name} />
                    <span>
                      <strong>{player.name}</strong>
                      {academy && (player.category || player.primaryPosition) && (
                        <small>
                          {[player.category, player.primaryPosition].filter(Boolean).join(" · ")}
                        </small>
                      )}
                    </span>
                  </span>
                </td>
                {!goalkeeperView && <td>{player.goals}</td>}
                {football && !goalkeeperView && <td>{player.assists}</td>}
                {goalkeeperView && <td>{player.saves || 0}</td>}
                {goalkeeperView && <td>{Number(player.saveAverage || 0).toFixed(1)}</td>}
                <td>{goalkeeperView ? player.goalkeeperAppearances : player.games}</td>
                <td>
                  <span className="table-evaluation">
                    <strong className="evaluation-badge">
                      {Number(
                        goalkeeperView ? player.goalkeeperEvaluation : player.evaluation,
                      ).toFixed(1)}
                    </strong>
                    <small>
                      {"★".repeat(
                        goalkeeperView
                          ? starsFromScore(
                              player.goalkeeperEvaluation,
                              player.goalkeeperAppearances,
                            )
                          : player.stars || starsFromScore(player.evaluation, player.games),
                      )}
                    </small>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Resumo({ icon, label, value }) {
  return (
    <div>
      <span>{icon}</span>
      <p>
        <small>{label}</small>
        <strong>{value}</strong>
      </p>
    </div>
  );
}
