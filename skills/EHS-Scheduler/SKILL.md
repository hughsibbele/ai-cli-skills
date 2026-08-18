---
name: EHS-Scheduler
description: EHS (Episcopal High School) block-schedule expert for setting Canvas assignment due dates. Use whenever setting, moving, or batch-updating a due date or time for an EHS course — it picks the correct date and exact time for the right block (A–G), accounting for the Monday vs. long-block layouts, the two-week flex cycle, schedule-override days, MRC/no-class days, breaks, exam periods, and Eastern-time DST offsets. Trigger even on casual phrasings like "set this homework due for B block next week" or "when should this be due?"
user-invocable: true
---

# EHS Assignment Scheduler

You are helping an Episcopal High School teacher schedule Canvas assignment due dates. You have expert knowledge of the EHS block schedule and will use it to set accurate due dates and times.

## Source precedence

When a teacher supplies a course planning document (a scope & sequence, unit calendar, or similar), **trust it over the calendar data in this file** wherever the two disagree, and tell the teacher what the discrepancy was. Those documents are maintained against the live school calendar and have caught real gaps here — the two Family Weekend Monday overrides below were missing from this skill until a teacher's scope & sequence surfaced them in August 2026.

A planning doc that lists a class-day number per week is also a free consistency check: compute how many times each block meets that week and compare. Matching counts across the whole year is strong evidence the day-to-date mapping is right; a mismatch points at either a missing override here or an ambiguity worth asking the teacher about.

When you find a genuine discrepancy, offer to update this file so the correction persists.

## EHS Block Schedule Rules

The overall *structure* is stable year to year (Monday = all 7 short blocks; Tue–Fri = long blocks; the A/B/C and D/E/F/G meeting-day split; the two-week flex cycle). But **exact block times and flex-week phasing are verified from the school's iCal feeds each year** — don't assume they carry over. The daily iCal feed is the source of truth. (The 26-27 Monday C/D times below were corrected against the feed; an earlier version of this skill listed C at 9:45 / D at 10:30, which was wrong.)

### Weekly Block Rotation

Every week follows the same pattern. Monday has all 7 blocks (short periods). Tuesday–Friday have 3–4 long blocks each.

**Monday (all blocks, ~40 min each) — 26-27 times:**
| Block | Start | End |
|-------|-------|-----|
| A | 8:15 AM | 8:55 AM |
| B | 9:00 AM | 9:40 AM |
| C | 10:15 AM | 10:55 AM |
| D | 11:00 AM | 11:40 AM |
| E | 1:05 PM | 1:45 PM |
| F | 1:50 PM | 2:30 PM |
| G | 2:35 PM | 3:15 PM |

*Note: there is a ~35-min gap between B (ends 9:40) and C (starts 10:15) on Mondays — an all-school gathering slot.*

**Tuesday (long blocks, ~75 min):**
| Block | Start | End |
|-------|-------|-----|
| C | 8:15 AM | 9:30 AM |
| B | 10:05 AM | 11:20 AM |
| A | 12:35 PM | 1:50 PM |

**Wednesday (long blocks):**
| Block | Start | End |
|-------|-------|-----|
| E | 8:15 AM | 9:30 AM |
| F | 10:05 AM | 11:20 AM |
| G | 12:35 PM | 1:50 PM |
| D | 2:00 PM | 3:15 PM |

**Thursday (long blocks):**
| Block | Start | End |
|-------|-------|-----|
| B | 8:15 AM | 9:30 AM |
| A | 10:05 AM | 11:20 AM |
| C | 12:35 PM | 1:50 PM |

**Friday (long blocks):**
| Block | Start | End |
|-------|-------|-----|
| G | 8:15 AM | 9:30 AM |
| D | 10:05 AM | 11:20 AM |
| E | 12:35 PM | 1:50 PM |
| F | 2:00 PM | 3:15 PM |

### Which Blocks Meet Which Days (quick lookup)

| Block | Monday | Tuesday | Wednesday | Thursday | Friday |
|-------|--------|---------|-----------|----------|--------|
| A | Yes | Yes | - | Yes | - |
| B | Yes | Yes | - | Yes | - |
| C | Yes | Yes | - | Yes | - |
| D | Yes | - | Yes | - | Yes |
| E | Yes | - | Yes | - | Yes |
| F | Yes | - | Yes | - | Yes |
| G | Yes | - | Yes | - | Yes |

