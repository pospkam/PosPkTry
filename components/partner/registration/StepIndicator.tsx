'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepNames: string[];
}

export function StepIndicator({ currentStep, totalSteps, stepNames }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div
              className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all text-sm',
                currentStep > step && 'bg-green-500 text-white',
                currentStep === step && 'bg-premium-gold text-premium-black shadow-lg',
                currentStep < step && 'bg-white/10 text-white/40'
              )}
            >
              {currentStep > step ? <Check className="w-5 h-5" /> : step}
            </div>
            {step < totalSteps && (
              <div
                className={clsx(
                  'flex-1 h-1 mx-2 transition-all',
                  currentStep > step ? 'bg-green-500' : 'bg-white/10'
                )}
              />
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="text-white/70 text-sm">
          Шаг {currentStep} из {totalSteps}: {stepNames[currentStep - 1]}
        </p>
      </div>
    </div>
  );
}
