'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Protected } from '@/components/Protected';
import { OperatorNav } from '@/components/operator/OperatorNav';

export const metadata = {
  title: 'Создание тура | Kamhub',
  description: 'Создание нового тура оператора',
};

import { TourForm } from '@/components/operator/Tours/TourForm';
import { TourFormData } from '@/types/operator';
import { useAuth } from '@/contexts/AuthContext';

export default function NewTour() {
  const { user } = useAuth();
  const router = useRouter();

  const operatorId = user?.id;

  const handleSubmit = async (formData: TourFormData) => {
    try {
      const response = await fetch(`/api/operator/tours?operatorId=${operatorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        alert('Тур успешно создан!');
        router.push('/hub/operator/tours');
      } else {
        throw new Error(result.error || 'Failed to create tour');
      }
    } catch (error) {
      console.error('Error creating tour:', error);
      throw error;
    }
  };

  const handleCancel = () => {
    router.push('/hub/operator/tours');
  };

  return (
    <Protected roles={['operator', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <OperatorNav />
        
        {/* Header */}
        <div className="bg-white/15 border-b border-white/15 p-6">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-black text-white">
              Создание нового тура
            </h1>
            <p className="text-white/70 mt-1">
              Заполните информацию о туре
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto p-6">
          <TourForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isEdit={false}
          />
        </div>
      </main>
    </Protected>
  );
}



