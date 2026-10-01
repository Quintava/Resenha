import { Medal, Trophy } from "lucide-react";
import { scoreAction, sportKind, starsFromScore } from "../../domain/sports";
import { Avatar, Empty } from "../common/Common";

export function RankingPanel({ title, eyebrow, ranking, valueKey, valueLabel }) {
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
        <Empty
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

export function PerformanceTable({ ranking, sport }) {
  if (!ranking.length)
    return (
      <Empty
        icon={<Trophy size={27} />}
        title="Sem partidas neste período"
        text="Salve uma partida para montar a classificação."
      />
    );
  const football = sportKind(sport) === "football";
  return (
    <div className="performance-table-wrap">
      <table className="performance-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Nome</th>
            <th>{scoreAction(sport)}s</th>
            {football && <th>Assist.</th>}
            {football && <th>Defesas</th>}
            {football && <th>Def./jogo</th>}
            <th>Jogos</th>
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
                    <strong>{player.name}</strong>
                  </span>
                </td>
                <td>{player.goals}</td>
                {football && <td>{player.assists}</td>}
                {football && <td>{player.saves || 0}</td>}
                {football && <td>{Number(player.saveAverage || 0).toFixed(1)}</td>}
                <td>{player.games}</td>
                <td>
                  <span className="table-evaluation">
                    <strong className="evaluation-badge">{player.evaluation.toFixed(1)}</strong>
                    <small>
                      {"★".repeat(player.stars || starsFromScore(player.evaluation, player.games))}
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

export function Summary({ icon, label, value }) {
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
