'use client';
import React from 'react';

interface TransferBookingManagementProps {
  operatorId?: string;
  onDataChange?: () => void;
}

export function TransferBookingManagement({ operatorId, onDataChange }: TransferBookingManagementProps) {
  return (
    <div className="p-6 text-[var(--text-muted)] text-center">
      Управление бронированиями трансфера — в разработке
    </div>
  );
}
