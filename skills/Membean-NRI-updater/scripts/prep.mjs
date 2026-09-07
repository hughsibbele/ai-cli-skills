#!/usr/bin/env node
/**
 * prep.mjs — de-identify Membean / NoRedInk CSV exports for the Membean-NRI-updater skill.
 *
 * Matches student names in the CSVs against the canvas-agent vault (which already holds
 * every roster member's Canvas user_id, anonymized token, and "Last, First" sortable name),
 * then writes a JSON file that contains ONLY tokens, user_ids, and the per-student metrics.
 * Real names never appear in stdout, stderr, or the output file, so the AI assistant can
 * read the output without student names entering the conversation.
 *
 * Usage:
 *   node prep.mjs --course 8449 --membean ~/Downloads/Report.csv [--membean second.csv]
 *                 [--nri ~/Downloads/noredink-gradebook.csv] [--out prep-8449.json]
 *                 [--aliases aliases.csv] [--host episcopalhighschool.instructure.com]
 *                 [--vault-dir ~/.canvas-agent/vault]
 *
 * --aliases: optional two-column CSV, kept locally (never share it): first column is the name
 *   exactly as the Membean/NRI export shows it ("Last, First"), second is the Canvas
 *   sortable name ("Last, First"). Use it for nicknames the prefix fallback can't resolve
 *   (e.g. "Kate" for "Katherine"). Row numbers reported as unmatched tell you what to add.
 *
 * Requires Node 18+. No dependencies.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// ---------- args ----------
const args = process.argv.slice(2);
const opts = { membean: [], nri: null, course: null, out: null, host: null, vaultDir: null, aliases: null };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  const next = () => args[++i];
  if (a === "--course") opts.course = next();
  else if (a === "--membean") opts.membean.push(next());
  else if (a === "--nri") opts.nri = next();
  else if (a === "--out") opts.out = next();
  else if (a === "--host") opts.host = next();
  else if (a === "--vault-dir") opts.vaultDir = next();
  else if (a === "--aliases") opts.aliases = next();
  else if (a === "--help" || a === "-h") { usage(); process.exit(0); }
  else { console.error(`Unknown argument: ${a}`); usage(); process.exit(2); }
}
function usage() {
  console.error("Usage: node prep.mjs --course <canvas course id> [--membean <csv>]... [--nri <csv>] [--out <json>] [--aliases <csv>] [--host <canvas host>] [--vault-dir <dir>]");
}
if (!opts.course) { console.error("--course is required"); usage(); process.exit(2); }
if (opts.membean.length === 0 && !opts.nri) { console.error("Provide at least one --membean or --nri CSV"); process.exit(2); }

// ---------- vault ----------
const vaultRoot = expand(opts.vaultDir ?? path.join(os.homedir(), ".canvas-agent", "vault"));
let host = opts.host;
if (!host) {
  const hosts = fs.existsSync(vaultRoot)
    ? fs.readdirSync(vaultRoot).filter((d) => d !== "unknown" && fs.statSync(path.join(vaultRoot, d)).isDirectory())
    : [];
  if (hosts.length !== 1) {
    console.error(`Could not pick a Canvas host automatically (found ${hosts.length} under ${vaultRoot}). Pass --host.`);
    process.exit(2);
  }
  host = hosts[0];
}
const vaultPath = path.join(vaultRoot, host, `${opts.course}.json`);
if (!fs.existsSync(vaultPath)) {
  console.error(`No vault for course ${opts.course} at ${vaultPath}.`);
  console.error("Ask the assistant to run list_students on the course first (that populates the vault), then rerun.");
  process.exit(2);
}
const vault = JSON.parse(fs.readFileSync(vaultPath, "utf8"));

// roster entries: { user_id, token, keys: Set<normalized "last|first"> }
const roster = [];
for (const [userId, rec] of Object.entries(vault)) {
  if (!rec || !rec.token) continue;
  if (rec.role === "teacher") continue;
  const keys = new Set();
  const sortable = rec.sortable_name || "";
  if (sortable.includes(",")) {
    const [last, first] = sortable.split(",", 2);
    keys.add(nameKey(last, first));
  }
  const full = rec.name || "";
  if (full.trim()) {
    const parts = full.trim().split(/\s+/);
    if (parts.length >= 2) keys.add(nameKey(parts[parts.length - 1], parts.slice(0, -1).join(" ")));
  }
  roster.push({ user_id: userId, token: rec.token, keys, isTest: /test student/i.test(full) });
}
const rosterStudents = roster.filter((r) => !r.isTest);

// ---------- helpers ----------
function expand(p) { return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p; }

function norm(s) {
  return String(s ?? "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")   // strip accents
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")                          // keep letters, apostrophes, hyphens
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, " ")               // drop suffixes
    .replace(/\s+/g, " ").trim();
}
function firstToken(first) { return norm(first).split(" ")[0] || ""; }
function nameKey(last, first) { return `${norm(last)}|${firstToken(first)}`; }

// aliases: normalized "last|first" as exported -> normalized "last|first" in Canvas
const aliases = new Map();
if (opts.aliases) {
  const rows = parseCsv(fs.readFileSync(expand(opts.aliases), "utf8"));
  for (const r of rows) {
    if (r.length < 2) continue;
    const [aL, aF] = splitName(r[0]); const [cL, cF] = splitName(r[1]);
    if (!aL || !cL) continue;
    aliases.set(nameKey(aL, aF), nameKey(cL, cF));
  }
}
function splitName(raw) {
  raw = String(raw ?? "").trim();
  if (!raw) return ["", ""];
  if (raw.includes(",")) { const [l, f] = raw.split(",", 2); return [l, f ?? ""]; }
  const p = raw.split(/\s+/); return [p[p.length - 1], p.slice(0, -1).join(" ")];
}

/** Find the roster entry for a (last, first) pair. Returns {entry, how} or null. */
function match(last, first) {
  let key = nameKey(last, first);
  if (aliases.has(key)) {
    const target = aliases.get(key);
    const hit = rosterStudents.filter((r) => r.keys.has(target));
    if (hit.length === 1) return { entry: hit[0], how: "alias" };
  }
  const exact = rosterStudents.filter((r) => r.keys.has(key));
  if (exact.length === 1) return { entry: exact[0], how: "exact" };
  if (exact.length > 1) return { entry: null, how: "ambiguous" };
  // Fallback: same last name, first names share a prefix (nicknames: "Kate" vs "Katherine")
  const nl = norm(last), nf = firstToken(first);
  const loose = rosterStudents.filter((r) =>
    [...r.keys].some((k) => {
      const [kl, kf] = k.split("|");
      return kl === nl && nf && kf && (kf.startsWith(nf) || nf.startsWith(kf));
    }));
  if (loose.length === 1) return { entry: loose[0], how: "loose" };
  if (loose.length > 1) return { entry: null, how: "ambiguous" };
  return null;
}

