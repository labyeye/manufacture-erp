# Production Planning & Calendar — ERP Specification

**Module:** Production Calendar (Machine-wise Scheduling)
**Applicable to:** Paper Cup / Bowl / Box / Bag Manufacturing (Sheet + Reel Divisions)
**Planning Horizon:** Rolling 7–14 days
**Version:** 1.0 — Draft for Development Review

---

## 1. Design Principles

1. **Machine-wise, not factory-wise.** Every scheduling decision is made per machine. There is no aggregated "factory capacity" number used anywhere in the algorithm.
2. **Rolling horizon of 7–14 days.** The scheduler always looks forward this many days. Older dates freeze into the production log and are not re-planned.
3. **Eligibility gates run before sorting.** A job that is not runnable (missing material, missing artwork, missing tool, predecessor stage incomplete) is never placed on the calendar, regardless of priority or due date.
4. **Due-date risk is the only trigger for overtime and night shift.** Backlog volume alone must not trigger OT.
5. **Automation computes, humans approve cost.** OT and night-shift slots are auto-scheduled with status "Pending Approval" and require supervisor sign-off before the shift opens.
6. **Minimum viable change on reschedule.** On a breakdown or urgent insertion, reschedule only the affected chain, not the whole calendar.
7. **Chained stages, one job card.** A job moves Printing → Lamination → Die Cut → Formation (or equivalent). Each stage auto-books after the previous one finishes, with a configurable buffer.
8. **Split across days on the same machine.** A job larger than one day's capacity is split across consecutive days on the same machine, not across different machines, to avoid duplicate setup.

---

## 2. Scope of Machines (per current shop floor)

**Sheet Division**

| Stage | Machines |
|---|---|
| Printing | Komori 28x40 |
| Varnish | Komori 28x40 (same machine, different process) |
| Die Cutting | Manual Die Cutter 1, Manual Die Cutter 2, Automatic Die Cutter |
| Lamination | Lamination Machine 1, Lamination Machine 2 |
| Formation — Dip Bowl | Dip Bowl Machine (40/100/125/180 ml) |
| Formation — Dip Bowl Lid | Single Layer Lid Machine (62/75/80/90 mm) |
| Formation — Paper Cup (SW) | Single Wall Paper Cup Machine (240/360/480 ml) |
| Formation — Paper Cup (DW) | Double Wall Paper Cup Machine (240/360/480 ml) |
| Formation — Soup Bowl 250 | Bowl 250ml Machine |
| Formation — Soup Bowl 350/400/650 | Bowl 350ml Machine |
| Formation — Soup Bowl 500 | Bowl 500ml Machine |
| Formation — Soup Bowl 750 | Bowl 750ml Machine |
| Formation — Soup Bowl Lid 110 | Lid 110mm Machine 1, Lid 110mm Machine 2 |
| Formation — Flat Bowl 500/750/1000 | Flat Bowl Machine 1 (500/750/1000 ml) |
| Formation — Flat Bowl 500/1000/1184 | Flat Bowl Machine 2 (500/1000/1184 ml) |
| Formation — Flat Bowl Lid 150 | Flat Bowl Lid Machine |
| Formation — Carton Erection (Salad Box, Boat Tray, Burger Box) | Carton Erection Machine 1, Carton Erection Machine 2 |

**Reel Division**

| Stage | Machines |
|---|---|
| Printing | Flexo Printing Machine |
| Bag Formation (with/without handle) | SBBM 360 Machine 1, SBBM 360 Machine 2 |
| Wrapping Paper | Sheet Cutting Machine |

**Scheduling implications:**

- **Komori is the single upstream bottleneck for the Sheet Division.** Every sheet-based product (cups, bowls, boxes, lids) that needs printing/varnishing funnels through one machine. Die Cut and Lamination also serve many downstream products. These three stage groups will be the hotspots; scheduler must protect them from fragmentation (cluster similar jobs, minimize changeovers).
- **Most formation machines are product-dedicated.** Product Compatibility in Machine Master is a discrete list of SKU families, not a GSM/size range.
- **Parallel capacity pairs exist:** Manual Die Cutter 1 & 2, Lamination 1 & 2, Lid 110mm 1 & 2, Carton Erection 1 & 2, SBBM 360 Machine 1 & 2. Scheduler must load-balance between these pairs. When a job can run on either, pick the one with less queued work on the target day; if equal, prefer the one whose Last Job Setup Signature is closer to the new job.
- **Sheet and Reel divisions are fully independent.** No cross-routing.
- **Automatic Die Cutter is higher throughput than Manual.** Scheduler prefers Automatic for large-qty jobs if compatible; Manual for small runs or when Automatic is booked.

