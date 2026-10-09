import {
  Activity,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  Globe2,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings,
  CircleDollarSign,
  Sun,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";

import { AvatarPerfil } from "../comuns/ComponentesComuns";

const brandIconSrc = `${import.meta.env.BASE_URL}assets/icone-qresenha.webp`;
const developerEmblemSrc = `${import.meta.env.BASE_URL}assets/icone-qresenha.webp`;

const navigation = [
  { id: "setup", icon: Users, title: "Preparar jogo", detail: "Presença e divisão dos times" },
  { id: "match", icon: Activity, title: "Partida", detail: "Rodadas, placar e times de fora" },
  { id: "stats", icon: BarChart3, title: "Estatísticas", detail: "Classificação por modalidade" },
  { id: "mural", icon: Globe2, title: "Portal público", detail: "Ranking, agenda e resultados" },
  { id: "evolution", icon: TrendingUp, title: "Evolução", detail: "Desempenho de cada jogador" },
];

export function BarraSuperior({
  view,
  hasMatch,
  onNavigate,
  menuOpen,
  setMenuOpen,
  menuRef,
  theme,
  onToggleTheme,
  profileRef,
  profileOpen,
  setProfileOpen,
  displayName,
  email,
  onOpenProfile,
  onOpenSettings,
  onOpenPassword,
  onSignOut,
  academyMode = false,
  notifications = [],
  notificationsOpen,
  setNotificationsOpen,
  notificationsRef,
  unreadNotifications = 0,
  onNotificationsRead,
}) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => onNavigate("setup")} aria-label="Ir para o início">
        <span className="brand-mark">
          <img src={brandIconSrc} alt="" aria-hidden="true" />
        </span>
        <span>
          <strong>QResenha</strong>
          <small>Organização para cada partida.</small>
        </span>
      </button>

      <div className="topbar-actions">
        <div className="app-menu-area" ref={menuRef}>
          <button
            className="menu-trigger"
            onClick={() => {
              setMenuOpen((current) => !current);
              setNotificationsOpen(false);
              setProfileOpen(false);
            }}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <Menu size={20} /> <span>Menu</span>
          </button>
          {menuOpen && (
            <nav className="app-menu-dropdown" aria-label="Menu principal">
              {navigation.map(({ id, icon: Icon, title, detail }) => (
                <button
                  key={id}
                  className={view === id ? "active" : ""}
                  disabled={id === "match" && !hasMatch}
                  onClick={() => onNavigate(id)}
                >
                  <Icon size={18} />
                  <span>
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </span>
                </button>
              ))}
            </nav>
          )}
        </div>

        <button
          className="icon-button theme-button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
        >
          {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        {academyMode && (
          <div className="notification-area" ref={notificationsRef}>
            <button
              className="icon-button notification-trigger"
              onClick={() => {
                onNotificationsRead();
                setNotificationsOpen((current) => !current);
                setMenuOpen(false);
                setProfileOpen(false);
              }}
              aria-label={`Notificações não lidas do Modo Treinador: ${unreadNotifications}`}
              aria-expanded={notificationsOpen}
              aria-haspopup="dialog"
            >
              <Bell className="notification-bell" size={20} aria-hidden="true" />
              {unreadNotifications > 0 && (
                <span className="notification-count">{unreadNotifications}</span>
              )}
            </button>
            {notificationsOpen && (
              <section className="notification-dropdown" aria-label="Notificações do treinador">
                <header>
                  <div>
                    <strong>Notificações</strong>
                    <small>Informações importantes dos atletas</small>
                  </div>
                  <span>{notifications.length}</span>
                </header>
                <div className="notification-list">
                  {notifications.length === 0 ? (
                    <div className="notification-empty">
                      <Bell size={20} />
                      <span>Nenhum aviso no momento.</span>
                    </div>
                  ) : (
                    notifications.slice(0, 4).map((notification) => {
                      const Icon =
                        notification.type === "birthday" ? CalendarDays : CircleDollarSign;
                      return (
                        <article
                          className={`notification-item ${notification.type}`}
                          key={notification.id}
                        >
                          <span className="notification-item-icon">
                            <Icon size={17} />
                          </span>
                          <div>
                            <strong>{notification.title}</strong>
                            <p>{notification.message}</p>
                            <small>{notification.dateLabel}</small>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        <div className="profile-area" ref={profileRef}>
          <button
            className="profile-trigger"
            onClick={() => {
              setProfileOpen((current) => !current);
              setMenuOpen(false);
              setNotificationsOpen(false);
            }}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <AvatarPerfil name={displayName} icon />
            <span>
              <strong>{displayName}</strong>
              <small>{email}</small>
            </span>
            <ChevronDown size={16} />
          </button>
          {profileOpen && (
            <div className="profile-dropdown" role="menu">
              <ProfileAction
                icon={UserRound}
                title="Meu perfil"
                detail="Nome da conta"
                onClick={onOpenProfile}
              />
              <ProfileAction
                icon={Settings}
                title="Configurações"
                detail="Jogadores e partidas"
                onClick={onOpenSettings}
              />
              <ProfileAction
                icon={KeyRound}
                title="Trocar senha"
                detail="Validar senha atual"
                onClick={onOpenPassword}
              />
              <ProfileAction
                className="logout-item"
                icon={LogOut}
                title="Sair"
                detail="Encerrar acesso"
                onClick={onSignOut}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function BarraGrupos({
  groups,
  activeGroupId,
  onChange,
  onCreate,
  busy,
  managementMode,
  onModeChange,
}) {
  return (
    <div className="group-context-bar" aria-label="Contexto de trabalho">
      <div className="mode-switch-cards" role="group" aria-label="Modo de gestão">
        <button
          className={managementMode === "amateur" ? "active" : ""}
          onClick={() => onModeChange("amateur")}
          type="button"
        >
          <span className="mode-card-art amateur-art" aria-hidden="true">
            <img className="mode-brand-logo" src={brandIconSrc} alt="" />
          </span>
          <span>
            <strong>Modo Amador</strong>
            <small>Grupos, partidas e rankings</small>
          </span>
        </button>
        <button
          className={managementMode === "academy" ? "active" : ""}
          onClick={() => onModeChange("academy")}
          type="button"
        >
          <span className="mode-card-art" aria-hidden="true">
            <img src={`${import.meta.env.BASE_URL}assets/mascote-resenha.webp`} alt="" />
          </span>
          <span>
            <strong>Modo Treinador</strong>
            <small>Atletas, saúde e mensalidades</small>
          </span>
        </button>
      </div>
      <div className="group-context-actions">
        <label className="context-select group-select">
          <span>
            <Users size={14} /> Grupo
          </span>
          <select
            value={activeGroupId}
            onChange={(event) => onChange(event.target.value)}
            disabled={busy}
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <ChevronDown size={16} />
        </label>
        <button className="button secondary group-create-button" onClick={onCreate} disabled={busy}>
          <Plus size={17} /> <span>Adicionar grupo</span>
        </button>
      </div>
      <small className="mode-status">
        {managementMode === "academy"
          ? "Treinador · gestão técnica e administrativa dos atletas"
          : "Amador · gestão de participantes e partidas"}
      </small>
    </div>
  );
}

function ProfileAction({ className = "", icon: Icon, title, detail, onClick }) {
  return (
    <button className={className} onClick={onClick} role="menuitem">
      <Icon size={17} />
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </button>
  );
}

export function RodapeSite() {
  return (
    <footer className="site-footer">
      <strong>QResenha</strong>
      <div className="footer-developer">
        <img src={developerEmblemSrc} alt="" aria-hidden="true" />
        <span>
          Criado e desenvolvido por <strong>Adriel Alves Quintava</strong>
        </span>
      </div>
      <small>Projeto em evolução contínua · versão de testes.</small>
    </footer>
  );
}