/** Minimal RFC-4180 CSV parser (handles quoted fields, embedded commas/newlines, CRLF, BOM). */
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = []; let row = []; let field = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}
function findCol(header, ...needles) {
  const h = header.map((x) => norm(x));
  for (const n of needles) {
    const idx = h.findIndex((x) => x.includes(norm(n)));
    if (idx >= 0) return idx;
  }
  return -1;
}
function toInt(s) { const m = String(s ?? "").replace(/,/g, "").match(/-?\d+(\.\d+)?/); return m ? Math.round(Number(m[0])) : null; }

// ---------- Membean ----------
const membean = { source_files: [], students: [], unmatched: [], ambiguous: [] };
const seenMembean = new Map();
for (const file of opts.membean) {
  const abs = expand(file);
  const rows = parseCsv(fs.readFileSync(abs, "utf8"));
  const hIdx = rows.findIndex((r) => findCol(r, "name") >= 0 && findCol(r, "minutes") >= 0);
  if (hIdx < 0) { console.error(`Membean CSV ${path.basename(abs)}: could not find a header row with Name and Minutes columns`); process.exit(1); }
  const header = rows[hIdx];
  const cName = findCol(header, "name");
  const cMin = findCol(header, "minutes trained", "minutes");
  const cAcc = findCol(header, "accuracy");
  const cDub = findCol(header, "dubious");
  membean.source_files.push(path.basename(abs));
  for (let i = hIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const raw = (r[cName] ?? "").trim();
    if (!raw || /class average/i.test(raw)) continue;
    const [last, first] = splitName(raw);
    const m = match(last, first);
    const rowNo = i + 1; // 1-based line number in the CSV as a spreadsheet would show it
    if (!m) { membean.unmatched.push({ file: path.basename(abs), row: rowNo }); continue; }
    if (!m.entry) { membean.ambiguous.push({ file: path.basename(abs), row: rowNo }); continue; }
    const rec = {
      user_id: m.entry.user_id,
      token: m.entry.token,
      minutes: toInt(r[cMin]) ?? 0,
      accuracy: cAcc >= 0 ? (toInt(r[cAcc]) ?? 0) : null,
      dubious_minutes: cDub >= 0 ? (toInt(r[cDub]) ?? 0) : 0,
      match: m.how,
      file: path.basename(abs),
    };
    if (seenMembean.has(rec.token)) { membean.ambiguous.push({ file: path.basename(abs), row: rowNo, note: "duplicate of an earlier row" }); continue; }
    seenMembean.set(rec.token, rec);
    membean.students.push(rec);
  }
}