---

## 3. Master Data Model

### 3.1 Machine Master

| Field | Type | Notes |
|---|---|---|
| Machine ID | PK | System-generated |
| Machine Name | Text | e.g., "Komori 28x40", "SBBM 360 Machine 1" |
| Process Type | Enum | Printing, Varnish, Die Cut, Lamination, Formation, Bag Making, Sheet Cutting |
| Division | Enum | Sheet / Reel |
| Active Status | Bool | Soft-disable without deleting |
| Current Status | Enum | Running / Idle / Breakdown / Under Maintenance |
| Standard Shift Hours | Decimal | e.g., 8.0 |
| Shift Start Time | Time | e.g., 08:00 |
| Shift End Time | Time | e.g., 16:00 |
| Max Shifts Allowed | Int | 1 / 2 / 3 |
| Overtime Allowed | Bool | |
| Max Overtime Hours | Decimal | Per-day cap (e.g., 4.0) |
| Second Shift Lead Time | Decimal (hrs) | Minimum notice required before second shift can open (default 24 hrs) |
| Weekly Off Days | Multi-select | Sun / Mon / ... |
| Planned Maintenance Hours | Decimal | Per week |
| Practical Run Rate | Decimal | Units/hr (already includes efficiency factor) |
| Efficiency Factor | Decimal (0.7–0.95) | Optional, for theoretical vs achieved tracking |
| Setup Time Default | Decimal (hrs) | First-job setup after idle / maintenance / weekly off |
| Changeover Time Default | Decimal (hrs) | Between two dissimilar jobs on same machine |
| Break Time | Decimal (hrs) | Deducted from shift hours |
| Capacity Unit | Enum | Sheets / Kg / Pcs / Meters |
| Product Compatibility | Multi-select | List of SKU families the machine can run (e.g., "Paper Cup 240ml SW, Paper Cup 360ml SW, Paper Cup 480ml SW") |
| Min Batch Size / Economic Run Length | Decimal | Below this, scheduler tries to club with similar jobs instead of running standalone |
| Priority Rank | Int | Tiebreaker when two machines can run the same job |
| Operator Requirement | Int + Skill Level | Informational in v1 (not a hard constraint) |
| Last Job Setup Signature | JSON | {GSM, size, die, reel_width, handle_type, SKU} of the most recent job — used to compute changeover cost for the next job |
| Parallel Machine Group | Tag | Machines that share workload (e.g., "Lamination Pair", "Carton Erection Pair", "SBBM 360 Pair", "Lid 110 Pair") |
| Dependent/Successor Machines | Multi-select | Typical downstream machines this feeds |
| Cost per Hour | Decimal | Optional |

### 3.2 Tooling Master — Cylinders, Dies, Plates

| Field | Type | Notes |
|---|---|---|
| Tool ID | PK | |
| Tool Type | Enum | Cylinder / Die / Plate |
| Linked SKU / Design Code | FK | Which product it belongs to |
| Compatible Machines | Multi-select | Machines that physically accept this tool |
| Current Status | Enum | Available / In Use / Under Recondition / Scrapped |
| Impressions Done | Int | Running count |
| Max Impressions Before Recondition | Int | Lifecycle trigger |
| Location | Text | Floor / Storage / Vendor Premises |
| Last Used Date | Date | |
| Reconditioning Lead Time | Int (days) | How long the tool is unavailable when sent out |

**v1 approach:** Full tracking for all three tool types. Cylinders and dies churn slowly (track seriously). Plates churn fast but you've chosen full tracking — plan for more data-entry load on the tool room.

### 3.3 Factory Calendar Master (Layer 1 — Factory-wide)

| Field | Type | Notes |
|---|---|---|
| Date | Date | PK |
| Type | Enum | Working / Holiday / Shutdown / Half-day / Power-cut |
| Reason | Text | e.g., "Diwali", "Annual maintenance", "Scheduled outage" |
| Affects All Machines | Bool | If false, it is a selective event (see Machine Maintenance) |

### 3.4 Machine Maintenance Calendar (Layer 2 — Machine-specific planned events)

| Field | Type | Notes |
|---|---|---|
| Machine ID | FK | |
| Start DateTime | DateTime | |
| End DateTime | DateTime | |
| Type | Enum | Planned Maintenance / PM Inspection / Tool Change / Cleaning |
| Reason | Text | |
| Hours Blocked | Decimal | |

