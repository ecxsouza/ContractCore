'use client';

import { useState } from 'react';
import {
  Printer, Shield, Zap, PenLine, Trash2, CheckCircle,
  X, Mail, RefreshCw, Send, ArrowUpRight
} from 'lucide-react';
import { getContractPrintCSS, getContractPrintHeader } from '@/lib/pdf/contractPrintCSS';
import { SaveAsTemplateButton } from '@/components/contract/SaveAsTemplateButton';
import { formatDateBR } from '@/lib/masks';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Props {
  contractId:           string;
  contractNum:          string;
  contractHtml:         string;
  status:               string;
  logoUrl?:             string | null;
  companyName:          string;
  companyCity:          string;
  providerEmail?:       string | null;
  emailConfigured?:     boolean;
  providerProfissao?:   string;
  providerNome?:        string;
  providerEspecialidade?: string | null;
  providerConselho?:      string | null;
  assinadoContratante?: boolean;
  assinadoPrestador?:   boolean;
  iaRevisado:           boolean;
  iaRevisadoEm?:        string | null;
  iaSugestoes?:         string | null;
  notasInternas?:       string | null;
}

export function ContractDetailClient({
  contractId, contractNum, contractHtml, status,
  logoUrl, companyName, companyCity,
  providerEmail, emailConfigured,
  assinadoContratante = false, assinadoPrestador = false,
  providerProfissao = 'outro', providerNome = '',
  providerEspecialidade, providerConselho,
  iaRevisado, iaRevisadoEm, iaSugestoes, notasInternas
}: Props) {
  const router   = useRouter();
  const supabase = createClient();

  // Modais
  const [showSignModal,   setShowSignModal]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEmailModal,  setShowEmailModal]  = useState(false);
  const [showRenewModal,  setShowRenewModal]  = useState(false);

  // Estados dos formulários
  const [signType,   setSignType]   = useState<'contratante' | 'prestador'>('contratante');
  // Limpar nome ao trocar signatário
  function handleSignTypeChange(type: 'contratante' | 'prestador') {
    setSignType(type);
    setSignName('');
  }
  const [signName,   setSignName]   = useState('');
  const [emailExtra, setEmailExtra] = useState('');
  const [emailInstrucoes, setEmailInstrucoes] = useState('');
  const [renewForm,  setRenewForm]  = useState({ vigencia_indeterminada: true, inicio: '', fim: '' });

  // Loading states
  const [signingIA,    setSigningIA]    = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [renewing,     setRenewing]     = useState(false);

  const isRascunho = status === 'rascunho' || status === 'aguardando_assinatura' || status === 'revisado_ia' || status === 'em_revisao' || status === 'aguardando_aprovacao';

  // ── Impressão ──────────────────────────────────────────────────
  function handlePrint() {
    const css    = getContractPrintCSS(logoUrl, companyName);
    const header = getContractPrintHeader(logoUrl, companyName);
    const win    = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>${contractNum} — ${companyName}</title>
<style>${css}</style></head>
<body>${header}${contractHtml}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 700);
  }

  // ── Assinatura ─────────────────────────────────────────────────
  async function handleSign() {
    if (!signName.trim()) { toast.error('Digite o nome completo para confirmar.'); return; }
    setSigningIA(true);
    try {
      const field = signType === 'contratante'
        ? { assinado_contratante: true, data_assinatura_contratante: new Date().toISOString() }
        : { assinado_prestador: true,  data_assinatura_prestador:   new Date().toISOString() };

      const { error } = await supabase.from('contracts').update(field).eq('id', contractId);
      if (error) throw error;

      const { data: contract } = await supabase
        .from('contracts').select('assinado_contratante, assinado_prestador').eq('id', contractId).single();

      if (contract?.assinado_contratante && contract?.assinado_prestador) {
        await supabase.from('contracts').update({ status: 'assinado' }).eq('id', contractId);
        toast.success('Contrato assinado por ambas as partes!');
      } else {
        await supabase.from('contracts').update({ status: 'aguardando_assinatura' }).eq('id', contractId);
        toast.success('Assinatura registrada. Aguardando a outra parte.');
      }
      setShowSignModal(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao registrar assinatura.');
    } finally { setSigningIA(false); }
  }

  // ── E-mail ─────────────────────────────────────────────────────
  async function handleSendEmail() {
    setSendingEmail(true);
    try {
      const res = await fetch('/api/email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          tipo:        'contrato',
          contractId,
          destinatario: emailExtra || undefined,
          instrucoes:   emailInstrucoes || undefined,
        }),
      });
      const data = await res.json() as { enviado_para?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar');
      toast.success(`E-mail enviado para ${data.enviado_para?.join(', ')}`);
      setShowEmailModal(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar e-mail.');
    } finally { setSendingEmail(false); }
  }

  // ── Renovação ──────────────────────────────────────────────────
  async function handleRenew() {
    setRenewing(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/renew`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          vigencia_indeterminada: renewForm.vigencia_indeterminada,
          nova_vigencia_inicio:   renewForm.inicio || new Date().toISOString().split('T')[0],
          nova_vigencia_fim:      renewForm.vigencia_indeterminada ? undefined : renewForm.fim,
        }),
      });
      const data = await res.json() as { numero_novo?: string; contract?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error || 'Erro ao renovar');
      toast.success(`Contrato renovado! Nº ${data.numero_novo}`);
      setShowRenewModal(false);
      router.push(`/contracts/${data.contract?.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao renovar.');
    } finally { setRenewing(false); }
  }

  // ── Exclusão ───────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.from('contracts').delete().eq('id', contractId);
      if (error) throw error;
      toast.success('Contrato excluído.');
      router.push('/contracts');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao excluir.');
      setDeleting(false);
    }
  }

  return (
    <>
      {/* ── MODAL ASSINAR ───────────────────────────── */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-card-lg p-8 max-w-md w-full animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-brand-900 text-lg">Registrar Assinatura</h3>
              <button onClick={() => setShowSignModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="cc-label">Quem está assinando?</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { v: 'contratante' as const, label: 'Clínica (Contratante)', jaAssinou: assinadoContratante },
                    { v: 'prestador'   as const, label: 'Prestador (Contratado)', jaAssinou: assinadoPrestador },
                  ].map(opt => (
                    <button key={opt.v} type="button"
                      onClick={() => !opt.jaAssinou && handleSignTypeChange(opt.v)}
                      disabled={opt.jaAssinou}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        opt.jaAssinou
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-600 cursor-not-allowed opacity-70'
                          : signType === opt.v
                          ? 'border-brand-500 bg-brand-50 text-brand-800'
                          : 'border-slate-200 text-slate-600 hover:border-brand-300'
                      }`}>
                      {opt.jaAssinou ? `✓ ${opt.label}` : opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="cc-label">Nome completo para confirmar</label>
                <input className="cc-input" value={signName}
                  onChange={e => setSignName(e.target.value)}
                  placeholder="Digite o nome completo do signatário" />
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                Esta é uma assinatura eletrônica simples com registro de data/hora.
                Para validade jurídica plena, assine via GOV.BR ou ClickSign.
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowSignModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleSign} disabled={signingIA} className="btn-primary flex-1">
                  {signingIA
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><PenLine className="w-4 h-4" /> Confirmar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EXCLUIR ───────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-card-lg p-8 max-w-sm w-full animate-slide-up">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="font-bold text-brand-900 text-lg text-center mb-2">Excluir contrato?</h3>
            <p className="text-slate-500 text-sm text-center mb-6 leading-relaxed">
              <strong>{contractNum}</strong> será excluído permanentemente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
                {deleting
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Trash2 className="w-4 h-4" /> Excluir</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL E-MAIL ────────────────────────────── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-card-lg p-8 max-w-md w-full animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-brand-900 text-lg">Enviar por E-mail</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {providerEmail && (
                <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-800">
                  <strong>Destinatário:</strong> {providerEmail}
                </div>
              )}
              <div>
                <label className="cc-label">E-mail adicional (opcional)</label>
                <input type="email" className="cc-input" value={emailExtra}
                  onChange={e => setEmailExtra(e.target.value)} placeholder="outro@email.com" />
              </div>
              <div>
                <label className="cc-label">Instruções ao prestador (opcional)</label>
                <textarea className="cc-textarea" rows={2} value={emailInstrucoes}
                  onChange={e => setEmailInstrucoes(e.target.value)}
                  placeholder="Ex: Assine via GOV.BR e envie o PDF assinado em até 5 dias úteis." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEmailModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleSendEmail} disabled={sendingEmail} className="btn-primary flex-1">
                  {sendingEmail
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Send className="w-4 h-4" /> Enviar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL RENOVAR ───────────────────────────── */}
      {showRenewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-card-lg p-8 max-w-md w-full animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-brand-900 text-lg">Renovar Contrato</h3>
              <button onClick={() => setShowRenewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                O contrato atual será <strong>encerrado</strong> e um novo rascunho será criado.
              </div>
              <div className="flex gap-3">
                {[
                  { v: true,  label: 'Prazo Indeterminado' },
                  { v: false, label: 'Prazo Determinado'   },
                ].map(opt => (
                  <button key={String(opt.v)} type="button"
                    onClick={() => setRenewForm(p => ({ ...p, vigencia_indeterminada: opt.v }))}
                    className={`flex-1 py-2 px-3 rounded-xl border-2 text-xs font-medium transition-all ${
                      renewForm.vigencia_indeterminada === opt.v
                        ? 'border-brand-500 bg-brand-50 text-brand-800'
                        : 'border-slate-200 text-slate-600'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div>
                <label className="cc-label">Data de início</label>
                <input type="date" className="cc-input" value={renewForm.inicio}
                  onChange={e => setRenewForm(p => ({ ...p, inicio: e.target.value }))} />
              </div>
              {!renewForm.vigencia_indeterminada && (
                <div>
                  <label className="cc-label">Data de término</label>
                  <input type="date" className="cc-input" value={renewForm.fim}
                    onChange={e => setRenewForm(p => ({ ...p, fim: e.target.value }))} />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowRenewModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleRenew} disabled={renewing} className="btn-primary flex-1">
                  {renewing
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><RefreshCw className="w-4 h-4" /> Renovar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CORPO PRINCIPAL ─────────────────────────── */}
      {contractHtml && (
        <div className="cc-card overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-semibold text-brand-800 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Texto do Contrato
              {iaRevisado && (
                <span className="badge badge-green gap-1 ml-1">
                  <Zap className="w-2.5 h-2.5" />
                  IA {iaRevisadoEm ? formatDateBR(iaRevisadoEm.split('T')[0]) : ''}
                </span>
              )}
            </span>
            <div className="flex gap-2 flex-wrap">
              {/* Salvar como Template */}
              <SaveAsTemplateButton
                contractId={contractId}
                profissao={providerProfissao}
                providerNome={providerNome}
                providerEspecialidade={providerEspecialidade ?? undefined}
                providerConselho={providerConselho ?? undefined}
              />
              {/* Assinar — só exibe se ainda há partes sem assinar */}
              {!(assinadoContratante && assinadoPrestador) && (
                <button onClick={() => setShowSignModal(true)} className="btn-primary text-xs py-1.5 px-3">
                  <PenLine className="w-3.5 h-3.5" /> Registrar Assinatura
                </button>
              )}
              {/* Email */}
              {emailConfigured && (
                <button onClick={() => setShowEmailModal(true)} className="btn-secondary text-xs py-1.5 px-3">
                  <Mail className="w-3.5 h-3.5" /> Enviar por E-mail
                </button>
              )}
              {/* Renovar */}
              {(status === 'assinado' || status === 'aguardando_assinatura') && (
                <button onClick={() => setShowRenewModal(true)} className="btn-secondary text-xs py-1.5 px-3">
                  <RefreshCw className="w-3.5 h-3.5" /> Renovar
                </button>
              )}
              {/* Imprimir */}
              <button onClick={handlePrint} className="btn-secondary text-xs py-1.5 px-3">
                <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
              </button>
              {/* Excluir */}
              {isRascunho && (
                <button onClick={() => setShowDeleteModal(true)}
                  className="btn-ghost text-xs py-1.5 px-3 text-red-500 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              )}
            </div>
          </div>
          <div
            className="contract-preview rounded-none border-0 max-h-[70vh]"
            dangerouslySetInnerHTML={{ __html: contractHtml }}
          />
        </div>
      )}

      {notasInternas && (
        <div className="cc-card p-6">
          <div className="section-title">Notas Internas</div>
          <p className="text-sm text-slate-600 leading-relaxed">{notasInternas}</p>
        </div>
      )}

      {iaSugestoes && (
        <div className="cc-card p-6">
          <div className="section-title flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-brand-600" /> Análise da IA Claude
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{iaSugestoes}</p>
        </div>
      )}
    </>
  );
}
