'use client';

import React, { useState } from 'react';
import Script from 'next/script';
import { Loader2, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

interface CloudPaymentsWidgetProps {
  amount: number;
  currency: string;
  description: string;
  invoiceId: string;
  accountId: string;
  email: string;
  data?: Record<string, unknown>;
  onSuccess: (transactionId: number) => void;
  onFail: (reason: string, reasonCode?: number) => void;
  onComplete?: () => void;
  buttonText?: string;
  buttonClassName?: string;
}

interface CPSuccessOptions { transactionId: number }
interface CPFailOptions { reasonCode?: number }

declare global {
  interface Window {
    cp?: {
      CloudPayments: new () => {
        charge: (
          payment: Record<string, unknown>,
          callbacks: {
            onSuccess: (opts: CPSuccessOptions) => void;
            onFail: (reason: string, opts: CPFailOptions) => void;
            onComplete: (result: unknown, opts: unknown) => void;
          }
        ) => void;
      };
    };
  }
}

export function CloudPaymentsWidget({
  amount,
  currency,
  description,
  invoiceId,
  accountId,
  email,
  data,
  onSuccess,
  onFail,
  onComplete,
  buttonText = 'Оплатить',
  buttonClassName = '',
}: CloudPaymentsWidgetProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);

  const publicId = process.env.NEXT_PUBLIC_CLOUDPAYMENTS_PUBLIC_ID ?? '';

  const handlePayment = () => {
    if (!scriptLoaded || !window.cp) {
      toast.error('Платёжная система загружается, попробуйте через несколько секунд');
      return;
    }
    if (!publicId) {
      toast.error('Платёжная система не настроена. Свяжитесь с администратором.');
      return;
    }

    setProcessing(true);

    const widget = new window.cp.CloudPayments();
    widget.charge(
      { publicId, description, amount, currency, invoiceId, accountId, email, data: data ?? {} },
      {
        onSuccess: (opts) => { setProcessing(false); onSuccess(opts.transactionId); },
        onFail:    (reason, opts) => { setProcessing(false); onFail(reason, opts?.reasonCode); },
        onComplete: () => { setProcessing(false); onComplete?.(); },
      }
    );
  };

  const defaultClassName =
    'w-full px-8 py-4 bg-[var(--accent)] hover:opacity-90 ' +
    'text-[var(--bg-primary)] font-bold rounded-lg transition-all ' +
    'disabled:opacity-50 disabled:cursor-not-allowed text-lg ' +
    'flex items-center justify-center gap-2';

  return (
    <>
      <Script
        src="https://widget.cloudpayments.ru/bundles/cloudpayments.js"
        onLoad={() => setScriptLoaded(true)}
        strategy="afterInteractive"
      />
      <button
        type="button"
        onClick={handlePayment}
        disabled={!scriptLoaded || processing}
        className={buttonClassName || defaultClassName}
      >
        {processing || !scriptLoaded
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <CreditCard className="w-4 h-4" />
        }
        {processing ? 'Обработка…' : !scriptLoaded ? 'Загрузка…' : buttonText}
      </button>
    </>
  );
}
