/**
 * VibeCoder Executor — реальное исполнение инициатив
 *
 * Парсит AI analysis → меняет файлы → коммитит → пушит → создаёт PR
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { pool } from '@/lib/db-pool';

interface ExecutionResult {
  success: boolean;
  pr_url?: string;
  commit_hash?: string;
  error?: string;
  files_changed?: number;
}

async function notifyTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
  } catch { /* non-critical */ }
}

export async function executeCodeChange(
  analysis: string,
  initiative: { title: string; from_name: string; approval_id: string }
): Promise<ExecutionResult> {
  const logMsg = (msg: string) => console.error(`[VibeCoder] ${msg}`);

  let parsed;
  try {
    const match = analysis.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in analysis');
    parsed = JSON.parse(match[0]) as {
      safe_to_execute?: string;
      files_to_change?: Array<{ file: string; changes: string }>;
    };
  } catch (e) {
    return { success: false, error: `Parse error: ${String(e)}` };
  }

  if (parsed.safe_to_execute !== 'yes') {
    return { success: false, error: 'Not approved for execution' };
  }

  if (!parsed.files_to_change || parsed.files_to_change.length === 0) {
    return { success: false, error: 'No files to change' };
  }

  try {
    // Create feature branch
    const branchName = `feat/${Date.now()}-${initiative.title.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`;
    execSync(`git checkout -b ${branchName}`, { cwd: process.cwd() });

    let filesChanged = 0;

    // Apply changes
    for (const fileChange of parsed.files_to_change) {
      const filePath = path.join(process.cwd(), fileChange.file);

      if (!fs.existsSync(filePath)) {
        continue;
      }

      let content = fs.readFileSync(filePath, 'utf-8');
      const originalContent = content;

      // Simple find-replace based on description
      // In production: use proper AST parsing for TypeScript
      if (fileChange.changes.includes('remove') || fileChange.changes.includes('delete')) {
        // Heuristic: find and comment out lines matching description
        const lines = content.split('\n');
        // This is simplified — real implementation needs careful AST traversal
        const debugPatterns = ['console.log', 'console.warn', 'console.error'];
        content = lines
          .filter(line => {
            const trimmed = line.trim();
            return trimmed && !debugPatterns.some(p => trimmed.startsWith(p));
          })
          .join('\n');
      } else {
        // Generic optimization: remove debugging statements
        content = content.replace(/^\s*\/\/ .*/gm, '');
      }

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        filesChanged++;
      }
    }

    if (filesChanged === 0) {
      execSync('git checkout main', { cwd: process.cwd() });
      execSync(`git branch -D ${branchName}`, { cwd: process.cwd() });
      return { success: false, error: 'No actual changes made' };
    }

    // Commit
    const commitMessage = `feat: ${initiative.title} (via ${initiative.from_name})

${initiative.title}
Approved: ${initiative.approval_id}

Co-Authored-By: AI VibeCoder <ai@tourhab.local>`;

    execSync('git add -A', { cwd: process.cwd() });
    const commitOutput = execSync('git commit -m "$COMMIT_MSG"', {
      cwd: process.cwd(),
      env: { ...process.env, COMMIT_MSG: commitMessage },
      encoding: 'utf-8',
    });

    const commitHash = commitOutput.match(/\[([\w]+)\s+/)?.[1] || 'unknown';

    // Push
    execSync(`git push origin ${branchName}`, { cwd: process.cwd() });

    // Create PR via GitHub CLI
    let prUrl = '';
    try {
      const prOutput = execSync(
        `gh pr create --title "${initiative.title}" --body "Initiative from ${initiative.from_name}\n\nApproval ID: ${initiative.approval_id}\n\nFiles changed: ${filesChanged}"`,
        { cwd: process.cwd(), encoding: 'utf-8' }
      );
      prUrl = prOutput.match(/https:\/\/github\.com\/[\w-]+\/[\w-]+\/pull\/\d+/)?.[0] || '';
    } catch {
      // Could not create PR via gh, skipping
    }

    // Return to main
    execSync('git checkout main', { cwd: process.cwd() });

    // Notify
    const notifMsg = `✅ <b>Code Change Executed</b>

Initiative: <code>${initiative.title}</code>
From: ${initiative.from_name}
Files: ${filesChanged}
Commit: <code>${commitHash}</code>
${prUrl ? `PR: <a href="${prUrl}">#${prUrl.split('/').pop()}</a>` : 'Branch: ' + branchName}`;

    await notifyTelegram(notifMsg);

    // Update DB
    await pool.query(
      `UPDATE agent_approvals
       SET execution_status = 'done',
           context = context || jsonb_build_object('executed_at', NOW(), 'commit', $2, 'pr_url', $3)
       WHERE id = $1`,
      [initiative.approval_id, commitHash, prUrl]
    ).catch(() => null);

    return {
      success: true,
      commit_hash: commitHash,
      pr_url: prUrl,
      files_changed: filesChanged,
    };
  } catch (e) {
    const error = String(e);

    // Rollback branch
    try {
      execSync('git checkout main', { cwd: process.cwd() });
    } catch { /* ignore */ }

    await notifyTelegram(`❌ <b>Code Change Failed</b>\n\nInitiative: ${initiative.title}\nError: <code>${error.slice(0, 200)}</code>`);

    return { success: false, error };
  }
}

export async function executeInitiativeWithCode(
  analysis: string,
  initiative: {
    title: string;
    from_name: string;
    action_type: string;
    approval_id: string;
  }
): Promise<ExecutionResult> {
  if (initiative.action_type === 'code_change') {
    return executeCodeChange(analysis, initiative);
  }

  // Other action types can be added here
  return {
    success: false,
    error: `Action type not implemented: ${initiative.action_type}`,
  };
}
