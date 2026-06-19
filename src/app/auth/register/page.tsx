'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Shield, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const router   = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [done, setDone]       = useState(false);
  const [form, setForm] = useState({
    name:     '',
    email:    '',
    password: '',
    confirm:  '',
  });

  async function handleRegister(e: React.FormEvent) {
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
      const { error } = await supabase.auth.signUp({
        email:    form.email,
        password: form.password,
        options:  {
          data: { full_name: form.name },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/login`,
        },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="cc-card p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-brand-900 mb-2">Conta criada!</h2>
          <p className="text-slate-500 text-sm mb-6">
            Enviamos um e-mail de confirmação para <strong>{form.email}</strong>.
            Acesse sua caixa de entrada e clique no link para ativar sua conta.
          </p>
          <Link href="/auth/login" className="btn-primary w-full justify-center">
            Ir para o Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <div className="flex items-center gap-2 justify-center mb-8">
          <Shield className="w-6 h-6 text-brand-700" />
          <span className="font-bold text-brand-900 text-lg">ContractCore</span>
        </div>

        <div className="cc-card p-8">
          <h2 className="text-2xl font-bold text-brand-900 mb-1">Criar conta</h2>
          <p className="text-slate-500 text-sm mb-8">
            Plataforma de governança contratual para clínicas
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="cc-label">Nome completo</label>
              <input
                type="text"
                required
                className="cc-input"
                placeholder="Dra. Ana Silva"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="cc-label">E-mail</label>
              <input
                type="email"
                required
                className="cc-input"
                placeholder="seu@email.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>

            <div>
              <label className="cc-label">Senha (mínimo 8 caracteres)</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  className="cc-input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="cc-label">Confirmar senha</label>
              <input
                type="password"
                required
                className="cc-input"
                placeholder="••••••••"
                value={form.confirm}
                onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando conta...
                </>
              ) : 'Criar minha conta'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Já tem conta?{' '}
            <Link href="/auth/login" className="text-brand-600 font-semibold hover:underline">
              Entrar
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Em conformidade com a LGPD · Dados protegidos por criptografia
        </p>
      </div>
    </div>
  );
}