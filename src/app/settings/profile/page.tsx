'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { maskPhone, capitalizeName } from '@/lib/masks';
import toast from 'react-hot-toast';
import { traduzirErroSupabase } from '@/lib/errorMessages';
import { User, Save, Lock } from 'lucide-react';
import type { Company } from '@/types';

export default function ProfilePage() {
  const supabase = createClient();
  const [company, setCompany] = useState<Company | null>(null);
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [loading, setSaving]  = useState(false);
  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' });
  const [loadingPass, setLoadingPass] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setName(user.user_metadata?.full_name || '');
      setPhone(user.user_metadata?.phone || '');
      const { data: co } = await supabase.from('companies').select('*').eq('user_id', user.id).single();
      if (co) setCompany(co);
    }
    load();
  }, []);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name, phone }
      });
      if (error) throw error;
      toast.success('Perfil atualizado!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar.');
    } finally { setSaving(false); }
  }

  async function handleChangePassword() {
    if (passForm.next !== passForm.confirm) { toast.error('As senhas não coincidem.'); return; }
    if (passForm.next.length < 8) { toast.error('Mínimo 8 caracteres.'); return; }
    setLoadingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passForm.next });
      if (error) throw error;
      toast.success('Senha alterada com sucesso!');
      setPassForm({ current: '', next: '', confirm: '' });
    } catch (e: any) {
      toast.error(traduzirErroSupabase(e.message) || 'Erro ao alterar senha.');
    } finally { setLoadingPass(false); }
  }

  const fakeCompany: Company = company || { id:'',user_id:'',razao_social:'Minha Empresa',nome_fantasia:'ContractCore',cnpj:'',email:'',telefone:'',responsavel_legal:'',cpf_responsavel:'',cep:'',logradouro:'',numero:'',bairro:'',cidade:'',uf:'',created_at:'',updated_at:'' };

  return (
    <AppLayout company={fakeCompany}>
      <div className="max-w-xl mx-auto space-y-6 animate-in">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-5 h-5 text-brand-600" />
          <h1 className="text-2xl font-bold text-brand-900">Meu Perfil</h1>
        </div>

        <div className="cc-card p-6 space-y-4">
          <div className="section-title">Dados Pessoais</div>
          <div>
            <label className="cc-label">Nome completo</label>
            <input className="cc-input" value={name} onChange={e => setName(capitalizeName(e.target.value))} placeholder="Seu nome" />
          </div>
          <div>
            <label className="cc-label">Telefone</label>
            <input className="cc-input" value={phone} onChange={e => setPhone(maskPhone(e.target.value))} placeholder="(11) 99999-0000" maxLength={15} />
          </div>
          <button onClick={handleSaveProfile} disabled={loading} className="btn-primary">
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Perfil
          </button>
        </div>

        <div className="cc-card p-6 space-y-4">
          <div className="section-title flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Alterar Senha</div>
          <div>
            <label className="cc-label">Nova senha</label>
            <input type="password" className="cc-input" value={passForm.next} onChange={e => setPassForm(p=>({...p,next:e.target.value}))} placeholder="Mínimo 8 caracteres" />
          </div>
          <div>
            <label className="cc-label">Confirmar nova senha</label>
            <input type="password" className="cc-input" value={passForm.confirm} onChange={e => setPassForm(p=>({...p,confirm:e.target.value}))} placeholder="Repita a senha" />
          </div>
          <button onClick={handleChangePassword} disabled={loadingPass} className="btn-secondary">
            {loadingPass ? <span className="w-4 h-4 border-2 border-slate-300 border-t-brand-600 rounded-full animate-spin" /> : <Lock className="w-4 h-4" />}
            Alterar Senha
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
