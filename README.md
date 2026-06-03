# EHS Claude Skills

Shared [Claude Code](https://claude.com/claude-code) skills for Episcopal High School faculty.

These are reusable "skills" — packaged instructions that teach Claude Code how to do
EHS-specific tasks correctly. Install one, and you can invoke it by name in any Claude
Code session.

## Skills in this repo

| Skill | Invoke with | What it does |
|-------|-------------|--------------|
| **EHS-Scheduler** | `/EHS-Scheduler` | Sets Canvas assignment due dates at the right time for the right block — accounts for the EHS block rotation, the two-week flex cycle, schedule-override days, no-class days, breaks, and exam periods. |

> **Prerequisite:** EHS-Scheduler is designed to be used alongside the **canvas-agent MCP**
> (it calls Canvas tools like `update_assignment_dates`, `create_assignment_override`, and
> `batch_update_dates`). It still gives correct dates/times without it, but the "set it in
> Canvas for me" steps need canvas-agent connected.

## Install (per machine)

Claude Code automatically discovers personal skills in `~/.claude/skills/`. The pattern
below clones this repo once, then **symlinks** each skill into that folder — so editing a
skill here (or running `git pull`) updates the live skill immediately, with no copying.

```bash
git clone https://github.com/hughsibbele/ehs-claude-skills.git ~/code/ehs-claude-skills
```

```bash
mkdir -p ~/.claude/skills
```

```bash
ln -s ~/code/ehs-claude-skills/skills/EHS-Scheduler ~/.claude/skills/EHS-Scheduler
```

Start a new Claude Code session and type `/EHS-Scheduler` to confirm it's available.

## Getting updates

```bash
cd ~/code/ehs-claude-skills && git pull
```

Because the skills are symlinked, a pull propagates updates instantly — no reinstall.

## Keeping the calendar current

EHS-Scheduler has two kinds of knowledge:

1. **Permanent block-schedule rules** (the weekly rotation, flex cycle, override logic) —
   these don't change year to year.
2. **Per-semester calendar data** (semester start/end, no-class days, MRC days, schedule
   overrides, break dates, exam order, Canvas grading-period IDs) — under the
   `Semester Calendar Data` section (e.g. `## 2025–26 Semester Calendar Data`) in
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
