# Academic House Operator — What This Account Can & Cannot Do

**Purpose:** a plain-language reference for what an Academic House Operator account is allowed to do in the Univotel CRM. For the technical implementation, see `crm-partner-access-build-doc.md`.

---

## In one sentence

An Academic House Operator can **see and work the leads tied to Academic House properties** — viewing details, updating information, advancing the sale, and logging visits — but **cannot touch anything outside Academic House properties** and **cannot delete, archive, or otherwise destroy any data.**

---

## Why this account exists

Academic House dorms are sold through Univotel's pipeline, but **Academic House's own salespeople** meet the customers and run the property visits — Univotel staff don't. This account brings Academic House into the loop: it lets them see what's happening with their own sales cycle, keep lead information current, and record the visits and outcomes their team handles — all inside Univotel's shared knowledge base, scoped strictly to their own properties.

It is a **visibility-and-collaboration** account, not an administrative one. Leads are **not assigned** to Academic House Operators; they see leads because those leads are tied to Academic House properties, not because they "own" them. Univotel's team continues to see and work the same leads in parallel.

---

## Which leads they can see

An Academic House Operator sees a lead when that lead is currently tied to an Academic House property. "Tied to" follows a **priority order** — the furthest-along stage decides:

1. **If the lead has put down a deposit (kapora) on a room** → the lead belongs to whoever owns that room. If it's an Academic House room, they see it. If it's a competitor's room, they do **not**.
2. **Otherwise, if the lead has visited a property** → the lead belongs to whoever owns the visited property. Academic House visit → they see it. Competitor visit → they don't.
3. **Otherwise, by interest** → if the lead is interested in any Academic House property, they see it.

**Later stages override earlier ones.** A lead who was interested in Academic House but then visits or buys at a competitor **disappears** from the Academic House Operator's view — because the lead has moved on to a different property. This is intended: the account shows their _current_ prospects and customers, not everyone who ever glanced at their dorms.

> Because Academic House's own salespeople run Academic House visits, in normal operation a lead they're working stays visible to them throughout. A lead only disappears if it becomes attached to a _non_-Academic-House property later in the funnel.

They may also see, on a shared lead, the **other** properties that lead is interested in (including competitors') — this was deliberately left visible as harmless and occasionally useful context.

---

## What they CAN do

On leads tied to their properties:

- **View** all lead information — contact details, qualification info, conversation history, visit history, stage.
- **Add new leads** — but only leads interested in **Academic House properties** (they cannot create a lead for a competitor's property).
- **Edit qualification information** — budget, move-in timing, room preference, persona, university, notes, and similar details.
- **Advance the sale through the pipeline** — move a lead forward through the funnel stages (e.g., toward a deposit).
- **Log visits and visit results** — record that a visit happened and its outcome, for **Academic House properties** (since their salespeople run these visits).
- **Set the purchased room** — when a lead commits, record which **Academic House** room type they're buying.
- **Log contact** and **create tasks** on their leads.
- **Add placement notes** and read notes.

In the **Property Management System (PMS)**, for **Academic House dorms only**:

- **View** their dorms' rooms, occupancy, and who's placed where.
- **Place** customers into rooms, **relocate** within their dorms, **change room/property** within Academic House, and **vacate** a placement (free up a bed) — all for their own dorms.

---

## What they CANNOT do

**No destructive actions of any kind:**

- ❌ **Delete** anything — no lead, visit, or record can be deleted.
- ❌ **Archive** a lead.
- ❌ **Mark a lead as lost.**
- ❌ **Remove a property** from a lead's interested list. (They also can't _add_ one — the set of interested properties is managed by Univotel.)

**No actions outside their properties:**

- ❌ See, open, or edit any lead tied to a **non-Academic-House** property — these leads are invisible to them entirely.
- ❌ See other properties in the PMS — only Academic House dorms appear; other properties don't exist from their view.
- ❌ Set a lead's purchased room or visit result to a **competitor's** property.

**No assignment or ownership controls:**

- ❌ Reassign a lead to a different salesperson, or claim/unclaim leads.
- ❌ Change who a lead is assigned to.

**No access to Univotel-internal tools:**

- ❌ **Analytics / Team Panel** — no performance dashboards or company-wide numbers.
- ❌ **My Day** — the Univotel salesperson cockpit and personal performance views.
- ❌ **Global quick-search** — they cannot search across all leads (this would bypass their property scoping).
- ❌ **Notifications** — no inbound-call alerts or activity notifications.
- ❌ **Campaigns, archive, webhook logs, settings**, and other management tools.

---

## What they see when they log in

A trimmed interface containing only:

- **Their leads** — a list of leads tied to Academic House properties.
- **Their calendars** — visits and move-ins for Academic House properties.
- **Their tasks** — tasks on their leads.
- **The PMS** — Academic House dorms, rooms, and occupancy.

Everything else in the Univotel CRM sidebar is hidden.

---

## How it's protected

Access is enforced at the **database level** (not just hidden in the interface), so the boundaries hold even if someone tried to reach data directly. Every table that holds lead information carries a rule that checks property ownership before returning or accepting data. The restrictions above are guarantees, not just interface conveniences.

---

## Quick reference table

| Action                                  | Allowed? | Scope                                   |
| --------------------------------------- | :------: | --------------------------------------- |
| View lead info                          |    ✅    | Their properties' leads                 |
| Add a lead                              |    ✅    | Interested in their properties only     |
| Edit qualification info                 |    ✅    | Their properties' leads                 |
| Advance funnel stage                    |    ✅    | Their properties' leads (not to "lost") |
| Log visits & results                    |    ✅    | Their properties                        |
| Set purchased room                      |    ✅    | Their room types only                   |
| Log contact / create tasks              |    ✅    | Their properties' leads                 |
| Manage PMS (place/relocate/vacate)      |    ✅    | Their dorms only                        |
| Add notes                               |    ✅    | Their properties' leads                 |
| Delete anything                         |    ❌    | —                                       |
| Archive a lead                          |    ❌    | —                                       |
| Mark a lead lost                        |    ❌    | —                                       |
| Add/remove interested property          |    ❌    | —                                       |
| Reassign / claim leads                  |    ❌    | —                                       |
| See non-Academic-House leads            |    ❌    | —                                       |
| See other properties (PMS or otherwise) |    ❌    | —                                       |
| Quick-search                            |    ❌    | —                                       |
| Analytics / My Day / notifications      |    ❌    | —                                       |

_End of capability summary._
