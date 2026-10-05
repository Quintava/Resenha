import { ArrowLeft, ChevronRight, CloudOff, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { AlternadorTema } from "../comuns/ComponentesComuns";
import { PASSWORD_MIN_LENGTH } from "../../utilitarios/seguranca";

const mascotSrc = `${import.meta.env.BASE_URL}assets/mascote-resenha.webp`;
const brandIconSrc = `${import.meta.env.BASE_URL}assets/logo-resenha.webp`;
const authSlides = [
  { src: mascotSrc, alt: "Mascote esportivo do Resenha", type: "mascot" },
  {
    src: `${import.meta.env.BASE_URL}assets/ranking-futebol.webp`,
    alt: "Equipe de futebol do Resenha",
    type: "team",
  },
  {
    src: `${import.meta.env.BASE_URL}assets/ranking-volei.webp`,
    alt: "Equipe de vôlei do Resenha",
    type: "team",
  },
  {
    src: `${import.meta.env.BASE_URL}assets/ranking-basquete.webp`,
    alt: "Equipe de basquete do Resenha",
    type: "team",
  },
];

function AuthSportCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return undefined;
    const interval = window.setInterval(
      () => setActiveSlide((current) => (current + 1) % authSlides.length),
      4500,
    );
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="auth-sport-carousel" aria-live="off">
      <div className="auth-slide-frame">
        {authSlides.map((slide, index) => (
          <img
            className={`auth-slide ${slide.type} ${index === activeSlide ? "active" : ""}`}
            src={slide.src}
            alt={index === activeSlide ? slide.alt : ""}
            aria-hidden={index !== activeSlide}
            width={slide.type === "mascot" ? "720" : "1200"}
            height={slide.type === "mascot" ? "810" : "800"}
            key={slide.src}
          />
        ))}
      </div>
    </div>
  );
}

export function TelaAutenticacao({
  mode,
  setMode,
  email,
  setEmail,
  password,
  setPassword,
  passwordConfirm,
  setPasswordConfirm,
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
      <AlternadorTema theme={theme} setTheme={setTheme} className="auth-theme" />
      <section className="auth-hero">
        <div className="auth-brand">
          <span className="brand-mark mascot-brand-mark">
            <img src={brandIconSrc} alt="" aria-hidden="true" />
          </span>
          <span>
            <strong>Resenha</strong>
            <small>Organização completa do jogo</small>
          </span>
        </div>
        <div className="auth-stage">
          <AuthSportCarousel />
          <div className="auth-copy">
            <span className="auth-kicker">A COMPETIÇÃO COMEÇA AQUI</span>
            <h1>Entre em campo. Deixe sua marca.</h1>
            <p>Monte os times, dispute cada lance e descubra quem domina a rodada.</p>
          </div>
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
              onClick={() => {
                setMode("signin");
                setPasswordConfirm("");
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => {
                setMode("signup");
                setPasswordConfirm("");
              }}
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
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck="false"
                  maxLength="254"
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
                  minLength={PASSWORD_MIN_LENGTH}
                  maxLength="128"
                  required
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres`}
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
            {mode === "signup" && (
              <div className="field">
                <label htmlFor="login-password-confirm">Repita a senha</label>
                <div className="auth-input">
                  <LockKeyhole size={18} />
                  <input
                    id="login-password-confirm"
                    type={showPassword ? "text" : "password"}
                    minLength={PASSWORD_MIN_LENGTH}
                    maxLength="128"
                    required
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    placeholder="Digite a mesma senha novamente"
                  />
                </div>
              </div>
            )}
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

export function TelaRecuperacaoSenha({
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
      <AlternadorTema theme={theme} setTheme={setTheme} className="auth-theme" />
      <section className="auth-hero">
        <div className="auth-brand">
          <span className="brand-mark mascot-brand-mark">
            <img src={brandIconSrc} alt="" aria-hidden="true" />
          </span>
          <span>
            <strong>Resenha</strong>
            <small>Recuperação de acesso</small>
          </span>
        </div>
        <div className="auth-stage recovery-stage">
          <img
            className="auth-mascot recovery-mascot"
            src={mascotSrc}
            alt="Mascote esportivo do Resenha"
            width="720"
            height="810"
          />
          <div className="auth-copy">
            <span className="auth-kicker">VOLTE PARA A DISPUTA</span>
            <h1>Recupere seu acesso.</h1>
            <p>Defina uma nova senha e retorne ao seu grupo.</p>
          </div>
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
              placeholder={`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres`}
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
          minLength={PASSWORD_MIN_LENGTH}
          maxLength="128"
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

export function TelaConfiguracaoAutenticacao({ theme, setTheme }) {
  return (
    <main className="auth-page setup-required-page">
      <AlternadorTema theme={theme} setTheme={setTheme} className="auth-theme" />
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
