#!/usr/bin/env node
/**
 * weekly.mjs — one unchanging command for the weekly Membean/NRI prep.
 *
 * Reads ~/.membean-nri/config.json (see --init), finds the newest Membean and NoRedInk CSV
 * exports in your Downloads folder by filename pattern, runs prep.mjs for every course, writes
 * the token-only prep files plus a latest.json manifest, and prints the line to give your
 * assistant. Nothing here prints a student name.
 *
 * Usage:
 *   node weekly.mjs            # do the weekly prep
 *   node weekly.mjs --init     # write an example config to edit
 *   node weekly.mjs --dry-run  # show which files would be used, run nothing
 *   node weekly.mjs --date 2026-09-07   # use the exports from that date instead of the newest
 *   node weekly.mjs --config <path>
 *
 * File choice: for each pattern, every CSV in Downloads whose name starts with the pattern
 * (followed by a separator or digit) is a candidate. The newest by the YYYY-MM-DD in the
 * filename wins; ties (browser duplicates like "…07 (1).csv") go to the most recently
 * modified file. Older exports can stay in Downloads — they are listed but ignored.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PREP = path.join(HERE, "prep.mjs");
const DEFAULT_CONFIG = path.join(os.homedir(), ".membean-nri", "config.json");

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const configPath = expand(args.includes("--config") ? args[args.indexOf("--config") + 1] : DEFAULT_CONFIG);
const forceDate = args.includes("--date") ? args[args.indexOf("--date") + 1] : null;
if (forceDate && !/^\d{4}-\d{2}-\d{2}$/.test(forceDate)) { console.error("--date must be YYYY-MM-DD"); process.exit(2); }

if (flag("--help") || flag("-h")) {
  console.log("Usage: node weekly.mjs [--init] [--dry-run] [--date YYYY-MM-DD] [--config <path>]");
  process.exit(0);
}

if (flag("--init")) {
  if (fs.existsSync(configPath)) { console.error(`${configPath} already exists; edit it instead.`); process.exit(1); }
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({
    downloads: "~/Downloads",
    output: "~/Downloads/membean-prep",
    nri_pattern: "noredink-gradebook",
    max_age_days: 8,
    courses: [
      { course_id: "12345", name: "FLC", membean_pattern: "Flc-Report", nri: true },
      { course_id: "12346", name: "Gothic", membean_pattern: "AmericanGothic-Report", nri: false },
    ],
  }, null, 2) + "\n");
  console.log(`Wrote example config to ${configPath}. Edit the course ids and filename patterns, then run again without --init.`);
  process.exit(0);
}

if (!fs.existsSync(configPath)) {
  console.error(`No config at ${configPath}. Run: node ${path.relative(process.cwd(), fileURLToPath(import.meta.url))} --init`);
  process.exit(2);
}
const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
const downloads = expand(cfg.downloads ?? "~/Downloads");
const outDir = expand(cfg.output ?? "~/Downloads/membean-prep");
const maxAgeDays = cfg.max_age_days ?? 8;
const nriPattern = cfg.nri_pattern ?? "noredink-gradebook";
if (!Array.isArray(cfg.courses) || cfg.courses.length === 0) { console.error("config.courses is empty"); process.exit(2); }

function expand(p) { return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p; }

/**
 * Pick the CSV in `dir` for `pattern`. Returns { chosen, candidates } — `chosen` is null when
 * nothing matches (or nothing matches --date). Match = name starts with the pattern
 * (case-insensitive) and the next character is a separator, digit, or end of the stem, so
 * "Flc-Report" matches "Flc-Report-2026-09-07 (1).csv" but not "Flc-Reportage-….csv".
 */
