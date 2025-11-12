'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Protected } from '@/components/Protected';
import { OperatorNav } from '@/components/operator/OperatorNav';
import { TourForm } from '@/components/operator/Tours/TourForm';
import { LoadingSpinner, EmptyState } from '@/components/admin/shared';
import { TourFormData, OperatorTour } from '@/types/operator';
import { useAuth } from '@/contexts/AuthContext';

export default function EditTour() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tourId = params.id as string;

  const [tour, setTour] = useState<OperatorTour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const operatorId = user?.id;

  useEffect(() => {
    fetchTour();
  }, [tourId]);

  const fetchTour = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/operator/tours/${tourId}?operatorId=${operatorId}`);
      const result = await response.json();

      if (result.success) {
        setTour(result.data);
      } else {
        setError(result.error || 'Failed to fetch tour');
      }
    } catch (err) {
      console.error('Error fetching tour:', err);
      setError('Failed to fetch tour');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: TourFormData) => {
    try {
      const response = await fetch(`/api/operator/tours/${tourId}?operatorId=${operatorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        alert('Тур успешно обновлён!');
        router.push('/hub/operator/tours');
      } else {
        throw new Error(result.error || 'Failed to update tour');
      }
    } catch (error) {
      console.error('Error updating tour:', error);
      throw error;
    }
  };

  const handleCancel = () => {
    router.push('/hub/operator/tours');
  };

  const tourFormData: TourFormData | undefined = tour ? {
    name: tour.name,
    description: tour.description,
    category: tour.category,
    difficulty: tour.difficulty,
    duration: tour.duration,
    maxGroupSize: tour.maxGroupSize,
    minGroupSize: tour.minGroupSize,
    price: tour.price,
    currency: tour.currency,
    includes: tour.includes,
    excludes: tour.excludes,
    itinerary: tour.itinerary,
    images: tour.images
  } : undefined;

  return (
    <Protected roles={['operator', 'admin']}>
      <main className="min-h-screen bg-premium-black text-white">
        <OperatorNav />
        
        {/* Header */}
        <div className="bg-white/5 border-b border-white/10 p-6">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-black text-premium-gold">
              Редактирование тура
            </h1>
            <p className="text-white/70 mt-1">
              {tour ? tour.name : 'Загрузка...'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" message="Загрузка тура..." />
            </div>
          ) : error ? (
            <EmptyState
              icon="⚠️"
              title="Ошибка загрузки"
              description={error}
              action={{
                label: 'Попробовать снова',
                onClick: fetchTour
              }}
            />
          ) : !tour ? (
            <EmptyState
              icon="🏔️"
              title="Тур не найден"
              description="Тур не существует или был удалён"
              action={{
                label: 'Вернуться к списку',
                onClick: () => router.push('/hub/operator/tours')
              }}
            />
          ) : (
            <TourForm
              initialData={tourFormData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isEdit={true}
            />
          )}
        </div>
      </main>
    </Protected>
  );
}



