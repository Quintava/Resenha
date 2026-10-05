import { Check, CircleDollarSign, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

const currency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const dateLabel = (value) =>
  value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—";

const monthLabel = (month) =>
  new Date(`${month}-02T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

export function ControleMensalidades({ profile, onToggle, onPaidAtChange }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const multiplier =
    profile.tuitionType === "scholarship100"
      ? 0
      : profile.tuitionType === "scholarship50"
        ? 0.5
        : 1;
  const monthlyAmount = Math.max(0, Number(profile.monthlyFee) || 0) * multiplier;
  const scholarship = profile.tuitionType === "scholarship100";

  const rows = useMemo(() => {
    const records = new Map((profile.paymentHistory || []).map((record) => [record.month, record]));
    return Array.from({ length: 12 }, (_, index) => {
      const month = `${year}-${String(index + 1).padStart(2, "0")}`;
      const record = records.get(month);
      const lastDay = new Date(year, index + 1, 0).getDate();
      const dueDay = Math.min(lastDay, Math.max(1, Number(profile.dueDay) || 1));
      return {
        month,
        label: monthLabel(month),
        amount: record?.amount ?? monthlyAmount,
        dueDate: record?.dueDate || `${month}-${String(dueDay).padStart(2, "0")}`,
        paid: scholarship || Boolean(record?.paid),
        paidAt: record?.paidAt || "",
      };
    });
  }, [monthlyAmount, profile.dueDay, profile.paymentHistory, scholarship, year]);

  const paidTotal = rows.reduce((sum, row) => sum + (row.paid ? Number(row.amount) : 0), 0);
  const openTotal = rows.reduce((sum, row) => sum + (!row.paid ? Number(row.amount) : 0), 0);
  const availableYears = [
    ...new Set([
      currentYear,
      ...(profile.paymentHistory || [])
        .map((record) => Number(String(record.month || "").slice(0, 4)))
        .filter(Boolean),
    ]),
  ].sort((a, b) => b - a);
  const filteredRows = rows.filter(
    (row) =>
      (monthFilter === "all" || row.month.endsWith(`-${monthFilter}`)) &&
      (statusFilter === "all" || (statusFilter === "paid" ? row.paid : !row.paid)),
  );

  return (
    <section className="tuition-control" aria-labelledby="tuition-control-title">
      <header className="tuition-control-header">
        <div>
          <small>CONTROLE ANUAL</small>
          <h3 id="tuition-control-title">Mensalidades de {year}</h3>
        </div>
        <span>
          {profile.paymentHistory?.filter((item) => item.month?.startsWith(String(year))).length ||
            0}{" "}
          registros
        </span>
      </header>

      <div className="tuition-summary">
        <article className="paid">
          <span>
            <Check size={18} />
          </span>
          <div>
            <small>Total pago no ano</small>
            <strong>{currency(paidTotal)}</strong>
          </div>
        </article>
        <article className="open">
          <span>
            <CircleDollarSign size={18} />
          </span>
          <div>
            <small>Total em aberto</small>
            <strong>{currency(openTotal)}</strong>
          </div>
        </article>
      </div>

      <div className="tuition-filters" aria-label="Filtros das mensalidades">
        <label>
          <span>Ano</span>
          <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {availableYears.map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Mês</span>
          <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
            <option value="all">Todos</option>
            {Array.from({ length: 12 }, (_, index) => {
              const value = String(index + 1).padStart(2, "0");
              return (
                <option value={value} key={value}>
                  {monthLabel(`${year}-${value}`).split(" de ")[0]}
                </option>
              );
            })}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Todos</option>
            <option value="paid">Pagos</option>
            <option value="pending">Pendentes</option>
          </select>
        </label>
      </div>

      <div className="tuition-table" role="table" aria-label={`Mensalidades de ${year}`}>
        <div className="tuition-table-head" role="row">
          <span>Mês/Ano</span>
          <span>Valor</span>
          <span>Status</span>
          <span>Pagamento</span>
          <span>Ação</span>
        </div>
        {filteredRows.length === 0 && (
          <p className="tuition-empty">Nenhuma mensalidade corresponde aos filtros.</p>
        )}
        {filteredRows.map((row) => (
          <div className="tuition-month-row" role="row" key={row.month}>
            <div className="tuition-month-name">
              <strong>{row.label}</strong>
              <small>Vence {dateLabel(row.dueDate)}</small>
            </div>
            <b>{currency(row.amount)}</b>
            <span className={row.paid ? "payment-paid" : "payment-pending"}>
              {row.paid ? "Pago" : "Pendente"}
            </span>
            <label className="tuition-paid-date">
              <span>Data</span>
              <input
                type="date"
                value={row.paidAt}
                disabled={!row.paid || scholarship}
                onChange={(event) => onPaidAtChange(row.month, event.target.value)}
              />
            </label>
            <button
              className={`button compact ${row.paid ? "secondary" : "primary"}`}
              type="button"
              disabled={scholarship}
              onClick={() => onToggle(row.month, !row.paid)}
            >
              {row.paid ? (
                <>
                  <RotateCcw size={14} /> Marcar pendente
                </>
              ) : (
                <>
                  <Check size={14} /> Registrar pagamento
                </>
              )}
            </button>
          </div>
        ))}
      </div>
      {scholarship && (
        <p className="tuition-scholarship-note">
          Bolsista integral: mensalidades consideradas quitadas, sem cobrança.
        </p>
      )}
    </section>
  );
}
