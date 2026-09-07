# AI-CLI Skills

Shared AI-assistant skills for Episcopal High School faculty. They work with
[Claude Code](https://claude.com/claude-code) and with Google's Antigravity CLI.

These are reusable "skills" — packaged instructions that teach your AI assistant how to do
EHS-specific tasks correctly. Install one, and you can invoke it by name in any session.

## Skills in this repo

| Skill | Invoke with | What it does |
|-------|-------------|--------------|
| **EHS-Scheduler** | `/EHS-Scheduler` | Sets Canvas assignment due dates at the right time for the right block — accounts for the EHS block rotation, the two-week flex cycle, schedule-override days, no-class days, breaks, and exam periods. |
| **Membean-NRI-updater** | `/Membean-NRI-updater` | Grades weekly Membean and NoRedInk completion assignments in Canvas from the CSV reports you download — applies 1/0 completion grades, per-student progress comments, missing flags, NRI late makeups, break-training credit, and end-of-semester reconciliation. Ships with a local prep script that keeps student names out of the AI conversation. |

> **Prerequisite:** both skills are designed to be used alongside the **canvas-agent MCP**
> ([setup guide](https://hughsibbele.github.io/Canvas-Agent/)) — they call Canvas tools like
> `update_assignment_dates`, `batch_update_dates`, `list_submissions`, and `grade_submission`.
> EHS-Scheduler still gives correct dates/times without it, but the "set it in Canvas for me"
> steps need canvas-agent connected. Membean-NRI-updater requires it.

## Install (per machine)

Clone this repo once, then **symlink** each skill into your assistant's skills folder — so
editing a skill here (or running `git pull`) updates the live skill immediately, with no copying.
Every command below is safe to re-run; if the clone says `fatal: destination path already
exists`, the repo is already downloaded — continue to the linking step.

```bash
git clone https://github.com/hughsibbele/ai-cli-skills.git ~/code/ai-cli-skills
```

**Claude Code** discovers personal skills in `~/.claude/skills/`:

```bash
mkdir -p ~/.claude/skills
ln -sfn ~/code/ai-cli-skills/skills/EHS-Scheduler ~/.claude/skills/EHS-Scheduler
ln -sfn ~/code/ai-cli-skills/skills/Membean-NRI-updater ~/.claude/skills/Membean-NRI-updater
```

**Antigravity CLI** discovers global skills in `~/.gemini/config/skills/`:

```bash
mkdir -p ~/.gemini/config/skills
ln -sfn ~/code/ai-cli-skills/skills/EHS-Scheduler ~/.gemini/config/skills/EHS-Scheduler
ln -sfn ~/code/ai-cli-skills/skills/Membean-NRI-updater ~/.gemini/config/skills/Membean-NRI-updater
```

(Use `-sfn`, not plain `-s`: re-running a plain `ln -s` against an existing link silently
creates a junk link *inside* the skill folder instead of failing. On **Windows**, symlinks
and `mkdir -p` don't work in PowerShell — copy the skill folders into the equivalent
locations instead (`$HOME\.claude\skills\`, `$HOME\.gemini\config\skills\`), and re-copy
after each `git pull`.)

Start a new session and type `/EHS-Scheduler` (Claude Code) or just mention the task
(Antigravity picks the skill by description) to confirm it's available.

## Getting updates

```bash
cd ~/code/ai-cli-skills && git pull
```

Because the skills are symlinked, a pull propagates updates instantly — no reinstall.

## Membean-NRI-updater: Canvas setup and weekly routine

### One-time Canvas setup

The skill grades existing Canvas assignments — it doesn't invent them. Your course needs:

1. **Assignment groups** named **Membean** and (FLC only) **NRI** or **NoRedInk**, each weighted
   **5%** of the course grade.
2. **One assignment per week** in each group, worth **1 point**, submission type
   **"No submission"**, due **Sunday at 10:00 PM Eastern**. The name must *contain*
   "Membean" or "NoRedInk". Recommended names: **`Membean Week N`** and
   **`NoRedInk: <topic>`**, where the topic is the assignment name exactly as NoRedInk shows
   it — the skill reads the week's NRI topic from the Canvas name, so there is no schedule
   table to maintain.

The easiest way to create a semester's worth is to ask your assistant: *"Create a 1-point
no-submission assignment named Membean Week N in the Membean group, due every Sunday at 10 PM
from [semester start] to [semester end], skipping break and exam weeks"* — it will use
canvas-agent to build them all.

3. **Node 18+** on your machine (`node --version`). The prep script below has no other
   dependencies.

### Why there is a prep script

canvas-agent hides student names from the AI (it sees `Student_xxxxxx` tokens), but the
Membean and NoRedInk exports contain real names. `skills/Membean-NRI-updater/scripts/prep.mjs`
runs on your machine, matches the CSV names against canvas-agent's local vault, and writes a
JSON file holding only tokens, Canvas user ids, and the numbers. The assistant reads that file,
never the CSVs, so names stay off the wire. Rows it can't match are reported by row number.

### Weekly routine

1. Download this week's reports to **Downloads**: the **Report CSV** from Membean (one per
   Membean class) and — for FLC — the **gradebook export CSV** from NoRedInk.
2. Run the prep script once per Canvas course. For an FLC course:

```bash
node ~/code/ai-cli-skills/skills/Membean-NRI-updater/scripts/prep.mjs --course 8449 --membean ~/Downloads/Report.csv --nri ~/Downloads/noredink-gradebook.csv --out ~/Downloads/prep-8449.json
```

   For a Membean-only course, leave off `--nri`. If it reports "no vault for course", open
   your assistant and ask it to `list_students` for that course, then rerun.

3. Open your assistant and say *"Run the Membean updater on ~/Downloads/prep-8449.json"* (or
   `/Membean-NRI-updater` in Claude Code).
4. The skill finds the week's assignments by due date, checks thresholds (30 min for FLC,
   45 min for everyone else, 60% accuracy; NRI must be fully complete), scans the last 4
   weeks for NRI makeups, and **shows you a full summary of every grade and comment before
   touching Canvas**.
5. Confirm, and it applies grades, progress comments, and missing flags in one pass.

**Test Student:** Canvas's Student View account is graded as a missed week every run (0, missing
flag, the usual "you didn't do it" comment), so you can open Student View any time to show a
class exactly what a missed week looks like.

**Nicknames:** if the same student is unmatched every week (Membean says "Kate", Canvas says
"Katherine"), make a two-column CSV on your machine — export name, Canvas name, both as
`Last, First` — and add `--aliases ~/path/aliases.csv` to the prep command. Keep that file
private; it contains names.

There are two occasional extra passes, both described in the SKILL.md: **break-training
credit** (run after a break with Membean's break report, through the same prep script) and
**end-of-semester reconciliation** (excuses surplus Membean weeks so the total lands on the
15-week requirement). Both must happen **before the grading period closes** — at EHS, the
1st-semester period closes the night of Feb 1, so January is when winter-break credit and
the last fall NRI makeups get applied.

### Customizing for your courses

Everything course-specific is plain text in `skills/Membean-NRI-updater/SKILL.md`:
the minutes/accuracy thresholds, the 15-weeks-for-full-credit rule, and the comment wording.
Edit them to match your own rules — the workflow logic doesn't care what the numbers are.

## Keeping the calendar current

EHS-Scheduler has two kinds of knowledge:

1. **Permanent block-schedule rules** (the weekly rotation, flex cycle, override logic) —
   these don't change year to year.
2. **Per-semester calendar data** (semester start/end, no-class days, MRC days, schedule
   overrides, break dates, exam order, Canvas grading-period IDs) — under the
   `Semester Calendar Data` section (e.g. `## 2026–27 Semester Calendar Data`) in
   `skills/EHS-Scheduler/SKILL.md`.

At the start of each semester, update section #2 from the school's iCal feeds and the
Major Dates PDF, then commit and push so every colleague gets the new dates on their next
`git pull`.

## Adding a skill

1. Create `skills/<Skill-Name>/SKILL.md` with YAML frontmatter:
   ```yaml
   ---
   name: Skill-Name
   description: One-line description of when Claude should use this skill.
   user-invocable: true
   ---
   ```
2. Add it to the table above, commit, and push.
3. Each colleague symlinks it with the `ln -s` command pattern shown in Install.

## Notes

- These skills encode EHS operational details (bell schedule, calendar, internal Canvas
  grading-period IDs). They contain **no student data**. Free for EHS faculty to use and adapt.
