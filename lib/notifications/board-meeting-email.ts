/**
 * Board meeting email notifications
 * После завершения заседания каждый агент присылает свой итог на admin@tourhab.ru
 */

import { emailService } from '@/lib/notifications/email-service';
import type { AgentReport, AgentProposal } from '@/app/api/agents/board-meeting/route';

// Агентный реестр: id → { адрес, цвет, должность }
const AGENT_META: Record<string, { email: string; color: string; title: string }> = {
  admin:    { email: 'admin@tourhab.ru',    color: '#D44A0C', title: 'Операционный директор' },
  legal:    { email: 'legal@tourhab.ru',    color: '#8B5CF6', title: 'Юрисконсульт'          },
  security: { email: 'security@tourhab.ru', color: '#DC2626', title: 'Служба безопасности'   },
  hacker:   { email: 'growth@tourhab.ru',   color: '#3FB950', title: 'Директор по росту'     },
  rescue:   { email: 'sos@tourhab.ru',      color: '#D29922', title: 'Начальник SAR'          },
  eco:      { email: 'eco@tourhab.ru',      color: '#10B981', title: 'Эколог-аналитик'        },
  content:  { email: 'content@tourhab.ru',  color: '#2568B0', title: 'Контент-директор'       },
  quality:  { email: 'quality@tourhab.ru',  color: '#F59E0B', title: 'Директор по качеству'   },
  planning: { email: 'planning@tourhab.ru', color: '#3B82F6', title: 'Стратегический плановик' },
  evo:      { email: 'evo@tourhab.ru',      color: '#EC4899', title: 'Архитектор платформы'   },
};

const ADMIN_EMAIL = 'admin@tourhab.ru';
const SMTP_FROM   = process.env.SMTP_USER ?? 'noreply@tourhab.ru';

