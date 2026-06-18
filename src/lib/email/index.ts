// ================================================================
// ContractCore — Serviço de E-mail via Resend
// A chave RESEND_API_KEY fica APENAS no servidor
// ================================================================

import { Resend } from 'resend';

// Instância única do Resend (lazy — só instancia quando necessário)
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY não configurada. Adicione ao .env.local e nas variáveis da Vercel.');
  }
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

// Remetente padrão — pode ser customizado na env
function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'ContractCore <onboarding@resend.dev>';
}

// ── ENVIAR E-MAIL GENÉRICO ────────────────────────────────────────
export async function sendEmail(params: {
  to:       string | string[];
  subject:  string;
  html:     string;
  from?:    string;
  replyTo?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from:     params.from || getFromEmail(),
      to:       Array.isArray(params.to) ? params.to : [params.to],
      subject:  params.subject,
      html:     params.html,
      reply_to: params.replyTo,
    });

    if (error) {
      console.error('[email] Erro Resend:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('[email] Erro inesperado:', err);
    return { success: false, error: err.message || 'Erro ao enviar e-mail' };
  }
}

// ── VERIFICAR SE E-MAIL ESTÁ CONFIGURADO ─────────────────────────
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY &&
    process.env.RESEND_API_KEY !== 're_...sua_chave_aqui';
}
