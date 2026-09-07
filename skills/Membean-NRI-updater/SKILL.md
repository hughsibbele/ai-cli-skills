---
name: Membean-NRI-updater
description: Use when grading weekly Membean or NoRedInk (NRI) completion assignments in Canvas from downloaded CSV reports, applying NRI late makeups, crediting Membean break training, or reconciling Membean/NRI totals at the end of a semester.
user-invocable: true
---

# Weekly Tracker

You are helping an Episcopal High School English teacher grade weekly Membean and NoRedInk (NRI) completion assignments in Canvas. The teacher downloads CSV reports from each platform, runs a local prep script that swaps student names for Canvas tokens, and you turn the prep file into Canvas grades and comments.

## Background

### Platforms

- **Membean**: Vocabulary training. Students must meet a weekly minutes goal with adequate accuracy.
- **NoRedInk (NRI)**: Grammar practice. Students must fully complete the weekly assigned topic. Only used in FLC courses.

### Completion Criteria

**Membean — must meet BOTH:**

| Course Type | Minutes Required | Accuracy Required |
|-------------|-----------------|-------------------|
| FLC (freshmen) | ≥ 30 minutes | ≥ 60% |
| All other courses | ≥ 45 minutes | ≥ 60% |

**NoRedInk:**
- Score must equal the assignment's maximum points (typically 20/20)

### Canvas Assignments

- One assignment per week. The name **contains** "Membean" or "NoRedInk"; exact naming varies by course:
  - FLC: `Membean Week N` and `NoRedInk: <topic>` (the topic after the colon is the NRI assignment name exactly as it appears in the NRI gradebook export)
  - Other courses: every weekly assignment may simply be named `Membean` — locate the right one by **due date**, never by name alone
- Due **Sunday at 10:00 PM Eastern** (`02:00Z` in EDT, `03:00Z` in EST)
- Graded as **completion: 1 point max**; assignment groups are **Membean** (5%) and **NRI** or **NoRedInk** (5%)
- Complete → **1/1**, with a progress comment (see Step 6)
- Incomplete → **0/1 + `missing` flag**, with a comment giving the shortfall and running progress
- Submission type is **"No submission"** — the missing flag is set manually via the API (see Semester Credit Model)

### Course Context

- **FLC** (Fundamentals in Literature & Composition): Membean + NRI
- **All other courses** (e.g., Advanced English Seminar, Gothic Literature): Membean only
- A teacher with several sections of the same course runs **one Membean class and one NRI class** for all of them, so there is normally **one CSV per Canvas course**. If Membean was split into several classes, pass every CSV to the prep script in one run.

---

## Privacy: tokens, not names

The canvas-agent MCP anonymizes every student as `Student_xxxxxx`. **Real student names must never enter the conversation.** Do not run `canvas-agent reveal`, do not read CSVs that contain names, and do not suggest disabling anonymization.

The CSVs from Membean and NRI contain names. The bridge is `scripts/prep.mjs` in this skill folder: it runs locally, matches CSV names against the canvas-agent vault (which already stores every roster member's Canvas `user_id`, token, and "Last, First" name), and writes a JSON file that contains **only tokens, user_ids, and metrics**. Unmatched rows are reported by **CSV row number**, never by name.

You read the prep JSON, never the CSVs. `grade_submission` and `bulk_grade` take the numeric `user_id`, which the prep file and `list_submissions` both expose next to each token.

---

## Semester Credit Model & Bookkeeping

This governs how weekly completions roll up into a semester grade, plus the missing/excused bookkeeping that keeps the Canvas total honest. **To know the semester span, which weeks are class weeks, and which are break/exam weeks, consult the `/EHS-Scheduler` skill** — it has the authoritative calendar (semester start/end, breaks, exam periods, grading-period ids). You need that calendar for the progress comments, the makeup-week logic, and end-of-semester excusing.

### Full-credit thresholds

- **Membean:** a student needs **15 completed weeks per semester** for full credit. Count the weekly assignments in Canvas whose due dates fall inside the semester's grading period; there are usually *more* than 15 (e.g., 18 in a fall semester), so students can miss a few. **If a semester has exactly 15, there is no slack** — say so in the progress comments' remaining-weeks clause, because break credit is then the only recovery.
- **NoRedInk:** **every** NRI assignment must be completed for full credit — no drops.
- Doing more than the requirement never exceeds 100%.

### How the Membean grade is represented (excuse the surplus)

Each week is a 1-pt assignment. The semester Membean grade should be `min(completed, 15) / 15`, capped at 100%. Achieve this **at the end of the semester** by excusing surplus assignments so the denominator lands on 15:

- Counted (non-excused) assignments per student = **max(15, completed)**.
- **Excuse** the leftover incompletes beyond that.
- *Example:* 18 weekly assignments, student completed **13** → keep 13 ones + 2 zeros (= **13/15**), **excuse the other 3**.
- Student completed **≥ 15** → excuse all remaining incompletes → **100%**.

**NRI is never excused** — all assignments are required, so an NRI left incomplete past its makeup window stays a real **0**.

### Additional (makeup) weeks — Membean only

A missed Membean *class* week can't be trained retroactively. But students can train during **breaks and exam weeks** to earn makeup credit (this mechanism is **Membean only**; NRI's only flexibility is its 4-week late window). Identify these weeks from `/EHS-Scheduler`:

- **Count as makeup weeks:** full break weeks (Thanksgiving, Winter, Spring) **and the fall exam week** (Winter Assessments — fall is mid-year, not a semester end, so that week is a Membean break week).
- **Does NOT count:** the **spring exam week**. Membean and NRI both **end on the final Sunday before spring exams** — no assignment that week, no makeup credit.
- A two-week break can earn **two** credits (one per break week in which the student meets the normal threshold).

### Missing flags

- An incomplete Membean/NRI gets **score 0 AND `late_policy_status: "missing"`** in the weekly run.
- These assignments are **"No submission"** type. Canvas does **not** auto-flag no-submission assignments missing, but you **can** set `missing` manually via the API (that's the same call the Grade Detail Tray makes) — so set it explicitly. Verified 2026-09-07: a manual `missing` set through `grade_submission` sticks on no-submission assignments (re-read via `list_submissions` shows `missing: true`). If a future Canvas release stops honouring it, the fallback is to switch these assignments to **"On paper"** submission type.
- **NRI missing comments must include the makeup deadline** (due date + 4 weeks) — see the late window below.

### Late / makeup completion

- **NRI can be completed late**, within a **4-week window** after the due date. When a late completion appears, flip the grade **0 → 1** and **clear the missing flag**.
- **Membean class weeks cannot be completed late** — the only recovery is break/exam-week makeup credit (above).

### Grading-period close dates cut every window short

Canvas locks grades when a grading period closes (`list_grading_periods` gives the `close_date`; at EHS the 1st-semester period closes the night of **Feb 1** and the 2nd closes just after spring exams). After that you cannot change a grade in that period at all.

- The 4-week NRI window for the last three or four NRI assignments of a semester runs **past** the close. Apply those makeups **before the close date**, and say so in the missing comment when the calendar deadline would be later than the close: `"Must complete by [earlier of due+4 weeks and the close date] for makeup credit."`
- Winter-break Membean credit lands on **1st-semester** assignments, so run the break-credit pass in **January**, before Feb 1.
- Run the end-of-semester reconciliation **before** the close date, not after.

---

## NRI topics come from Canvas

There is no hand-maintained topic table. The FLC NRI assignments are named `NoRedInk: <topic>`, and the topic text is the column header in the NRI gradebook export. To find this week's topic:

1. `list_assignments` with `search_term: "NoRedInk"`.
2. Pick the assignment whose `due_at` is the relevant Sunday.
3. Topic = the name with the leading `NoRedInk:` and surrounding whitespace removed.
4. Look up that topic in the prep file's `nri.topics` list (exact match after trimming; if no exact match, try case-insensitive and tell the teacher which Canvas name and which CSV header you paired).

If the Canvas name has no colon, ask the teacher which CSV column it corresponds to.

**Diagnostics can't be graded from the export.** A NoRedInk diagnostic (e.g. "Parts of Speech Diagnostic") shows `- pts` in the max-points row and no score for anyone, so the prep file has `max_points: null` and all-null scores. Don't mark it incomplete for everyone. Tell the teacher and ask whether to skip the assignment, mark everyone complete, or take a list of tokens who didn't finish it.

---

## Workflow

### Step 1: Get the prep files

The teacher normally runs one unchanging command (`membean-prep`, an alias for `scripts/weekly.mjs`) that finds this week's CSV exports in Downloads, runs `scripts/prep.mjs` for every course in their local config, and writes:

- `~/Downloads/membean-prep/prep-<course_id>-<date>.json` — one token-only prep file per course
- `~/Downloads/membean-prep/latest.json` — a manifest listing those files, the CSV names, and the CSV date

**When the teacher says "grade this week from the latest prep files"** (or gives no file at all): read `~/Downloads/membean-prep/latest.json`, then read each `prep_file` it lists. If the manifest's `csv_date` or `generated_at` is more than a week old, say so and ask whether to continue. If the teacher names prep files explicitly, read those instead.

If the teacher hasn't run the prep yet, ask them to run `membean-prep` (or run it yourself with Bash — it prints only counts, filenames, and row numbers). For a one-off course the underlying script can be run directly:

```
node ~/code/ai-cli-skills/skills/Membean-NRI-updater/scripts/prep.mjs --course <course_id> --membean <Membean Report CSV> --nri <NRI gradebook CSV> --out <prep.json>
```

- Omit `--nri` for Membean-only courses. Repeat `--membean` if Membean was split into several classes.
- `--aliases <csv>` points at an optional local two-column file (export name, Canvas sortable name) for nicknames the script can't resolve on its own. It stays on the teacher's machine.
- The script needs the course's vault file. If it says there is no vault, run `list_students` on the course (that populates it), then rerun.
- **If a prep file contains anything that looks like a real name, stop and tell the teacher; do not continue.**

Report each course's summary to the teacher: matched / unmatched / ambiguous counts, unmatched row numbers, and how many roster members appear in no CSV. Unmatched rows are the teacher's to resolve (fix the CSV, add an alias, or skip).

### Step 2: Identify Courses

The prep file records its `course_id`. Determine the minutes threshold:
- If the course is FLC → **30 minutes**
- Otherwise → **45 minutes**

The `nri` block is present only for FLC.

### Step 3: Find Canvas Assignments & Gather Semester Context

For each course:

1. `list_assignments` with `search_term: "Membean"` (and `"NoRedInk"` for FLC) to get **all** weekly assignments of that type (you need the full list — the progress comments and end-of-semester math depend on it).
2. Identify the **current week's** assignment: the one whose `due_at` is the Sunday of the relevant week — normally the most recent past Sunday. If the CSV filename carries a date, match to the Sunday on or just before it. Confirm the choice with the teacher in the summary.
3. If no matching assignment is found, tell the teacher — they may need to create it first.

**Gather semester context** from `/EHS-Scheduler` and `list_grading_periods`:
- The semester span, its **end** (spring: the Sunday before spring exams), and the grading period's **close date**.
- Which remaining weeks are **class weeks** (have an assignment) vs. **additional makeup weeks** (full break weeks + the **fall** exam week; **not** the spring exam week).
- How many assignments are **due to date** (the denominator for "X of Y so far") and how many the semester has in total.

### Step 4: Process Membean

For each entry in `membean.students`:

1. **minutes** and **accuracy** are integers; **dubious_minutes** is Membean's flag.
2. **Evaluate** (this produces a **detail string** that gets folded into the full comment in Step 6):
   - If minutes = 0 and accuracy = 0 → **Incomplete**, **no detail** (the lead line already says they didn't do it)
   - If minutes < threshold → **Incomplete**, detail: `"[X]/[threshold] minutes."`
   - If accuracy < 60 → **Incomplete**, detail: `"[X]% accuracy (60% needed)."`
   - If both short → **Incomplete**, detail: `"[X]/[threshold] minutes, [X]% accuracy (60% needed)."`
   - Otherwise → **Complete**

Incomplete Membean gets **score 0 + `late_policy_status: "missing"`**; complete gets **1**.

**Dubious Minutes:** If `dubious_minutes` is non-zero, flag it in the summary (e.g., "Note: [X] dubious minutes flagged by Membean"). Still use the total minutes for evaluation — let the teacher decide whether to override.

**Roster members in no CSV** (`roster_not_in_csvs`): list their tokens in the summary and leave them ungraded unless the teacher says otherwise.

**Test Student** (`test_students` in the prep file): Canvas's built-in Test Student is in every course and never in a CSV. Grade it as a **missed week every run** — Membean **and** NRI — with the normal incomplete comment and the missing flag. The teacher uses Student View on it to show students what a missed week looks like. Its progress line will read 0 of Y; that's expected. Never excuse it at end of semester.

### Step 5: Process NoRedInk (FLC only)

#### Current Week

1. Derive this week's topic from the Canvas assignment name (see *NRI topics come from Canvas*).
2. Read its max points from `nri.topics`.
3. For each entry in `nri.students`, read `scores[topic]`:
   - Score = max points → **Complete**
   - Score = `null` or less than max points → **Incomplete** (no separate detail string; the comment names the topic)

Incomplete NRI gets **score 0 + `late_policy_status: "missing"`**; complete gets **1**. Because NRI can be made up late, an incomplete NRI comment **must state the makeup deadline**: the due date + 4 weeks, or the grading-period close date if that is sooner, written as a plain date such as `October 4`.

#### Makeup Check (Previous 4 Weeks)

Students can make up missed NRI assignments up to a month after they were due. Check for makeups on **every** weekly run:

1. From the Canvas NRI assignment list, take the assignments due in the **previous 4 weeks** and derive each one's topic.
2. `list_submissions` on each; collect students currently at **0/1** or flagged missing.
3. Check those students' `scores[topic]` in the prep file.
4. If a student now has full marks → include in the summary as a **makeup to update**: change to **1**, **clear the missing flag** (`late_policy_status: "none"`), comment per Step 6.

### Step 6: Build Each Student's Progress Comment

**Every** graded assignment gets a comment — complete *and* incomplete, weekly grades *and* makeups — and Membean and NoRedInk are separate Canvas assignments, so each gets its **own** comment. To build it, compute each student's cumulative progress **from live Canvas grades at the moment you post** (so earlier makeups and break credits are already counted):

1. Count **completed** weeks so far this semester (across all Membean — resp. NRI — assignments **due to date**, using `list_submissions`; a week is complete if it's graded 1, including the grades you are about to post this run). Call this `X`, out of `Y` assignments due to date.
2. From the Step 3 context, get **remaining class weeks** (`C`) and, for Membean, **remaining additional makeup weeks** (`A`).

**Progress line** (the same sentence closes every Membean comment; the NRI version drops the makeup clause):

- Membean: `"Membean progress: [X] of [Y] weeks done so far. You need 15 for full credit this semester. [C] class weeks and [A] additional (break/exam) makeup weeks remain."`
- NoRedInk: `"NoRedInk progress: [X] of [Y] complete so far — all are required for full credit. [C] class weeks remain."`

**Comment templates** (lead line states this assignment's status, then the progress line):

- **Membean — complete:** `"You did your Membean this week! " + progress line`
- **Membean — incomplete:** `"You didn't do your Membean this week. [detail from Step 4, if any] " + progress line` — with no detail this is just `"You didn't do your Membean this week. " + progress line`
- **NoRedInk — complete:** `"You did your NoRedInk this week! " + progress line`
- **NoRedInk — incomplete:** `"You didn't do your NRI assignment this week: [topic name]. You must complete it by [deadline] for makeup credit. " + progress line`
- **NoRedInk — makeup:** `"Makeup completed — [topic name]. " + progress line`
- **Membean — break credit:** `"Credit applied from break training (week of [Mon–Sun dates]). " + progress line`

**Never rewrite or delete earlier comments.** They say "so far" and are dated, so they read as snapshots. Because the makeup and break-credit comments carry the progress line, the newest comment on any student's most recently touched assignment always shows the correct running total.

### Step 7: Present Summary

**Always present the summary before making any changes.** Organize by course. Refer to students by token.

Format:

```
## [Course Name] — Membean

Canvas assignment: [name] (due [date])
Threshold: [X] minutes, 60% accuracy
Prep file: [filename] (from [Membean CSV name(s)])

**Complete ([N] students):** [list tokens]

**Incomplete ([N] students):**
- [Token]: [comment that will be posted]
...

**Flagged:**
- [Token]: [X] dubious minutes flagged by Membean
- Unmatched CSV rows: [file:row, ...]
- Roster members in no CSV: [tokens]
- Test Student [token]: graded as missed (demo account)
```

```
## FLC — NoRedInk

Canvas assignment: [name] (due [date])
Topic: [NRI topic name] ([max] pts)
Prep file: [filename]

**Complete ([N] students):** [list tokens]

**Incomplete ([N] students):**
- [Token]: [comment that will be posted]
...

**Makeups ([N] students):**
- [Token]: Now complete on [topic] (due [date]) — update to 1/1
...
```

End with:
> **Summary: [X] Membean grades across [N] courses, [Y] NRI grades, [Z] NRI makeups. Proceed?**

### Step 8: Apply Grades

**Wait for the teacher to confirm.** They may want to skip certain students or adjust.

After confirmation, apply all grades. **Every** graded assignment carries its Step 6 comment. `student_id` is the numeric `user_id` from the prep file.

**Complete (1/1, with comment)** — one `bulk_grade` call per assignment is fastest; it returns a Progress object, so re-read the submissions afterwards to confirm the scores landed:
```
bulk_grade(
  course_id: "<course_id>",
  assignment_id: "<assignment_id>",
  grades: [{ student_id: "<user_id>", score: 1, comment: "<Step 6 'You did your ...' comment>" }, ...]
)
```

**Incomplete (0/1, missing flag, with comment)** — must be `grade_submission`, because only it sets `late_policy_status`:
```
grade_submission(
  course_id: "<course_id>",
  assignment_id: "<assignment_id>",
  student_id: "<user_id>",
  score: 0,
  late_policy_status: "missing",
  comment: "<Step 6 'You didn't do your ...' comment>"
)
```

**Makeup update (0 → 1, clear missing):**
```
grade_submission(
  course_id: "<course_id>",
  assignment_id: "<assignment_id>",
  student_id: "<user_id>",
  score: 1,
  late_policy_status: "none",
  comment: "<Step 6 makeup comment>"
)
```

**Parallelize** these calls where possible — changes to different students are independent.

After all grades are applied, **verify**: `list_submissions` on each touched assignment and confirm scores and `missing` flags match the plan. Then:
> **Done — [X] Membean grades and [Y] NRI grades applied across [N] courses. [Z] makeups updated.**

---

## Break Makeup Credit (Membean only)

Run this as its own pass when the teacher provides a **break/makeup CSV** (Membean trained over a break or exam week), through the prep script like any other Membean CSV. NRI has no break-makeup mechanism — only its 4-week late window.

1. **Count earned credits per student.** Each break/exam week (Mon–Sun) in which the student meets the **normal threshold** (45 min / 60%, or 30 min for FLC) earns **one** makeup credit — a two-week break can yield two. Membean's break report may aggregate the period differently than one row per week; if the week boundaries aren't clear, **ask the teacher** how to split it (one prep run per week is simplest).
2. **Apply each credit as a 1/1**, in this priority order:
   - **First → the student's previously-marked-missing Membean assignments** (earliest missing first): set score 1, clear the missing flag (`late_policy_status: "none"`), Step 6 break-credit comment.
   - **If no missing assignments remain → the final Membean assignments of the semester** (latest first), same comment. This banks credit toward the 15-week requirement.
3. Never apply more than one credit per assignment, and never exceed the student's total assignment count.
4. **Mind the close date:** winter-break credit belongs to 1st-semester assignments and must be applied before that period closes.
5. Present the proposed credits per student (which assignments, sourced from which break week) and **confirm before applying**.

---

## End-of-Semester Reconciliation

Run once near the semester end — for Membean/NRI that's the **Sunday before spring exams** in spring, and the last Membean Sunday in fall — and **before the grading period's close date**, so each Canvas total reflects the true grade. (Use `/EHS-Scheduler` and `list_grading_periods` to confirm those dates.)

**Membean — excuse the surplus** (see Semester Credit Model):
1. For each student, count **completed** Membean weeks this semester (`completed`) and the **total** weekly Membean assignments in the period (`T`).
2. Non-excused count = **max(15, completed)**; number to **excuse** = `T − max(15, completed)`.
3. Excuse that many of the student's **incomplete** assignments — they're equivalent 1-pt weeks, so any of them work — with `excuse: true`. Leave enough zeros that the denominator equals `max(15, completed)`:
   - `completed ≥ 15` → excuse **all** remaining incompletes → **100%**.
   - `completed < 15` → keep `(15 − completed)` zeros, excuse the rest → **`completed`/15**.
4. Skip the Test Student entirely — its zeros stay.
5. Present the plan per student (resulting grade, how many excused) and **confirm before applying**.

**NRI — no excusing.** Every NRI assignment is required, so any incomplete whose 4-week makeup window has closed stays a real **0**. Just confirm those windows (or the close date) have passed before finalizing.

---

## Edge Cases

- **Unmatched or ambiguous CSV rows**: report the row numbers; the teacher fixes the CSV or adds an alias and reruns the prep script. Never guess a match yourself.
- **Roster member in no CSV**: list the token; they may not be enrolled in Membean/NRI. Skip unless told otherwise.
- **Canvas assignment already has grades**: show existing grades in the summary and ask before overwriting. If a student already has 1/1, don't downgrade.
- **No `nri` block in the prep file**: skip the NRI section entirely — just process Membean.
- **No `membean` block**: skip the Membean section — just process NRI.
- **Membean accuracy 0 with 0 minutes**: no detail string at all — "You didn't do your Membean this week." already says it. Never write "Did not train this week."
- **Test Student**: always graded as a missed week (see Step 4) — never skipped, never excused. If `test_students` is empty but `list_submissions` shows one more user than the prep file covers, ask the teacher whether that token is the Test Student.
- **Prep file older than the CSVs, from a different course, or a stale manifest**: check `generated_at`, `csv_date`, and `course_id` and ask for a fresh `membean-prep` run.
