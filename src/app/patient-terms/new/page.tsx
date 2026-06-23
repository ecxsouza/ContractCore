import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { NewPatientTermPageClient } from '@/components/patientTerms/NewPatientTermPageClient';

export const metadata = { title: 'Novo Termo de Paciente' };

export default async function NewPatientTermPage({
  searchParams,
}: {
  searchParams: Promise<{ patient_id?: string; duplicate_from?: string }>;
}) {
  const { patient_id, duplicate_from } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: company } = await supabase
    .from('companies').select('*').eq('user_id', user.id).single();
  if (!company) redirect('/settings/company?onboarding=true');

  let initialPatient:    any | null = null;
  let initialResponsibles: any[]   = [];
  let duplicateFromTerm: any | null = null;

  // Prioridade: duplicate_from > patient_id
  if (duplicate_from) {
    // Buscar termo completo para duplicação
    const { data: term } = await supabase
      .from('patient_terms')
      .select('*')
      .eq('id', duplicate_from)
      .eq('company_id', company.id)
      .single();

    if (term) {
      duplicateFromTerm = term;
      // Buscar paciente e responsáveis do termo para pré-preencher
      const { data: pat } = await supabase
        .from('patients').select('*')
        .eq('id', term.patient_id).eq('company_id', company.id).single();
      if (pat) initialPatient = pat;

      const { data: resps } = await supabase
        .from('patient_responsibles').select('*')
        .eq('patient_id', term.patient_id).eq('company_id', company.id)
        .order('created_at');
      initialResponsibles = resps || [];
    }
  } else if (patient_id) {
    // Apenas pré-preencher paciente e responsáveis
    const { data: pat } = await supabase
      .from('patients').select('*')
      .eq('id', patient_id).eq('company_id', company.id).single();
    if (pat) initialPatient = pat;

    if (initialPatient) {
      const { data: resps } = await supabase
        .from('patient_responsibles').select('*')
        .eq('patient_id', patient_id).eq('company_id', company.id)
        .order('created_at');
      initialResponsibles = resps || [];
    }
  }

  return (
    <AppLayout company={company}>
      <NewPatientTermPageClient
        company={company}
        initialPatient={initialPatient}
        initialResponsibles={initialResponsibles}
        duplicateFromTerm={duplicateFromTerm}
      />
    </AppLayout>
  );
}
