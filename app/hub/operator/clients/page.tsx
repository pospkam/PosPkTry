'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { OperatorNav } from '@/components/operator/OperatorNav';
import { LoadingSpinner, EmptyState } from '@/components/admin/shared';
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  Calendar, 
  Star,
  TrendingUp,
  Filter,
  Download
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBookings: number;
  totalSpent: number;
  lastBooking: string;
  rating: number;
  status: 'active' | 'inactive' | 'vip';
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    // Демо данные
    setTimeout(() => {
      setClients([
        {
          id: '1',
          name: 'Иван Петров',
          email: 'ivan@example.com',
          phone: '+7 914 123-45-67',
          totalBookings: 5,
          totalSpent: 285000,
          lastBooking: '2026-01-15',
          rating: 4.8,
          status: 'vip',
        },
        {
          id: '2',
          name: 'Мария Сидорова',
          email: 'maria@example.com',
          phone: '+7 914 234-56-78',
          totalBookings: 2,
          totalSpent: 65000,
          lastBooking: '2026-01-28',
          rating: 5.0,
          status: 'active',
        },
        {
          id: '3',
          name: 'Алексей Козлов',
          email: 'alex@example.com',
          phone: '+7 914 345-67-89',
          totalBookings: 1,
          totalSpent: 28000,
          lastBooking: '2025-12-10',
          rating: 4.5,
          status: 'inactive',
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'vip':
        return <span className="px-2 py-1 bg-premium-gold/20 text-premium-gold rounded-full text-xs font-bold">VIP</span>;
      case 'active':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">Активный</span>;
      case 'inactive':
        return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs font-bold">Неактивный</span>;
      default:
        return null;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(value);
  };

  return (
    <Protected roles={['operator', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <OperatorNav />
        
        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-white">Клиенты</h1>
              <p className="text-white/60 mt-1">Управление базой клиентов</p>
            </div>
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-medium flex items-center gap-2 transition-colors">
              <Download className="w-5 h-5" />
              Экспорт
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/10 border border-white/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{clients.length}</p>
                  <p className="text-sm text-white/60">Всего клиентов</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-premium-gold/20 rounded-lg">
                  <Star className="w-5 h-5 text-premium-gold" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{clients.filter(c => c.status === 'vip').length}</p>
                  <p className="text-sm text-white/60">VIP клиентов</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(clients.reduce((sum, c) => sum + c.totalSpent, 0))} ₽</p>
                  <p className="text-sm text-white/60">Общая выручка</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{clients.reduce((sum, c) => sum + c.totalBookings, 0)}</p>
                  <p className="text-sm text-white/60">Всего бронирований</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="text"
                placeholder="Поиск по имени или email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-premium-gold"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-premium-gold"
            >
              <option value="all" className="bg-gray-900">Все статусы</option>
              <option value="vip" className="bg-gray-900">VIP</option>
              <option value="active" className="bg-gray-900">Активные</option>
              <option value="inactive" className="bg-gray-900">Неактивные</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" message="Загрузка клиентов..." />
            </div>
          ) : filteredClients.length === 0 ? (
            <EmptyState
              icon={<Users className="w-12 h-12 text-white/30" />}
              title="Клиенты не найдены"
              description="Попробуйте изменить параметры поиска"
            />
          ) : (
            <div className="bg-white/10 border border-white/20 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/60 font-medium">Клиент</th>
                    <th className="text-left p-4 text-white/60 font-medium">Контакты</th>
                    <th className="text-left p-4 text-white/60 font-medium">Бронирования</th>
                    <th className="text-left p-4 text-white/60 font-medium">Потрачено</th>
                    <th className="text-left p-4 text-white/60 font-medium">Рейтинг</th>
                    <th className="text-left p-4 text-white/60 font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-premium-gold/20 rounded-full flex items-center justify-center">
                            <span className="text-premium-gold font-bold">{client.name.charAt(0)}</span>
                          </div>
                          <span className="font-medium">{client.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <Mail className="w-4 h-4" />
                            {client.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <Phone className="w-4 h-4" />
                            {client.phone}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-bold">{client.totalBookings}</span>
                        <span className="text-white/50 text-sm ml-1">туров</span>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-premium-gold">{formatCurrency(client.totalSpent)} ₽</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="font-bold">{client.rating}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(client.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </Protected>
  );
}
