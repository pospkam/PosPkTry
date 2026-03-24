'use client';

import { useState } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

interface AgreementCheckpoint {
  id: string;
  label: string;
  checked: boolean;
}

interface AgreementModalProps {
  type: 'tos' | 'privacy' | 'operator-content-consent';
  title: string;
  content: string;
  checkpoints: string[];
  onAccept: () => Promise<void>;
  onDecline: () => void;
  onClose: () => void;
  required?: boolean;
}

export function AgreementModal({
  type,
  title,
  content,
  checkpoints,
  onAccept,
  onDecline,
  onClose,
  required = true,
}: AgreementModalProps) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [checkpoints_state, setCheckpoints] = useState<AgreementCheckpoint[]>(
    checkpoints.map((label, i) => ({
      id: `checkpoint-${i}`,
      label,
      checked: false,
    }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChecked = checkpoints_state.every(cp => cp.checked);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    setScrolledToBottom(isAtBottom);
  };

  const toggleCheckpoint = (id: string) => {
    setCheckpoints(prev =>
      prev.map(cp => (cp.id === id ? { ...cp, checked: !cp.checked } : cp))
    );
  };

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    try {
      await onAccept();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при принятии согласия');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-card)] rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
          {!required && (
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 text-sm text-[var(--text-secondary)] whitespace-pre-wrap"
        >
          {content}
        </div>

        {/* Checkpoints */}
        <div className="border-t border-[var(--border)] p-6 space-y-3">
          {checkpoints_state.map(cp => (
            <label key={cp.id} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={cp.checked}
                onChange={() => toggleCheckpoint(cp.id)}
                className="w-4 h-4 mt-1 rounded accent-[var(--accent)]"
              />
              <span className="text-xs text-[var(--text-secondary)]">{cp.label}</span>
            </label>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-4 mx-6 mb-4 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg">
            <AlertCircle className="w-4 h-4 text-[var(--danger)] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[var(--danger)]">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-[var(--border)] bg-[var(--bg-primary)]">
          {!required && (
            <button
              onClick={onDecline}
              disabled={loading}
              className="flex-1 ds-btn ds-btn-secondary py-2.5 font-medium disabled:opacity-50"
            >
              Отклонить
            </button>
          )}
          <button
            onClick={handleAccept}
            disabled={!allChecked || !scrolledToBottom || loading}
            className="flex-1 ds-btn ds-btn-primary py-2.5 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin" />
                Принятие...
              </>
            ) : allChecked && scrolledToBottom ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Принять
              </>
            ) : !scrolledToBottom ? (
              'Прочитайте до конца'
            ) : (
              'Отметьте все пункты'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook для управления состоянием модалей
export function useAgreementModals() {
  const [modals, setModals] = useState<Record<string, boolean>>({
    tos: false,
    privacy: false,
    operator_content: false,
  });

  const openModal = (key: string) => {
    setModals(prev => ({ ...prev, [key]: true }));
  };

  const closeModal = (key: string) => {
    setModals(prev => ({ ...prev, [key]: false }));
  };

  return { modals, openModal, closeModal };
}
