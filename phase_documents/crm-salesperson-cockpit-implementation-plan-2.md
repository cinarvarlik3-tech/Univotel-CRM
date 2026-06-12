# Univotel CRM — Salesperson Cockpit & UX Overhaul Implementation Plan

**Date:** 2026-06-12
**Author:** Çınar (Lead Software Engineer) + Claude (architecture planning)
**Target:** Sonnet on Cursor (incremental, reviewable, reversible implementation)
**Production:** https://panel.marketinguni.app
**Stack:** Next.js 15 Pages Router, Cloudflare Workers, Supabase Postgres, TypeScript, Zod, shadcn/ui

> **Dependency note:** This update assumes the **Major Update** (Lead Hub, compartment tables, `visits`, task revamp, funnel consolidation) and the **Salesperson Job Easing & Tracking** update (My Day, `lead_stage_history`, `claimed_at`, message attribution) are both shipped to production. References to `visits`, `is_auto_created`, `claimed_at`, `lead_stage_history`, the compartment mapping, and My Day all come from those plans. This plan builds on top of them.

---

## Overview

This is a UI/UX overhaul that fundamentally reorganizes the CRM around a single goal: **make stalled leads visible and the next action one tap away.** The diagnostic finding driving it is the **funnel cliff** — leads arrive, accumulate at `yeni` (212 of ~230 active at audit time), and die there with empty fields and zero conversion. The CRM currently shows _inventory_ (here are 112 leads, all "Yeni", sorted by creation date) when salespeople need a _worklist_ (here is who to work, in what order, and the one thing to do with each).

The mechanical root cause, verified in code: **calls log that they happened but capture nothing.** A NetGSM CDR writes a `contact_history` note with `salesperson_id: null` and `status_changed: false` — no stage change, no information captured, no credit. A salesperson can call a lead, learn she is a Marmara student wanting Kadıköy with a September move-in, hang up, and the CRM still shows "Yeni / Bilinmiyor / Atanmamış." The conversation evaporates. The single highest-leverage thing this overhaul does is make **"log call outcome" — set stage + capture qualification info + credit the agent — a one-gesture action that salespeople actually complete during or right after a call.** Everything else (worklist sorts, the rebuilt slide-over, the "just called" surface, global quick-search) exists to funnel the agent into that gesture at the right moment.

### Success metric

Not "does it look nicer." The testable outcome is **do leads stop dying at `yeni`** — measured by the conversion ladder (yeni→downpayment, yeni→signed) moving off ~0%, and by the new "leads at yeni > 7 days" count trending down.

### Guiding design philosophy (applies to every screen)

**Display facts; give agents lenses they control; never impose a system verdict.** This is the explicit anti-pattern to the dead SLA system, whose permanently-red "110/112 breached" card trained everyone to ignore the single most attention-grabbing color in the app. Concretely, throughout this plan:

- No automatic urgency ranking as the default — urgency is an opt-in **sort**, not an imposed order.
- No per-stage staleness thresholds, no auto-stale flags, no default color-coding of urgency.
- Facts (last-contact age, days-in-stage) are **shown**; the agent decides what to do with them.
- "My Day = today's execution; the dedicated page = the full filterable picture" — a consistent split repeated across leads (compartments vs My Day), calls (Son Aramalar vs attention queue), and tasks (My Day task panel vs /görevler).

### Scope boundaries

- **In scope:** worklist sorts/pins, slide-over restructure, call-capture flow, inbound-call surface, CDR auto-advance, nav/layout, Team Panel rework, Tasks revamp, SLA removal, i18n/cleanup.
- **Not in scope (deliberately):** removing or merging compartment _pages_ (nav gets labeled/grouped, pages stay); SLA reintroduction (dead, may return later); the deferred phase-2 items called out inline (stage velocity metric, suggested-extraction capture).

### Hard constraints (called out in bold throughout — do not violate)

- **The NetGSM integration is frozen.** CDR fires post-hangup; it took extensive effort to stabilize and any regression is 2–3 days of recovery. CRM-side processing changes (`process-netgsm.ts` — what the CRM _does with_ a received CDR) are allowed; NetGSM config, bindings, and the webhook contract are **untouched**. Every NetGSM-adjacent change in this plan is CRM-side only.
- **All funnel-status writes route through `lib/leads/update-lead.ts` (`updateLeadRecord`)** so `lead_stage_history` always gets a row. This includes CDR auto-advance. Do **not** copy the `process-chatwoot.ts` pattern, which currently bypasses the chokepoint (a latent inconsistency, not a model to follow).
- **DNI is fully scrapped.** Only the company number `02129095244` is used. All CDRs are company-line. The `dni_numbers` table and DNI attribution machinery are vestigial — ignore, do not design around.

---

## Decisions log (D1–D27 quick reference)