Blocks A/B/C meet Mon + Tue + Thu. Blocks D/E/F/G meet Mon + Wed + Fri.

### Two-Week Flex Cycle and Week 1 Thursdays

EHS runs a two-week flex cycle. Each of the 7 blocks gets one designated flex *slot* per cycle. However, **flex is not automatic** — it is an option, not a guarantee. Most courses only use flex 1–2 times per semester. Flex blocks are used for **off-campus trips**, not for extending class time, extra assignments, or make-up work. You will generally not know whether a flex block is actually being used on a given day unless the teacher tells you.

**IMPORTANT:** On Week 1 Thursdays, regular academic blocks still meet as normal, but there are **no flex blocks** — the school has meetings during the lunch flex period instead. The only scheduling impact is that no flex trips will occur on these days. Do NOT treat Week 1 Thursdays as no-class days.

**Determining which flex week it is:** Do **not** use a simple `floor((date - anchor) / 7) % 2` formula. The cycle does **not** advance on a clean 7-day cadence — it **pauses during disrupted weeks** (short weeks after long weekends, full break weeks), so a single-anchor formula drifts out of phase and gives wrong answers for stretches of the year. (Verified against the 26-27 feed: e.g. the Oct 12 short week is skipped entirely, throwing the formula off by one for weeks afterward.)

Instead, look up the target date's **week-of-Monday** in the explicit Week 1 / Week 2 lists in the semester data below. Those lists are derived directly from the school's iCal feed and are authoritative. If a date's week isn't listed (opening week, break weeks, exam weeks), the flex cycle doesn't apply that week — and flex is reference-only anyway, so it has no bearing on due dates.

**Flex slot assignments per week (for reference only — does NOT mean the block will actually flex):**

| Day | Week 1 Flex Block | Week 2 Flex Block |
|-----|-------------------|-------------------|
| Tuesday | B | A |
| Wednesday | F | G |
| Thursday | *(meetings — no flex, classes normal)* | C |
| Friday | D | E |

**For scheduling purposes:** Always use normal block times unless the teacher specifically says a flex trip is happening. Do not suggest using flex time for assignments, workshops, or catch-up — flex means the class is off campus on a trip.

### Schedule Override Days

Sometimes the school runs a different day's schedule. For example, "Wednesday Class Schedule" on a Monday means that Monday uses Wednesday's block layout and times instead of the normal Monday layout.

When an override is in effect:
- Use the **override day's** block assignments and times
- The flex cycle position still follows the **actual calendar date** (not the override)
- Flag this to the teacher: "Note: [date] runs a [override] schedule"

**Family Weekend pattern:** when a Friday is lost to Family Weekend, the Monday of that same week runs a **Friday schedule** to make it up. This happened twice in 26-27 (Mon 10/19 for Fri 10/23; Mon 4/5 for Fri 4/9). Expect this pairing in future years and verify it against the feed — it is easy to miss because the Monday looks ordinary on the calendar. The consequence is significant: **A/B/C do not meet at all that Monday**, so an A/B/C section loses a meeting that week while a D/E/F/G section keeps its normal count.

**Unbalanced weeks:** when a teacher has one section in A/B/C and another in D/E/F/G, most weeks give both the same number of meetings — but override weeks can break that symmetry. The clearest 26-27 case is the week of Apr 5, 2027: Mon 4/5 runs a Friday schedule *and* Thu 4/8 is a modified Monday running all 7 blocks, so a D/E/F/G section gets **three** meetings while an A/B/C section gets **two**. When a course plan numbers its class days, always compare the meeting count per section against the plan's numbered days for that week; a mismatch means you must ask the teacher which meetings carry the numbered content rather than guessing.

### Exam Periods

During exam weeks, the normal block schedule does not apply. Exams follow their own schedule (typically two exams per day: 9:00–11:00 AM and 2:00–4:00 PM). A review day usually precedes exams. Do not schedule regular assignments due during exam periods.

---

## 2026–27 Semester Calendar Data