### 3.5 Breakdown Log (Layer 3 — Ad-hoc unplanned events)

| Field | Type | Notes |
|---|---|---|
| Machine ID | FK | |
| Start DateTime | DateTime | When breakdown reported |
| End DateTime | DateTime | When resolved (null if ongoing) |
| Reason Code | Enum | Mechanical / Electrical / Tooling / Material Jam / Power / Other |
| Description | Text | |
| Reschedule Triggered | Bool | Whether this caused a calendar regeneration |

**Precedence for computing available hours on any machine-day:**
Breakdown Log > Machine Maintenance > Factory Calendar > Machine Master weekly off > Standard shift hours. Walk these in order.

### 3.6 Job Card (Parent) and Job Stage (Child)

**Model chosen:** one parent job card, chained child stages.

**Job Card (Parent):**

| Field | Type | Notes |
|---|---|---|
| Job Card ID | PK | |
| Order ID | FK | Sales order link |
| Client ID | FK | Inherits default client priority |
| Order Priority Override | Enum | Normal / Rush / Critical — overrides client default |
| Critical Approver | FK (User) | Required when Order Priority Override = Critical |
| Order Qty | Decimal | |
| Final Due Date | Date | Dispatch date committed to customer |
| Internal Due Date | Date | = Final Due Date − 24-hr safety margin (auto) |
| Dispatch Date | Date | Actual, on completion |
| Overall Status | Enum | Draft / Scheduled / In Progress / Completed / On Hold / Cancelled |

**Job Stage (Child):**

| Field | Type | Notes |
|---|---|---|
| Stage ID | PK | |
| Job Card ID | FK | |
| Sequence | Int | 1, 2, 3, ... |
| Process Type | Enum | Printing / Varnish / Die Cut / Lamination / Formation / Bag Making / Sheet Cutting |
| Stage Internal Due DateTime | DateTime | Back-calculated from Internal Due Date, subtracting downstream stage durations + buffers |
| Predecessor Stage ID | FK | Null for the first stage |
| Successor Buffer Hrs | Decimal | Cooling / QC gap before the next stage can start |
| Material Ready | Bool | Auto from inventory, stores can override (quality reject) |
| Artwork Approved | Bool | Manual flag by design/sales |
| Tool Ready | Bool | Auto from Tooling Master availability |
| Predecessor Complete | Bool | Auto-flipped when prior stage marked complete |
| Eligibility Status | Enum | Eligible / Blocked |
| Blocked Reason Codes | Multi-select | Material / Artwork / Tool / Prev Stage / Maintenance |
| Planned Setup/Changeover Hrs | Decimal | Computed at scheduling time |
| Planned Run Hrs | Decimal | = Qty ÷ Practical Run Rate |
| Planned Buffer Hrs | Decimal | Configurable safety |
| Planned Total Hrs | Decimal | Sum of the three |
| Scheduled Machine ID | FK | |
| Scheduled Start | DateTime | |
| Scheduled End | DateTime | |
| Actual Start | DateTime | |
| Actual End | DateTime | |
| Actual Qty Produced | Decimal | |
| Stage Status | Enum | Blocked / Eligible / Scheduled / Pending Approval / In Progress / Completed / Cancelled |

### 3.7 Calendar Output

| Field | Type | Notes |
|---|---|---|
| Calendar Entry ID | PK | |
| Machine ID | FK | |
| Date | Date | |
| Shift | Enum | Day / OT / Night |
| Start Time | DateTime | |
| End Time | DateTime | |
| Job Card ID | FK | |
| Job Stage ID | FK | |
| Process Type | Enum | |
| Scheduled Hours | Decimal | |
| Scheduled Qty | Decimal | For this slot only (partial if split across days) |
| OT Flag | Bool | |
| Predecessor Stage ID | FK | For chain traceability |
| Status | Enum | Scheduled / Pending Approval / Approved / In Progress / Completed / Rescheduled / Cancelled |
| Locked | Bool | Nightly reschedule will not move a locked slot |
| Reschedule Reason Code | Enum | Breakdown / Urgent Insertion / Material Delay / Artwork Pending / Tool Unavailable / Manual |
| Planned Start | DateTime | |
| Actual Start | DateTime | |
| Planned End | DateTime | |
| Actual End | DateTime | |
| Planned Qty | Decimal | |
| Actual Qty | Decimal | |