| ID      | Decision                                                                                                                                                                                                                                                                                           |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1**  | Two one-click sorts on every list: last-contact (furthest-past on top) and created-at (newest on top). Per-agent **pin** floats a lead to the top of that agent's own view.                                                                                                                        |
| **D2**  | Time-in-stage tracked and **displayed, never penalizing**. `last_contact_at` is the displayed recency value.                                                                                                                                                                                       |
| **D3**  | No per-stage thresholds, no stale-flag logic, no auto color. Track and display only.                                                                                                                                                                                                               |
| **D4**  | Sorts + pin are a shared **capability on every list** (compartments, My Leads, Lead Hub). Compartments stay stage-scoped. My Day = roll-up + tasks + attention queue. **No central merged lead list.**                                                                                             |
| **D5**  | Per-stage primary next-action mapping (Claim/Call → Log call outcome → Mark contacted → Mark attended/failed → Mark contacted/Advance → Set move-in → Set actual move-in).                                                                                                                         |
| **D6**  | Urgency-on-top is the **opt-in sort** (D1), not the default. Default stays calm; no color wall.                                                                                                                                                                                                    |
| **D7**  | Slide-over: 7 tabs → 3 (Konuşma / Profil / Geçmiş). Konuşma default _if conversation exists, else Profil_. Profil tiered (Tier 1 qualification card, Tiers 2/3 nested+grouped). Pins personal+private.                                                                                             |
| **D8**  | Bottom sticky action bar: primary stage-action + secondary (log-contact, reassign) + **guarded** destructive (delete/archive confirm).                                                                                                                                                             |
| **D9**  | Empty fields: filled show normally; missing collapse into compact "eksik bilgi" inline-capture cluster (= the Chatwoot missing-info visibility).                                                                                                                                                   |
| **D10** | Identity bar (persistent, slim): name+phone, stage pill, assignee, channel icon, last-contact + days-in-stage pills, plus Ziyaret Planla + Görev Oluştur buttons kept in header. Two-location action model is deliberate.                                                                          |
| **D11** | Fullscreen = real two-column mode (conversation persistent one side, facts/history other).                                                                                                                                                                                                         |
| **D12** | Editable name; original auto-logged name preserved (new columns); lists show display name; side panel shows display name + auto-logged muted below; rename logs to Aktiviteler. No fallback for ugly auto-names (show as-is).                                                                      |
| **D13** | Last-contact + days-in-stage as **pills** on list rows and side-panel header. Days-in-stage from `lead_stage_history` with `created_at`/backfill fallback.                                                                                                                                         |
| **D14** | Phone = CRM capture surface. Inbound call → rate-limited "just called" surface (1/sec, queued-release). Global quick-search (name/phone, every screen) + recently-searched — **sole widened-visibility path**; lists stay tight RLS; cross-agent logging does **not** reassign. **NetGSM frozen.** |
| **D15** | Call-attention: toast + recent-calls record (My Day) + attention-queue backstop (unlogged calls persist until logged).                                                                                                                                                                             |
| **D16** | Remove all SLA UI (header cards, identity pill, analytics panel, rep column). Dead DB columns left alone.                                                                                                                                                                                          |
| **D17** | Kill card strips on all compartment lists (summary → My Day); manager Leadler page also bare; count in title badge.                                                                                                                                                                                |
| **D18** | Team Panel is canonical rep-performance surface; consolidate away from the old Overview rep table.                                                                                                                                                                                                 |
| **D19** | CDR auto-advance (all calls company-line): inbound-success→`bizi-aradı-konuştuk`, outbound-success→`arandı`, outbound-`(dur ?? 0)===0`→`arandı-açmadı`, inbound-missed→`aranacak`. **Forward-only.** No attribution. Via chokepoint, `source: 'netgsm'`.                                           |
| **D20** | All funnel writes (incl. CDR auto-advance) through the chokepoint → stage-history row.                                                                                                                                                                                                             |
| **D21** | Side-panel protects unsaved edits from background refresh; non-destructive "updated — refresh when ready" cue.                                                                                                                                                                                     |
| **D22** | Son Aramalar (Last Calls) = My Day section (in+out), one-tap log-info; unifies with attention queue.                                                                                                                                                                                               |
| **D23** | Per-field save-on-commit (blur/enter/select); **debounced/coalesced** Chatwoot push; one explicit "log outcome" button for the multi-write call gesture.                                                                                                                                           |
| **D24** | Always-open labeled sidebar, grouped: Günüm / Pipeline (Aktif satış → Kapanış → Özel durumlar) / Takvimler / Görevler / Yönetim (salesperson-hidden) / Ayarlar. Collapse opt-in.                                                                                                                   |
| **D25** | Team Panel rework: trash SLA/response-time; headline + secondary metric set; new metrics as SQL aggregations; message-count needs per-rep join.                                                                                                                                                    |
| **D26** | Distinct icon per destination + key buttons; row status iconography; content max-width (hard cap); no new nav entries.                                                                                                                                                                             |
| **D27** | Tasks full revamp: filterable backlog (server-side filters added), lead-picker creation (never UUID), auto/manual legibility. Daily execution stays on My Day.                                                                                                                                     |

---

## 1. Data foundation (migrations, schema, write-path fixes)

Everything else depends on this. Ships first (Phase A). Migrations continue from the current head (latest was `0073`); numbers below are illustrative — use the actual next available.

### 1.1 New columns — editable name with provenance (D12)

```sql
-- leads: preserve the auto-logged original; add an editable display name
ALTER TABLE leads ADD COLUMN auto_logged_name TEXT;   -- original from channel, never overwritten
ALTER TABLE leads ADD COLUMN display_name TEXT;        -- human-edited; null = use auto_logged_name
```

Backfill: `UPDATE leads SET auto_logged_name = lead_name WHERE auto_logged_name IS NULL;`

**Read rule:** effective name = `COALESCE(display_name, auto_logged_name, lead_name)`. Keep `lead_name` populated for backward-compat until all readers migrate; treat `auto_logged_name` as the immutable source.

**Write rules:**

- Create paths (`createLeadFromWebhook`, POST `/api/leads`) write `auto_logged_name` (and keep writing `lead_name` for compat).
- A rename writes `display_name` only — **never touches `auto_logged_name`.**
- `display_name` is added to `UpdateLeadSchema` and editable via `PATCH /api/leads/[id]` (currently `lead_name` is not in the PATCH schema at all).
- A rename appends an Aktiviteler entry: `"{eski} → {yeni} olarak yeniden adlandırıldı"`.
- **No fallback for ugly auto-names.** If `auto_logged_name` is `.`/`—`/blank, it displays as-is until a human renames. The phone is already the secondary line in every row, so blank names are not a rendering problem.

### 1.2 New table — per-agent pins (D7)

```sql
CREATE TABLE lead_pins (
  agent_id  UUID NOT NULL REFERENCES salespeople(id) ON DELETE CASCADE,
  lead_uuid UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, lead_uuid)
);
CREATE INDEX idx_lead_pins_agent ON lead_pins(agent_id);
```

**RLS:** an agent reads/writes only their own pins (`agent_id = auth.uid()`). Pins are **personal and private** — never visible to other agents or managers. A pin floats the lead to the top of that agent's own list view only.

### 1.3 New table — recently searched (D14)

```sql
CREATE TABLE recent_searches (
  agent_id   UUID NOT NULL REFERENCES salespeople(id) ON DELETE CASCADE,
  lead_uuid  UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, lead_uuid)
);
CREATE INDEX idx_recent_searches_agent ON recent_searches(agent_id, searched_at DESC);
```

