#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';

const BASE_TOKEN = process.env.BASE_TOKEN || 'HdqfbQnYgaNmOJsDJNdlKVmCg4c';
const TABLE_IDS = 'tbl62pWCfKLMEHjQ';
const TABLE_ACTIONS = 'tblZFnTjYHIjNJAF';
const TABLE_LOG = 'tbldtBstrl16TXgJ';
const meetingId = process.argv[2];
if (!meetingId) throw new Error('Usage: generate-meeting-minutes.mjs <Meeting ID>');

function cli(args, input) {
  const r = spawnSync('lark-cli', ['--profile','cli_a97cf3218eb8ded4', ...args, '--as','bot','--format','json'], {
    input, encoding: 'utf8', env: { ...process.env, LARKSUITE_CLI_NO_UPDATE_NOTIFIER: '1', LARKSUITE_CLI_NO_SKILLS_NOTIFIER: '1' }
  });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  const o = JSON.parse(r.stdout);
  if (!o.ok) throw new Error(JSON.stringify(o));
  return o.data;
}
function records(table, fields, filterByMeeting = true) {
  const args = ['base','+record-list','--base-token',BASE_TOKEN,'--table-id',table,'--limit','200'];
  if (filterByMeeting) args.push('--filter-json', JSON.stringify({ logic: 'and', conditions: [['Meeting ID', '==', meetingId]] }));
  for (const f of fields) args.push('--field-id', f);
  const data = cli(args);
  return data.items || data.records || [];
}
function val(fields, name) {
  const v = fields?.[name];
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(x => x?.text ?? x?.name ?? x).join(', ');
  if (typeof v === 'object') return v.text ?? v.name ?? JSON.stringify(v);
  return String(v);
}
function esc(s) { return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

const logs = records(TABLE_LOG, ['Meeting ID','Bắt đầu','Kết thúc','Tổng thời lượng','Chi tiết tab','Minutes generated','Lark Doc URL']);
const log = logs[0];
if (!log) throw new Error(`No meeting log for ${meetingId}`);
if (val(log.fields, 'Minutes generated') === 'true' || val(log.fields, 'Minutes generated') === 'Yes') {
  console.log(JSON.stringify({ ok: true, skipped: 'already_generated', url: val(log.fields, 'Lark Doc URL') }));
  process.exit(0);
}
const ids = records(TABLE_IDS, ['Meeting ID','Mã IDS','Ngày họp','Identify','Discuss','Solution','Phạm vi','Trạng thái']);
const actions = records(TABLE_ACTIONS, ['Hành động','Người phụ trách','Deadline','Nguồn','Mã nguồn'], false);
const idsByCode = new Set(ids.map(r => val(r.fields, 'Mã IDS')));
const relatedActions = actions.filter(r => idsByCode.has(val(r.fields, 'Mã nguồn')));

const title = `Biên bản họp ${meetingId}`;
const idsRows = ids.length ? ids.map(r => `<tr><td>${esc(val(r.fields,'Mã IDS'))}</td><td>${esc(val(r.fields,'Phạm vi'))}</td><td>${esc(val(r.fields,'Identify'))}</td><td>${esc(val(r.fields,'Discuss') || 'Chưa xác định')}</td><td>${esc(val(r.fields,'Solution') || 'Chưa xác định')}</td><td>${esc(val(r.fields,'Trạng thái'))}</td></tr>`).join('') : '<tr><td colspan="6">Chưa có IDS trong cuộc họp.</td></tr>';
const actionRows = relatedActions.length ? relatedActions.map(r => `<tr><td>${esc(val(r.fields,'Hành động'))}</td><td>${esc(val(r.fields,'Người phụ trách') || 'Chưa xác định')}</td><td>${esc(val(r.fields,'Deadline') || 'Chưa xác định')}</td><td>${esc(val(r.fields,'Mã nguồn'))}</td></tr>`).join('') : '<tr><td colspan="4">Chưa có action item.</td></tr>';
const xml = `<title>${esc(title)}</title><p><b>Meeting ID:</b> ${esc(meetingId)}</p><p><b>Thời lượng:</b> ${esc(val(log.fields,'Tổng thời lượng'))} giây</p><p><b>Chi tiết tab:</b> ${esc(val(log.fields,'Chi tiết tab') || 'Chưa xác định')}</p><h1>IDS</h1><table><thead><tr><th>Mã IDS</th><th>Phạm vi</th><th>Identify</th><th>Discuss</th><th>Solution</th><th>Trạng thái</th></tr></thead><tbody>${idsRows}</tbody></table><h1>Action items</h1><table><thead><tr><th>Hành động</th><th>Người phụ trách</th><th>Deadline</th><th>Mã nguồn</th></tr></thead><tbody>${actionRows}</tbody></table><p><b>Ghi chú:</b> Biên bản tạo từ dữ liệu IDS. Trường thiếu được ghi là “Chưa xác định”, không tự suy diễn quyết định.</p>`;
const file = `.minutes-${meetingId}.xml`;
writeFileSync(file, xml);
const doc = cli(['docs','+create','--content',`@${file}`]).document;
unlinkSync(file);
const url = doc.url;
const logId = log.record_id || log.recordId || log.id;
cli(['base','+record-batch-update','--base-token',BASE_TOKEN,'--table-id',TABLE_LOG,'--json', JSON.stringify({ update_records: { [logId]: { 'Lark Doc URL': url, 'Minutes generated': true } } })]);
const updates = Object.fromEntries(ids.map(r => [r.record_id || r.recordId || r.id, { 'Lark Doc URL': url, 'Minutes generated': true }]));
if (Object.keys(updates).length) cli(['base','+record-batch-update','--base-token',BASE_TOKEN,'--table-id',TABLE_IDS,'--json', JSON.stringify({ update_records: updates })]);
console.log(JSON.stringify({ ok: true, url, ids: ids.length, actions: relatedActions.length }, null, 2));
