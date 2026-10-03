export const PASSWORD_MIN_LENGTH = 8;

export function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .slice(0, 254);
}

export function passwordIssue(password) {
  if (password.length < PASSWORD_MIN_LENGTH)
    return `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password))
    return "Use pelo menos uma letra e um número na senha.";
  return "";
}

// Evita expor mensagens internas do provedor e mantém respostas previsíveis para o usuário.
export function friendlyAuthError(error, fallback = "Não foi possível concluir. Tente novamente.") {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();
  if (code.includes("invalid_credentials") || message.includes("invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (code.includes("email_not_confirmed") || message.includes("email not confirmed"))
    return "Confirme o e-mail recebido antes de entrar.";
  if (code.includes("user_already_exists") || message.includes("already registered"))
    return "Já existe uma conta cadastrada com este e-mail.";
  if (code.includes("over_email_send_rate_limit") || message.includes("rate limit"))
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos.";
  if (code.includes("weak_password") || message.includes("password"))
    return "A senha não atende aos requisitos de segurança.";
  return fallback;
}

export function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
