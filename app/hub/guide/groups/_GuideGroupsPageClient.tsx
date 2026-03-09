'use client';

import { useState } from 'react';
import { Protected } from '@/components/auth/Protected';
import { LoadingSpinner } from '@/components/admin/shared';
import { Users, Calendar, Phone, Mail } from 'lucide-react';
import { useApiFetch } from '@/hooks/use-api-fetch';

interface GroupMember {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface Group {
  id: string;
  tourName: string;
  date: string;
  members: GroupMember[];
  notes: string;
}

export default function GuideGroupsPageClient() {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const { data: groups, loading } = useApiFetch<Group[], Group[]>(
    '/api/guide/groups',
    (d) => d ?? [],
  );

  const list = groups ?? [];

  return (
    <Protected roles={['guide', 'operator', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <div className="bg-white/15 border-b border-white/15 p-6">
          <h1 className="text-3xl font-black text-white">Мои группы</h1>
          <p className="text-white/70">Участники предстоящих туров</p>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {loading ? (
            <LoadingSpinner message="Загрузка групп..." />
          ) : list.length === 0 ? (
            <div className="bg-white/10 border border-white/20 rounded-xl p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-white/30" />
              <h2 className="text-xl font-bold mb-2">Нет активных групп</h2>
              <p className="text-white/50">Группы появятся после назначения на туры</p>
            </div>
          ) : (
            <div className="space-y-4">
              {list.map((group) => (
                <div
                  key={group.id}
                  className="bg-white/10 border border-white/20 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                    className="w-full p-6 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold">{group.tourName}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-white/70">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(group.date).toLocaleDateString('ru-RU')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {group.members.length} участников
                          </span>
                        </div>
                      </div>
                      <span className="text-2xl">{expandedGroup === group.id ? '−' : '+'}</span>
                    </div>
                  </button>

                  {expandedGroup === group.id && (
                    <div className="border-t border-white/10 p-6">
                      {group.notes && (
                        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
                          <strong>Заметки:</strong> {group.notes}
                        </div>
                      )}
                      <div className="space-y-3">
                        {group.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                          >
                            <span className="font-medium">{member.name}</span>
                            <div className="flex items-center gap-4 text-sm text-white/70">
                              <a href={`tel:${member.phone}`} className="flex items-center gap-1 hover:text-white">
                                <Phone className="w-4 h-4" />
                                {member.phone}
                              </a>
                              <a href={`mailto:${member.email}`} className="flex items-center gap-1 hover:text-white">
                                <Mail className="w-4 h-4" />
                                {member.email}
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </Protected>
  );
}
