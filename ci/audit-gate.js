#!/usr/bin/env node
// =====================================================================
// ci/audit-gate.js - dependency security gate for the Jenkins pipeline
//
// Reads ONE saved `npm audit --json` result and uses it for both the
// archived reports and the pass/fail decision, so the evidence and the
// gate can never come from two different scans.
//
//   node ci/audit-gate.js report <audit.json> <outDir>
//        writes <outDir>/npm-audit.txt and <outDir>/audit-summary.txt
//   node ci/audit-gate.js gate <audit.json>
//        exit 0 = pass, 1 = High/Critical found, 2 = scan missing/invalid
// =====================================================================
'use strict';
const fs = require('fs');
const path = require('path');

const BLOCKING = ['critical', 'high'];            // severities that fail the build
const ORDER = ['critical', 'high', 'moderate', 'low', 'info'];
const [mode, file, outDir = 'reports'] = process.argv.slice(2);

// Validate the scan result. Anything unexpected is treated as "no result",
// never as "zero vulnerabilities".
function load(f) {
  let data;
  try { data = JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { return { ok: false, reason: `cannot read or parse ${f} (${e.message})` }; }
  if (data.error) {
    return { ok: false, reason: `npm audit returned an error: ${data.error.code || ''} ${data.error.summary || ''}`.trim() };
  }
  const c = data.metadata && data.metadata.vulnerabilities;
  if (!c && data.message) return { ok: false, reason: `npm audit could not complete: ${data.message}` };
  const keys = ['info', 'low', 'moderate', 'high', 'critical', 'total'];
  if (!c || !keys.every(k => Number.isInteger(c[k]))) {
    return { ok: false, reason: 'scan result has no vulnerability counts' };
  }
  return { ok: true, data, c };
}

const summaryLine = c =>
  `Vulnerabilities -> critical: ${c.critical}, high: ${c.high}, moderate: ${c.moderate}, low: ${c.low}, total: ${c.total}`;

function report(r) {
  fs.mkdirSync(outDir, { recursive: true });
  if (!r.ok) {
    const msg = `SCAN INVALID: ${r.reason}`;
    fs.writeFileSync(path.join(outDir, 'audit-summary.txt'), msg + '\n');
    fs.writeFileSync(path.join(outDir, 'npm-audit.txt'), msg + '\n');
    console.log(msg);
    return;
  }
  const lines = [summaryLine(r.c), ''];
  const vulns = Object.values(r.data.vulnerabilities || {})
    .sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity) || a.name.localeCompare(b.name));
  for (const v of vulns) {
    lines.push(`${v.name} ${v.range}  [${v.severity.toUpperCase()}]${v.isDirect ? '  (direct dependency)' : ''}`);
    for (const via of v.via) {
      if (typeof via === 'string') lines.push(`    via vulnerable ${via}`);
      else lines.push(`    ${via.title} - ${via.url}`);
    }
    const fix = v.fixAvailable;
    if (fix === true) lines.push('    fix: available via npm audit fix');
    else if (fix && typeof fix === 'object') lines.push(`    fix: ${fix.name}@${fix.version}${fix.isSemVerMajor ? ' (breaking change)' : ''}`);
    else lines.push('    fix: none available');
    lines.push('');
  }
  if (!vulns.length) lines.push('No known vulnerabilities.');
  fs.writeFileSync(path.join(outDir, 'npm-audit.txt'), lines.join('\n') + '\n');
  fs.writeFileSync(path.join(outDir, 'audit-summary.txt'), summaryLine(r.c) + '\n');
  console.log(lines.join('\n'));
}

function gate(r) {
  if (!r.ok) {
    console.log(`Gate: SCAN INVALID - ${r.reason}`);
    process.exit(2);
  }
  const blocking = BLOCKING.reduce((n, s) => n + r.c[s], 0);
  console.log(`Gate input: ${summaryLine(r.c)}`);
  console.log(`Gate threshold: fail on ${BLOCKING.join(' or ')} (found ${blocking})`);
  process.exit(blocking > 0 ? 1 : 0);
}

if (!file || !['report', 'gate'].includes(mode)) {
  console.error('usage: audit-gate.js report|gate <audit.json> [outDir]');
  process.exit(2);
}
const r = load(file);
if (mode === 'report') report(r); else gate(r);
