# AI-CLI Skills

Shared AI-assistant skills for Episcopal High School faculty. They work with
[Claude Code](https://claude.com/claude-code) and with Google's Antigravity CLI.

These are reusable "skills" — packaged instructions that teach your AI assistant how to do
EHS-specific tasks correctly. Install one, and you can invoke it by name in any session.

## Skills in this repo

| Skill | Invoke with | What it does |
|-------|-------------|--------------|
| **EHS-Scheduler** | `/EHS-Scheduler` | Sets Canvas assignment due dates at the right time for the right block — accounts for the EHS block rotation, the two-week flex cycle, schedule-override days, no-class days, breaks, and exam periods. |
| **Membean-NRI-updater** | `/Membean-NRI-updater` | Grades weekly Membean and NoRedInk completion assignments in Canvas from the CSV reports you download — applies 1/0 completion grades, per-student progress comments, missing flags, NRI late makeups, break-training credit, and end-of-semester reconciliation. |

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

1. **Assignment groups** named **Membean** and (FLC only) **NoRedInk**, each weighted **5%**
   of the course grade.
2. **One assignment per week** in each group, named exactly **"Membean"** / **"NoRedInk"**,
   worth **1 point**, submission type **"No submission"**, due **Sunday at 10:00 PM Eastern**.

The easiest way to create a semester's worth is to ask your assistant: *"Create a 1-point
no-submission assignment named Membean in the Membean group, due every Sunday at 10 PM from
[semester start] to [semester end]"* — it will use canvas-agent to build them all.

3. **First run only:** open `skills/Membean-NRI-updater/SKILL.md` and fill in the
   **NRI Assignment Schedule** table (which NoRedInk topic is due which Sunday). Membean
   grading works without it; NRI grading needs it.

### Weekly routine

1. Download this week's reports to your **Downloads** folder: the per-class **Report CSV**
   from Membean (one per class), and — for FLC — the **gradebook export CSV** from NoRedInk.
2. Open your assistant and say something like *"Run the Membean updater"* (or
   `/Membean-NRI-updater` in Claude Code).
3. The skill finds the CSVs, matches them to your Canvas courses, checks thresholds
   (30 min for FLC, 45 min for everyone else, 60% accuracy; NRI must be fully complete),
   scans the last 4 weeks for NRI makeups, and **shows you a full summary of every grade and
   comment before touching Canvas**.
4. Confirm, and it applies grades, progress comments, and missing flags in one pass.

There are two occasional extra passes, both described in the SKILL.md: **break-training
credit** (run after a break with Membean's break report) and **end-of-semester
reconciliation** (excuses surplus Membean weeks so the total lands on the 15-week
requirement).

### Customizing for your courses

Everything course-specific is plain text in `skills/Membean-NRI-updater/SKILL.md`:
the minutes/accuracy thresholds, the 15-weeks-for-full-credit rule, the comment wording,
and the NRI topic schedule. Edit them to match your own rules — the workflow logic doesn't
care what the numbers are.

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
