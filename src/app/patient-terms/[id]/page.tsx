import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { PatientTermDetailClient } from '@/components/patientTerms/PatientTermDetailClient';

export const metadata = { title: 'Detalhe do Termo' };

export default async function PatientTermDetailPage({
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

  // Buscar termo com filtro duplo: id + company_id (RLS + garantia extra)
  const { data: term, error } = await supabase
    .from('patient_terms')
    .select('*')
    .eq('id', id)
    .eq('company_id', company.id)
    .single();

  if (!term || error) notFound();

  // Buscar paciente vinculado
  const { data: patient } = await supabase
    .from('patients')
    .select('id, nome_completo, cpf, data_nascimento, telefone, email, is_menor')
    .eq('id', term.patient_id)
    .eq('company_id', company.id)
    .single();

  return (
    <AppLayout company={company}>
      <PatientTermDetailClient term={term} patient={patient || null} />
    </AppLayout>
  );
}
