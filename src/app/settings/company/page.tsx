'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { maskCNPJ, maskCPF, maskPhone, maskCEP, capitalizeName, onlyDigits } from '@/lib/masks';
import toast from 'react-hot-toast';
import { traduzirErroSupabase } from '@/lib/errorMessages';
import { Building2, Upload, Save, Search, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import type { Company } from '@/types';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

function CompanySettingsInner() {
  const router      = useRouter();
  const params      = useSearchParams();
  const isOnboarding = params.get('onboarding') === 'true';
  const supabase    = createClient();

  const [company, setCompany] = useState<Partial<Company>>({
    razao_social: '', nome_fantasia: '', cnpj: '', inscricao_municipal: '', inscricao_estadual: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: 'SP',
    email: '', telefone: '', responsavel_legal: '', cpf_responsavel: '',
    pix_key: '', banco: '', agencia: '', conta: '', tipo_conta: 'corrente',
  });
  const [loading, setSaving]  = useState(false);
  const [loadingCNPJ, setLCNPJ] = useState(false);
  const [loadingCEP, setLCEP]   = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Carregar empresa existente
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('companies').select('*').eq('user_id', user.id).single();
      if (data) {
        setCompany(data);
        if (data.logo_url) setLogoPreview(data.logo_url);
      }
    }
    load();
  }, []);

  function update(field: keyof Company, value: string) {
    setCompany(prev => ({ ...prev, [field]: value }));
  }

  async function buscarCNPJ() {
    const cnpj = onlyDigits(company.cnpj || '');
    if (cnpj.length !== 14) { toast.error('Digite o CNPJ completo.'); return; }
    setLCNPJ(true);
    try {
      const res = await fetch(`/api/cnpj?cnpj=${cnpj}`);
      if (!res.ok) { toast.error('CNPJ não encontrado.'); return; }
      const d = await res.json();
      setCompany(prev => ({
        ...prev,
        razao_social: d.razao_social,
        nome_fantasia: d.nome_fantasia || prev.nome_fantasia,
        logradouro: d.logradouro,
        numero: d.numero,
        complemento: d.complemento || '',
        bairro: d.bairro,
        cidade: d.municipio,
        uf: d.uf,
        cep: d.cep,
        email: d.email || prev.email,
        telefone: d.telefone || prev.telefone,
      }));
      toast.success('Dados preenchidos via CNPJ!');
    } finally { setLCNPJ(false); }
  }

  async function buscarCEP() {
    const cep = onlyDigits(company.cep || '');
    if (cep.length !== 8) return;
    setLCEP(true);
    try {
      const res = await fetch(`/api/cep?cep=${cep}`);
      if (!res.ok) return;
      const d = await res.json();
      setCompany(prev => ({
        ...prev,
        logradouro: d.logradouro || prev.logradouro,
        bairro: d.bairro || prev.bairro,
        cidade: d.localidade || prev.cidade,
        uf: d.uf || prev.uf,
      }));
    } finally { setLCEP(false); }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Logo máximo 5MB.'); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!company.razao_social || !company.cnpj || !company.email) {
      toast.error('Preencha os campos obrigatórios: Razão Social, CNPJ e E-mail.');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      let logo_url = company.logo_url;

      // Upload de logo
      if (logoFile) {
        const ext  = logoFile.name.split('.').pop();
        const path = `${user.id}/logo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('company-logos')
          .upload(path, logoFile, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(path);
          logo_url = urlData.publicUrl;
        }
      }

      const payload = { ...company, user_id: user.id, logo_url };

      if (company.id) {
        const { error } = await supabase.from('companies').update(payload).eq('id', company.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('companies').insert(payload).select().single();
        if (error) throw error;
        setCompany(data);
      }

      toast.success('Dados da empresa salvos!');
      // Forçar reload da página para refletir nova logo
      if (isOnboarding) {
        router.push('/dashboard');
      } else {
        router.refresh();
        window.location.reload();
      }
    } catch (err: any) {
      toast.error(traduzirErroSupabase(err.message) || 'Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const fakeCompanyForLayout: Company = company.id
    ? (company as Company)
    : { id: '', user_id: '', razao_social: 'Sua Empresa', nome_fantasia: 'ContractCore', cnpj: '', email: '', telefone: '', responsavel_legal: '', cpf_responsavel: '', cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '', created_at: '', updated_at: '' };

  return (
    <AppLayout company={fakeCompanyForLayout}>
      <div className="max-w-3xl mx-auto space-y-6 animate-in">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-brand-600" />
            <h1 className="text-2xl font-bold text-brand-900">
              {isOnboarding ? 'Cadastre sua Empresa' : 'Dados da Empresa'}
            </h1>
          </div>
          {isOnboarding && (
            <p className="text-slate-500 text-sm">
              Estas informações preencherão automaticamente todos os contratos gerados pelo ContractCore.
            </p>
          )}
        </div>

        {/* Logo */}
        <div className="cc-card p-6">
          <div className="section-title">Logo da Empresa</div>
          <div className="flex items-center gap-6">
            <div
              onClick={() => logoInputRef.current?.click()}
              className={clsx(
                'w-24 h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all',
                logoPreview ? 'border-brand-300' : 'border-slate-300 hover:border-brand-400'
              )}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain rounded-2xl p-1" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-400 text-center px-1">Clique para enviar</span>
                </>
              )}
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            <div className="text-sm text-slate-500 space-y-1">
              <p>A logo aparecerá na <strong>capa do PDF</strong> e no cabeçalho dos contratos.</p>
              <p className="text-xs text-slate-400">PNG, JPG ou SVG · Máximo 5MB · Fundo transparente recomendado</p>
              {logoPreview && (
                <button
                  onClick={() => { setLogoPreview(''); setLogoFile(null); }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remover logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dados básicos */}
        <div className="cc-card p-6">
          <div className="section-title">Identificação da Empresa</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="cc-label">CNPJ <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <input
                  className="cc-input flex-1"
                  value={company.cnpj || ''}
                  onChange={e => update('cnpj', maskCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                <button type="button" onClick={buscarCNPJ} disabled={loadingCNPJ} className="btn-secondary px-3">
                  {loadingCNPJ
                    ? <span className="w-4 h-4 border-2 border-slate-300 border-t-brand-600 rounded-full animate-spin" />
                    : <Search className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="cc-label">Inscrição Municipal (ISS)</label>
              <input className="cc-input" value={company.inscricao_municipal || ''} onChange={e => update('inscricao_municipal', e.target.value)} placeholder="CCM / ISS" />
            </div>

            <div>
              <label className="cc-label">Inscrição Estadual</label>
              <input className="cc-input" value={(company as any).inscricao_estadual || ''} onChange={e => update('inscricao_estadual' as any, e.target.value)} placeholder="IE — Inscrição Estadual (se houver)" />
            </div>

            <div className="md:col-span-2">
              <label className="cc-label">Razão Social <span className="text-red-500">*</span></label>
              <input className="cc-input" value={company.razao_social || ''} onChange={e => update('razao_social', capitalizeName(e.target.value))} placeholder="Bem Estar Psicologia Ltda" />
            </div>

            <div className="md:col-span-2">
              <label className="cc-label">Nome Fantasia <span className="text-red-500">*</span></label>
              <input className="cc-input" value={company.nome_fantasia || ''} onChange={e => update('nome_fantasia', e.target.value)} placeholder="Clínica Bem Estar" />
            </div>

            <div>
              <label className="cc-label">E-mail <span className="text-red-500">*</span></label>
              <input type="email" className="cc-input" value={company.email || ''} onChange={e => update('email', e.target.value.toLowerCase())} placeholder="contato@bemestarpsi.com.br" />
            </div>

            <div>
              <label className="cc-label">Telefone <span className="text-red-500">*</span></label>
              <input className="cc-input" value={company.telefone || ''} onChange={e => update('telefone', maskPhone(e.target.value))} placeholder="(11) 3000-0000" maxLength={15} />
            </div>

            <div>
              <label className="cc-label">Responsável Legal <span className="text-red-500">*</span></label>
              <input className="cc-input" value={company.responsavel_legal || ''} onChange={e => update('responsavel_legal', capitalizeName(e.target.value))} placeholder="Nome do sócio/diretor" />
            </div>

            <div>
              <label className="cc-label">CPF do Responsável <span className="text-red-500">*</span></label>
              <input className="cc-input" value={company.cpf_responsavel || ''} onChange={e => update('cpf_responsavel', maskCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="cc-card p-6">
          <div className="section-title">Endereço da Clínica</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="cc-label">CEP</label>
              <div className="flex gap-2">
                <input className="cc-input flex-1" value={company.cep || ''} onChange={e => update('cep', maskCEP(e.target.value))} onBlur={buscarCEP} placeholder="00000-000" maxLength={9} />
                {loadingCEP && <div className="flex items-center px-2"><span className="w-4 h-4 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" /></div>}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="cc-label">Logradouro</label>
              <input className="cc-input" value={company.logradouro || ''} onChange={e => update('logradouro', e.target.value)} placeholder="Rua, Avenida..." />
            </div>
            <div>
              <label className="cc-label">Número</label>
              <input className="cc-input" value={company.numero || ''} onChange={e => update('numero', e.target.value)} placeholder="000" />
            </div>
            <div>
              <label className="cc-label">Complemento</label>
              <input className="cc-input" value={company.complemento || ''} onChange={e => update('complemento', e.target.value)} placeholder="Sala, Andar..." />
            </div>
            <div>
              <label className="cc-label">Bairro</label>
              <input className="cc-input" value={company.bairro || ''} onChange={e => update('bairro', e.target.value)} placeholder="Bairro" />
            </div>
            <div>
              <label className="cc-label">Cidade</label>
              <input className="cc-input" value={company.cidade || ''} onChange={e => update('cidade', e.target.value)} placeholder="São Paulo" />
            </div>
            <div>
              <label className="cc-label">UF</label>
              <select className="cc-select" value={company.uf || 'SP'} onChange={e => update('uf', e.target.value)}>
                {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Dados bancários */}
        <div className="cc-card p-6">
          <div className="section-title">Dados Bancários (Opcional)</div>
          <p className="text-slate-500 text-xs mb-4">Usados para documentação interna. Não aparecem diretamente no contrato.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="cc-label">Banco</label>
              <input className="cc-input" value={company.banco || ''} onChange={e => update('banco', e.target.value)} placeholder="Nubank, Itaú, Bradesco..." />
            </div>
            <div>
              <label className="cc-label">Chave PIX</label>
              <input className="cc-input" value={company.pix_key || ''} onChange={e => update('pix_key', e.target.value)} placeholder="CNPJ, e-mail, telefone ou chave aleatória" />
            </div>
            <div>
              <label className="cc-label">Agência</label>
              <input className="cc-input" value={company.agencia || ''} onChange={e => update('agencia', e.target.value)} placeholder="0000" />
            </div>
            <div>
              <label className="cc-label">Conta</label>
              <input className="cc-input" value={company.conta || ''} onChange={e => update('conta', e.target.value)} placeholder="00000-0" />
            </div>
          </div>
        </div>

        {/* Salvar */}
        <div className="flex justify-end pb-8">
          <button onClick={handleSave} disabled={loading} className="btn-primary px-8 py-3">
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isOnboarding ? 'Salvar e Continuar' : 'Salvar Alterações'}
              </>
            )}
          </button>
        </div>

      </div>
    </AppLayout>
  );
}

export default function CompanySettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <CompanySettingsInner />
    </Suspense>
  );
}
