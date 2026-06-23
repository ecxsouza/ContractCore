import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { PatientTermsClient } from '@/components/patientTerms/PatientTermsClient';

export const metadata = { title: 'Termos de Pacientes' };

export default async function PatientTermsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();
  if (!company) redirect('/settings/company?onboarding=true');

  return (
    <AppLayout company={company}>
      <PatientTermsClient />
    </AppLayout>
  );
}
