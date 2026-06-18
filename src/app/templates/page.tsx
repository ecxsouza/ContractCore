import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { TemplatesClient } from '@/components/contract/TemplatesClient';

export const metadata = { title: 'Templates' };

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();
  if (!company) redirect('/settings/company?onboarding=true');

  // Buscar templates do sistema + da empresa
  const { data: templates } = await supabase
    .from('contract_templates')
    .select('*')
    .or(`is_sistema.eq.true,company_id.eq.${company.id}`)
    .order('is_sistema', { ascending: false })
    .order('uso_count',  { ascending: false });

  return (
    <AppLayout company={company}>
      <TemplatesClient company={company} templates={templates || []} />
    </AppLayout>
  );
}