Ephemeral convenience store; cap displayed history (e.g. last 10), prune older rows on write or via a light cleanup. Per-agent RLS as above. (Client-side storage is an acceptable alternative if you'd rather avoid a table — but a table survives device/browser changes, which matters mid-shift.)

### 1.4 `last_contact_at` — fix the writes (D2/D13, codebase item 3)

**Problem (verified):** `last_contact_at` updates **only** on the manual contact-log POST. CDR call notes and Chatwoot messages do **not** bump it. The "last contact" pill and the D1 last-contact sort — the spine of the worklist — are therefore blind to two of three contact channels and systematically wrong.

**Fix:** bump `last_contact_at` to `now()` wherever a contact occurs:

- **Manual contact log** — already does this. ✓
- **CDR call note** — in `process-netgsm.ts` `handleCdrForExistingLead`, add `last_contact_at` to the same update that writes the `contact_history` call row. **This is a CRM-side handler change, not a NetGSM integration change — allowed under the freeze.**
- **Chatwoot message** — in the `message_created` webhook path, bump `last_contact_at` on **every** message, **both inbound and outbound** (last_contact_at = "last time this lead was touched by anyone, either direction").

**No gap rule on `last_contact_at`** — it is a single cheap column overwrite with zero readability cost; it must always reflect the true most-recent touch. (The gap rule applies only to the activity timeline — see 1.5.)

### 1.5 Activity-timeline "talked via Chatwoot" — 2h gap (replaces 4h)

Distinct from 1.4. The activity timeline (Aktiviteler tab) must stay readable — a 20-message WhatsApp burst must not produce 20 timeline rows.

- A "Chatwoot üzerinden görüşüldü" event is written to `contact_history` only when there is a **≥2h gap** since the last Chatwoot interaction.
- **This 2h threshold replaces the existing 4h `message_start` threshold** (same mechanism, retuned from 4h to 2h).
- Individual messages are **not** written to the timeline; they live in the Konuşma tab. Recency vs. auditing are different concerns with opposite needs (always-latest vs de-duplicated).

### 1.6 Days-in-stage — `lead_stage_history` with fallback (D13, codebase item 6)

- Compute current-stage entry time from the latest `lead_stage_history` row for the lead (go-forward, clean).
- **Fallback:** leads with only the migration-`0073` backfill row (no real transition since) have no true stage-entry timestamp. For those, derive days-in-stage from `created_at` (or the backfill timestamp) and treat as approximate — do **not** show "0 days" or error.
- Migrate `funnel-view.ts` off its current `contact_history status_change` source onto `lead_stage_history` for consistency, applying the same fallback.

### 1.7 Funnel ordering comparator (D19 forward-only)

- `FUNNEL_STATUSES` in `lib/constants.ts` is the canonical ordered list and the source of truth (same values as Chatwoot funnel labels).
- Build a comparator: a target stage is "ahead" iff `FUNNEL_STATUSES.indexOf(target) > FUNNEL_STATUSES.indexOf(current)`.
- **Explicit handling required for:** `lost` (terminal, not on the linear path — never auto-advance to/from), `sözleşme-imzalandı` (terminal won), and visit substates. Auto-advance is a **no-op** when the lead is already at or past the target stage.

### Phase-A flagged checks (verify in code before/while building)

- **Message-count per-rep scoping:** the `lead_messages` branch in `getPerformancePayload` excludes campaigns (`sender_agent_id IS NOT NULL`) but does **not** scope per rep — it can inflate any rep's count with team-wide human sends, and uses Chatwoot user-ID strings, not `salespeople.id`. The D25 message-count column requires a **join to `salespeople.chatwoot_user_id`** for correct per-rep attribution. Fix before trusting the column.
- **DNI vestigial:** confirm DNI is fully scrapped and the `dni_numbers` machinery is dead; ignore, do not design around. (All CDRs are company-line.)
- **Chokepoint bypass:** `process-chatwoot.ts` writes `leads` directly + `writeStageHistory` separately, bypassing `updateLeadRecord`. CDR auto-advance must **not** copy this — use the chokepoint. (Optionally note the Chatwoot bypass as future cleanup; out of scope here.)

---

## 2. The worklist (lists, rows, sorts, pins)

The transformation from inventory to worklist is a **capability applied to every list** (D4), not a new page. Compartments stay stage-scoped so the per-stage next-action stays coherent. Same row component and same sort controls everywhere; My Day is the roll-up, not a fourth lead list.

### 2.1 Sort controls (D1, D6)

Every list (each compartment, My Leads, Lead Hub) gets two one-click sorts plus the default:

- **Default:** created-at, newest on top (calm; what exists, most-recent first).
- **Sort A — "En son temas" (last-contact, furthest-past on top):** the cold-lead lens / the urgency view. The lead nobody has touched longest rises to the top. This is the _opt-in_ urgency sort — there is no automatic urgency ranking and no default color wall (D6).
- **Sort B — "Oluşturulma" (created-at, newest on top):** explicit version of the default for when another sort is active.

Sorts are one click (a segmented control or sort dropdown in the list toolbar — the toolbar already exists; replace the single "Oluşturulma" sort with these). Sort is per-list, client-driven over the existing query params.

### 2.2 Pins (D1, D7)

- A **pin** icon on each row; one click pins/unpins.
- Pinned leads float to the **top of that agent's own view**, above whatever sort is active.
- **Personal and private** (D7): backed by `lead_pins` (§1.2); other agents and managers never see another agent's pins. A manager viewing the same compartment sees _their own_ pins, not the salesperson's.

### 2.3 Row anatomy (D5, D13)

A worklist row, left → right:

1. **Name** (effective name per §1.1) with **phone** as the secondary line beneath.
2. **Channel icon** — WhatsApp / NetGSM / Instagram, small, distinct (D26). Tells the agent _how_ to reach them.
3. **Stage pill** — current `funnel_status`, the existing "Yeni"-style pill.
4. **Two dwell pills** (D13): **last-contact age** ("3 gün önce") and **days-in-stage** ("8 gündür Yeni"), small and muted. Same two pills appear in the slide-over identity header (§3.1) — the row chip and the header chip are identical, so what you glance at in the list matches what you see on open.
5. **Primary next-action button** — the single D5 action for this lead's stage (see mapping below). One tap, performs the action without necessarily opening the panel where possible (e.g. "Mark contacted").
6. **Pin** icon.

Empty/dash columns (the current ÖĞRENCİ AŞAMASI = "Bilinmiyor" / OKUL YILI = "—" wall) are **not** rendered as dedicated columns in the worklist row — the row leads with name, state, dwell, and action. Detailed fields live in the slide-over. This kills the "wall of em-dashes" and the edge-to-edge column stretch.

### 2.4 Per-stage primary next-action (D5)

| Stage / compartment                                              | Primary action                              |
| ---------------------------------------------------------------- | ------------------------------------------- |
| `yeni` / Lead Hub                                                | **Claim / Ara**                             |
| `aranacak`, `arandı-açmadı` (Arama Bekliyor)                     | **Çağrı sonucu kaydet** (Log call outcome)  |
| `arandı`, `bilgi-verildi`, `bizi-aradı-konuştuk` (Nurture/Takip) | **İletişim kaydet** (Mark contacted)        |
| `ziyaret`                                                        | **Ziyaret durumu** (Mark attended/failed)   |
| `ziyaret-etti`, `teklif-gönderildi` (Ziyaret Sonrası)            | **İletişim kaydet / İlerlet**               |
| `kapora-alındı` (Kapora)                                         | **Taşınma tarihi gir** (Set move-in)        |
| `sözleşme-imzalandı` (Sözleşme)                                  | **Gerçek taşınma gir** (Set actual move-in) |

The compartment is stage-homogeneous, so the primary action is unambiguous per list — this is why compartments stay stage-scoped (D4) rather than being merged into one super-list.

### 2.5 List chrome cleanup (D17)

- **Remove the header card strips** on all compartment lists (the big blue AKTİF LEADLER / red SLA / ZAMANINDA quad). The count already lives in the title badge (e.g. "Arama Bekliyor 1"). Reclaim the vertical space for leads; summary tiles belong on My Day.
- The **manager Leadler (all-leads) page** also goes bare — managers have the Dashboard for summary.
- **Remove the SLA card entirely** (D16) — do not relocate it.
- **Content max-width** (D26): wrap list/table content in a hard max-width container so it stops spanning edge-to-edge on wide monitors. Tables get a readable measure instead of flinging name to the far left and the last column to the far right.

---

## 3. The slide-over (rebuilt around the task)

The highest-leverage screen — every lead interaction happens here. Today it fights the user: seven tabs, a header repeated on all of them eating ~40% of vertical height, the conversation buried below the fold, two redundant audit tabs, and a raw-JSON tab in a salesperson's face. The rebuild collapses it to **a slim persistent identity bar + three tabs + a bottom sticky action bar.**

### 3.1 Identity bar (persistent on every tab) — D10, D13

A slim zone, **two rows**, present on all tabs. **Carries identity + two actions + two dwell pills. No other actions.**

- **Row 1:** effective name (left) · stage pill · assignee · channel icon (right). Phone shown under the name (tappable to call). The **auto-logged name appears muted directly below the display name** when the lead has been renamed (D12 provenance — "geldiği ad: ~Fatma").
- **Row 2:** last-contact pill · days-in-stage pill — small, muted, the same two pills as the row (D13).
- **Two action buttons kept in the header** (D10, deliberate two-location model): **Ziyaret Planla** and **Görev Oluştur**, as proper buttons. All _other_ actions live in the bottom bar (§3.4).
- **Delete the SLA "İhlal edildi" pill entirely** (D16) — not relocated.

> Two-location action model is intentional: header = Ziyaret Planla + Görev Oluştur; bottom bar = stage-advance + log-contact + reassign + destructive. Do not "helpfully" consolidate them into one place.

### 3.2 Three tabs (D7)

Seven (Genel, Profil, Detay, Konuşma, Geçmiş, Aktiviteler, İşlemler) collapse to three:

- **Konuşma (Conversation)** — the synced WhatsApp thread. **Default tab on open _if a conversation exists_; otherwise default to Profil** (see §3.5 for the call-only empty-state). Reading what the lead said is the first thing a salesperson does; today it's buried 4th.
- **Profil** — merged Genel + Profil + Detay, tiered (§3.3).
- **Geçmiş** — merged history. The clean **Aktiviteler timeline** is the view. The old raw-JSON "Geçmiş" payloads are **demoted to a collapsed "geliştirici/sistem ayrıntısı" disclosure**, not a peer tab. (The two old tabs showed near-identical events in different formats — merge to the clean one.)
- **İşlemler is no longer a tab** — reassign/archive/delete move to the bottom action bar (§3.4), with destructive actions guarded.

### 3.3 Profil tiering (D7) — the careful part

Merging three tabs does not reduce the ~25 fields; it requires a hierarchy or it becomes one endless scroll. Three tiers **within** the single Profil tab:

**Tier 1 — Qualification card (always visible, top, flat, dense). Ordered exactly:**

1. Persona (öğrenci / veli)
2. Öğrenci cinsiyeti (gender)
3. Üniversite (university)
4. Üniversite yılı (uni year)
5. İlgilenilen otel (interested hotel)
6. Oda tercihi (room preference)
7. Bütçe (budget tier)
8. Taşınma zamanı (move-in timing)

Each Tier-1 field is **one-tap inline-edit** (per §3.6 save model). This is "what do I need to know/capture to advance this person." Reads as a compact card, not a vertical stack of full-width blocks.

**Tier 2 — Rest of the profile (one tap to expand; itself grouped, not a flat dump).** Sub-groups, each collapsible:

- _Kişi / İletişim:_ parent/student name, parent phone.
- _Eğitim:_ school shortname, campus.
- _Tercihler:_ language, district preference, dorm-awaiting.
- _Durum:_ nationality, special state, loss reason, notes.

**Tier 3 — System / source (demoted to the bottom, grouped, collapsed).** created-at, attribution/source_details, recommendation engine inputs/outputs. Most of Tier 3 should **relocate out of Profil**: created-at/channel/last-contact/days-in-stage already live in the identity bar; attribution lives under Geçmiş. Tier 3 ends up nearly empty by design.

**Empty-field treatment (D9):** filled facts render normally; missing fields collapse into a compact **"eksik bilgi"** cluster where each is a one-tap inline-capture. This cluster _is_ the Chatwoot missing-info visibility (D15) — no separate alarm mechanism. Heaviest in Tier 2.

> The exact sub-group taxonomy and the visual density of the Tier-1 card are the kind of structural calls best confirmed on the real component. Build Tier 1 first; review density before wiring Tiers 2/3.

### 3.4 Bottom sticky action bar (D8)

One slim bar, **same on every tab**, replacing the per-tab repeated header actions:

- **Primary:** the D5 stage-action for this lead's stage (the prominent button).
- **Secondary:** İletişim kaydet (log-contact), Reassign — one level down (secondary buttons / overflow).
- **Destructive, guarded:** Lead arşivle and Lead sil require a confirmation step. Today "Lead sil" is a naked red button one tab over — easy to hit. It must require intent.

### 3.5 Conversation empty-state for call-only leads (D7, codebase item 7)

Verified: pure NetGSM leads have `chatwoot_conversation_id = null`; the sync returns 404 and the UI shows red error text. Since Konuşma is the default tab:

- **Detect no conversation before syncing.** If `chatwoot_conversation_id` is null, do **not** call the sync endpoint.
- Show a friendly empty state ("Bu lead ile WhatsApp görüşmesi yok — telefon leadi"), not a red error.
- **Default to Profil** (not Konuşma) when there is no conversation, so a call-only lead opens to useful content.

### 3.6 Save model (D23) + edit protection (D21)

**Per-field save-on-commit, not per-keystroke and not a global save button:**

- Each field commits on **blur / enter / select** (combobox pick, date pick, dropdown select). No giant "Save" button to hunt for; no per-character writes.
- **Debounce/coalesce the Chatwoot push** (codebase item 4): each Tier-1 field PATCH currently fires an async `pushCustomAttributesToChatwoot`. Save-on-blur per field = one push per field = write amplification. Keep the **CRM save per-field** (instant local feel) but **batch the Chatwoot sync** within a short window into a single push.
- **One explicit "Çağrı sonucu kaydet / log outcome" button** for the call-capture gesture (§4) — the multi-write unit (stage + Tier-1 + `salesperson_id`) commits together, deliberately, attributed.

**Edit protection (D21):** background data (CDR auto-advance, the 15s Chatwoot poll) must **never** clobber a field mid-edit.

- Unsaved local edits always win until saved or explicitly discarded.
- When background data arrives for the open lead while editing, surface a **non-destructive cue** ("Bu lead güncellendi — yenile") the agent applies when ready — never a silent re-render that discards their work.
- This is a **general side-panel rule**, covering both CDR and the conversation poll, not a CDR special-case.
- _Scope note (verified):_ the panel today does **not** blindly re-fetch lead fields on the poll (poll is messages-only) and edits use explicit-save. So D21 is "add dirty-state guards for the new autosave-on-blur and any future global refresh," not a rework of existing clobbering. Lighter than it sounds.

### 3.7 Fullscreen two-column (D11)

Keep the fullscreen toggle, but make it a **real two-column mode**: conversation persistent on one side, facts/history on the other — so reading-while-editing doesn't require tab-flipping. The slide-over (non-fullscreen) stays single-column tabbed.

---

## 4. Capture-at-conversation & the call flow (the funnel-cliff attack)

This is the core of the overhaul. Capture splits by channel; the phone path is where the CRM is the data-entry surface and where the cliff is closed.

### 4.1 Two-track capture model

- **Chatwoot leads (messaging):** Chatwoot is the capture surface — agents set labels + custom attributes _in Chatwoot_, which sync into the CRM automatically. The CRM **receives** and **mirrors read-only**. The CRM's job is **not** to re-capture, but to (1) show the conversation for context (Konuşma tab) and (2) make the capture-gap visible via the D9 "eksik bilgi" cluster. **No in-CRM capture gesture is built for messaged leads** — it would duplicate the working Chatwoot flow. Given current low volume (~2 agents pre-season), the D9 cluster is sufficient; revisit only if season-open volume turns the trickle into a flood.
- **Phone leads (calling):** the CRM **is** the capture surface. The agent logs during or right after a call. This is where §4.2–§4.5 apply.

### 4.2 The log-outcome gesture (the keystone)

After a call, three things are un-done (verified: CDR writes a `contact_history` note only — no stage, no info, no credit). The **one explicit "Çağrı sonucu kaydet / log outcome" action** does all three in one gesture:

1. **Set stage** (confirm/correct — may already be auto-advanced by CDR, §4.4).
2. **Capture Tier-1 qualification info** (the §3.3 card — what was learned on the call).
3. **Stamp `salesperson_id` = the logging agent** (the only way a call gets credited — CDR cannot supply the agent).

Resolution: a called lead leaves the call-attention queue (§4.5) when this action has run. This is the measurable behavior the overhaul exists to drive.

### 4.3 Inbound-call surface — "just called" (D14)

**NetGSM is frozen; this is built entirely on the existing post-hangup CDR.** No new bindings, no API changes, no call-start event.

- When a CDR lands for a number matching a lead, surface a **"şu an arandı / az önce aradı"** notification, **global regardless of which screen the agent is on**, one tap → opens that lead's side panel.
- **Display includes:** CDR detail + **answered/missed** (call-responded-or-not).
- **Rate-limited: max 1 notification/second per agent.** Prime-time bursts (3–4 simultaneous) must not storm. **Queued-release:** suppressed notifications release one-per-second over following seconds. Spec a **queue-depth cap** so a sustained burst can't build a minutes-long backlog of stale toasts (propose: cap depth, drop oldest beyond cap — confirm on build).
- **Throttle the visual notification only, not CDR ingestion** — every call's `webhook_logs`/`contact_history` writes still happen; only the toast is rate-limited.

**Real-time delivery (codebase item 5 — design constraint):** there is **no push infrastructure** today (no Supabase Realtime / WebSocket / SSE). The closest pattern is the 15s Chatwoot poll. So "just called" is **near-real-time**: either (a) a short poll on a recent-calls endpoint, or (b) introduce a Supabase Realtime subscription on the relevant `contact_history`/calls write. Build (a) as the floor (no new infra, ships now); (b) is a worthwhile upgrade if real-time latency matters. **Off the existing post-hangup CDR, the realistic experience is "lead pops up the moment you hang up, ready to log," not live-during-ring** — which is the intended behavior, not a limitation.

**Recipient routing (codebase item 6 — open product decision, default specced):** CDR carries no `salesperson_id`, and the lead may be unassigned. There is no CDR→agent routing today (the existing assignee-notify is Chatwoot-chat only). **Default policy:** notify the lead's **assignee** if assigned; if unassigned, notify the **whole active sales pool** (anyone can claim/handle). Confirm/adjust on build.

### 4.4 CDR auto-advance (D19, D20)

**CRM-side processing change to `process-netgsm.ts` — NetGSM integration untouched.** All CDRs are company-line (DNI scrapped), so direction is always derivable (company number = caller → outbound; = callee → inbound).

**Mapping:**
| Call | Result stage |
|------|--------------|
| Inbound, successful (`(duration ?? 0) > 0`) | `bizi-aradı-konuştuk` |
| Outbound, successful | `arandı` |
| Outbound, `(duration ?? 0) === 0` (no answer) | `arandı-açmadı` |
| Inbound, `(duration ?? 0) === 0` (missed) | `aranacak` (callback owed) |

**Critical duration rule (codebase item 2):** NetGSM may send `null`, not `0`, for unanswered calls — and there is no test for the 0/missing case. **Use `(duration ?? 0) === 0`**, never `=== 0`, or missed calls silently fail to flag. Add a test for `sure: 0` and missing-duration.

**Forward-only (codebase item 1, §1.7):** auto-advance only moves a lead **onward** — `indexOf(target) > indexOf(current)`. No-op if the lead is already at or past the target (a routine check-in call on a `kapora-alındı` lead must not knock it back). `lost`/terminal handled explicitly.

**Routing & attribution:**

- **Routes through `updateLeadRecord` (the chokepoint, D20)** with `changedBy: null`, `source: 'netgsm'` — writes the `lead_stage_history` row and runs auto-task cancel/create. **Do not copy the `process-chatwoot.ts` bypass.**
- **No attribution** — CDR auto-advance never stamps `salesperson_id` (you don't have it; rep credit comes only from the manual log-outcome).

**Interaction with the manual flow (the happy path):** agent logs during the call → manually advances stage + captures info + stamps their `salesperson_id` → call ends → post-hangup CDR tries to auto-advance → **forward-only makes it a no-op** if the agent already moved the lead as far or further. No double-write, no conflict. The guard composes correctly with manual capture — preserve this property.

**Decoupling auto-advance from capture (important):** CDR auto-advancing the stage resets the _call_ urgency (a call demonstrably happened, lead leaves the "needs a call" queue) but **does not** reset the _capture_ urgency. A lead auto-advanced to `arandı` with empty Tier-1 fields **stays in the "called, not captured" attention state** until a human logs the info. Otherwise the cliff just moves one stage right.

### 4.5 Call-attention queue & Son Aramalar (D15, D22)

Three layers, one underlying fact (the `contact_history` call record) at three lifecycle states — **not** divided sources of truth:

1. **Toast** (§4.3) — real-time/near-real-time, ephemeral.
2. **Son Aramalar (Last Calls) — a My Day section** (D22), not a new sidebar entry. Per-agent, **inbound + outbound**, each row = lead · time · direction · answered/missed, with a **one-tap "log info"** into that lead's capture flow. The paper-to-CRM bridge for agents who write during the call and log after. Full recent history, including already-logged calls.
3. **Attention-queue backstop** — in My Day, the **unlogged** subset only: a called lead persists here until its outcome/info is logged. Resolution condition = the log-outcome action ran (§4.2).

**Single rule that keeps it un-confusing:** a call appears in the attention queue **iff** it has no logged outcome. Log it → leaves the queue (stays in Son Aramalar as history). One record, three renderings by state.

### 4.6 Global quick-search (D14)

The mid-call lead-finding tool — so the agent never hunts through tables while a phone rings.

- **Always accessible, every screen** (top-bar search or shortcut). Search by **name or number**; click result → opens that lead's side panel.
- **"Recently searched" list** opens on focus (backed by §1.3) — if an agent accidentally closes a panel, the lead is one tap to reopen, no re-typing.
- **Sole widened-visibility path (codebase item 5, decision 5a):** quick-search resolves **any** lead — own, unassigned, _or another rep's_ — so the mid-call flow always works. This requires a dedicated `SECURITY DEFINER` search path with broad visibility, **distinct from list RLS** (which stays tight: lists show own + unassigned only). Quick-search is the _only_ place a salesperson can reach another rep's lead.
- **Cross-agent logging does not reassign (decision 5a):** if Agent A opens Agent B's lead via quick-search and logs info / advances stage, the lead **stays in B's pool**. Verify the existing log-contact / advance-stage endpoints do **not** auto-claim or change `assigned_to` (claim is a separate explicit action). Flagged check.

---

## 5. Navigation & layout (D24, D26)

### 5.1 Sidebar — always open, labeled, grouped (D24)

- **Always expanded with labels by default** (labels exist on hover today; the resting state must show them). Manual collapse-to-rail is **opt-in**, not the default.
- **Grouped into labeled sections** (21 flat items → categories):

```
Günüm                      (My Day)
─ PIPELINE
  ─ Aktif satış:   Leadler (manager only) · Lead Hub · Leadlerim ·
                   Arama Bekliyor · Takip · Ziyaret Sonrası
  ─ Kapanış:       Kapora · Sözleşme · Taşındı
  ─ Özel durumlar: 24s Kısıtlı · Anlaşma Bekliyor
─ TAKVİMLER:       Ziyaret Takvimi · Taşınma Takvimi
─ GÖREVLER         (standalone)
─ YÖNETİM:         Analitik · Kampanyalar · Tesisler ·
                   Webhook Kayıtları · Arşiv · Eski leadler
Ayarlar            (bottom)
```

- **"Kapanış"** groups the closing run (Kapora, Sözleşme, Taşındı). Note: Kapora is **not** "Won" — downpayments can still fall through; "Kapanış" (closing) is the honest label. Taşındı (`has_moved_in`) is the successful terminal state and belongs here.
- **"Özel durumlar"** groups the non-progression flag-states (24s Kısıtlı = `is_24h_restricted`, Anlaşma Bekliyor = `deal_awaiting`) — these are booleans, not funnel stages.
- **Yönetim is hidden entirely for salespeople** (not shown-locked). Role-gated render.

### 5.2 Icons (D26)

- **Each destination gets a distinct, meaningful icon** — the currently-blurring clock variants (Arama Bekliyor / 24s Kısıtlı / Anlaşma Bekliyor) must be visually differentiated.
- **Important buttons also get distinct icons** (not just nav).
- **Row status iconography** (channel, the dwell pills) per §2.3.
- **No new nav destinations** — the goal is navigability of 21, not growth. "More icons" = better/distinct icons, never more pages.

### 5.3 Content width (D26)

- **Hard max-width container** on content (tables, lists, detail) so it stops spanning edge-to-edge on wide monitors. Content sits in a readable measure against the always-open sidebar. Reins in both laptop and ultrawide stretch.

---

## 6. Analytics & Team Panel (D16, D18, D25)

### 6.1 SLA removal (D16)

SLA is scrapped but still renders. **Remove all four surfaces:**

1. Lead-list header cards ("SLA İHLALİ 110").
2. Slide-over identity pill ("İhlal edildi").
3. Analytics Overview "SLA ihlal oranı" panel.
4. Rep-performance "ORT. YANIT (DK)" column.

Leave the dead `sla_status`/`sla_deadline` DB columns and the disabled cron **untouched** — this is UI removal only, no migration, lower risk.

### 6.2 Team Panel as canonical rep-performance surface (D18, D25)

Consolidate away from the old Overview rep table (drop it / its response-time column) toward the Team Panel, which is already built on the `lead_stage_history` instrumentation.

**Trash:** SLA breach, response-time (ORT. YANIT), and capture-rate (the conversion ladder measures the same thing in hard data — do not build a fuzzy field-fill metric).

**Headline metrics (at a glance per agent):**

- Lead count
- **Chatwoot message count** (critical — Univotel is a volume game; **requires the per-rep `salespeople.chatwoot_user_id` join fix**, §1 flagged check)
- Calls made/answered (inbound + outbound)
- Scheduled visits
- Downpayments
- Signed deals
- Four conversions: yeni→signed, yeni→downpayment, visit→downpayment, downpayment→signed

**Secondary / expandable:**

- Outbound connect rate (`arandı` vs `arandı-açmadı`)
- Loss-reason breakdown (distribution of `loss_reason`)
- Failure counts (24h-restricted, failed visits, failed deals)
- **"Leads still at yeni > 7 days" count** — the cliff-warning metric (hard data: stage + timestamp; computable immediately, no instrumentation). A leading indicator vs the lagging conversions.

**Deferred (phase 2):** stage velocity / avg days-in-stage — real but data too young (`lead_stage_history` only recently seeded) and heavier to compute.

**Build notes (codebase item, D25):**

- New metrics (four ratios, connect rate, loss breakdown, stale-aggregate) are **net-new** — only one conversion ratio exists today.
- Implement as **SQL aggregations / RPC**, not in-memory paging — `fetchAllRows` caps at 1000 rows/page × 10 pages = 10k rows; heavy aggregations will exceed that.

**Presentation (D25, D26):** cluster the columns (Volume / Funnel / Outcomes / Conversions) under the content max-width — not a flat 14-column wall. Rows clickable to per-agent focus (already exists; preserve).

---

## 7. Tasks revamp (D27)

The `/görevler` page is currently a developer artifact (a create-form with a required raw **"Lead UUID"** field, on top of a flat list). Full revamp, three jobs — none of which My Day's task panel does (My Day = today's execution; /görevler = the full filterable picture).

### 7.1 Filterable backlog

All tasks (managers) / own tasks (salespeople), filterable. **Add server-side filtering to `/api/tasks`** (today filtering is client-only; the API has no server-side filters):

- **Status:** open / overdue / completed / cancelled
- **Kind:** auto vs manual (`is_auto_created`)
- **Type:** the `auto_task_type` set (verified implemented: `nurture_reminder`, `post_visit_nurture_reminder`, `visit_reminder`, `move_in_reminder`, `visit_resolution`, `failed_visit_followup`)
- **Lead:** all tasks for a given lead
- **Assignee:** managers only
- **Due window:** date range

Same filter philosophy as the lead lists, applied to tasks.

### 7.2 Lead-picker creation (kill the UUID field)

- Replace the raw "Lead UUID" input with the **§4.6 quick-search lead-picker** (name/phone → select). Never a UUID paste.
- When a task is created from a lead's side panel ("Görev Oluştur", §3.1), the lead is **pre-filled** — the standalone picker is only for the "starting from the Tasks page" case.
- Fields: lead (picker), type (manual subset, e.g. `geri arama`), due (date/time), assignee (defaults to self; managers can assign), notes. Created `is_auto_created: false` so they survive stage transitions.

### 7.3 Auto/manual legibility

- **Auto-tasks get a distinct visual marker** (icon + `auto_task_type` label, per D26) so a system reminder is distinguishable from a deliberate manual task.
- Convey lifecycle ("bu otomatik hatırlatma aşama değiştiğinde kapanır") so a vanished auto-task isn't a mystery.

### 7.4 Boundaries

- **No inline daily-work actions here** — those live on My Day's task panel. Opening a task from /görevler **deep-links to the lead's side panel** (where the work happens).
- **Single-task interaction in v1; bulk actions (multi-complete/reassign) deferred.**

---

## 8. Cleanup punch list (rides alongside)

Low-risk, high-visibility. All confirmed from diagnosis.

1. **i18n `{COUNT}` literal** on the Lead Hub card ("{COUNT} SAHİPSİZ LEAD") — broken interpolation; fix.
2. **"DEAL AWAITING"** red English on Anlaşma Bekliyor rows → Turkish ("Anlaşma bekliyor") + **orange** (not red — it's a neutral parked state, not a problem; red is reserved for genuine problems).
3. **English activity strings** ("Stage set to yeni", "First contact — lead created", "Duplicate submission detected — lead not created") — server-generated, never routed through i18n. Route through the catalog so they render Turkish.
4. **Görevler UUID field** — covered by §7.2 (lead-picker).
5. **Button casing** — standardize capitalization (currently "Ulaşıldı olarak işaretle" / "görüntüle" / "Görev oluştur" / "Talep Et" are inconsistent).
6. **Empty states** — leave bare ("Lead bulunamadı.") — no per-screen copy (decision).
7. **SLA removal** — = §6.1.
8. **"DEMO" seed data** in calendars — dev seed; clears with real data, do not design around.

---

## 9. Flagged checks (verify in code before/while building — don't assume)

| #   | Check                                                                             | Gates       | Resolution                                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Stale-label sync: outbound `setConversationLabels` removes the prior funnel label | D16         | **Verified OK** — outbound cleans stale labels; CRM column always single-valued; Chatwoot UI may briefly hold two until next push (acceptable lag, not a bug).                           |
| 2   | Message-count per-rep scoping                                                     | D25         | **Fix required** — `lead_messages` branch excludes campaigns but isn't scoped per rep and uses Chatwoot user IDs. Add join to `salespeople.chatwoot_user_id` before trusting the column. |
| 3   | DNI fully scrapped / vestigial                                                    | D19, global | Confirm `dni_numbers` machinery is dead; ignore. All CDRs company-line.                                                                                                                  |
| 4   | Chokepoint callable from webhook                                                  | D19/D20     | **Verified OK** — `updateLeadRecord` works from webhook with `source: 'netgsm'`, `changedBy: null`.                                                                                      |
| 5   | Don't copy `process-chatwoot.ts` chokepoint bypass                                | D19/D20     | Chatwoot writes `leads` directly + `writeStageHistory` separately. CDR auto-advance must use `updateLeadRecord`, not this pattern.                                                       |
| 6   | Cross-agent log-contact / advance does not auto-claim                             | D14 (5a)    | Verify log-contact/advance endpoints don't change `assigned_to`. Claim is separate.                                                                                                      |
| 7   | CDR duration null vs 0                                                            | D19         | **Confirmed risk** — use `(duration ?? 0) === 0`; add test for `sure: 0` and missing duration (none today).                                                                              |
| 8   | CDR direction derivable for all calls                                             | D19         | **OK given DNI scrapped** — all company-line → direction always derived.                                                                                                                 |

---

## 10. Migration sequence

Continue from the actual current head (latest was `0073`). Apply in order; run `pnpm gen:types` after.

| Migration | Purpose                                                                                                  | Section |
| --------- | -------------------------------------------------------------------------------------------------------- | ------- |
| 00XX      | `leads.auto_logged_name` + `leads.display_name`; backfill `auto_logged_name = lead_name`                 | §1.1    |
| 00XX      | `lead_pins` table + RLS (per-agent private)                                                              | §1.2    |
| 00XX      | `recent_searches` table + RLS (or skip if client-side store chosen)                                      | §1.3    |
| 00XX      | Quick-search `SECURITY DEFINER` RPC with broad visibility (distinct from list RLS)                       | §4.6    |
| 00XX      | Team Panel aggregation RPC(s) for new metrics (four ratios, connect rate, loss breakdown, stale-at-yeni) | §6.2    |

**No migration needed for** (code-side only): `last_contact_at` write fixes (§1.4), 2h timeline threshold (§1.5), days-in-stage source switch + fallback (§1.6), forward-only comparator (§1.7), CDR auto-advance (§4.4), Chatwoot push debounce (§3.6), `display_name` in `UpdateLeadSchema`, server-side task filters (§7.1), SLA UI removal (§6.1).

After all migrations: `pnpm gen:types`.

---

## 11. Delivery phases

Sized for incremental, reviewable, reversible implementation (Sonnet on Cursor, screen-by-screen review). **Phase A is foundational — everything else depends on it.** Within B–F, each item is self-contained enough to build, review, and correct before the next.

### Phase A — Data foundation & write-path correctness (ship first, together)

1. Migrations: `auto_logged_name`/`display_name`, `lead_pins`, `recent_searches`, quick-search RPC. `pnpm gen:types`.
2. `last_contact_at` write fixes — manual (exists) + CDR (`process-netgsm.ts`, CRM-side) + Chatwoot message (both directions) (§1.4).
3. Activity timeline 2h threshold replaces 4h (§1.5).
4. Days-in-stage on `lead_stage_history` + `created_at` fallback; migrate `funnel-view.ts` (§1.6).
5. Forward-only comparator on `FUNNEL_STATUSES` with `lost`/terminal handling (§1.7).
6. `display_name` into `UpdateLeadSchema` + rename → Aktiviteler log (§1.1).
7. Flagged checks #2 (message-count join), #3 (DNI), #6 (no auto-claim), #7 (duration null test).

### Phase B — CDR auto-advance & call backbone

1. CDR auto-advance in `process-netgsm.ts`: mapping, `(duration ?? 0)` rule, forward-only, via chokepoint `source: 'netgsm'`, no attribution (§4.4). **NetGSM config untouched.**
2. Decouple auto-advance from capture urgency (§4.4).
3. Recent-calls data path (the source behind toast / Son Aramalar / attention queue) (§4.5).

### Phase C — The slide-over rebuild (centerpiece)

1. Identity bar: slim two-row, dwell pills, provenance name, two header buttons, SLA pill removed (§3.1).
2. Three-tab collapse; Konuşma default-if-conversation-else-Profil; call-only empty-state (§3.2, §3.5).
3. Profil tiering — build Tier 1 first, review density, then Tiers 2/3 grouped + "eksik bilgi" cluster (§3.3).
4. Bottom sticky action bar with guarded destructive (§3.4).
5. Per-field save-on-commit + debounced Chatwoot push + edit protection (§3.6).
6. Fullscreen two-column (§3.7).

### Phase D — Worklist & capture gesture

1. Row component: name/provenance, channel icon, stage pill, two dwell pills, primary action, pin (§2.3).
2. Two sorts + pin on every list; list chrome cleanup (kill card strips, max-width) (§2.1, §2.2, §2.5).
3. Per-stage primary next-action wiring (§2.4).
4. The log-outcome gesture: stage + Tier-1 + `salesperson_id` in one action (§4.2).

### Phase E — Call surface, quick-search, My Day sections

1. Global quick-search + recently-searched; widened-visibility RPC path (§4.6).
2. "Just called" surface: near-real-time delivery, 1/sec queued-release, answered/missed, recipient routing (§4.3).
3. My Day: Son Aramalar section + call-attention queue (unlogged backstop) (§4.5).

### Phase F — Nav, layout, analytics, tasks, cleanup

1. Sidebar always-open + grouped + distinct icons; content max-width (§5).
2. SLA UI removal (all four surfaces) (§6.1).
3. Team Panel rework: metrics, SQL aggregations, clustered presentation (§6.2).
4. Tasks revamp: server-side filters, lead-picker creation, auto/manual legibility (§7).
5. Cleanup punch list: i18n `{COUNT}`, DEAL AWAITING→orange+TR, English activity strings, button casing (§8).

### Phase G — Testing & verification

1. Unit tests: forward-only comparator, `(duration ?? 0) === 0` missed-call, conversion-credit, message-count campaign+per-rep exclusion, "today"/"this week" Istanbul boundaries.
2. Verify every funnel write routes through the chokepoint (grep for direct `funnel_status` updates; CDR path included).
3. Verify cross-agent log doesn't reassign; verify quick-search resolves others' leads while lists stay tight.
4. Smoke: inbound CDR → toast → open → log-outcome → forward-only no-op on the post-hangup CDR.
5. Confirm campaign sends excluded from message counts on a real payload.

---

## 12. What this plan deliberately does NOT do

- Reintroduce SLA (dead; may return as a separate future pass).
- Build in-CRM capture for Chatwoot-messaged leads (Chatwoot is their capture surface; D9 cluster surfaces gaps).
- Suggested/automatic extraction of fields from chat text (designed-for, deferred — needs a Turkish extraction model validated separately).
- Live-during-ring call notification (gated on a NetGSM call-start event we are deliberately not pursuing — NetGSM frozen).
- Stage-velocity / avg-days-in-stage metric (phase 2 — data too young).
- Remove or merge compartment pages (nav is labeled/grouped; pages stay).
- Touch the NetGSM integration config/bindings (frozen — CRM-side processing only).
- Bulk task actions (v1 single-task; deferred).

---

_End of plan. This document is the frozen spec for the salesperson cockpit & UX overhaul. Decisions D1–D27 and flagged checks #1–#8 are authoritative; deviations should be confirmed with the lead engineer. Update on major scope change._
