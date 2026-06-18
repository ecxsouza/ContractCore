import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, Clock, FileText } from 'lucide-react';
import { ContractVersionsClient } from '@/components/contract/ContractVersionsClient';

export const metadata = { title: 'Histórico de Versões' };

export default async function ContractVersionsPage({
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

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, numero_contrato, versao, status')
    .eq('id', id)
    .eq('company_id', company.id)
    .single();

  if (!contract) notFound();

  const { data: versions } = await supabase
    .from('contract_versions')
    .select('*')
    .eq('contract_id', id)
    .order('versao', { ascending: false });

  return (
    <AppLayout company={company}>
      <div className="max-w-5xl mx-auto space-y-6 animate-in">

        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link href={`/contracts/${id}`} className="hover:text-brand-600 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> {contract.numero_contrato}
          </Link>
          <span>/</span>
          <span className="text-brand-800 font-medium">Histórico de Versões</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-brand-900">Histórico de Versões</h1>
          <p className="text-slate-500 text-sm mt-1">
            Contrato {contract.numero_contrato} · {versions?.length || 0} versão(ões) registrada(s)
          </p>
        </div>

        <ContractVersionsClient
          contractId={id}
          currentVersion={contract.versao}
          versions={versions || []}
        />
      </div>
    </AppLayout>
  );
}