---

## 4. Core Formulas

### 4.1 Planned Hours per Stage

```
Planned Hours = Changeover/Setup Hours + Run Hours + Buffer Hours

Changeover/Setup Hours:
  IF this job's setup signature (GSM, size, die, reel width, handle type, SKU)
     matches the machine's Last Job Setup Signature:
       → minimum changeover (e.g., 0.25 hr for minor adjustments)
  ELSE IF machine is idle / post-maintenance / first job of shift / post weekly-off:
       → Setup Time Default (from Machine Master)
  ELSE:
       → Changeover Time Default (from Machine Master)

Run Hours = Order Qty ÷ Practical Run Rate

Buffer Hours = configurable percentage of Run Hours (e.g., 5–10%)
```

### 4.2 Stage Internal Due Date (back-calculation)

For each stage, starting from the last stage and walking backward:
```
Stage N Due DateTime         = Internal Due Date at 18:00 (or dispatch cut-off)
Stage (N-1) Due DateTime     = Stage N Due DateTime − Stage N Planned Total Hrs − Successor Buffer Hrs (of stage N-1)
Stage (N-2) Due DateTime     = Stage (N-1) Due DateTime − Stage (N-1) Planned Total Hrs − Successor Buffer Hrs (of stage N-2)
...
```
These internal stage due dates drive the sort score; if a stage's scheduled end exceeds its internal due date, the downstream chain is at risk.

### 4.3 Due-Date Risk Check (OT authorization trigger)

```
is_urgent = (Final Due Date − now ≤ 72 hours) OR job.is_delayed

at_risk = (Earliest Finish in Normal Hours > Internal Due Date)
         i.e., (Final Due Date − 24 hr safety margin)

Authorize OT IF:  at_risk AND is_urgent
Authorize Night Shift IF:  at_risk AND is_urgent AND OT alone insufficient
                            AND Second Shift Lead Time satisfied (≥24 hrs notice)
Escalate to planner IF:  at_risk AND is_urgent AND even night shift insufficient

Order Priority Override = Critical:
  → Relaxes the 72-hr urgency window. Critical orders can trigger OT
    even outside the 72-hr horizon.
  → Requires named Critical Approver on the order.
```

### 4.4 Job Score (weighted sort, replaces strict cascade)

```
score = w1 · due_date_urgency
      + w2 · delay_penalty
      + w3 · client_priority_weight
      + w4 · order_override_weight       (Rush=+X, Critical=+Y)
      − w5 · changeover_cost_if_placed_here

Eligible jobs are sorted by score (descending) per machine per day.
Weights (w1..w5) are configurable in a System Parameters table.
```

The negative changeover term allows a slightly-lower-priority job to be placed before a higher-priority one only when setup similarity saves significantly more time than the priority difference costs. Without this, setup similarity never wins — it is always the last tiebreaker and rarely affects the plan.

---

## 5. Scheduling Algorithm (Daily Nightly Run + Event-Driven)

### 5.1 Regeneration Triggers

- **Nightly full run** at configurable cut-off (e.g., 22:00): regenerates the rolling 7–14 day calendar from scratch, except for slots marked `Locked = true` or `Status = In Progress`.
- **Event-driven partial rerun** on any of:
  - Machine breakdown logged
  - New urgent order (≤72 hrs due OR Critical)
  - Material/artwork/tool flag flips to Ready for a blocked urgent job
  - Planner manually requests reschedule on a specific chain
  - Job completed earlier or later than planned by >2 hours (cascades to downstream stages)

Event-driven reruns affect only the chain of the impacted job and any machine-days downstream of it. The rest of the calendar is preserved to avoid plan churn.

### 5.2 Algorithm (pseudocode)

