'use client';

import { useState } from 'react';
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
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Мои группы</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Участники предстоящих туров
        </p>
      </div>

      {loading ? (
        <LoadingSpinner message="Загрузка групп..." />
      ) : list.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-12 text-center">
          <Users className="w-14 h-14 mx-auto mb-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            Нет активных групп
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Группы появятся после назначения на туры
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((group) => (
            <div
              key={group.id}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                className="w-full px-5 py-4 text-left hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {group.tourName}
                    </h3>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(group.date).toLocaleDateString('ru-RU')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {group.members.length} участников
                      </span>
                    </div>
                  </div>
                  <span className="text-lg text-[var(--text-muted)]">
                    {expandedGroup === group.id ? '−' : '+'}
                  </span>
                </div>
              </button>

              {expandedGroup === group.id && (
                <div className="border-t border-[var(--border)] px-5 py-4">
                  {group.notes && (
                    <div
                      className="mb-4 px-3.5 py-2.5 rounded-md text-sm border"
                      style={{
                        color: 'var(--warning)',
                        borderColor: 'var(--warning)',
                        backgroundColor: 'color-mix(in srgb, var(--warning) 10%, transparent)',
                      }}
                    >
                      <strong>Заметки:</strong> {group.notes}
                    </div>
                  )}
                  <div className="space-y-2">
                    {group.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between px-3.5 py-2.5 bg-[var(--bg-hover)] rounded-md"
                      >
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {member.name}
                        </span>
                        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                          <a
                            href={`tel:${member.phone}`}
                            className="flex items-center gap-1 hover:text-[var(--accent)] transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {member.phone}
                          </a>
                          <a
                            href={`mailto:${member.email}`}
                            className="flex items-center gap-1 hover:text-[var(--accent)] transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
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
  );
}
