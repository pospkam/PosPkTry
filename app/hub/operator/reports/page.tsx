'use client';

import React, { useState } from 'react';
import { Protected } from '@/components/Protected';
import { OperatorNav } from '@/components/operator/OperatorNav';
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
    color: 'bg-blue-500/20 text-blue-400',
  },
  {
    id: 'revenue',
    name: 'Финансовый отчет',
    description: 'Выручка, комиссии, выплаты',
    icon: <Wallet className="w-6 h-6" />,
    color: 'bg-green-500/20 text-green-400',
  },
  {
    id: 'tours',
    name: 'Отчет по турам',
    description: 'Популярность туров, заполняемость',
    icon: <BarChart3 className="w-6 h-6" />,
    color: 'bg-purple-500/20 text-purple-400',
  },
  {
    id: 'clients',
    name: 'Отчет по клиентам',
    description: 'Анализ клиентской базы',
    icon: <Users className="w-6 h-6" />,
    color: 'bg-amber-500/20 text-amber-400',
  },
  {
    id: 'analytics',
    name: 'Аналитический отчет',
    description: 'Тренды, прогнозы, рекомендации',
    icon: <TrendingUp className="w-6 h-6" />,
    color: 'bg-cyan-500/20 text-cyan-400',
  },
  {
    id: 'summary',
    name: 'Сводный отчет',
    description: 'Общая статистика за период',
    icon: <PieChart className="w-6 h-6" />,
    color: 'bg-pink-500/20 text-pink-400',
  },
];

export default function ReportsPage() {
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
    alert(`Отчет "${reportTypes.find(r => r.id === selectedReport)?.name}" сгенерирован`);
  };

  return (
    <Protected roles={['operator', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <OperatorNav />
        
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white">Отчеты</h1>
            <p className="text-white/60 mt-1">Генерация и скачивание отчетов</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Report Types */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold mb-4">Выберите тип отчета</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reportTypes.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedReport === report.id
                        ? 'bg-premium-gold/20 border-premium-gold'
                        : 'bg-white/10 border-white/20 hover:bg-white/15'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${report.color}`}>
                        {report.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{report.name}</h3>
                        <p className="text-sm text-white/60 mt-1">{report.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Panel */}
            <div>
              <h2 className="text-xl font-bold mb-4">Параметры</h2>
              <div className="bg-white/10 border border-white/20 rounded-2xl p-6 space-y-6">
                <div>
                  <label htmlFor="report-date-from" className="block text-sm text-white/70 mb-2">Дата начала</label>
                  <input
                    id="report-date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-premium-gold"
                  />
                </div>
                <div>
                  <label htmlFor="report-date-to" className="block text-sm text-white/70 mb-2">Дата окончания</label>
                  <input
                    id="report-date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-premium-gold"
                  />
                </div>

                {selectedReport && (
                  <div className="p-4 bg-premium-gold/10 border border-premium-gold/30 rounded-xl">
                    <p className="text-sm text-white/70">Выбран отчет:</p>
                    <p className="font-bold text-premium-gold">
                      {reportTypes.find(r => r.id === selectedReport)?.name}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleGenerateReport}
                  disabled={!selectedReport || !dateFrom || !dateTo || generating}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
                    selectedReport && dateFrom && dateTo && !generating
                      ? 'bg-premium-gold text-premium-black hover:bg-premium-gold/80'
                      : 'bg-white/10 text-white/50 cursor-not-allowed'
                  }`}
                >
                  {generating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-premium-black/30 border-t-premium-black rounded-full animate-spin" />
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
              <div className="mt-6">
                <h3 className="font-bold mb-3">Последние отчеты</h3>
                <div className="space-y-2">
                  {[
                    { name: 'Финансовый отчет', date: '01.02.2026', size: '245 KB' },
                    { name: 'Отчет по бронированиям', date: '28.01.2026', size: '128 KB' },
                    { name: 'Сводный отчет', date: '15.01.2026', size: '512 KB' },
                  ].map((report) => (
                    <div key={report.name} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-white/50" />
                        <div>
                          <p className="text-sm font-medium">{report.name}</p>
                          <p className="text-xs text-white/50">{report.date} • {report.size}</p>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Protected>
  );
}
