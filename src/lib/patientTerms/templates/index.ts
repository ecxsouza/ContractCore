// ================================================================
// ContractCore — Templates de Termos de Pacientes
// Exporta os 4 renderers da Fase 1 e o mapa de seleção.
// Fase 2 adicionará: online_menor, convenio_adulto, convenio_menor.
// ================================================================

import type { PatientTermType } from '../types';
import type { TemplateContext } from './particular_adulto';

export { renderParticularAdulto } from './particular_adulto';
export { renderParticularMenor  } from './particular_menor';
export { renderAvaliacaoNeuro   } from './avaliacao_neuro';
export { renderOnlineAdulto     } from './online_adulto';

// Re-export do tipo de contexto para uso no generator
export type { TemplateContext } from './particular_adulto';

// Tipo da função renderer
export type TermRenderer = (ctx: TemplateContext) => string;

// Mapa: tipo do termo → função de renderização
// O generator.ts usa este mapa para selecionar o template correto.
// Fallback: qualquer tipo não mapeado usa 'particular_adulto'.
import { renderParticularAdulto } from './particular_adulto';
import { renderParticularMenor  } from './particular_menor';
import { renderAvaliacaoNeuro   } from './avaliacao_neuro';
import { renderOnlineAdulto     } from './online_adulto';

export const PATIENT_TERM_TEMPLATE_RENDERERS: Record<PatientTermType, TermRenderer> = {
  particular_adulto: renderParticularAdulto,
  particular_menor:  renderParticularMenor,
  avaliacao_neuro:   renderAvaliacaoNeuro,
  online_adulto:     renderOnlineAdulto,
};
