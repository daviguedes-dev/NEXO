/** Mensagens em português para os erros de autenticação do Supabase. */
export function authMessage(error: unknown): string {
  const e = (error ?? {}) as { code?: string; status?: number; message?: string; name?: string }
  if (e.status === 0 || e.name === 'AuthRetryableFetchError' || (typeof navigator !== 'undefined' && !navigator.onLine))
    return 'Sem conexão com o servidor. Verifique a internet e tente de novo.'
  switch (e.code) {
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.'
    case 'email_not_confirmed':
      return 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
    case 'user_already_exists':
    case 'email_exists':
      return 'Já existe uma conta com este e-mail. Tente entrar.'
    case 'weak_password':
      return 'Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.'
    case 'same_password':
      return 'A nova senha precisa ser diferente da atual.'
    case 'email_address_invalid':
    case 'validation_failed':
      return 'Confira o e-mail informado.'
    case 'over_email_send_rate_limit':
      return 'Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo.'
    case 'over_request_rate_limit':
      return 'Muitas tentativas. Aguarde um pouco e tente novamente.'
    case 'signup_disabled':
      return 'Novas contas estão desativadas neste projeto.'
    case 'otp_expired':
      return 'O link expirou. Peça um novo.'
  }
  return e.message ? `Não foi possível concluir: ${e.message}` : 'Não foi possível concluir. Tente novamente.'
}
