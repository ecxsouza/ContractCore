import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { PatientDetailClient } from '@/components/patients/PatientDetailClient';

export const metadata = { title: 'Detalhe do Paciente' };

export default async function PatientDetailPage({
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

  // Paciente — filtro duplo: id + company_id
  const { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .eq('company_id', company.id)
    .single();

  if (!patient || error) notFound();

  // Responsáveis
  const { data: responsibles } = await supabase
    .from('patient_responsibles')
    .select('id, nome_completo, cpf, telefone, email, grau_parentesco, is_responsavel_legal, is_responsavel_financeiro')
    .eq('patient_id', id)
    .eq('company_id', company.id)
    .order('created_at');

  // Termos vinculados (resumo — sem HTML)
  const { data: terms } = await supabase
    .from('patient_terms')
    .select('id, numero_termo, status, tipo_termo, modalidade, created_at')
    .eq('patient_id', id)
    .eq('company_id', company.id)
    .order('created_at', { ascending: false });

  return (
    <AppLayout company={company}>
      <PatientDetailClient
        patient={patient}
        responsibles={responsibles || []}
        terms={terms || []}
      />
    </AppLayout>
  );
}
