---
name: Membean-NRI-updater
description: Process Membean and NoRedInk CSV exports and grade weekly Canvas completion assignments — handles thresholds, per-student progress comments, missing flags, NRI late makeups, Membean break-training credit, and end-of-semester excusing to the correct full-credit total.
user-invocable: true
---

# Weekly Tracker

You are helping an Episcopal High School English teacher grade weekly Membean and NoRedInk (NRI) completion assignments in Canvas. The teacher downloads CSV reports from each platform, and you process them into Canvas grades.

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

- Weekly assignments named **"Membean"** or **"NoRedInk"**
- Due **Sunday at 10:00 PM Eastern**
- Graded as **completion: 1 point max** (assignment groups: Membean 5%, NRI 5%)
- Complete → **1/1**, with a progress comment (see Step 6)
- Incomplete → **0/1 + `missing` flag**, with a comment giving the shortfall and running progress
- Submission type is **"No submission"** — the missing flag is set manually via the API (see Semester Credit Model)

### Course Context

- **FLC** (Fundamentals in Literature & Composition): Membean + NRI
- **All other courses** (e.g., Advanced English Seminar, Gothic Literature): Membean only

---

## Semester Credit Model & Bookkeeping

This governs how weekly completions roll up into a semester grade, plus the missing/excused bookkeeping that keeps the Canvas total honest. **To know the semester span, which weeks are class weeks, and which are break/exam weeks, consult the `/EHS-Scheduler` skill** — it has the authoritative calendar (semester start/end, breaks, exam periods). You need that calendar for the progress comments, the makeup-week logic, and end-of-semester excusing.

### Full-credit thresholds

- **Membean:** a student needs **15 completed weeks per semester** for full credit. There are normally *more* than 15 weekly assignments (e.g., 17), so students can miss a couple.
- **NoRedInk:** **every** NRI assignment must be completed for full credit — no drops.
- Doing more than the requirement never exceeds 100%.

### How the Membean grade is represented (excuse the surplus)

Each week is a 1-pt assignment. The semester Membean grade should be `min(completed, 15) / 15`, capped at 100%. Achieve this **at the end of the semester** by excusing surplus assignments so the denominator lands on 15:

- Counted (non-excused) assignments per student = **max(15, completed)**.
- **Excuse** the leftover incompletes beyond that.
- *Example:* 17 weekly assignments, student completed **13** → keep 13 ones + 2 zeros (= **13/15**), **excuse the other 2**.
- Student completed **≥ 15** → excuse all remaining incompletes → **100%**.

**NRI is never excused** — all assignments are required, so an NRI left incomplete past its makeup window stays a real **0**.

### Additional (makeup) weeks — Membean only

A missed Membean *class* week can't be trained retroactively. But students can train during **breaks and exam weeks** to earn makeup credit (this mechanism is **Membean only**; NRI's only flexibility is its 4-week late window). Identify these weeks from `/EHS-Scheduler`:

- **Count as makeup weeks:** full break weeks (Thanksgiving, Winter, Spring) **and the fall exam week** (Winter Assessments — fall is mid-year, not a semester end, so that week is a Membean break week).
- **Does NOT count:** the **spring exam week**. Membean and NRI both **end on the final Sunday before spring exams** — no assignment that week, no makeup credit.
- A two-week break can earn **two** credits (one per break week in which the student meets the normal threshold).

### Missing flags

