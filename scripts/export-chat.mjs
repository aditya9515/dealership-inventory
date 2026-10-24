import { readFileSync, writeFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) throw new Error('Usage: node scripts/export-chat.mjs <this-chat-session.jsonl>');
const records = readFileSync(path, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const messages = records.filter((record) => {
  const item = record.payload;
  if (record.type !== 'response_item' || item?.type !== 'message') return false;
  if (!['user', 'assistant'].includes(item.role)) return false;
  if (item.role === 'assistant' && !['commentary', 'final'].includes(item.phase)) return false;
  const text = item.content.map((part) => part.text ?? '').join('');
  // These are app-provided context records, not authored conversation messages.
  return (
    !text.startsWith('<environment_context>') && !text.startsWith('<external_codex_apps_open_page>')
  );
});
const intro =
  '# Raw AI chat log\n\nVerbatim user-visible message text exported from this project’s Codex session. No summaries or rewritten prompts. App context, system/developer instructions, private reasoning, and tool calls/outputs are not included. The export is a snapshot taken before the final handoff.\n\n';
const body = messages
  .map((record) => {
    const content = record.payload.content.map((part) => part.text ?? '').join('');
    const fence = '`'.repeat(
      Math.max(4, ...Array.from(content.matchAll(/`+/g), (match) => match[0].length + 1)),
    );
    return `## ${record.payload.role} — ${record.timestamp}\n\n${fence}text\n${content}\n${fence}\n`;
  })
  .join('\n');
writeFileSync('PROMPTS.md', intro + body);
console.log(`Exported ${messages.length} unedited user/assistant messages to PROMPTS.md.`);
