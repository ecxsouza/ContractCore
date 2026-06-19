import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import Link from 'next/link';
import { FileText, Zap, Clock, ArrowLeft, Calendar, User, History, BookmarkPlus } from 'lucide-react';
import { formatDateBR } from '@/lib/masks';
import { ContractDetailClient } from '@/components/contract/ContractDetailClient';
import { GovBRSignatureGuide } from '@/components/contract/GovBRSignatureGuide';
import { SaveAsTemplateButton } from '@/components/contract/SaveAsTemplateButton';
import { getStatusDisplay } from '@/lib/constants';

export const metadata = { title: 'Contrato' };


export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();
  if (!company) redirect('/settings/company?onboarding=true');

  const { data: contract, error } = await supabase
    .from('contracts')
    .select(`*, service_providers (*)`)
    .eq('id', id)
    .eq('company_id', company.id)
    .single();

  if (!contract || error) notFound();

  const statusInfo = getStatusDisplay(contract.status);
  const provider: any = contract.service_providers;

  return (
    <AppLayout company={company}>
      <div className="max-w-5xl mx-auto space-y-6 animate-in">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/contracts" className="hover:text-brand-600 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Contratos
          </Link>
          <span>/</span>
          <span className="text-brand-800 font-medium">{contract.numero_contrato}</span>
        </div>

        {/* Header */}
        <div className="cc-card p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-brand-900">{provider?.nome_razao_social}</h1>
                <span className={`badge ${statusInfo.cls}`}>{statusInfo.label}</span>
                {contract.ia_revisado && (
                  <span className="badge badge-blue gap-1"><Zap className="w-3 h-3" /> IA</span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />{contract.numero_contrato} · v{contract.versao}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />{provider?.profissao}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />Emitido em {formatDateBR(contract.data_emissao)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {contract.vigencia_indeterminada ? 'Vigência indeterminada' : `Até ${formatDateBR(contract.data_vigencia_fim)}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status das assinaturas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tipo',             value: provider?.tipo_pessoa || '—' },
            { label: 'Vigência',         value: contract.vigencia_indeterminada ? 'Indeterminada' : formatDateBR(contract.data_vigencia_inicio) },
            {
              label: 'Assin. Clínica',
              value: contract.assinado_contratante
                ? `✓ ${formatDateBR(contract.data_assinatura_contratante?.split('T')[0])}`
                : 'Pendente'
            },
            {
              label: 'Assin. Prestador',
              value: contract.assinado_prestador
                ? `✓ ${formatDateBR(contract.data_assinatura_prestador?.split('T')[0])}`
                : 'Pendente'
            },
          ].map(item => (
            <div key={item.label} className="cc-card p-4">
              <div className="text-2xs text-slate-400 uppercase tracking-widest font-semibold mb-1">{item.label}</div>
              <div className={`text-sm font-semibold ${item.value.startsWith('✓') ? 'text-emerald-600' : 'text-brand-900'}`}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Guia de assinatura GOV.BR */}
        <GovBRSignatureGuide contractNum={contract.numero_contrato} />

        {/* Link para histórico de versões */}
        <div className="flex justify-end">
          <Link href={`/contracts/${id}/versions`} className="btn-ghost text-xs">
            <Clock className="w-3.5 h-3.5" /> Histórico de versões ({contract.versao})
          </Link>
        </div>

        {/* Client component com impressão, assinatura e exclusão */}
        <ContractDetailClient
          contractId={contract.id}
          contractNum={contract.numero_contrato}
          contractHtml={contract.contrato_html || ''}
          status={contract.status}
          logoUrl={company.logo_url}
          companyName={company.nome_fantasia || company.razao_social}
          companyCity={`${company.cidade}/${company.uf}`}
          providerEmail={provider?.email}
          emailConfigured={!!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_'))}
          assinadoContratante={!!contract.assinado_contratante}
          assinadoPrestador={!!contract.assinado_prestador}
          providerProfissao={provider?.profissao ?? 'outro'}
          providerNome={provider?.nome_razao_social ?? ''}
          providerEspecialidade={provider?.especialidade}
          providerConselho={provider?.conselho_profissional}
          iaRevisado={contract.ia_revisado}
          iaRevisadoEm={contract.ia_revisado_em}
          iaSugestoes={contract.ia_sugestoes}
          notasInternas={contract.notas_internas}
        />

      </div>
    </AppLayout>
  );
}
