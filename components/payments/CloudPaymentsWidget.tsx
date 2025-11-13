'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';

interface CloudPaymentsWidgetProps {
  amount: number;
  currency: string;
  description: string;
  invoiceId: string;
  accountId: string;
  email: string;
  data?: any;
  onSuccess: (transactionId: number) => void;
  onFail: (reason: string, reasonCode?: number) => void;
  onComplete?: () => void;
  buttonText?: string;
  buttonClassName?: string;
}

declare global {
  interface Window {
    cp: any;
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
  buttonClassName = ''
}: CloudPaymentsWidgetProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);

  const publicId = process.env.NEXT_PUBLIC_CLOUDPAYMENTS_PUBLIC_ID || '';

  const handlePayment = () => {
    if (!scriptLoaded || !window.cp) {
      alert('Платёжная система загружается, попробуйте через несколько секунд');
      return;
    }

    if (!publicId) {
      alert('Платёжная система не настроена. Свяжитесь с администратором.');
      return;
    }

    setProcessing(true);

    const widget = new window.cp.CloudPayments();

    const paymentData = {
      publicId,
      description,
      amount,
      currency,
      invoiceId,
      accountId,
      email,
      data: data || {},
    };

    const options = {
      onSuccess: (options: any) => {
        console.log('Payment successful:', options);
        setProcessing(false);
        onSuccess(options.transactionId);
      },
      onFail: (reason: string, options: any) => {
        console.log('Payment failed:', reason, options);
        setProcessing(false);
        onFail(reason, options?.reasonCode);
      },
      onComplete: (paymentResult: any, options: any) => {
        console.log('Payment completed:', paymentResult, options);
        setProcessing(false);
        if (onComplete) onComplete();
      }
    };

    widget.charge(paymentData, options);
  };

  const defaultClassName = `
    w-full px-8 py-4 bg-premium-gold hover:bg-premium-gold/80 
    text-premium-black font-bold rounded-xl transition-colors 
    disabled:opacity-50 disabled:cursor-not-allowed text-lg
    flex items-center justify-center
  `;

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
        {processing ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            Обработка платежа...
          </>
        ) : !scriptLoaded ? (
          <>
            <span className="animate-pulse mr-2">⏳</span>
            Загрузка...
          </>
        ) : (
          <>
            <span className="mr-2">💳</span>
            {buttonText}
          </>
        )}
      </button>
    </>
  );
}



