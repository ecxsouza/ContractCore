// ================================================================
// ContractCore — Tradução de erros técnicos (Supabase/Postgres) para
// mensagens amigáveis em português. Usado em qualquer formulário que
// trate respostas de erro do Supabase Auth ou do banco de dados.
// ================================================================

/**
 * Traduz a mensagem de erro crua do Supabase/Postgres para uma
 * mensagem amigável em português. Se não reconhecer o padrão,
 * retorna a mensagem original como fallback.
 */
export function traduzirErroSupabase(message: string | undefined | null): string {
  if (!message) return 'Ocorreu um erro inesperado. Tente novamente.';

  // ── Autenticação ────────────────────────────────────────────
  if (message === 'Invalid login credentials') {
    return 'E-mail ou senha incorretos.';
  }
  if (message === 'Email not confirmed') {
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (e spam) e clique no link de confirmação.';
  }
  if (message.includes('User already registered')) {
    return 'Já existe uma conta cadastrada com este e-mail.';
  }
  if (message.includes('Password should be at least')) {
    return 'A senha precisa ter no mínimo 8 caracteres.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Muitas tentativas em sequência. Aguarde alguns minutos e tente novamente.';
  }

  // ── Violações de unicidade (chave duplicada) ────────────────
  if (message.includes('duplicate key value violates unique constraint')) {
    if (message.includes('companies_cnpj_key')) {
      return 'Já existe uma empresa cadastrada com este CNPJ.';
    }
    if (message.includes('companies_user_id_key')) {
      return 'Este usuário já possui uma empresa cadastrada.';
    }
    if (message.includes('service_providers') && message.includes('cpf')) {
      return 'Já existe um prestador cadastrado com este CPF.';
    }
    if (message.includes('service_providers') && message.includes('cnpj')) {
      return 'Já existe um prestador cadastrado com este CNPJ.';
    }
    if (message.includes('email')) {
      return 'Este e-mail já está em uso.';
    }
    return 'Já existe um registro com esses dados no sistema.';
  }

  // ── Violações de chave estrangeira ───────────────────────────
  if (message.includes('violates foreign key constraint')) {
    return 'Não foi possível concluir a operação porque há dados vinculados a este registro.';
  }

  // ── Campos obrigatórios não preenchidos no banco ────────────
  if (message.includes('violates not-null constraint')) {
    return 'Há um campo obrigatório não preenchido. Verifique o formulário.';
  }

  // Fallback: retorna a mensagem original (evita esconder erros não mapeados)
  return message;
}
