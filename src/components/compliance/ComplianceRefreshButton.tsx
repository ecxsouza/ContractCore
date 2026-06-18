'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function ComplianceRefreshButton({ companyId }: { companyId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRefresh() {
    setLoading(true);
    try {
      await supabase.rpc('generate_compliance_alerts', { p_company_id: companyId });
      router.refresh();
      toast.success('Alertas atualizados!');
    } catch {
      toast.error('Erro ao atualizar alertas.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleRefresh} disabled={loading} className="btn-secondary">
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Atualizando...' : 'Atualizar alertas'}
    </button>
  );
}