**Update this section each school year.** Source: school iCal feeds (daily + master) and the Major Dates PDF. Data below was extracted from the 26-27 feeds and PDF (PDF updated 6/9/26).

**About Canvas grading periods:** EHS uses account-level grading periods (group_id 274). Each semester has its own id. When you call Canvas API endpoints that accept a `grading_period_id` parameter (currently `/courses/{id}/enrollments` and `/courses/{id}/students/submissions`), passing this id scopes grades and submissions to that semester only — without it, you get cumulative/lifetime data. Use `list_grading_periods` to discover the id for any course. Grading period ids are stable across all EHS courses for a given school year. **The 26-27 ids are not yet recorded below — discover them with `list_grading_periods` on any 26-27 course and fill them in.** (For reference, 25-26 used `370` for 1st Semester and `371` for 2nd Semester; 26-27 will have new ids.)

### 1st Semester (Fall 2026)

- **Semester span:** 2026-08-31 → 2027-01-29
- **Aug 31 (Mon):** Orientation Day — **no academic blocks**
- **Sep 1 (Tue):** First Day of Classes (runs a **Modified Tuesday** schedule, see overrides)
- **Marking Period 1 ends:** 2026-10-30
- **Semester ends:** 2027-01-29 (Fri)
- **Last regular class day before winter assessments:** 2026-12-11 (Fri)
- **Canvas grading period id:** `374` (verified 2026-08 via `list_grading_periods`; was `370` in 25-26)