// ---------- NoRedInk ----------
const nri = { source_file: null, topics: [], students: [], unmatched: [], ambiguous: [] };
if (opts.nri) {
  const abs = expand(opts.nri);
  const rows = parseCsv(fs.readFileSync(abs, "utf8"));
  const header = rows[0];
  const cFull = findCol(header, "full name");
  const cFirst = findCol(header, "first name");
  const cLast = findCol(header, "last name");
  const cAvg = findCol(header, "average");
  if (cFirst < 0 || cLast < 0) { console.error("NRI CSV: expected 'First Name' and 'Last Name' columns"); process.exit(1); }
  const skip = new Set([cFull, cFirst, cLast, cAvg].filter((x) => x >= 0));
  const maxRow = rows[1] ?? [];
  const topicCols = [];
  header.forEach((h, idx) => {
    if (skip.has(idx) || !h.trim()) return;
    const max = toInt(maxRow[idx]);
    topicCols.push({ idx, name: h.trim(), max });
    nri.topics.push({ name: h.trim(), max_points: max });
  });
  nri.source_file = path.basename(abs);
  const seen = new Set();
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const first = (r[cFirst] ?? "").trim(), last = (r[cLast] ?? "").trim();
    const full = (r[cFull] ?? `${first} ${last}`).trim();
    if (!full || /class average/i.test(full)) continue;
    const m = match(last, first);
    const rowNo = i + 1;
    if (!m) { nri.unmatched.push({ row: rowNo }); continue; }
    if (!m.entry) { nri.ambiguous.push({ row: rowNo }); continue; }
    if (seen.has(m.entry.token)) { nri.ambiguous.push({ row: rowNo, note: "duplicate of an earlier row" }); continue; }
    seen.add(m.entry.token);
    const scores = {};
    for (const t of topicCols) {
      const v = (r[t.idx] ?? "").trim();
      scores[t.name] = v === "" || /^n\/a$/i.test(v) ? null : toInt(v);
    }
    nri.students.push({ user_id: m.entry.user_id, token: m.entry.token, match: m.how, scores });
  }
}

// ---------- roster coverage ----------
const covered = new Set([...membean.students, ...nri.students].map((s) => s.token));
const roster_not_in_csvs = rosterStudents.filter((r) => !covered.has(r.token)).map((r) => ({ user_id: r.user_id, token: r.token }));
// Canvas's built-in Test Student (Student View) is in every course and never in a CSV. The
// assistant can't recognize it by name (it sees a token), so surface it here: the skill grades
// it as a missed week every run so the teacher can use it to demo the "missed it" view.
const test_students = roster.filter((r) => r.isTest).map((r) => ({ user_id: r.user_id, token: r.token }));

// ---------- output ----------
const out = {
  course_id: String(opts.course),
  canvas_host: host,
  generated_at: new Date().toISOString(),
  roster_size: rosterStudents.length,
  membean: opts.membean.length ? membean : null,
  nri: opts.nri ? nri : null,
  roster_not_in_csvs,
  test_students,
};
const outPath = expand(opts.out ?? `prep-${opts.course}.json`);
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

const lines = [`Wrote ${outPath}`, `Roster (vault, non-teacher): ${rosterStudents.length}`];
if (opts.membean.length) lines.push(`Membean: ${membean.students.length} matched, ${membean.unmatched.length} unmatched, ${membean.ambiguous.length} ambiguous` +
  (membean.unmatched.length ? ` — unmatched rows: ${membean.unmatched.map((u) => `${u.file}:${u.row}`).join(", ")}` : "") +
  (membean.ambiguous.length ? ` — ambiguous rows: ${membean.ambiguous.map((u) => `${u.file}:${u.row}`).join(", ")}` : ""));
if (opts.nri) lines.push(`NoRedInk: ${nri.students.length} matched, ${nri.unmatched.length} unmatched, ${nri.ambiguous.length} ambiguous; ${nri.topics.length} topics` +
  (nri.unmatched.length ? ` — unmatched rows: ${nri.unmatched.map((u) => u.row).join(", ")}` : "") +
  (nri.ambiguous.length ? ` — ambiguous rows: ${nri.ambiguous.map((u) => u.row).join(", ")}` : ""));
lines.push(`Roster members in no CSV: ${roster_not_in_csvs.length}; test students: ${test_students.length}`);
console.log(lines.join("\n"));
