import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ReportsClient } from '@/components/reports/ReportsClient';

export const metadata = { title: 'Relatórios' };

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();
  if (!company) redirect('/settings/company?onboarding=true');

  const { data: contracts } = await supabase
    .from('contracts')
    .select(`
      id, numero_contrato, versao, status, data_emissao,
      data_vigencia_inicio, data_vigencia_fim, vigencia_indeterminada,
      ia_revisado, assinado_contratante, assinado_prestador,
      data_assinatura_contratante, data_assinatura_prestador,
      service_details, remuneration, anexos, created_at,
      service_providers (
        nome_razao_social, profissao, profissao_descricao,
        tipo_pessoa, especialidade, email, telefone,
        conselho_profissional, numero_registro_conselho
      )
    `)
    .eq('company_id', company.id)
    .order('created_at', { ascending: false });

  return (
    <AppLayout company={company}>
      <ReportsClient
        company={company}
        contracts={contracts || []}
      />
    </AppLayout>
  );
}
