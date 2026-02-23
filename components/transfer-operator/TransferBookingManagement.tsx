'use client';
import React from 'react';

interface TransferBookingManagementProps {
  operatorId?: string;
  onDataChange?: () => void;
}

export function TransferBookingManagement({ operatorId, onDataChange }: TransferBookingManagementProps) {
  return (
    <div className="p-6 text-white/60 text-center">
      Управление бронированиями трансфера — в разработке
    </div>
  );
}