```
FUNCTION generate_calendar():
    horizon = next 14 days
    candidate_stages = all Job Stages where Stage Status ∈ {Eligible, Scheduled, Pending Approval}
                        AND Scheduled End is within horizon OR not yet scheduled

    FOR EACH stage IN candidate_stages:
        run eligibility_check(stage)
        IF blocked: move to Blocked Queue with reason codes; SKIP

    sorted_stages = sort(eligible_stages, by score DESC)

    FOR EACH stage IN sorted_stages:
        candidate_machines = machines where Product Compatibility matches stage.SKU
                              AND Active = true
                              AND stage.Tool is Compatible

        FOR EACH day IN horizon (starting from max(today, predecessor.scheduled_end + successor_buffer)):
            FOR EACH machine IN candidate_machines (sorted by parallel-group load + setup similarity):
                available_hrs = compute_available_hours(machine, day)
                                # Applies Breakdown Log, Machine Maintenance,
                                # Factory Calendar, weekly off in precedence order
                IF available_hrs ≥ stage.planned_total_hrs:
                    book_slot(stage, machine, day, shift=Day)
                    update machine.Last_Job_Setup_Signature
                    BREAK (next stage)

                ELSE IF can_split AND stage.remaining_qty ≥ min_batch_size:
                    book_partial_slot(stage, machine, day, shift=Day, hrs=available_hrs)
                    reduce stage.remaining_qty
                    CONTINUE to next day on same machine

        IF stage still not fully booked in normal hours AND stage is_urgent AND at_risk:
            attempt_ot_booking(stage)      # status = Pending Approval, OT Flag = Y
            IF still insufficient AND night shift allowed AND lead time satisfied:
                attempt_night_shift_booking(stage)  # status = Pending Approval, Shift = Night
            IF still insufficient:
                mark stage as "Cannot Meet Due Date" → Escalation Queue

        book all downstream stages of this job into their earliest feasible slots
        (chained: stage N+1 cannot start before stage N ends + successor_buffer)

    END FOR

    write all bookings to Calendar Output table
    send Pending Approval summary to supervisor dashboard
    send Blocked Queue summary to planner dashboard
    send Escalation Queue to planner + sales
END
```

### 5.3 Parallel-Machine Load Balancing

When two machines share a Parallel Machine Group tag (e.g., Lamination Pair, SBBM 360 Pair):
1. Compute total scheduled hours for each machine on the target day.
2. Prefer the machine with lower load.
3. If loads are equal (within ±30 min), prefer the machine whose Last Job Setup Signature is closer to the new job.
4. If still tied, use Priority Rank from Machine Master.

### 5.4 Splitting a Large Job

- Split across **consecutive days on the same machine** (to preserve setup).
- Do **not** split below Minimum Economic Run Length. If the residual is too small, either:
  - authorize OT on Day 1 to finish it, OR
  - push the whole job to start on Day 2.
- The scheduler evaluates both options and picks the lower-cost path (fewer OT hrs, or fewer days idle).

---

## 6. Eligibility Gates

A stage is `Eligible` only if **all** of the following are true:
1. **Material Ready** — auto-set from inventory/GRN match against BOM. Stores can override to `Rejected` if there is a quality issue (e.g., off-shade, damaged reel), which moves the stage back to Blocked.
2. **Artwork Approved** — manual flag by design/sales.
3. **Tool Ready** — auto from Tooling Master (tool Available, not Under Recondition, not In Use elsewhere at the target time).
4. **Predecessor Complete** — auto from previous stage status. For Stage 1, always true.

If **any** gate fails, the stage enters the **Blocked Queue** with reason codes. The Planner Dashboard shows blocked stages grouped by reason code and by internal due date, so the planner knows which blocks to chase first (e.g., blocked + due within 48 hrs → chase immediately).

Blocked stages are re-evaluated on every calendar regeneration; as soon as all gates clear, they become Eligible and enter the next scheduling run.

---

## 7. Approval Workflow (OT & Night Shift)

1. Scheduler writes OT / Night Shift slots with `Status = Pending Approval`.
2. A **Supervisor Dashboard** lists all pending slots, grouped by shift start time, with:
   - Machine, date, shift, hours
   - Linked job cards and urgency reason (why OT was authorized)
   - Estimated cost (Hrs × Cost per Hour) if Cost per Hour is populated
3. Supervisor **Approves** or **Rejects** each slot.
4. On **Approve**: slot status → `Approved` → visible to operators as a confirmed shift.
5. On **Reject**: slot is removed, and a mini-reschedule runs for the affected chain:
   - Try to accommodate in normal hours of the next day.
   - If still misses due date → stage goes to **Escalation Queue** (planner + sales notified).

Approval must happen before the shift's start time minus the machine's Second Shift Lead Time. A configurable auto-escalation triggers if the supervisor has not acted in time.

---

## 8. Dashboards (minimum set for v1)

### 8.1 Planner Dashboard
- **Blocked Queue** — stages waiting on Material / Artwork / Tool / Prev Stage, sorted by internal due date.
- **Escalation Queue** — stages flagged "Cannot Meet Due Date".
- **Calendar Heat Map** — machine × day matrix, color-coded by load % (green <80%, yellow 80–100%, red >100% i.e., needs OT/night).
- **Today's Plan vs Actual** — slot-level comparison from the Calendar Output table.

