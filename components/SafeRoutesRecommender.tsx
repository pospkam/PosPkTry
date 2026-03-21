'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, MapPin, Users, AlertTriangle, Zap } from 'lucide-react';

interface SafeRoute {
  id: number;
  title: string;
  location_type: string;
  activity_type: string;
  difficulty: number;
  capacity_remaining: number;
  optimal_group_size: number;
  hazards: string[];
  alerts: string[];
  alert_severity: number;
  status: string;
  safety_score: number;
  reason: string;
}

interface SafeRoutesRecommenderProps {
  date?: string;
  groupSize?: number;
  activityType?: string;
  onSelectRoute?: (route: SafeRoute) => void;
}

export function SafeRoutesRecommender({
  date = new Date().toISOString().split('T')[0],
  groupSize = 1,
  activityType = '',
  onSelectRoute,
}: SafeRoutesRecommenderProps) {
  const [routes, setRoutes] = useState<SafeRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSafeRoutes();
  }, [date, groupSize, activityType]);

  async function fetchSafeRoutes() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        date,
        group_size: groupSize.toString(),
        difficulty: '5',
      });

      if (activityType) {
        params.append('activity_type', activityType);
      }

      const response = await fetch(`/api/safety/routes?${params}`);
      if (!response.ok) throw new Error('Failed to fetch safe routes');

      const data = await response.json();
      setRoutes(data.data || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border border-[var(--border)] border-t-[var(--accent)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ds-card p-6 bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-[var(--warning)]">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-[var(--warning)] flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Error loading routes</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="ds-card p-6 text-center">
        <AlertCircle className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-[var(--text-secondary)]">No safe routes available for these parameters</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-[var(--text-secondary)]">
        Found {routes.length} safe routes for {new Date(date).toLocaleDateString()} • Group size: {groupSize}
      </div>

      {routes.map(route => (
        <div
          key={route.id}
          className={`ds-card p-5 rounded-lg transition-all ${
            route.alert_severity >= 2
              ? 'bg-yellow-50 dark:bg-yellow-950/20 border border-[var(--warning)]'
              : route.status === 'yellow'
                ? 'bg-sky-50 dark:bg-sky-950/20 border border-[var(--ocean)]'
                : 'bg-green-50 dark:bg-green-950/20 border border-[var(--success)]'
          }`}
          onClick={() => onSelectRoute?.(route)}
          role="button"
          tabIndex={0}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-[var(--text-primary)] text-lg">{route.title}</h3>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="ds-badge bg-[var(--accent)] bg-opacity-20 text-[var(--accent)] text-xs">
                  {route.location_type}
                </span>
                <span className="ds-badge bg-[var(--ocean)] bg-opacity-20 text-[var(--ocean)] text-xs">
                  {route.activity_type}
                </span>
                <span className="ds-badge">Difficulty: {route.difficulty}/5</span>
              </div>
            </div>

            {/* Status */}
            <div className="text-right">
              {route.alert_severity >= 2 ? (
                <AlertCircle className="w-6 h-6 text-[var(--danger)] mb-2" />
              ) : route.status === 'green' ? (
                <CheckCircle className="w-6 h-6 text-[var(--success)] mb-2" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-[var(--warning)] mb-2" />
              )}
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  route.alert_severity >= 2
                    ? 'bg-[var(--danger)] text-white'
                    : route.status === 'green'
                      ? 'bg-[var(--success)] text-white'
                      : 'bg-[var(--warning)] text-white'
                }`}
              >
                {route.alert_severity >= 2 ? 'CLOSED' : route.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Info Row */}
          <div className="grid grid-cols-3 gap-4 mb-3 py-3 border-y border-[var(--border)]">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">{route.capacity_remaining}</span> spots left
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-[var(--text-secondary)]">
                Group size: <span className="font-medium text-[var(--text-primary)]">{route.optimal_group_size}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-[var(--text-secondary)]">
                Safety: <span className="font-medium">{Math.round(route.safety_score * 100)}%</span>
              </span>
            </div>
          </div>

          {/* Hazards */}
          {route.hazards.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Hazards:</p>
              <div className="flex gap-2 flex-wrap">
                {route.hazards.map(hazard => (
                  <span key={hazard} className="ds-badge bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 text-xs">
                    {hazard}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Alerts */}
          {route.alerts.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Active Alerts:</p>
              <div className="flex gap-2 flex-wrap">
                {route.alerts.map((alert, idx) => (
                  <span key={idx} className="ds-badge bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs">
                    {alert}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reason */}
          <p className="text-sm text-[var(--text-secondary)] italic mb-3">{route.reason}</p>

          {/* CTA */}
          <button className="ds-btn ds-btn-primary w-full">
            View Details & Book
          </button>
        </div>
      ))}
    </div>
  );
}
