import { Check, ChevronLeft, ChevronRight, Moon, Sun, UserRound, X } from "lucide-react";

export function AlternadorTema({ theme, setTheme, className = "" }) {
  return (
    <button
      className={`icon-button theme-button ${className}`}
      onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}

export function Avatar({ name }) {
  return <span className="avatar">{name.slice(0, 2).toUpperCase()}</span>;
}

export function AvatarPerfil({ name, large = false, icon = false }) {
  return (
    <span className={`profile-avatar ${large ? "large" : ""} ${icon ? "icon-avatar" : ""}`}>
      {icon ? (
        <UserRound aria-hidden="true" />
      ) : (
        String(name || "Usuário")
          .trim()
          .charAt(0)
          .toUpperCase() || "U"
      )}
    </span>
  );
}

export function Estrelas({ rating, label }) {
  return (
    <span className="rating-stars" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <i key={star} className={star <= rating ? "filled" : ""}>
          ★
        </i>
      ))}
    </span>
  );
}

export function Paginacao({ page, pageCount, onChange }) {
  return (
    <nav className="pagination" aria-label="Páginas de jogadores">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft size={18} />
      </button>
      {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
        <button
          type="button"
          key={number}
          className={number === page ? "active" : ""}
          onClick={() => onChange(number)}
          aria-current={number === page ? "page" : undefined}
        >
          {number}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(Math.min(pageCount, page + 1))}
        disabled={page === pageCount}
        aria-label="Próxima página"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}

export function EstadoVazio({ icon, title, text }) {
  return (
    <div className="empty-state">
      {icon}
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

export function Modo({ active, onClick, icon, title, text }) {
  return (
    <button type="button" className={active ? "mode active" : "mode"} onClick={onClick}>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
      {active && <Check size={18} />}
    </button>
  );
}

export function Modal({ onClose, icon, color, title, text, children }) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <button className="icon-button modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <span className={`modal-icon ${color}`}>{icon}</span>
        <h2>{title}</h2>
        <p>{text}</p>
        {children}
      </div>
    </div>
  );
}