### 8.2 Supervisor Dashboard
- **Pending Approval Queue** — OT and Night Shift slots awaiting approval, with cost estimates.
- **In-Progress Now** — live list of running slots across all machines.
- **Breakdown Entry** — quick form to log a breakdown and trigger a reschedule.

### 8.3 Operator / Floor View (per machine)
- Today's scheduled slots for this machine, in order.
- Next 3 days preview.
- Tool/material/artwork readiness indicators per slot.

### 8.4 Sales / Customer-Facing View
- Order status and expected dispatch date (derived from the last stage's scheduled end + 24hr safety margin).
- Automatic alert when an order moves into the Escalation Queue.

---

## 9. Configuration Parameters (System Parameters table)

| Parameter | Default | Notes |
|---|---|---|
| Planning Horizon Days | 14 | Configurable 7–14 |
| Safety Margin Hours | 24 | Between last stage end and Final Due Date |
| Urgency Window Hours | 72 | Job is "urgent" if Final Due Date within this |
| Nightly Run Cut-Off Time | 22:00 | Local time |
| Score Weights w1..w5 | (50, 30, 20, 25, 15) | Tunable after pilot; see §4.4 |
| Buffer % of Run Hours | 7% | Per stage |
| Minimum Changeover Hours (matched signature) | 0.25 | |
| Supervisor Approval Auto-Escalation | 2 hrs before shift start | |
| Approval SLA to Critical Approver | 4 hrs | For Critical order escalations |

---

## 10. Edge Cases & Rules

1. **Same machine, same product family, back-to-back jobs** → minimum changeover; strongly preferred by the scoring term.
2. **Job spans weekly off** → split respects the off day; stage Planned End skips over the off day.
3. **Breakdown mid-shift** → the in-progress slot is stopped (Actual End = breakdown start time, Actual Qty = partial). A replacement stage is auto-generated for the remaining qty and enters the next scheduling run.
4. **Tool sent for re-chroming during a scheduled run** → must be blocked at creation time by the Tool Ready check; if a tool fails during a run, treat as a breakdown of the tool, stage stops.
5. **Varnish runs on Komori** — scheduler must treat Printing and Varnish as two sequential stages on the same machine with a changeover between them (not as parallel). This is unusual — worth calling out to the dev team.
6. **SBBM 360 Machine 1 & 2 both run bags with and without handle** — when both are free, assign to the one whose Last Job had matching handle type (saves changeover).
7. **Carton Erection Machines 1 & 2 both run all box types** — pure parallel, load-balance only.
8. **Flat Bowl Machine 1 and 2 overlap on 500ml and 1000ml only** — for those sizes, load-balance between them. For 750ml (only Machine 1) or 1184ml (only Machine 2), no choice.
9. **Critical orders** — relax OT trigger but still require Critical Approver on the order. Do not allow sales to silently upgrade every order.
10. **Locked slots** — planner can pin a slot to prevent the nightly rerun from moving it (e.g., promised to a VIP customer). Locked slots are respected by the algorithm as hard constraints.

---

## 11. Open Items for Phase 2 (explicitly out of scope for v1)

- Operator scheduling (skill matrix, shift rosters, leave management). Current v1 treats operator requirement as informational.
- Finite scheduling of ink/adhesive batches (currently assumed part of material readiness).
- Predictive breakdown analytics (usage-based PM triggers beyond fixed weekly PM hours).
- Cost-optimal assignment (currently scheduler is due-date-driven, not cost-driven).
- Multi-factory / multi-plant support.

---

## 12. Data Entry Dependencies Before Go-Live

| Master | Rows to Populate | Owner |
|---|---|---|
| Machine Master | ~25 machines as per §2 | Production head + maintenance |
| Tooling Master | All active cylinders, dies, plates | Tool room |
| Factory Calendar | 12–18 months of holidays/shutdowns | HR / Admin |
| Client Master priority defaults | All active clients (A/B/C tiers) | Sales |
| SKU → Machine compatibility | Every SKU mapped to its allowed machine(s) | Production head |
| SKU → Tool linkage | Every SKU linked to its cylinder/die/plate | Tool room + production |
| Practical Run Rates per machine × SKU | Measured over past 3 months | Production head |

Run rates are the single most impactful field — if these are wrong, every plan is wrong. Recommend 2 weeks of time-study before go-live and monthly recalibration afterward.
