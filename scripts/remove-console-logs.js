#!/usr/bin/env node
/**
 * Remove all console.* statements from production code
 * Security & Maintenance: console logs leak sensitive data to production logs
 */

const fs = require('fs');
const path = require('path');

const ROOT = '/workspaces/PosPkTry';
const IGNORE_DIRS = ['node_modules', '.next', '.git', '.cache'];
const IGNORE_FILES = ['*.test.ts', '*.test.tsx', '*.d.ts'];

function shouldIgnore(filePath) {
  const relative = path.relative(ROOT, filePath);
  for (const dir of IGNORE_DIRS) {
    if (relative.includes(dir)) return true;
  }
  for (const pattern of IGNORE_FILES) {
    if (relative.endsWith(pattern)) return true;
  }
  return false;
}

function getFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (shouldIgnore(fullPath)) continue;
    if (stat.isDirectory()) {
      getFiles(fullPath, files);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

function removeConsoleLogs(content) {
  const lines = content.split('\n');
  const results = [];
  let removed = 0;

  for (const line of lines) {
    // Match console.log/error/warn/info/debug statements
    // Support: console.log(...), indented, with/without semicolon
    if (/^\s*console\.(log|error|warn|info|debug)\s*\(/.test(line)) {
      removed++;
      continue; // Skip this line
    }
    results.push(line);
  }

  return { content: results.join('\n'), removed };
}

async function main() {
  const files = getFiles(ROOT);
  console.log(`Found ${files.length} TypeScript files to process...`);

  let totalRemoved = 0;
  let filesModified = 0;

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { content: newContent, removed } = removeConsoleLogs(content);

      if (removed > 0) {
        fs.writeFileSync(file, newContent, 'utf-8');
        filesModified++;
        totalRemoved += removed;
        process.stdout.write('.');
      }
    } catch (err) {
      console.error(`Error processing ${file}:`, err.message);
    }
  }

  console.log(`\n\nDone!\n`);
  console.log(`Files modified: ${filesModified}`);
  console.log(`console.* statements removed: ${totalRemoved}`);
}

main().catch(console.error);
