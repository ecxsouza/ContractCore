import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { NewPatientTermPageClient } from '@/components/patientTerms/NewPatientTermPageClient';

export const metadata = { title: 'Novo Termo de Paciente' };

export default async function NewPatientTermPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();
  if (!company) redirect('/settings/company?onboarding=true');

  return (
    <AppLayout company={company}>
      <NewPatientTermPageClient company={company} />
    </AppLayout>
  );
}