function esc(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/** Превращаем plaintext отчёт агента в читаемый HTML */
function reportToHtml(text: string): string {
  return text
    .split('\n')
    .map(line => {
      const t = line.trim();
      if (!t) return '';
      if (t.startsWith('##')) return `<h3 style="margin:16px 0 6px;font-size:13px;color:#1A1714;">${esc(t.replace(/^#+\s*/,''))}</h3>`;
      if (t.startsWith('#'))  return `<h2 style="margin:16px 0 8px;font-size:15px;color:#1A1714;">${esc(t.replace(/^#+\s*/,''))}</h2>`;
      if (t.startsWith('- ') || t.startsWith('• ')) return `<li style="margin:3px 0;font-size:13px;color:#6B6560;">${esc(t.replace(/^[-•]\s*/,''))}</li>`;
      return `<p style="margin:4px 0;font-size:13px;color:#6B6560;line-height:1.6;">${esc(t)}</p>`;
    })
    .join('\n');
}

function priorityLabel(p: string) {
  if (p === 'high')   return { text: 'Высокий',   bg: '#FEE2E2', color: '#DC2626' };
  if (p === 'medium') return { text: 'Средний',    bg: '#FEF3C7', color: '#D97706' };
  return               { text: 'Низкий',    bg: '#D1FAE5', color: '#059669' };
}

/** Индивидуальное письмо от одного агента */
function buildAgentEmail(opts: {
  agent:     AgentReport;
  proposal?: AgentProposal;
  shortId:   string;
  dateStr:   string;
  meta:      { email: string; color: string; title: string };
}): string {
  const { agent, proposal, shortId, dateStr, meta } = opts;
  const prio = proposal ? priorityLabel(proposal.priority) : null;

  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F0EB;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;padding:24px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

  <!-- Шапка агента -->
  <tr><td style="background:${meta.color};padding:20px 28px;">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:0.1em;">Совет директоров TourHab · ${esc(dateStr)}</p>
    <p style="margin:6px 0 2px;font-size:20px;font-weight:700;color:#FFFFFF;">${esc(agent.name)}</p>
    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.85);">${esc(meta.title)}</p>
  </td></tr>

  <!-- Заголовок письма -->
  <tr><td style="padding:20px 28px 0;">
    <p style="margin:0;font-size:11px;color:#9A9590;text-transform:uppercase;letter-spacing:0.08em;">Итог заседания #${esc(shortId)}</p>
    <h1 style="margin:6px 0 0;font-size:18px;font-weight:700;color:#1A1714;">Отчёт готов</h1>
  </td></tr>

  <!-- Отчёт -->
  <tr><td style="padding:16px 28px;">
    <div style="background:#F5F0EB;border-radius:8px;padding:16px 20px;">
      ${reportToHtml(agent.report)}
    </div>
  </td></tr>

  ${proposal ? `
  <!-- Инициатива -->
  <tr><td style="padding:0 28px 16px;">
    <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#1A1714;text-transform:uppercase;letter-spacing:0.06em;">Инициатива раунда 4</p>
    <div style="border-left:3px solid ${meta.color};padding:12px 16px;background:#FAFAFA;border-radius:0 6px 6px 0;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="font-size:13px;font-weight:700;color:#1A1714;">${esc(proposal.title)}</span>
        <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;background:${prio!.bg};color:${prio!.color};">${prio!.text}</span>
      </div>
      <p style="margin:0;font-size:12px;color:#6B6560;line-height:1.6;">${esc(proposal.description)}</p>
      ${proposal.approval_id ? `<p style="margin:8px 0 0;font-size:11px;color:#9A9590;">Одобрить: <a href="https://tourhab.ru/hub/admin/agents?tab=approvals" style="color:#D44A0C;text-decoration:none;">hub/admin/agents → Одобрения</a></p>` : ''}
    </div>
  </td></tr>
  ` : ''}

  <!-- Ссылка -->
  <tr><td style="padding:0 28px 20px;">
    <a href="https://tourhab.ru/hub/admin/board-meeting" style="display:inline-block;background:${meta.color};color:#FFFFFF;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;font-weight:600;">
      Открыть заседание →
    </a>
  </td></tr>

  <!-- Футер -->
  <tr><td style="padding:14px 28px;background:#FAFAFA;border-top:1px solid #F0ECE7;">
    <p style="margin:0;font-size:10px;color:#9A9590;">TourHab · Совет директоров · ${esc(dateStr)} · заседание #${esc(shortId)}</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

/** Дайджест-письмо: consensus + все инициативы */
function buildDigestEmail(opts: {
  agents:     AgentReport[];
  proposals:  AgentProposal[];
  consensus:  string;
  shortId:    string;
  dateStr:    string;
  durationMs: number;
}): string {
  const { agents, proposals, consensus, shortId, dateStr, durationMs } = opts;
  const okCount = agents.filter(a => a.status === 'ok').length;
  const mins = Math.round(durationMs / 60000);

  const proposalRows = proposals.map(p => {
    const prio = priorityLabel(p.priority);
    const meta = AGENT_META[p.from_id];
    const dot  = meta ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${meta.color};margin-right:6px;"></span>` : '';
    return `<tr>
      <td style="padding:8px 12px;font-size:12px;color:#1A1714;border-bottom:1px solid #F0ECE7;">${dot}${esc(p.from_name)}</td>
      <td style="padding:8px 12px;font-size:12px;color:#1A1714;border-bottom:1px solid #F0ECE7;">${esc(p.title)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #F0ECE7;">
        <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;background:${prio.bg};color:${prio.color};">${prio.text}</span>
      </td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F0EB;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

  <!-- Шапка -->
  <tr><td style="background:#1A1714;padding:24px 32px;">
    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.1em;">TourHab · Совет директоров · ${esc(dateStr)}</p>
    <h1 style="margin:8px 0 4px;font-size:22px;font-weight:700;color:#FFFFFF;">Заседание #${esc(shortId)} завершено</h1>
    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.6);">${okCount} из ${agents.length} агентов · ${proposals.length} инициатив · ${mins} мин.</p>
  </td></tr>

  <!-- Консенсус -->
  <tr><td style="padding:24px 32px 0;">
    <p style="margin:0 0 8px;font-size:11px;color:#9A9590;text-transform:uppercase;letter-spacing:0.08em;">Консенсус фасилитатора</p>
    <div style="background:#F5F0EB;border-radius:8px;padding:16px 20px;">
      <p style="margin:0;font-size:13px;color:#1A1714;line-height:1.7;">${esc(consensus.substring(0, 800))}${consensus.length > 800 ? '…' : ''}</p>
    </div>
  </td></tr>

  ${proposals.length > 0 ? `
  <!-- Инициативы -->
  <tr><td style="padding:20px 32px 0;">
    <p style="margin:0 0 12px;font-size:11px;color:#9A9590;text-transform:uppercase;letter-spacing:0.08em;">Инициативы (${proposals.length})</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #F0ECE7;border-radius:8px;overflow:hidden;">
      <tr style="background:#F5F0EB;">
        <td style="padding:8px 12px;font-size:10px;font-weight:700;color:#9A9590;text-transform:uppercase;">Агент</td>
        <td style="padding:8px 12px;font-size:10px;font-weight:700;color:#9A9590;text-transform:uppercase;">Инициатива</td>
        <td style="padding:8px 12px;font-size:10px;font-weight:700;color:#9A9590;text-transform:uppercase;">Приоритет</td>
      </tr>
      ${proposalRows}
    </table>
  </td></tr>
  ` : ''}

  <!-- CTA -->
  <tr><td style="padding:24px 32px;">
    <a href="https://tourhab.ru/hub/admin/board-meeting" style="display:inline-block;background:#D44A0C;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:13px;font-weight:600;margin-right:8px;">
      Открыть заседание →
    </a>
    <a href="https://tourhab.ru/hub/admin/agents?tab=approvals" style="display:inline-block;background:#F5F0EB;color:#1A1714;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:13px;font-weight:600;">
      Одобрить инициативы →
    </a>
  </td></tr>

  <!-- Футер -->
  <tr><td style="padding:14px 32px;background:#FAFAFA;border-top:1px solid #F0ECE7;">
    <p style="margin:0;font-size:10px;color:#9A9590;">ООО «ПОС-СЕРВИС» · tourhab.ru · Это автоматическое письмо</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

export interface BoardMeetingEmailInput {
  agents:     AgentReport[];
  proposals:  AgentProposal[];
  consensus:  string;
  meetingId:  string;
  durationMs: number;
}

/**
 * Отправляет письма после заседания:
 * 1. Индивидуальные от каждого агента → admin@tourhab.ru
 * 2. Дайджест с консенсусом + инициативами → admin@tourhab.ru
 *
 * Non-blocking: все ошибки подавляются (не блокируют встречу).
 */
export async function sendBoardMeetingEmails(input: BoardMeetingEmailInput): Promise<void> {
  const { agents, proposals, consensus, meetingId, durationMs } = input;

  const shortId = meetingId.slice(0, 8).toUpperCase();
  const dateStr = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

  // Индивидуальные письма от каждого агента (только те, что завершились успешно)
  const individualSends = agents
    .filter(a => a.status === 'ok' && AGENT_META[a.id])
    .map(async agent => {
      const meta     = AGENT_META[agent.id]!;
      const proposal = proposals.find(p => p.from_id === agent.id);

      try {
        await emailService.sendEmail({
          to:      ADMIN_EMAIL,
          subject: `[${agent.name}] Итог заседания #${shortId} — ${dateStr}`,
          html:    buildAgentEmail({ agent, proposal, shortId, dateStr, meta }),
          // Имитируем что письмо от агента (display name), но отправитель — noreply SMTP
          // Reply-To указывает куда отвечать
        });
      } catch {
        // non-critical — не блокируем
      }
    });

  // Запускаем параллельно (rate limit: max 5 одновременно чтобы не перегрузить SMTP)
  const BATCH = 5;
  for (let i = 0; i < individualSends.length; i += BATCH) {
    await Promise.allSettled(individualSends.slice(i, i + BATCH));
  }

  // Дайджест от Admin-агента
  try {
    await emailService.sendEmail({
      to:      ADMIN_EMAIL,
      subject: `[Совет директоров] #${shortId} завершён — ${proposals.length} инициатив — ${dateStr}`,
      html:    buildDigestEmail({ agents, proposals, consensus, shortId, dateStr, durationMs }),
    });
  } catch {
    // non-critical
  }
}
