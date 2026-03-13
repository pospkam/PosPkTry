'use client';
import React from 'react';

interface TransferRouteManagementProps {
  operatorId?: string;
  onDataChange?: () => void;
}

export function TransferRouteManagement({ operatorId, onDataChange }: TransferRouteManagementProps) {
  return (
    <div className="p-6 text-[var(--text-muted)] text-center">
      Управление маршрутами — в разработке
    </div>
  );
}
