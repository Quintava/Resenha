import {
  ArrowLeft,
  ChevronRight,
  CloudOff,
  Eye,
  EyeOff,
  Goal,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { ThemeToggle } from "../common/Common";

export function AuthScreen({
  mode,
  setMode,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  message,
  busy,
  onSubmit,
  onForgot,
  theme,
  setTheme,
}) {
  return (
    <main className="auth-page">
      <ThemeToggle theme={theme} setTheme={setTheme} className="auth-theme" />
      <section className="auth-hero">
        <div className="auth-brand">
          <span className="brand-mark">
            <Goal size={27} />
          </span>
          <span>
            <strong>Resenha</strong>
            <small>Organização completa do jogo</small>
          </span>
        </div>
        <div className="auth-copy">
          <h1>Organize o jogo. Viva a resenha.</h1>
          <p>Times equilibrados, placar ao vivo e desempenho em um só lugar.</p>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <span className="auth-lock">
            <LockKeyhole size={23} />
          </span>
          <h2>{mode === "signup" ? "Criar uma conta" : "Entrar no aplicativo"}</h2>
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "signin" ? "active" : ""}
              onClick={() => setMode("signin")}
            >
              Entrar
            </button>
            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => setMode("signup")}
            >
              Criar conta
            </button>
          </div>
          <form className="auth-form" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="login-email">E-mail</label>
              <div className="auth-input">
                <Mail size={18} />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nome@email.com"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="login-password">Senha</label>
              <div className="auth-input">
                <LockKeyhole size={18} />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  minLength="6"
                  required
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {mode === "signin" && (
              <button className="forgot-button" type="button" onClick={onForgot} disabled={busy}>
                Esqueci minha senha
              </button>
            )}
            {message && (
              <p className="auth-message" role="status">
                {message}
              </p>
            )}
            <button className="button primary large full" type="submit" disabled={busy}>
              {busy ? "Aguarde..." : mode === "signup" ? "Criar minha conta" : "Entrar"}
              <ChevronRight size={19} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export function PasswordRecoveryScreen({
  password,
  setPassword,
  confirm,
  setConfirm,
  message,
  busy,
  onSubmit,
  onBack,
  theme,
  setTheme,
}) {
  return (
    <main className="auth-page recovery-page">
      <ThemeToggle theme={theme} setTheme={setTheme} className="auth-theme" />
      <section className="auth-hero">
        <div className="auth-brand">
          <span className="brand-mark">
            <Goal size={27} />
          </span>
          <span>
            <strong>Resenha</strong>
            <small>Recuperação de acesso</small>
          </span>
        </div>
        <div className="auth-copy">
          <h1>Crie uma nova senha.</h1>
          <p>Escolha uma senha segura para voltar ao seu grupo.</p>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <button className="recovery-back" type="button" onClick={onBack}>
            <ArrowLeft size={17} /> Voltar ao login
          </button>
          <span className="auth-lock">
            <LockKeyhole size={23} />
          </span>
          <h2>Redefinir senha</h2>
          <form className="auth-form" onSubmit={onSubmit}>
            <PasswordField
              id="new-password"
              label="Nova senha"
              value={password}
              setValue={setPassword}
              placeholder="Mínimo de 6 caracteres"
            />
            <PasswordField
              id="confirm-password"
              label="Confirmar nova senha"
              value={confirm}
              setValue={setConfirm}
              placeholder="Digite novamente"
            />
            {message && (
              <p className="auth-message" role="status">
                {message}
              </p>
            )}
            <button className="button primary large full" disabled={busy}>
              {busy ? "Salvando..." : "Salvar nova senha"}
              <ChevronRight size={19} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function PasswordField({ id, label, value, setValue, placeholder }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-input">
        <LockKeyhole size={18} />
        <input
          id={id}
          type="password"
          minLength="6"
          required
          autoComplete="new-password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

export function AuthSetupRequired({ theme, setTheme }) {
  return (
    <main className="auth-page setup-required-page">
      <ThemeToggle theme={theme} setTheme={setTheme} className="auth-theme" />
      <section className="setup-required-card">
        <span className="auth-lock">
          <CloudOff size={25} />
        </span>
        <span className="eyebrow">CONFIGURAÇÃO NECESSÁRIA</span>
        <h1>Ative o banco de dados para liberar o login</h1>
        <p>
          Por segurança, jogadores e históricos não ficam mais disponíveis sem autenticação. Siga o
          arquivo <strong>CONFIGURAR_SUPABASE.md</strong> e adicione as duas chaves no GitHub.
        </p>
        <div className="setup-code">
          <code>VITE_SUPABASE_URL</code>
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>
        </div>
      </section>
    </main>
  );
}
