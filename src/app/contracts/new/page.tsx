import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NewContractPageClient } from '@/components/contract/NewContractPageClient';

export const metadata = { title: 'Novo Contrato' };

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ template_id?: string }>;
}) {
  const { template_id } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();
  if (!company) redirect('/settings/company?onboarding=true');

  // Buscar template se informado
  let templateData = null;
  if (template_id) {
    const { data: tpl } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', template_id)
      .single();
    templateData = tpl;
  }

  return <NewContractPageClient company={company} templateData={templateData} />;
}