function pickCsv(dir, pattern) {
  const pat = pattern.toLowerCase();
  const candidates = fs.readdirSync(dir)
    .filter((f) => {
      const lower = f.toLowerCase();
      if (!lower.endsWith(".csv") || !lower.startsWith(pat)) return false;
      const next = lower.slice(pat.length, pat.length + 1);
      return next === "" || next === "." || /[-_ ()\d]/.test(next);
    })
    .map((f) => {
      const full = path.join(dir, f);
      const m = f.match(/(\d{4}-\d{2}-\d{2})/);
      return { file: full, name: f, date: m ? m[1] : null, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.mtime - a.mtime);
  const pool = forceDate ? candidates.filter((c) => c.date === forceDate) : candidates;
  return { chosen: pool[0] ?? null, candidates };
}
function ageDays(hit) {
  const t = hit.date ? Date.parse(hit.date + "T12:00:00") : hit.mtime;
  return (Date.now() - t) / 86400000;
}

// ---------- locate files ----------
const notes = [];
function choose(label, pattern) {
  const { chosen, candidates } = pickCsv(downloads, pattern);
  if (!chosen) {
    problems.push(forceDate && candidates.length
      ? `${label}: ${candidates.length} file(s) start with "${pattern}" but none is dated ${forceDate}`
      : `${label}: no CSV starting with "${pattern}" in ${downloads}`);
    return null;
  }
  const others = candidates.filter((c) => c !== chosen);
  if (others.length) notes.push(`${chosen.name}: chosen over ${others.length} older/duplicate file(s) — ${others.slice(0, 4).map((o) => o.name).join(", ")}${others.length > 4 ? ", …" : ""}`);
  const sameDate = others.filter((o) => o.date && o.date === chosen.date);
  if (sameDate.length) notes.push(`${chosen.name}: ${sameDate.length} other file(s) carry the same date (re-downloads?) — the most recently modified one was used`);
  return chosen;
}
const problems = [];
const nriHit = cfg.courses.some((c) => c.nri) ? choose("NoRedInk", nriPattern) : null;
const plan = [];
for (const c of cfg.courses) {
  const label = c.name ?? c.course_id;
  const mb = c.membean_pattern ? choose(`${label} Membean`, c.membean_pattern) : null;
  if (c.nri && !nriHit && !problems.some((p) => p.startsWith("NoRedInk:"))) problems.push(`${label}: NRI export missing`);
  plan.push({ course: c, membean: mb, nri: c.nri ? nriHit : null });
}
if (problems.length) { console.error("Missing files:\n  " + problems.join("\n  ")); process.exit(1); }

const used = plan.flatMap((p) => [p.membean, p.nri].filter(Boolean));
const dates = [...new Set(used.map((h) => h.date).filter(Boolean))];
const warnings = [];
if (dates.length > 1) warnings.push(`CSV dates differ (${dates.join(", ")}) — make sure every export is from the same week.`);
for (const h of used) if (ageDays(h) > maxAgeDays) warnings.push(`${h.name} is ${Math.round(ageDays(h))} days old — download a fresh export?`);

console.log("Using:");
for (const p of plan) {
  const label = p.course.name ?? p.course.course_id;
  if (p.membean) console.log(`  ${label} (course ${p.course.course_id})  Membean: ${p.membean.name}`);
  if (p.nri) console.log(`  ${label} (course ${p.course.course_id})  NoRedInk: ${p.nri.name}`);
}
if (notes.length) console.log("Notes:\n  " + notes.join("\n  "));
if (warnings.length) console.log("Warnings:\n  " + warnings.join("\n  "));
if (flag("--dry-run")) process.exit(0);

// ---------- run prep per course ----------
fs.mkdirSync(outDir, { recursive: true });
const stamp = dates[0] ?? new Date().toISOString().slice(0, 10);
const manifest = { generated_at: new Date().toISOString(), csv_date: dates[0] ?? null, courses: [] };
let failed = false;
for (const p of plan) {
  const outFile = path.join(outDir, `prep-${p.course.course_id}-${stamp}.json`);
  const a = ["--course", String(p.course.course_id), "--out", outFile];
  if (p.membean) a.push("--membean", p.membean.file);
  if (p.nri) a.push("--nri", p.nri.file);
  const aliases = p.course.aliases ?? cfg.aliases;
  if (aliases) a.push("--aliases", expand(aliases));
  if (cfg.host) a.push("--host", cfg.host);
  if (cfg.vault_dir) a.push("--vault-dir", expand(cfg.vault_dir));
  console.log(`\n== ${p.course.name ?? p.course.course_id} (course ${p.course.course_id}) ==`);
  try {
    const out = execFileSync(process.execPath, [PREP, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    process.stdout.write(out.split("\n").filter((l) => !l.startsWith("Wrote ")).join("\n") + "\n");
    manifest.courses.push({ course_id: String(p.course.course_id), name: p.course.name ?? null, prep_file: outFile,
      membean_csv: p.membean?.name ?? null, nri_csv: p.nri?.name ?? null });
  } catch (e) {
    failed = true;
    process.stdout.write((e.stdout ?? "") + (e.stderr ?? "") + "\n");
  }
}
if (failed) { console.error("\nOne or more courses failed; fix the problem above and rerun."); process.exit(1); }

const manifestPath = path.join(outDir, "latest.json");
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`\nPrep files written to ${outDir} (manifest: ${manifestPath}).`);
console.log("\nNow tell your assistant:\n");
console.log("  /Membean-NRI-updater Grade this week from the latest prep files\n");
