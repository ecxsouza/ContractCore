'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { traduzirErroSupabase } from '@/lib/errorMessages';
import { Shield, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [email, setEmail]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/reset-password`,
      });
      if (error) {
        toast.error(traduzirErroSupabase(error.message));
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-brand flex">

      {/* ── Painel esquerdo — Visual Premium ─── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-brand opacity-95" />
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">ContractCore Elite</span>
              <div className="text-white/50 text-xs tracking-widest uppercase">by Zanarole</div>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Recupere o acesso<br />
            <span className="text-gold-400">à sua conta.</span>
          </h1>
          <p className="text-white/65 text-lg leading-relaxed max-w-md">
            Enviaremos um link seguro para redefinir sua senha por e-mail.
          </p>
        </div>

        <div className="relative z-10 text-white/30 text-xs">
          © {new Date().getFullYear()} ContractCore · Todos os direitos reservados
        </div>
      </div>

      {/* ── Painel direito — Formulário ─── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">

          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Shield className="w-6 h-6 text-brand-700" />
            <span className="font-bold text-brand-900 text-lg">ContractCore</span>
          </div>

          <div className="cc-card p-8">
            {!sent ? (
              <>
                <h2 className="text-2xl font-bold text-brand-900 mb-1">Esqueceu a senha?</h2>
                <p className="text-slate-500 text-sm mb-8">
                  Informe seu e-mail e enviaremos um link para redefinir sua senha.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="cc-label">E-mail</label>
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      className="cc-input"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" /> Enviar link de recuperação
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-brand-900 mb-2">Verifique seu e-mail</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Se houver uma conta cadastrada com <strong>{email}</strong>, enviamos um link
                  para redefinir sua senha. Acesse sua caixa de entrada (e a pasta de spam) e
                  clique no link para continuar.
                </p>
              </div>
            )}

            <Link
              href="/auth/login"
              className="flex items-center justify-center gap-1.5 text-sm text-brand-600 font-semibold hover:underline mt-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o login
            </Link>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Plataforma em conformidade com LGPD · Dados criptografados · Acesso seguro
          </p>
        </div>
      </div>

    </div>
  );
}
