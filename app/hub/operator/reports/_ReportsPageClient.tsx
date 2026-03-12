'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  Wallet,
  BarChart3,
  PieChart
} from 'lucide-react';
import toast from 'react-hot-toast';

const INPUT = 'w-full px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors';
const LABEL = 'block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5';

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const reportTypes: ReportType[] = [
  {
    id: 'bookings',
    name: 'Отчет по бронированиям',
    description: 'Детальная статистика бронирований за период',
    icon: <Calendar className="w-6 h-6" />,
    color: 'bg-[var(--bg-hover)] text-[var(--text-primary)]',
  },
  {
    id: 'revenue',
    name: 'Финансовый отчет',
    description: 'Выручка, комиссии, выплаты',
    icon: <Wallet className="w-6 h-6" />,
    color: 'bg-[var(--success)]/10 text-[var(--success)]',
  },
  {
    id: 'tours',
    name: 'Отчет по турам',
    description: 'Популярность туров, заполняемость',
    icon: <BarChart3 className="w-6 h-6" />,
    color: 'bg-[var(--accent)]/10 text-[var(--accent)]',
  },
  {
    id: 'clients',
    name: 'Отчет по клиентам',
    description: 'Анализ клиентской базы',
    icon: <Users className="w-6 h-6" />,
    color: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  },
  {
    id: 'analytics',
    name: 'Аналитический отчет',
    description: 'Тренды, прогнозы, рекомендации',
    icon: <TrendingUp className="w-6 h-6" />,
    color: 'bg-[var(--bg-hover)] text-[var(--text-primary)]',
  },
  {
    id: 'summary',
    name: 'Сводный отчет',
    description: 'Общая статистика за период',
    icon: <PieChart className="w-6 h-6" />,
    color: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  },
];

export default function ReportsPageClient() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerateReport = async () => {
    if (!selectedReport || !dateFrom || !dateTo) return;

    setGenerating(true);
    // Симуляция генерации
    await new Promise(resolve => setTimeout(resolve, 2000));
    setGenerating(false);

    // В реальности здесь будет скачивание файла
    toast.success(`Отчет "${reportTypes.find(r => r.id === selectedReport)?.name}" сгенерирован`);
  };

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Отчеты</h1>
        <p className="text-[var(--text-muted)] mt-1">Генерация и скачивание отчетов</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Types */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Выберите тип отчета</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reportTypes.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  selectedReport === report.id
                    ? 'bg-[var(--accent)]/10 border-[var(--accent)]'
                    : 'bg-[var(--bg-card)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${report.color}`}>
                    {report.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">{report.name}</h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{report.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate Panel */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Параметры</h2>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-5">
            <div>
              <label htmlFor="report-date-from" className={LABEL}>Дата начала</label>
              <input
                id="report-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={INPUT}
              />
            </div>
            <div>
              <label htmlFor="report-date-to" className={LABEL}>Дата окончания</label>
              <input
                id="report-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={INPUT}
              />
            </div>

            {selectedReport && (
              <div className="p-4 bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-md">
                <p className="text-sm text-[var(--text-muted)]">Выбран отчет:</p>
                <p className="font-semibold text-[var(--accent)]">
                  {reportTypes.find(r => r.id === selectedReport)?.name}
                </p>
              </div>
            )}

            <button
              onClick={handleGenerateReport}
              disabled={!selectedReport || !dateFrom || !dateTo || generating}
              className={`w-full py-3 rounded-md font-semibold flex items-center justify-center gap-2 transition-colors ${
                selectedReport && dateFrom && dateTo && !generating
                  ? 'bg-[var(--accent)] text-[var(--bg-card)] hover:opacity-90'
                  : 'bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed'
              }`}
            >
              {generating ? (
                <>
                  <div className="w-5 h-5 border-2 border-[var(--text-muted)]/30 border-t-[var(--bg-card)] rounded-full animate-spin" />
                  Генерация...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Сгенерировать отчет
                </>
              )}
            </button>
          </div>

          {/* Recent Reports */}
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Последние отчеты</h3>
            <div className="space-y-2">
              {[
                { name: 'Финансовый отчет', date: '01.02.2026', size: '245 KB' },
                { name: 'Отчет по бронированиям', date: '28.01.2026', size: '128 KB' },
                { name: 'Сводный отчет', date: '15.01.2026', size: '512 KB' },
              ].map((report) => (
                <div key={report.name} className="flex items-center justify-between p-3 bg-[var(--bg-hover)] rounded-md">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[var(--text-muted)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{report.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{report.date} • {report.size}</p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-[var(--bg-card)] rounded-md transition-colors text-[var(--text-muted)]">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
