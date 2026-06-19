'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { traduzirErroSupabase } from '@/lib/errorMessages';
import { Eye, EyeOff, Shield, Zap, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) {
        toast.error(traduzirErroSupabase(error.message));
        return;
      }
      toast.success('Bem-vindo(a) ao ContractCore!');
      router.push('/dashboard');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-brand flex">

      {/* ── Painel esquerdo — Visual Premium ─── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-brand opacity-95" />
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">ContractCore Elite</span>
              <div className="text-white/50 text-xs tracking-widest uppercase">by Zanarole</div>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Contratos Inteligentes.<br />
            <span className="text-gold-400">Governança Completa.</span>
          </h1>
          <p className="text-white/65 text-lg leading-relaxed max-w-md">
            Plataforma especializada em compliance contratual para clínicas de psicologia e saúde.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 grid grid-cols-1 gap-4">
          {[
            { icon: Shield,  title: 'Compliance Trabalhista',  desc: 'Proteção contra riscos de pejotização' },
            { icon: Lock,    title: 'LGPD & Dados Sensíveis',  desc: 'Cláusulas robustas de proteção de dados' },
            { icon: Zap,     title: 'IA Multidisciplinar',     desc: 'Revisão por 9 especialistas simultaneamente' },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3 bg-white/8 border border-white/12 rounded-xl px-4 py-3 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-white/12 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4 h-4 text-gold-400" />
              </div>
              <div>
                <div className="text-white text-sm font-semibold">{item.title}</div>
                <div className="text-white/50 text-xs">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="relative z-10 text-white/30 text-xs">
          © {new Date().getFullYear()} ContractCore · Todos os direitos reservados
        </div>
      </div>

      {/* ── Painel direito — Formulário ─── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Shield className="w-6 h-6 text-brand-700" />
            <span className="font-bold text-brand-900 text-lg">ContractCore</span>
          </div>

          <div className="cc-card p-8">
            <h2 className="text-2xl font-bold text-brand-900 mb-1">Acessar plataforma</h2>
            <p className="text-slate-500 text-sm mb-8">Entre com suas credenciais</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="cc-label">E-mail</label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  className="cc-input"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="cc-label">Senha</label>
                  <Link href="/auth/forgot-password" className="text-xs text-brand-600 hover:underline">
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    className="cc-input pr-10"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    autoComplete="current-password"
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

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : 'Entrar na plataforma'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Não tem conta?{' '}
              <Link href="/auth/register" className="text-brand-600 font-semibold hover:underline">
                Criar conta
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Plataforma em conformidade com LGPD · Dados criptografados · Acesso seguro
          </p>
        </div>
      </div>

    </div>
  );
}