**Flex cycle — Week 1 Mondays (look up the target date's week-of-Monday here):**
2026: Sep 7, Sep 21, Oct 5, Oct 26, Nov 9, Nov 30 · 2027: Jan 4, Jan 18

**Flex cycle — Week 2 Mondays:**
2026: Sep 14, Sep 28, Oct 19, Nov 2, Nov 16, Dec 7 · 2027: Jan 11, Jan 25

*Weeks not listed (opening week of Aug 31, the Oct 12 short week, Thanksgiving week, exam/break weeks) have no normal flex rotation. Reminder: flex is reference-only and doesn't change due dates.*

**Schedule overrides:**
| Date | Override |
|------|----------|
| 2026-09-01 (Tue) | First day — **Modified Tuesday** (compressed): C 8:40–9:30, B 9:40–10:30, A 12:40–1:30 |
| 2026-09-02 (Wed) | **Modified Wednesday** (compressed): E 8:40–9:30, F 9:40–10:30, G 11:15–12:05, D 1:05–1:55 |
| 2026-10-14 (Wed) | **Monday Schedule** — all 7 blocks at standard Monday times (makeup day after Fall Long Weekend) |
| 2026-10-19 (Mon) | **Friday Schedule** — runs G/D/E/F at standard Friday times (compensates for Fall Family Weekend on Fri 10/23). **A, B, and C do not meet this Monday.** |
| 2026-11-02 (Mon) | **Wednesday Class Schedule** (with Chapel) — runs E/F/G/D at standard Wednesday times |

**No-class days:**
| Date | Reason |
|------|--------|
| 2026-08-31 (Mon) | Orientation Day — no academic blocks |
| 2026-09-14 (Mon) | MRC Day (freshmen on Burch — see note below) |
| 2026-09-15 (Tue) | *9th grade only:* Burch backpacking trip — no classes for freshmen |
| 2026-09-16 (Wed) | *9th grade only:* Burch Reflection — no regular classes for freshmen |
| 2026-10-12 (Mon) | Fall Long Weekend return day — no classes |
| 2026-10-13 (Tue) | No Classes (9th grade Civics Day) |
| 2026-10-23 (Fri) | Fall Family Weekend — no classes |
| 2026-11-04 (Wed) | MRC Day |
| 2027-01-18 (Mon) | MRC Day (MLK Symposium) |

**Burch week (Sep 14–18, 2026) — grade-specific:**
The Monday MRC day (9/14) coincides with the 9th-grade Burch backpacking trip.
- **Grades 10–12:** no class Monday 9/14; normal classes Tuesday–Friday.
- **Grade 9 (FLC and other freshman courses):** no class Monday 9/14, Tuesday 9/15, or Wednesday 9/16 (Wednesday is the Burch Reflection). Normal classes Thursday 9/17 and Friday 9/18.

So for a freshman course that week, blocks A/B/C meet **once** (Thursday) and blocks D/E/F/G meet **once** (Friday). Always ask which grade the course serves before scheduling in this week.

**Breaks (no classes, campus may be closed):**
| Start | End | Name |
|-------|-----|------|
| 2026-10-10 | 2026-10-13 | Fall Long Weekend *(Fri 10/9 is a class day — no afternoon options; classes resume Wed 10/14 on a Monday schedule)* |
| 2026-11-21 | 2026-11-30 | Thanksgiving Break *(last class 11/20; resume 12/1)* |
| 2026-12-19 | 2027-01-04 | Winter Break *(after exams; resume 1/5)* |

**Exam period (Winter Assessments):**
| Dates | Details |
|-------|---------|
| 2026-12-14 (Mon) | Review Day |
| 2026-12-15 – 2026-12-18 | Winter Assessments |

Winter assessment order (two per day: 9:00–11:00 AM and 2:00–4:00 PM):
- Dec 15 (Tue): A Block (AM), B Block (PM)
- Dec 16 (Wed): C Block (AM), D Block (PM)
- Dec 17 (Thu): E Block (AM), F Block (PM)
- Dec 18 (Fri): G Block (AM)

### 2nd Semester (Spring 2027)

- **Semester span:** 2027-02-02 → 2027-06-04
- **Second semester begins:** 2027-02-02 (Tue)
- **Marking Period 3 ends:** 2027-04-02
- **Seniors' last day of classes:** 2027-04-30
- **Last regular class day (grades 9–11):** 2027-05-28 (Fri)
- **Canvas grading period id:** `375` (verified 2026-08 via `list_grading_periods`; was `371` in 25-26)

**Flex cycle — Week 1 Mondays:**
Feb 1, Feb 15, Mar 15, Mar 29, Apr 12, Apr 26, May 10

**Flex cycle — Week 2 Mondays:**
Feb 8, Feb 22, Mar 22, Apr 5, Apr 19, May 3, May 17

*Spring Break weeks (Mar 1, Mar 8) and exam week have no normal flex rotation.*

**Schedule overrides:**
| Date | Override |
|------|----------|
| 2027-02-15 (Mon) | **Wednesday Class Schedule** (with Chapel) — E/F/G/D at standard Wednesday times |
| 2027-04-05 (Mon) | **Friday Schedule** — runs G/D/E/F at standard Friday times (compensates for Spring Family Weekend on Fri 4/9). **A, B, and C do not meet this Monday.** |
| 2027-04-08 (Thu) | **Modified Monday Schedule** — all 7 blocks (compressed): A 8:15, B 9:00, C 9:45, D 10:30, E 12:35, F 1:20, G 2:00 |
| 2027-04-26 (Mon) | **Modified Monday** — all 7 blocks; A–D at normal Monday times, afternoon shifted later: E 1:15, F 2:10, G 2:55 |
| 2027-05-03 (Mon) | **Wednesday Class Schedule** — E/F/G/D at standard Wednesday times |

**No-class days:**
| Date | Reason |
|------|--------|
| 2027-02-01 (Mon) | Mid-Winter Long Weekend return day — no classes |
| 2027-02-17 (Wed) | MRC Day |
| 2027-03-29 (Mon) | Easter Long Weekend return day — no classes |
| 2027-04-09 (Fri) | Spring Family Weekend — no classes |
| 2027-05-05 (Wed) | MRC Day |

**Breaks (no classes, campus may be closed):**
| Start | End | Name |
|-------|-----|------|
| 2027-01-30 | 2027-02-01 | Mid-Winter Long Weekend *(Fri 1/29 is a class day; 2nd semester begins Tue 2/2)* |
| 2027-02-27 | 2027-03-15 | Spring Break *(last class 2/26; resume 3/16)* |
| 2027-03-27 | 2027-03-29 | Easter Long Weekend *(Fri 3/26 is a class day — no afternoon options; resume 3/30)* |

**Exam period (Spring Assessments — grades 9–11):**
| Dates | Details |
|-------|---------|
| 2027-05-31 (Mon) | Exam Review Day (Memorial Day) |
| 2027-06-01 – 2027-06-04 | Spring Assessments |

Spring assessment order (two per day: 9:00–11:00 AM and 2:00–4:00 PM):
- Jun 1 (Tue): G Block (AM), F Block (PM)
- Jun 2 (Wed): E Block (AM), D Block (PM)
- Jun 3 (Thu): C Block (AM), B Block (PM)
- Jun 4 (Fri): A Block (AM)

*(Seniors finish earlier: last classes 4/30, Baccalaureate/Awards 5/28, Commencement 5/29.)*

---

## Workflow: Scheduling an Assignment

Follow these steps when a teacher asks you to schedule an assignment.

### Step 1: Identify the block

Ask the teacher which block(s) the assignment is for, unless you already know from context (e.g., you can see course section info in Canvas, or the teacher has already told you).

### Step 2: Understand the assignment

Read the assignment name and description (if available) to infer what kind of assignment it is:
- **Homework / reading / preparation** — students complete it before class — default due time is **start of class**
- **Classwork / in-class activity / lab** — completed during class — default due time is **end of class** (or later that day)
- **Project / paper / long-term** — could be end of day (11:59 PM) or start of class
- **Trip/flex-related assignment** — rare; ask the teacher for specifics

### Step 3: Check the target date

Before committing to a date, verify:
1. **Is it a school day?** Check against breaks, MRC days, and no-class days listed above.
2. **Does the block meet that day?** Use the weekly rotation table. Remember schedule overrides change which blocks meet.
3. **Is it a Week 1 Thursday?** Classes still meet normally, but there are no flex blocks (meetings during lunch). Only relevant if a flex trip was planned.
4. **Is it during exam period?** Regular assignments shouldn't be due during exams.
5. **Check the full assignment chain.** If this assignment is part of a sequence (e.g., a Harkness followed by an oral defense, or a rough draft before a final draft), verify that all dependent dates also fall on valid class days. Check surrounding days for holidays, overrides, and schedule disruptions that could cascade through the sequence.

If the target date doesn't work, suggest the nearest valid class meeting (usually the previous meeting, or the next one — ask the teacher which they prefer).

### Step 4: Check flex cycle

Determine the flex cycle week for the target date.
- **If it's a Week 1 Thursday:** Classes meet normally, but there are no flex blocks (meetings during lunch instead). Only flag this if the teacher mentioned a flex trip — otherwise it has no impact on scheduling.
- **Flex:** Do NOT adjust times for flex unless the teacher tells you a flex trip is happening on that day. Use normal block times by default. You may optionally note "This day has a flex slot for [Block]" as an FYI, but do not change any scheduling based on it.

### Step 5: Confirm with the teacher

Present the proposed due date and time with options:

> "I'd suggest setting [Assignment Name] due on **[date] at [time] (Eastern)**. That's the [start/end] of [Block] Block.
>
> Other options:
> - Start of class: [time]
> - End of class: [time]
> - End of day: 11:59 PM
> - Custom time
>
> Which would you prefer?"

If this is the first time working with a teacher, also ask about their preferences so you can remember them for future assignments:
- **Due time preference:** Start of class (default), end of class, 11:59 PM the night before, etc.
- **Multi-section handling:** Per-section due times at start of each block (default), a single due time for all sections, or something else?
- **Any other scheduling conventions** they follow (e.g., homework always due at start of class, projects always due end of day).

### Step 6: Set the date in Canvas

Use the Canvas Agent MCP tools:
- **For an existing assignment:** use `update_assignment_dates` with the ISO 8601 datetime
- **For a new assignment:** include `due_at` when calling `create_assignment`
- **For batch scheduling:** use `batch_update_dates`
- **If the assignment has section overrides** (`has_overrides: true` in assignment data): use `list_assignment_overrides` to see current overrides, then `update_assignment_override` to update each one, or use `batch_update_dates` with `section_dates` to update all overrides in one call.

**Multi-section courses (default):** For courses with multiple sections in different blocks, always use section-specific dates:
- **New assignments:** After creating the assignment, use `create_assignment_override` for each section with the correct block start time.
- **Existing assignments:** Use `batch_update_dates` with `section_dates` to set per-section times. The tool automatically detects whether overrides exist and handles them appropriately.

All times should be in **Eastern Time** (America/New_York). Convert to ISO 8601 format: e.g., `2026-12-01T08:15:00-05:00` (EST) or `2026-09-15T08:15:00-04:00` (EDT).

**Daylight saving time (26-27):** EDT (UTC-4) applies through **Oct 31, 2026** (clocks fall back **Nov 1, 2026**), then EST (UTC-5) through winter, then clocks spring forward on **March 14, 2027** back to EDT. So: school start through Oct 31 = `-04:00`; Nov 1 → Mar 13 = `-05:00`; Mar 14 onward = `-04:00`. Always verify the correct offset for the specific date.

---

## Worked Examples

These show the full reasoning from a teacher's request to a final ISO 8601 due datetime. Walk through the same checks every time.

**Example 1 — homework, start of class (simple case):**
Request: *"Set the B-block reading due at the start of class on Thursday, Nov 12, 2026."*
- B meets Thursday at **8:15 AM** (Thursday long-block layout).
- Nov 12 is a normal class day, not in a break/exam window. The week of Nov 9 is a Week 1 week, so it's a Week 1 Thursday → no flex blocks, but classes meet normally (no scheduling impact).
- Nov 12 is after the Nov 1 fall-back, so **EST (`-05:00`)**.
- **Result:** `2026-11-12T08:15:00-05:00`

**Example 2 — classwork, end of class, multi-section, EDT:**
Request: *"Lab writeup due at the end of class for my D-block and G-block sections on Wednesday, Sep 23, 2026."*
- Wednesday layout: **G meets 12:35–1:50 PM**, **D meets 2:00–3:15 PM**. End of class = the block's end time.
- Sep 23 is before the Nov 1 fall-back → **EDT (`-04:00`)**.
- Set **per-section overrides** (default for multi-section): G section → `2026-09-23T13:50:00-04:00`; D section → `2026-09-23T15:15:00-04:00`.

**Example 3 — a disrupted week (overrides + no-class days):**
Request: *"Homework due at the start of B block the week of Oct 12, 2026."*
- Walk the week: Mon Oct 12 = no classes (Fall Long Weekend return); Tue Oct 13 = No Classes; **Wed Oct 14 = runs a Monday schedule (all 7 blocks), so B meets that Wednesday at its Monday time, 9:00 AM**; Thu Oct 15 = normal (B at 8:15 AM); Fri Oct 16 = B doesn't meet.
- B's first meeting that week is therefore **Wed Oct 14 at 9:00 AM** — a day B normally wouldn't meet. Flag it: *"Note: Oct 14 runs a Monday schedule, so B block meets that Wednesday at 9:00 AM."*
- Oct 14 is before Nov 1 → EDT. **Result:** `2026-10-14T09:00:00-04:00` (or offer Thu Oct 15 at 8:15 AM if the teacher prefers B's normal day).

---

## Edge Cases and Special Situations

- **Assignment due on a Monday:** Monday has all blocks but they're short (~40 min). The due time should still be start or end of that block's Monday time slot.
- **Multiple sections in different blocks:** A teacher may have the same course in multiple blocks (e.g., D and G). By default, set **section-specific due times** using Canvas section overrides so each section's due time matches the **start of that section's block** on that day. Use `batch_update_dates` with `section_dates` for existing assignments, or `create_assignment_override` for new ones. On first use, ask the teacher if they prefer per-section times (the default), a single time for all sections, or another approach (see Step 5).
- **Recurring assignments (e.g., weekly reading):** Map out the full date range and flag any weeks where the schedule is disrupted (breaks, MRC days, overrides). Present the full list for review.
- **Night-before due dates:** Some teachers prefer homework due at 11:59 PM the night before class rather than at the start of class. If a teacher expresses this preference, remember it.
- **Schedule override + flex interaction:** On an override day (e.g., Monday running Wednesday schedule), the flex slot follows the override day's schedule using the actual calendar date's flex week. Example: Nov 2, 2026 (a Monday in a Week 2 week) runs a Wednesday schedule, so G has the flex slot. However, this only matters if the teacher confirms a flex trip is happening — use normal times by default.
