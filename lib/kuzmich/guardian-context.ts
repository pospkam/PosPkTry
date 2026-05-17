import { pool } from '@/lib/db-pool';

interface GuardianPlaceRow {
  name: string;
  description: string | null;
  location_type: string | null;
  lat: number | null;
  lng: number | null;
  hazard_types: string[] | null;
  difficulty_level: number | null;
  altitude_m: number | null;
  nearest_medical_km: number | null;
  sat_communicator_required: boolean | null;
  capacity_per_day: number | null;
  open_from_date: string | null;
  open_to_date: string | null;
  is_open: boolean | null;
  current_crowds: number | null;
  active_alerts: string[] | null;
  recommender_status: string | null;
  alert_message: string | null;
  alert_severity: number | null;
  tourists_today: number | null;
}

interface AlertRow {
  title: string;
  severity: number;
  description: string | null;
  source_url: string | null;
}

interface KnowledgeRow {
  title: string;
  compiled_truth: string;
  type: string;
}

const STATUS_LABEL: Record<string, string> = {
  green: 'ЗЕЛЁНЫЙ',
  yellow: 'ЖЁЛТЫЙ',
  red: 'КРАСНЫЙ',
};

const HAZARD_LABELS: Record<string, string> = {
  avalanche: 'лавины',
  rockfall: 'камнепад',
  thermal: 'термальные поля',
  altitude: 'высотная болезнь',
  wildlife: 'дикие животные',
  water: 'горные реки',
  rapids: 'пороги',
  chemical: 'химические выбросы',
  weather: 'резкая смена погоды',
};

export async function getGuardianContext(placeName: string): Promise<string> {
  if (!placeName.trim()) return '';

  const [placesRes, alertsRes, knowledgeRes] = await Promise.all([
    pool.query<GuardianPlaceRow>(
      `SELECT
         p.name, p.description, p.location_type, p.lat, p.lng,
         lsp.hazard_types, lsp.difficulty_level, lsp.altitude_m,
         lsp.nearest_medical_km, lsp.sat_communicator_required,
         lsp.capacity_per_day, lsp.open_from_date, lsp.open_to_date,
         lrs.is_open, lrs.current_crowds, lrs.active_alerts,
         lrs.recommender_status, lrs.alert_message, lrs.alert_severity,
         lrs.tourists_today
       FROM places p
       LEFT JOIN location_safety_profile lsp ON lsp.agent_route_id = p.ark_id
       LEFT JOIN location_real_time_status lrs ON lrs.agent_route_id = p.ark_id
       WHERE p.name ILIKE $1
       ORDER BY char_length(p.name) ASC
       LIMIT 3`,
      [`%${placeName}%`],
    ),
    pool.query<AlertRow>(
      `SELECT title, severity, description, source_url
       FROM external_alerts
       WHERE (expires_at IS NULL OR expires_at > NOW())
         AND (title ILIKE $1 OR description ILIKE $1)
       ORDER BY severity DESC
       LIMIT 3`,
      [`%${placeName}%`],
    ),
    pool.query<KnowledgeRow>(
      `SELECT title, compiled_truth, type
       FROM agent_knowledge
       WHERE agent_id = 'kuzmich'
         AND (title ILIKE $1 OR compiled_truth ILIKE $1)
       ORDER BY
         CASE WHEN type = 'indigenous' THEN 1
              WHEN type = 'auto_gap' THEN 2
              ELSE 3 END,
         updated_at DESC
       LIMIT 5`,
      [`%${placeName}%`],
    ),
  ]);

  if (placesRes.rows.length === 0 && alertsRes.rows.length === 0 && knowledgeRes.rows.length === 0) {
    return '';
  }

  const parts: string[] = [];

  for (const p of placesRes.rows) {
    const status = p.recommender_status ? STATUS_LABEL[p.recommender_status] ?? p.recommender_status : null;
    const header = status
      ? `${p.name} [${status}${p.is_open === false ? ' — ЗАКРЫТО' : ''}]`
      : p.name;
    parts.push(header);

    // Алерты первыми — безопасность важнее описания
    if (p.alert_message) {
      parts.push(`Алерт: ${p.alert_message}`);
    } else if (p.active_alerts?.length) {
      parts.push(`Активные алерты: ${p.active_alerts.join(', ')}.`);
    }

    if (p.tourists_today !== null && p.capacity_per_day) {
      parts.push(`Сегодня посетило: ${p.tourists_today} чел. (норма ${p.capacity_per_day}/день).`);
    }

    if (p.altitude_m) parts.push(`Высота ${p.altitude_m} м.`);

    if (p.nearest_medical_km) {
      parts.push(`До медпомощи: ${p.nearest_medical_km} км.`);
    }

    if (p.sat_communicator_required) {
      parts.push('Требуется спутниковый коммуникатор.');
    }

    if (p.hazard_types?.length) {
      const hazards = p.hazard_types.map((h) => HAZARD_LABELS[h] ?? h).join(', ');
      parts.push(`Опасности: ${hazards}.`);
    } else if (!p.altitude_m && !p.nearest_medical_km && !p.sat_communicator_required) {
      parts.push('Профиль безопасности для этого места не оцифрован.');
    }

    if (p.description) {
      parts.push(p.description.slice(0, 300));
    }
  }

  for (const a of alertsRes.rows) {
    parts.push(`[Алерт КБГС/МЧС] ${a.title}${a.description ? ': ' + a.description.slice(0, 150) : ''}`);
  }

  for (const k of knowledgeRes.rows) {
    if (k.type === 'indigenous') {
      parts.push(`[Традиционные знания] ${k.title}: ${k.compiled_truth.slice(0, 200)}`);
    } else {
      parts.push(`${k.title}: ${k.compiled_truth.slice(0, 200)}`);
    }
  }

  return parts.join('\n');
}
