'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TourForm } from '@/components/operator/Tours/TourForm';
import { TourFormData } from '@/types/operator';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function NewTourClient() {
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
        toast.success('Тур успешно создан!');
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
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Создание нового тура
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Заполните информацию о туре
        </p>
      </div>

      {/* Content */}
      <TourForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isEdit={false}
      />
    </div>
  );
}
