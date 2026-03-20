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

  const handleSubmit = async (formData: TourFormData) => {
    const response = await fetch('/api/hub/operator/tours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:            formData.name,
        description:      formData.description,
        location_type:    'other',
        activity_type:    'other',
        location_name:    formData.category,
        latitude:         53.0,
        longitude:        158.7,
        base_price:       formData.price,
        price_unit:       'per_person',
        max_participants: formData.maxGroupSize,
        min_participants: formData.minGroupSize,
        duration_hours:   formData.duration,
        difficulty:       formData.difficulty,
        included:         formData.includes as string[],
        not_included:     formData.excludes as string[],
        tour_image:       formData.tourImage || undefined,
        agent_route_id:   formData.routeId   || undefined,
      }),
    });

    const result = await response.json() as { success: boolean; error?: string };

    if (!result.success) {
      throw new Error(result.error ?? 'Ошибка создания тура');
    }

    toast.success('Тур успешно создан!');
    router.push('/hub/operator/tours');
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
