'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { TourForm } from '@/components/operator/Tours/TourForm';
import { LoadingSpinner, EmptyState } from '@/components/admin/shared';
import { TourFormData, OperatorTour } from '@/types/operator';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import GenerateTagsButton from '@/components/operator/GenerateTagsButton';
import { AlertTriangle, Mountain } from 'lucide-react';

export default function EditTourClient() {
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
        toast.success('Тур успешно обновлён!');
        router.push('/hub/operator/tours');
      } else {
        throw new Error(result.error || 'Failed to update tour');
      }
    } catch (error) {
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
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Редактирование тура
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          {tour ? tour.name : 'Загрузка...'}
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" message="Загрузка тура..." />
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertTriangle className="w-16 h-16 text-red-400" />}
          title="Ошибка загрузки"
          description={error}
          action={{
            label: 'Попробовать снова',
            onClick: fetchTour
          }}
        />
      ) : !tour ? (
        <EmptyState
          icon={Mountain}
          title="Тур не найден"
          description="Тур не существует или был удалён"
          action={{
            label: 'Вернуться к списку',
            onClick: () => router.push('/hub/operator/tours')
          }}
        />
      ) : (
        <>
          <TourForm
            initialData={tourFormData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isEdit={true}
          />
          <GenerateTagsButton tourId={tourId} />
        </>
      )}
    </div>
  );
}