- An incomplete Membean/NRI gets **score 0 AND `late_policy_status: "missing"`** in the weekly run.
- These assignments are **"No submission"** type. Canvas does **not** auto-flag no-submission assignments missing, but you **can** set `missing` manually via the API (that's the same call the Grade Detail Tray makes) — so set it explicitly. **Verify it sticks on the first real assignment of the year;** if Canvas refuses to hold a manual missing on a no-submission assignment, the fallback is to switch these assignments to **"On paper"** submission type.
- **NRI missing comments must include the makeup deadline** (due date + 4 weeks) — see the late window below.

### Late / makeup completion

- **NRI can be completed late**, within a **4-week window** after the due date. When a late completion appears, flip the grade **0 → 1** and **clear the missing flag**.
- **Membean class weeks cannot be completed late** — the only recovery is break/exam-week makeup credit (above).

---

## CSV Data Formats

### Membean CSV

Downloaded per-class from Membean. Filename pattern: `*Report*.csv`

| Column | Use |
|--------|-----|
| Name | `"Last, First"` format |
| Minutes Trained | Compare to minutes threshold |
| Accuracy | Compare to 60% (parse as integer, strip `%`) |

**Important:** Ignore Membean's own "Goal Met" column — it uses Membean's internal criteria, which differ from the teacher's. Always evaluate using the thresholds above.

Skip any row where the Name field contains "Class Average" or is empty.

### NoRedInk CSV

Downloaded as a gradebook export. Filename pattern: `noredink-gradebook*.csv`

Structure:
- **Row 1**: Headers — `Full Name`, `First Name`, `Last Name`, `Average`, then one column per assignment topic
- **Row 2**: Max points — e.g., `"20 pts"`, `"15 pts"`, `"- pts"`
- **Row 3+**: Student data — scores are numbers (e.g., `20`, `0`), `"N/A"`, or blank
- Assignment columns are ordered **newest (left) to oldest (right)**

To evaluate a topic: parse the max points from row 2 (extract the number from `"20 pts"`), then check if the student's score equals that number. `"N/A"` means not attempted.

Skip any row where `Full Name` is `"Class Average"` or empty.

---

## NRI Assignment Schedule

This table maps each week to its assigned NRI topic. The topic name must match the column header in the NRI CSV exactly.

**IMPORTANT:** This table needs to be populated. Ask the teacher for the full list of NRI topics and their due dates for the relevant semester, then update this section.

### Fall 2026

| Due Date (Sunday 10 PM ET) | NRI Topic |
|----------------------------|-----------|
| *(TBD — ask teacher for the assignment schedule)* | |

### Spring 2027

| Due Date (Sunday 10 PM ET) | NRI Topic |
|----------------------------|-----------|
| *(TBD — ask teacher for the assignment schedule)* | |

---

## Workflow

### Step 1: Locate Data Files

Look in `~/Downloads` for the most recent files matching:
- Membean: files matching `*Report*.csv`
- NRI: files matching `noredink-gradebook*.csv`

Present the files found and confirm with the teacher. If multiple Membean CSVs are found, list them — each corresponds to a different class. If files aren't in ~/Downloads, ask for the paths.

### Step 2: Identify Courses

**Membean CSVs:** Each CSV covers one class. Ask the teacher which Canvas course each CSV corresponds to. You can help by matching student names in the CSV against Canvas rosters — use `list_courses` to find active courses, then `list_students` or enrollment data to get rosters.

Once you know the course, determine the minutes threshold:
- If the course is FLC → **30 minutes**
- Otherwise → **45 minutes**

**NRI CSV:** Always maps to the FLC course (NRI is only used in FLC).

### Step 3: Find Canvas Assignments & Gather Semester Context

For each course, find the correct Canvas assignment to grade:

1. Use `list_assignments` with `search_term: "Membean"` or `search_term: "NoRedInk"` to get **all** weekly assignments of that type for the semester (you need the full list, not just this week's — the progress comments and end-of-semester math depend on it).
2. Identify the **current week's** assignment: the one whose `due_at` falls on the Sunday of the relevant week. The relevant week is typically the most recent past Sunday; use the CSV download date as a guide — if the filename contains a date, match to the Sunday on or just before it.
3. If no matching assignment is found, tell the teacher — they may need to create it first.

**Gather semester context (needed for the progress comments and makeup logic):** consult the `/EHS-Scheduler` skill to establish, for the current semester:
- The semester span and its **end** (for Membean/NRI, spring ends the **Sunday before spring exams**).
- Which remaining weeks are **class weeks** (have a Membean/NRI assignment) vs. **additional makeup weeks** (full break weeks + the **fall** exam week; **not** the spring exam week) — see the Semester Credit Model section.
- How many assignments are **due to date** (the denominator for "X of Y so far").

### Step 4: Process Membean

For each student in the Membean CSV:

1. **Parse the name**: split on comma → `(last, first)`, trim whitespace
2. **Read Minutes Trained**: parse as integer
3. **Read Accuracy**: strip `%`, parse as integer
4. **Evaluate** (this produces a **detail string** that gets folded into the full comment in Step 6):
   - If minutes = 0 and accuracy = 0% → **Incomplete**, detail: `"Did not train this week."`
   - If minutes < threshold → **Incomplete**, detail: `"[X]/[threshold] minutes."`
   - If accuracy < 60% → **Incomplete**, detail: `"[X]% accuracy (60% needed)."`
   - If both short → **Incomplete**, detail: `"[X]/[threshold] minutes, [X]% accuracy (60% needed)."`
   - Otherwise → **Complete**

Incomplete Membean gets **score 0 + `late_policy_status: "missing"`**; complete gets **1**. (Missing flags on these no-submission assignments are set manually — see the Semester Credit Model section.)

**Dubious Minutes:** If a student has a non-zero value in the `Dubious Minutes` column, flag it in the report with a note (e.g., "Note: [X] dubious minutes flagged by Membean"). Still use the total Minutes Trained for evaluation — let the teacher decide whether to override.

### Step 5: Process NoRedInk (FLC only)

#### Current Week

1. Look up the current date in the NRI Assignment Schedule table above
2. Find the topic assigned for this week (the row whose due date is the upcoming or most recent Sunday)
3. In the NRI CSV, find the column matching that topic name
4. Parse the max points from row 2 for that column
5. For each student (this produces a **detail string** for Step 6):
   - Score = max points → **Complete**
   - Score = `"N/A"` → **Incomplete**, detail: `"[topic name] not attempted."`
   - Score < max points → **Incomplete**, detail: `"[topic name] incomplete."`

Incomplete NRI gets **score 0 + `late_policy_status: "missing"`**; complete gets **1**. Because NRI can be made up late, an incomplete NRI comment **must state the makeup deadline**: `"Must complete by [due date + 4 weeks] for makeup credit."`

#### Makeup Check (Previous 4 Weeks)

Students can make up missed NRI assignments up to a month after they were due. Check for makeups:

1. From the NRI Assignment Schedule, identify the topics from the **previous 4 weeks**
2. For each past week, find the corresponding Canvas "NoRedInk" assignment (by due date)
3. Use `list_submissions` to find students currently graded **0/1** (or flagged missing) on that assignment
4. Check those students' scores in the NRI CSV for that week's topic
5. If a student now has full marks → include in the summary as a **makeup to update**: change to **1**, **clear the missing flag** (`late_policy_status: "none"`), comment `"Makeup completed — [topic name]"`

### Step 6: Build Each Student's Progress Comment

**Every** assignment gets a comment — complete *and* incomplete — and Membean and NoRedInk are separate Canvas assignments, so each gets its **own** comment. To build it, compute each student's cumulative progress:

1. For the student, count **completed** weeks so far this semester (across all Membean — resp. NRI — assignments **due to date**, using `list_submissions`; count a week complete if it's graded 1 or has a qualifying makeup/break credit). Call this `X`, out of `Y` assignments due to date.
2. From the Step 3 / `/EHS-Scheduler` context, get **remaining class weeks** (`C`) and, for Membean, **remaining additional makeup weeks** (`A`).

**Comment templates** (lead line states this week's status, then the running progress):

- **Membean — complete:**
  `"You did your Membean this week! Membean progress: [X] of [Y] weeks done so far. You need 15 for full credit this semester. [C] class weeks and [A] additional (break/exam) makeup weeks remain."`
- **Membean — incomplete:**
  `"You didn't do your Membean this week. [detail from Step 4] Membean progress: [X] of [Y] weeks done so far. You need 15 for full credit this semester. [C] class weeks and [A] additional (break/exam) makeup weeks remain."`
- **NoRedInk — complete:**
  `"You did your NoRedInk this week! NoRedInk progress: [X] of [Y] complete so far — all are required for full credit. [C] class weeks remain."`
- **NoRedInk — incomplete:**
  `"You didn't do your NoRedInk this week. [detail from Step 5] Must complete by [due date + 4 weeks] for makeup credit. NoRedInk progress: [X] of [Y] complete so far — all are required for full credit. [C] class weeks remain."`

NRI has no additional/makeup weeks, so its comment omits that clause.

### Step 7: Present Summary

**Always present the summary before making any changes.** Organize by course.

Format:

```
## [Course Name] — Membean

Canvas assignment: [name] (due [date])
Threshold: [X] minutes, 60% accuracy
CSV: [filename]

**Complete ([N] students):** [list names]

**Incomplete ([N] students):**
- [Student Name]: [comment that will be posted]
- [Student Name]: [comment that will be posted]
...

**Flagged:**
- [Student Name]: [X] dubious minutes flagged by Membean
```

```
## FLC — NoRedInk

Canvas assignment: [name] (due [date])
Topic: [NRI topic name]
CSV: [filename]

**Complete ([N] students):** [list names]

**Incomplete ([N] students):**
- [Student Name]: [comment that will be posted]
...

**Makeups ([N] students):**
- [Student Name]: Now complete on [topic] (week of [date]) — update to 1/1
...
```

End with:
> **Summary: [X] Membean grades across [N] courses, [Y] NRI grades, [Z] NRI makeups. Proceed?**

### Step 8: Apply Grades

**Wait for the teacher to confirm.** They may want to skip certain students or adjust.

After confirmation, apply all grades. **Every** graded assignment carries its Step 6 progress comment.

**Complete (1/1, with comment):**
```
grade_submission(
  course_id: "<course_id>",
  assignment_id: "<assignment_id>",
  student_id: "<student_id>",
  score: 1,
  comment: "<Step 6 'You did your ...' comment>"
)
```

**Incomplete (0/1, missing flag, with comment):**
```
grade_submission(
  course_id: "<course_id>",
  assignment_id: "<assignment_id>",
  student_id: "<student_id>",
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
  student_id: "<student_id>",
  score: 1,
  late_policy_status: "none",
  comment: "Makeup completed — [topic name]"
)
```

**Parallelize** these calls where possible — changes to different students are independent.

After all grades are applied:
> **Done — [X] Membean grades and [Y] NRI grades applied across [N] courses. [Z] makeups updated.**

---

## Break Makeup Credit (Membean only)

Run this as its own pass when the teacher provides a **break/makeup CSV** (Membean trained over a break or exam week). NRI has no break-makeup mechanism — only its 4-week late window.

1. **Count earned credits per student.** Each break/exam week (Mon–Sun) in which the student meets the **normal threshold** (45 min / 60%, or 30 min for FLC) earns **one** makeup credit — a two-week break can yield two. Membean's break report may aggregate the period differently than one row per week; if the week boundaries aren't clear from the CSV, **ask the teacher** how to split it.
2. **Apply each credit as a 1/1**, in this priority order:
   - **First → the student's previously-marked-missing Membean assignments** (earliest missing first): set score 1, clear the missing flag (`late_policy_status: "none"`), comment: `"Credit applied from break training (week of [Mon–Sun dates the student actually trained])."`
   - **If no missing assignments remain → the final Membean assignments of the semester** (latest first), same comment. This banks credit toward the 15-week requirement.
3. Never apply more than one credit per assignment, and never exceed the student's total assignment count.
4. Present the proposed credits per student (which assignments, sourced from which break week) and **confirm before applying**.

---

## End-of-Semester Reconciliation

Run once near the semester end — for Membean/NRI that's the **Sunday before spring exams** in spring, and the semester end in fall — so each Canvas total reflects the true grade. (Use `/EHS-Scheduler` to confirm those dates.)

**Membean — excuse the surplus** (see Semester Credit Model):
1. For each student, count **completed** Membean weeks this semester (`completed`) and the **total** weekly Membean assignments (`T`).
2. Non-excused count = **max(15, completed)**; number to **excuse** = `T − max(15, completed)`.
3. Excuse that many of the student's **incomplete** assignments — they're equivalent 1-pt weeks, so any of them work — with `excuse: true`. Leave enough zeros that the denominator equals `max(15, completed)`:
   - `completed ≥ 15` → excuse **all** remaining incompletes → **100%**.
   - `completed < 15` → keep `(15 − completed)` zeros, excuse the rest → **`completed`/15**.
4. Present the plan per student (resulting grade, how many excused) and **confirm before applying**.

**NRI — no excusing.** Every NRI assignment is required, so any incomplete whose 4-week makeup window has closed stays a real **0**. Just confirm those windows have closed before finalizing.

---

## Student Name Matching

Names differ across platforms:
- **Membean**: `"Last, First"` (e.g., `"Martindale, Anne-Catherine"`)
- **NRI**: separate `First Name` and `Last Name` columns (e.g., `"Anne-Catherine"` + `"Martindale"`)
- **Canvas**: `name` field (`"First Last"`) and `sortable_name` field (`"Last, First"`)

**Matching strategy:**
1. Normalize all names: extract first and last name, lowercase, trim whitespace
2. Match on **last name** first, then **first name**
3. For ambiguous matches (same last name), use first name to disambiguate
4. **Flag any unmatched students** — ask the teacher to resolve

**Edge cases:**
- Hyphenated first names (e.g., "Anne-Catherine") — match the full first name
- Suffixes or middle names — match on first + last, ignore extras
- "Test Student" in Canvas — always skip

---

## Edge Cases

- **Student in CSV but not in Canvas**: Flag to the teacher (may have dropped the course or be in a different section)
- **Student in Canvas but not in CSV**: Skip — they may not be enrolled in Membean/NRI
- **Canvas assignment already has grades**: Show existing grades in the summary and ask before overwriting. If a student already has 1/1, don't downgrade.
- **NRI assignment schedule not populated**: Remind the teacher to provide the topic-to-week mapping before NRI grading can work. Membean grading still works independently.
- **No NRI CSV provided**: Skip the NRI section entirely — just process Membean
- **No Membean CSV provided**: Skip the Membean section — just process NRI
- **Membean accuracy 0% with 0 minutes**: Use the single comment `"Membean: Did not train this week"` rather than listing both metrics
