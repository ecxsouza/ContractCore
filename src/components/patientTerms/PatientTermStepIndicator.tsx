'use client';

import { Check } from 'lucide-react';
import clsx from 'clsx';

// Padrão visual idêntico ao StepIndicator do módulo de contratos,
// mantido em arquivo separado para isolamento de domínio.

interface PTStep {
  id:       number;
  titulo:   string;
  descricao: string;
  icone:    string;
}

interface PatientTermStepIndicatorProps {
  steps:       PTStep[];
  currentStep: number;
}

export function PatientTermStepIndicator({ steps, currentStep }: PatientTermStepIndicatorProps) {
  return (
    <div className="cc-card p-4 md:p-6">
      <div className="grid grid-cols-4 gap-0 items-start">
        {steps.map((step, idx) => {
          const state =
            currentStep > step.id ? 'complete' :
            currentStep === step.id ? 'active' : 'pending';
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.id} className="relative flex flex-col items-center text-center">
              {!isLast && (
                <div className={clsx(
                  'absolute left-1/2 top-[18px] md:top-5 h-0.5 w-full transition-all duration-300',
                  currentStep > step.id ? 'bg-emerald-400' : 'bg-slate-200',
                )} />
              )}
              <div className="relative z-10 flex w-full flex-col items-center gap-1.5">
                <div className={clsx(
                  'w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center',
                  'text-sm font-bold transition-all duration-300 border-2',
                  state === 'complete' && 'bg-emerald-500 border-emerald-500 text-white',
                  state === 'active'   && 'bg-brand-800 border-brand-800 text-white shadow-glow',
                  state === 'pending'  && 'bg-white border-slate-200 text-slate-400',
                )}>
                  {state === 'complete' ? <Check className="w-4 h-4" /> : step.icone}
                </div>
                <div className="text-center hidden md:block">
                  <div className={clsx(
                    'text-xs font-semibold',
                    state === 'active' ? 'text-brand-800' : 'text-slate-400',
                  )}>{step.titulo}</div>
                  <div className="text-2xs text-slate-400 hidden lg:block">{step.descricao}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 md:hidden text-center">
        <span className="text-sm font-semibold text-brand-800">
          {steps.find(s => s.id === currentStep)?.titulo}
        </span>
        <span className="text-slate-400 text-xs ml-2">
          Etapa {currentStep} de {steps.length}
        </span>
      </div>
    </div>
  );
}
