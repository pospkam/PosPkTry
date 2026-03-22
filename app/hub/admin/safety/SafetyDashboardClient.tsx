'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Clock, Users, MapPin } from 'lucide-react';

interface Alert {
  id: number;
  alert_type: string;
  severity: number;
  title: string;
  description: string;
  affected_zones: string[];
  created_at: string;
  expires_at: string;
  affected_route_count: number;
}

interface CapacityItem {
  agent_route_id: number;
  title: string;
  capacity_remaining: number;
  capacity_per_day: number;
  recommender_status: string;
  tourists_today: number;
  active_alerts?: string[];
  alert_severity: number;
}

export function SafetyDashboardClient() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [capacity, setCapacity] = useState<CapacityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'alerts' | 'capacity' | 'routes'>('alerts');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // refresh every 60 sec
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const [alertsRes, capacityRes] = await Promise.all([
        fetch('/api/safety/alerts'),
        fetch('/api/safety/capacity'),
      ]);

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.data || []);
      }

      if (capacityRes.ok) {
        const data = await capacityRes.json();
        setCapacity(data.data || []);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }

  const criticalAlerts = alerts.filter(a => a.severity >= 2);
  const redLocations = capacity.filter(c => c.recommender_status === 'red');
  const yellowLocations = capacity.filter(c => c.recommender_status === 'yellow');

  return (
    <div className="ds-page min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="ds-h1 mb-2">Safety Dashboard</h1>
          <p className="text-[var(--text-secondary)]">Real-time monitoring of alerts and capacity</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="ds-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--text-secondary)] text-sm">Critical Alerts</span>
              <AlertCircle className="w-5 h-5 text-[var(--danger)]" />
            </div>
            <p className="ds-h2">{criticalAlerts.length}</p>
          </div>

          <div className="ds-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--text-secondary)] text-sm">Full Locations</span>
              <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />
            </div>
            <p className="ds-h2">{redLocations.length}</p>
          </div>

          <div className="ds-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--text-secondary)] text-sm">Warning (70%)</span>
              <Clock className="w-5 h-5 text-[var(--warning)]" />
            </div>
            <p className="ds-h2">{yellowLocations.length}</p>
          </div>

          <div className="ds-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--text-secondary)] text-sm">Total Routes</span>
              <CheckCircle className="w-5 h-5 text-[var(--success)]" />
            </div>
            <p className="ds-h2">{capacity.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="ds-card mb-8">
          <div className="flex border-b border-[var(--border)]">
            {(['alerts', 'capacity', 'routes'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border border-[var(--border)] border-t-[var(--accent)]"></div>
              </div>
            ) : activeTab === 'alerts' ? (
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <p className="text-[var(--text-secondary)] text-center py-8">No active alerts</p>
                ) : (
                  alerts.map(alert => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        alert.severity >= 2
                          ? 'bg-yellow-50 dark:bg-yellow-950/20 border-[var(--danger)]'
                          : 'bg-blue-50 dark:bg-blue-950/20 border-[var(--ocean)]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-[var(--text-primary)]">{alert.title}</h3>
                          <p className="text-sm text-[var(--text-secondary)] mt-1">{alert.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-medium ${
                          alert.severity >= 2 ? 'bg-[var(--danger)] text-white' : 'bg-[var(--ocean)] text-white'
                        }`}>
                          {alert.alert_type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <div className="flex gap-4">
                          <span>Zones: {alert.affected_zones.join(', ')}</span>
                          <span>Routes affected: {alert.affected_route_count}</span>
                        </div>
                        <span>Expires: {new Date(alert.expires_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : activeTab === 'capacity' ? (
              <div className="space-y-3">
                {capacity.length === 0 ? (
                  <p className="text-[var(--text-secondary)] text-center py-8">No capacity data</p>
                ) : (
                  capacity.map(item => (
                    <div
                      key={item.agent_route_id}
                      className="ds-card p-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-[var(--text-primary)]">{item.title}</h3>
                        <div className="flex gap-4 mt-2 text-sm text-[var(--text-secondary)]">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {item.tourists_today}/{item.capacity_per_day}
                          </span>
                          <span className="flex items-center gap-1">
                            {item.capacity_remaining > 0 ? (
                              <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-[var(--danger)]" />
                            )}
                            {item.capacity_remaining} remaining
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          item.recommender_status === 'red'
                            ? 'bg-[var(--danger)] bg-opacity-20 text-[var(--danger)]'
                            : item.recommender_status === 'yellow'
                              ? 'bg-[var(--warning)] bg-opacity-20 text-[var(--warning)]'
                              : 'bg-[var(--success)] bg-opacity-20 text-[var(--success)]'
                        }`}>
                          {item.recommender_status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--text-secondary)]">
                Routes management coming soon
              </div>
            )}
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-sm text-[var(--text-secondary)] text-center">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
