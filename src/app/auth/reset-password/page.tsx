'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { traduzirErroSupabase } from '@/lib/errorMessages';
import { Shield, Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router   = useRouter();
  const supabase = createClient();
  const [loading,    setLoading]    = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [done,       setDone]       = useState(false);
  const [sessionOk,  setSessionOk]  = useState<boolean | null>(null);
  const [form, setForm] = useState({ password: '', confirm: '' });

  // O Supabase troca o token do link por uma sessão temporária automaticamente
  // ao carregar esta página (via hash da URL). Verificamos se a sessão existe.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionOk(!!session);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (form.password.length < 8) {
      toast.error('A senha precisa ter no mínimo 8 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: form.password });
      if (error) {
        toast.error(traduzirErroSupabase(error.message));
        return;
      }
      setDone(true);
      toast.success('Senha redefinida com sucesso!');
      setTimeout(() => router.push('/auth/login'), 2000);
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
            Defina sua<br />
            <span className="text-gold-400">nova senha.</span>
          </h1>
          <p className="text-white/65 text-lg leading-relaxed max-w-md">
            Escolha uma senha forte para manter sua conta protegida.
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
            {sessionOk === false ? (
              <div className="text-center py-4">
                <h2 className="text-xl font-bold text-brand-900 mb-2">Link inválido ou expirado</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  Este link de redefinição de senha não é mais válido. Solicite um novo link
                  na tela de recuperação de senha.
                </p>
                <a href="/auth/forgot-password" className="btn-primary w-full justify-center py-3 inline-flex">
                  Solicitar novo link
                </a>
              </div>
            ) : done ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-brand-900 mb-2">Senha redefinida!</h2>
                <p className="text-slate-500 text-sm">Redirecionando para o login...</p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-brand-900 mb-1">Nova senha</h2>
                <p className="text-slate-500 text-sm mb-8">Escolha uma senha forte para sua conta.</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="cc-label">Nova senha</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        placeholder="Mínimo 8 caracteres"
                        className="cc-input pr-10"
                        value={form.password}
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowPass(!showPass)}
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="cc-label">Confirmar nova senha</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      placeholder="Repita a senha"
                      className="cc-input"
                      value={form.confirm}
                      onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                      autoComplete="new-password"
                    />
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" /> Redefinir senha
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Plataforma em conformidade com LGPD · Dados criptografados · Acesso seguro
          </p>
        </div>
      </div>

    </div>
  );
}
