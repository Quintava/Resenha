import {
  Activity,
  BarChart3,
  ChevronDown,
  Globe2,
  Goal,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";

import { ProfileAvatar } from "../common/Common";

const navigation = [
  { id: "setup", icon: Users, title: "Preparar jogo", detail: "Presença e divisão dos times" },
  { id: "match", icon: Activity, title: "Partida", detail: "Rodadas, placar e times de fora" },
  { id: "stats", icon: BarChart3, title: "Estatísticas", detail: "Classificação por modalidade" },
  { id: "mural", icon: Globe2, title: "Mural da Resenha", detail: "Ranking público e agenda" },
  { id: "evolution", icon: TrendingUp, title: "Evolução", detail: "Desempenho de cada jogador" },
];

export function Topbar({
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
}) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => onNavigate("setup")} aria-label="Ir para o início">
        <span className="brand-mark">
          <Goal size={24} />
        </span>
        <span>
          <strong>Resenha</strong>
          <small>Onde o jogo termina e a resenha começa.</small>
        </span>
      </button>

      <div className="topbar-actions">
        <div className="app-menu-area" ref={menuRef}>
          <button
            className="menu-trigger"
            onClick={() => setMenuOpen((current) => !current)}
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

        <div className="profile-area" ref={profileRef}>
          <button
            className="profile-trigger"
            onClick={() => setProfileOpen((current) => !current)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <ProfileAvatar name={displayName} />
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
                detail="Nome e inicial"
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

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <strong>Resenha</strong>
      <span>Criado e desenvolvido por Adriel Alves Quintava.</span>
      <small>Projeto em evolução contínua · versão de testes.</small>
    </footer>
  );
}
