#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [,, specPath] = process.argv;
if (!specPath) {
  console.error('Usage: create-native-dashboard-from-spec.mjs spec.json');
  process.exit(2);
}
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const baseToken = spec.baseToken;
if (!baseToken) throw new Error('spec.baseToken required');
const env = { ...process.env };
for (const k of ['OPENCLAW_CLI','OPENCLAW_SERVICE_KIND','OPENCLAW_GATEWAY_SERVICE_PID','OPENCLAW_GATEWAY_PORT','OPENCLAW_SERVICE_MARKER','OPENCLAW_SERVICE_VERSION','OPENCLAW_SHELL','OPENCLAW_SYSTEMD_UNIT']) delete env[k];
function run(args) {
  const out = execFileSync('lark-cli', args, { encoding: 'utf8', env });
  console.log(out.trim());
  return JSON.parse(out);
}
const created = run(['base','+dashboard-create','--base-token',baseToken,'--name',spec.name || 'Dashboard from spec','--as','user','--format','json']);
const dashboardId = created.data?.dashboard?.dashboard_id || created.data?.dashboard_id || created.dashboard_id;
if (!dashboardId) throw new Error('Cannot parse dashboard_id');
for (const block of spec.blocks || []) {
  run(['base','+dashboard-block-create','--base-token',baseToken,'--dashboard-id',dashboardId,'--name',block.name,'--type',block.type,'--data-config',JSON.stringify(block.dataConfig || {}),'--as','user','--format','json']);
}
console.error(`Created dashboard ${dashboardId}`);
