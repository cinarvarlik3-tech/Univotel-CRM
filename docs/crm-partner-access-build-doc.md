# Univotel CRM — Partner Access & Academic House Operator Role (Build Doc)

**Date:** 2026-06-15
**Companion to:** `crm-pms-implementation-plan.md` (the PMS plan references this doc's `partners` table + `partner_id` foundation for its property-filter branch)
**Target:** Cursor (Sonnet) — build as its own phase; the RLS layer is a security boundary and must be reviewed as one unit
**Stack:** Next.js 15 Pages Router, Supabase Postgres (RLS), TypeScript, Zod, shadcn/ui

---

## 1. Overview

Academic House is a business partner whose dorms (properties) are sold through Univotel's pipeline, but whose **own salespeople** meet customers and run visits. This role brings them "into the fold": an **Academic House Operator** can see and work the leads tied to _their_ properties — view info, edit qualification data, advance stages, log visit results, manage their own dorm's PMS — **without touching anything outside their properties** and **without any destructive power**.

This is the CRM's first **partner-tenancy** layer. It is enforced entirely at the **database level via RLS**, not in application code, because partner isolation is only as tight as the loosest-guarded table — and app-layer checks are too easy to forget on one query. One reusable visibility function + RLS on every lead-related table is the whole strategy.

### 1.1 Core principles

1. **Property ownership is data.** A `partners` table + a `partner_id` FK on `properties` defines which properties belong to which partner. Nothing is inferred from names.
2. **One visibility function, applied everywhere.** `lead_partner_owner(lead_uuid)` returns the partner that "owns" a lead via a **precedence cascade** (§4). RLS on every lead-related table calls it. One predicate, no per-table reinvention.
3. **Visibility is a precedence cascade, not an OR.** The furthest-along stage with a hotel attached determines ownership: `purchased_room` > `visit_hotel` > `interested properties`. Later always wins; a lead **disappears** from the partner when overridden to a non-partner property (§4).
4. **No destructive power.** The role cannot delete, archive, mark loss, or remove interested properties. Enumerated in §6.
5. **Writes are constrained, not just gated.** `WITH CHECK` policies ensure any lead they create or any hotel-attaching field they set stays within their own properties (§6). They can't inject leads into others' pipelines or pull leads into their view by editing access-controlling fields.
6. **Minimal surface.** The role reaches leads + lead-related tables + their own PMS. It is **excluded** from quick-search, analytics, My Day, and notifications (§8).

### 1.2 Scope note — leads are NOT assigned to partners

Academic House Operators are **not** Univotel salespeople and leads are **not** `assigned_to` them. Visibility is purely property-based (the cascade), independent of `assigned_to`. Univotel's own team still owns/works these leads in parallel; the partner sees the same leads through the property lens. This is **additive visibility**, not exclusive ownership — both Univotel staff and the partner see a partner-owned lead (the partner via the cascade, staff via normal RLS).

---

## 2. Schema — partner ownership foundation

### 2.1 `partners` table

```sql
CREATE TABLE partners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,                 -- "Academic House"
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- seed
INSERT INTO partners (name) VALUES ('Academic House');
```

### 2.2 `partner_id` on `properties`

```sql
ALTER TABLE properties
  ADD COLUMN partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;
-- NULL = Univotel-owned (no partner). Set Academic House properties to AH's partner id.
CREATE INDEX idx_properties_partner ON properties(partner_id);
```

> A property has at most one partner (FK, not join table) — confirmed sufficient. If co-ownership ever arises, this becomes a join table, but start with the FK.

### 2.3 Linking an Operator account to a partner

The role needs to know _which_ partner the logged-in Operator belongs to. Add `partner_id` to the user/salespeople record:

```sql
ALTER TABLE salespeople
  ADD COLUMN partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;
-- NULL for normal Univotel staff; set to AH's id for Academic House Operators.
```

The role itself is a new value in the role enum/check (§7). `partner_id` + `role = 'partner_operator'` together define an Academic House Operator. (Keeping role and partner separate lets you onboard a second partner later without new roles — just a different `partner_id`.)

### 2.4 Interested-hotel → array column (multi-select)

Interested-hotel becomes multi-select. Implemented as an **array column** (per-viewer filtering was dropped — partners may see all of a lead's interests, so no join table needed):

```sql
-- if currently a single uuid/text column, migrate to:
ALTER TABLE lead_details ADD COLUMN interested_property_ids UUID[] DEFAULT '{}';
-- backfill from the existing single field, then deprecate the old column once readers migrate
CREATE INDEX idx_lead_details_interested_gin ON lead_details USING GIN (interested_property_ids);
```

- The GIN index makes the array-overlap check (`&&`) in the cascade fast at scale (optional at current volume, cheap insurance).
- **Chatwoot sync** must become multi-value: the interested-hotel custom attribute is now a set; sync reconciles add/remove deltas both directions (not a single-value overwrite). This is in scope regardless of the partner role (you're going multi-select anyway) — but spec the merge carefully where both CRM and Chatwoot can change the set.

### 2.5 Confirm: the `visit_hotel` field

The cascade references a "visit hotel" — the property a lead visited. **Confirm the actual column** (likely on `visits.property_id`, or a denormalized field on the lead). The cascade's visit path uses the property of the lead's visit(s). If a lead can have multiple visits to different properties, define which counts (most recent visit's property is the sensible choice). **Flag for confirmation during build.**

---

## 3. The reusable property-set helpers

Two SQL helpers the cascade and RLS lean on:

```sql
-- the partner the current user belongs to (NULL for Univotel staff)
CREATE OR REPLACE FUNCTION current_partner_id() RETURNS UUID AS $$
  SELECT partner_id FROM salespeople WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- is the current user a partner operator?
CREATE OR REPLACE FUNCTION is_partner_operator() RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'partner_operator';
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

(Adjust `get_user_role()` to your existing role accessor.)

---

## 4. `lead_partner_owner()` — the precedence cascade

The heart of partner visibility. Returns the `partner_id` that owns a lead, by the **furthest-along stage that has a hotel attached**. Later stages override earlier ones.

```sql
CREATE OR REPLACE FUNCTION lead_partner_owner(p_lead_uuid UUID) RETURNS UUID AS $$
DECLARE
  v_partner UUID;
  v_visit_property UUID;
BEGIN
  -- 1. PURCHASED ROOM wins if set: purchased_room (room_type) → hotel_id → partner_id
  SELECT p.partner_id INTO v_partner
  FROM lead_details ld
  JOIN room_types rt ON rt.id = ld.purchased_room
  JOIN properties p ON p.id = rt.hotel_id
  WHERE ld.lead_uuid = p_lead_uuid AND ld.purchased_room IS NOT NULL;
  IF FOUND THEN RETURN v_partner; END IF;

  -- 2. VISIT HOTEL next: the property of the lead's (most recent) visit
  SELECT p.partner_id INTO v_partner
  FROM visits v
  JOIN properties p ON p.id = v.property_id
  WHERE v.lead_uuid = p_lead_uuid
  ORDER BY v.scheduled_date DESC NULLS LAST
  LIMIT 1;
  IF FOUND THEN RETURN v_partner; END IF;

  -- 3. INTERESTED PROPERTIES last: any interested property's partner.
  --    (A lead can be interested in multiple; this returns a partner if ANY interested
  --     property belongs to one. With multiple partners interested, see note below.)
  SELECT p.partner_id INTO v_partner
  FROM lead_details ld
  JOIN properties p ON p.id = ANY(ld.interested_property_ids)
  WHERE ld.lead_uuid = p_lead_uuid AND p.partner_id IS NOT NULL
  LIMIT 1;
  IF FOUND THEN RETURN v_partner; END IF;

  RETURN NULL;  -- Univotel-owned / no partner
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### 4.1 How RLS uses it

A partner operator sees a lead iff the lead's owner partner equals theirs:

```sql
-- visibility predicate used in every lead-related RLS policy:
lead_partner_owner(<lead_uuid_for_this_row>) = current_partner_id()
```

For Univotel staff (`current_partner_id()` IS NULL, `is_partner_operator()` false), their **existing** RLS applies unchanged — the partner predicate is added as an _additional policy for the partner role only_, not a replacement for staff policies.

### 4.2 Cascade consequences (intended, per decisions)

- A lead interested in Academic House (visible) who then **visits a competitor** → cascade now returns the competitor's partner (NULL if Univotel) → **lead disappears from Academic House**. Intended.
- A lead who **buys a competitor room** → purchased_room path returns competitor → disappears from AH even if they visited or were interested in AH. Intended ("later always wins").
- Because AH's own visits are to AH properties (their salespeople run them), the visit path normally _keeps_ the lead with AH — the disappearance edge case mainly happens if a non-AH hotel gets attached later.

### 4.3 Edge case to confirm — multiple interested partners

If a lead is interested in two _different_ partners' properties (and no visit/purchase yet), the interest path's `LIMIT 1` returns an arbitrary one. At present there's only one partner (Academic House), so this can't happen. **Flag:** if a second partner is onboarded, the interest-path tie needs a defined rule (e.g., both partners see it — which would require the predicate to be "is the partner among the interested owners" rather than "is the partner THE owner"). For now, single-partner, non-issue. Note it for the future.

---

## 5. RLS — the complete table-by-table policy set (anti-leak checklist)

**This is the most important section.** Partner isolation leaks through whichever lead-related table you forget. Every table below that can be keyed back to a lead gets a partner-read (and where applicable, partner-write) policy using the §4.1 predicate. The predicate joins from the table's row to its lead, then calls `lead_partner_owner`.

> Pattern for a table with a `lead_uuid` column:
>
> ```sql
> CREATE POLICY partner_read_<table> ON <table>
>   FOR SELECT TO authenticated
>   USING ( is_partner_operator() AND lead_partner_owner(lead_uuid) = current_partner_id() );
> ```
>
> Univotel-staff policies remain separate and unchanged. The partner policy is **additive** — it grants the partner their slice; it does not loosen staff access.

| Table                    |          Partner SELECT           |          Partner INSERT/UPDATE           | Notes                                        |
| ------------------------ | :-------------------------------: | :--------------------------------------: | -------------------------------------------- |
| `leads`                  | ✅ via `lead_partner_owner(uuid)` | ✅ create/edit, `WITH CHECK` scoped (§6) | the spine                                    |
| `lead_details`           |          ✅ join to lead          |    ✅ qualification fields only (§6)     | purchased_room/interested writes constrained |
| `contact_history`        |          ✅ join to lead          |            ✅ can log contact            | call/message notes for their leads           |
| `visits`                 |          ✅ join to lead          |     ✅ can add visits + results (§6)     | their salespeople run visits                 |
| `lead_messages`          |          ✅ join to lead          |                    —                     | conversation visibility                      |
| `lead_stage_history`     |          ✅ join to lead          |         (written by chokepoint)          | their leads' stage trail                     |
| `lead_rooms`             |       ✅ via lead→placement       |  ✅ vacate own-property placements only  | PMS occupancy for their leads                |
| `tasks`                  |          ✅ join to lead          |      ✅ create tasks on their leads      | —                                            |
| `lead_pins`              |           own pins only           |                 own pins                 | personal, already per-user                   |
| `recent_searches`        |                n/a                |                   n/a                    | role has no quick-search (§8)                |
| `notes`/`placement_note` |                ✅                 |            ✅ on their leads             | placement_note is on lead_details            |

**Build rule:** enumerate **every** table with a `lead_uuid`/`lead_id` FK in the actual schema (grep the migrations) and confirm each has a partner policy or a documented reason it doesn't. A table missing from this list that keys to a lead is a leak. Produce the final list from the real schema, not this illustrative one.

### 5.1 Properties & PMS tables

| Table        |                    Partner SELECT                    |                Partner write                |
| ------------ | :--------------------------------------------------: | :-----------------------------------------: |
| `properties` |   ✅ **only `partner_id = current_partner_id()`**    |               ❌ (sync-owned)               |
| `room_types` | ✅ only types whose `hotel_id` is a partner property |               ❌ (sync-owned)               |
| `rooms`      |         ✅ only rooms in partner properties          |    ✅ room admin on own properties only     |
| `lead_rooms` |                      ✅ (above)                      | ✅ place/vacate **own-property rooms only** |

The partner must **not even see other properties exist** in the PMS chooser — the `properties` SELECT policy filters to their own. This is the PMS property-filter branch the PMS plan references.

### 5.2 Helper for "is this a partner-owned property"

```sql
CREATE OR REPLACE FUNCTION property_belongs_to_current_partner(p_property_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM properties
    WHERE id = p_property_id AND partner_id = current_partner_id()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

Used in `rooms`/`lead_rooms` PMS write policies for the partner role.

---

## 6. Write constraints (`WITH CHECK`) — the escalation guards

Gating _who_ can write isn't enough; `WITH CHECK` constrains _what_ they can write so the partner can't use legitimate write access to escalate visibility or inject into others' pipelines.

### 6.1 Lead creation — scoped to own properties

A partner operator can create leads, but the created lead must be interested **only** in their own properties:

```sql
CREATE POLICY partner_insert_leads ON leads
  FOR INSERT TO authenticated
  WITH CHECK (
    is_partner_operator()
    -- enforce via the lead_details insert / a trigger: every interested_property_id
    -- must belong to current_partner_id(); no foreign properties.
  );
```

Because interested properties live on `lead_details` (array), enforce the "own properties only" rule with a **trigger** on `lead_details` insert/update for partner operators:

```sql
CREATE OR REPLACE FUNCTION enforce_partner_interested_scope() RETURNS trigger AS $$
BEGIN
  IF is_partner_operator() THEN
    -- every interested property must belong to the operator's partner
    IF EXISTS (
      SELECT 1 FROM unnest(NEW.interested_property_ids) pid
      LEFT JOIN properties p ON p.id = pid
      WHERE p.partner_id IS DISTINCT FROM current_partner_id()
    ) THEN
      RAISE EXCEPTION 'PARTNER_SCOPE: interested properties must belong to your partner';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_partner_interested_scope
  BEFORE INSERT OR UPDATE ON lead_details
  FOR EACH ROW EXECUTE FUNCTION enforce_partner_interested_scope();
```

### 6.2 Hotel-attaching writes — scoped to own properties

The partner **can** set `purchased_room` and **can** log visit results (advancing to kapora, etc.), but only attaching **their own** properties:

- **`purchased_room`:** a partner operator may set it only to a room type whose `hotel_id` is one of their properties. Enforce in the same/companion trigger (check `room_types.hotel_id`'s `partner_id = current_partner_id()`). This means they can close a sale on their own dorm, but cannot set purchased_room to a competitor (which would be wrong and would make the lead vanish from them).
- **Visit results / `visits`:** a partner operator may add/edit visits only for their own properties (`visits.property_id` belongs to their partner). Enforced via `WITH CHECK` on the `visits` write policy using `property_belongs_to_current_partner(property_id)`.

### 6.3 Editable vs forbidden fields

| Field group                                                            |                    Partner can edit?                    |
| ---------------------------------------------------------------------- | :-----------------------------------------------------: |
| Qualification (budget, move-in, room pref, persona, university, notes) |                           ✅                            |
| Stage / funnel_status (advance through the pipeline)                   |                           ✅                            |
| Visit results (add visits, log outcomes — own properties)              |                           ✅                            |
| `purchased_room` (own properties only)                                 |                           ✅                            |
| `placement_note`, contact logs, tasks (own leads)                      |                           ✅                            |
| `assigned_to` / claiming / reassignment                                |                        ❌ never                         |
| Adding/removing interested properties                                  | ❌ never (the access-controlling set is locked to them) |
| Anything on non-owned leads/properties                                 |                     ❌ (RLS denies)                     |

> **Important nuance on interested properties:** §6.1's trigger enforces that _if_ interested properties are set, they're the partner's own. But the partner role itself **cannot add or remove** interested properties on existing leads (decision #11) — that's a Univotel-staff action. The trigger is the safety net for the create path; the UI simply doesn't expose interested-property editing to the partner role. Both layers.

### 6.4 Forbidden destructive operations (enumerated — "no delete" means no destruction)

The partner role is barred from **all** of these, not just SQL DELETE:

- **Delete** any row (leads, visits, anything) — hard delete denied by RLS (no DELETE policy granted to the role).
- **Archive** a lead (soft-delete / archive flag) — denied.
- **Mark loss** (`funnel_status → lost`) — denied. (This is a stage change, so the stage-write policy must specifically exclude transitioning to `lost` for partner operators.)
- **Remove an interested property** — denied (§6.3).
- **Reassign / unclaim** — denied (§6.3).

They **may** vacate a PMS placement, **but only in their own properties** (their dorm, their occupant) — soft-vacate is reversible, not destructive, and scoped by `property_belongs_to_current_partner`.

```sql
-- stage write must block 'lost' for partner operators:
CREATE POLICY partner_update_stage ON leads
  FOR UPDATE TO authenticated
  USING ( is_partner_operator() AND lead_partner_owner(uuid) = current_partner_id() )
  WITH CHECK (
    is_partner_operator()
    AND lead_partner_owner(uuid) = current_partner_id()
    AND funnel_status <> 'lost'    -- cannot mark loss
    AND assigned_to = OLD.assigned_to   -- cannot reassign (enforce via trigger if OLD unavailable in policy)
  );
```

(Where `OLD` isn't accessible in a policy, enforce the no-reassign / no-loss rules with a `BEFORE UPDATE` trigger gated on `is_partner_operator()`.)

---

## 7. The role

```sql
-- extend the role check/enum
-- e.g. role IN ('salesperson','operator','manager','superadmin','partner_operator')
```

- New role value: **`partner_operator`**.
- A `partner_operator` always has a non-null `salespeople.partner_id` (the partner they belong to). Enforce this pairing (a partner_operator without a partner_id should be invalid — add a check or onboarding validation).
- Role helpers: `is_partner_operator()`, `current_partner_id()` (§3).
- i18n: `formatRoleLabel('partner_operator')` → "İş Ortağı Operatörü" / partner name.

---

## 8. Excluded surfaces (the role does NOT reach these)

Explicitly keep the role **out** of:

- **Quick-search** (the widened-visibility path) — it bypasses RLS by design, so it must be **disabled** for partner operators, or it leaks every lead. Hide the entrypoint AND ensure the widened search RPC checks `NOT is_partner_operator()` (defense in depth).
- **Analytics / Team Panel** — no access (aggregates would leak totals).
- **My Day** (cockpit + performance) — no access; it's a Univotel-sales tool.
- **Notifications / "just called" toasts / inbound-call surfaces** — none fire for partner operators.
- **Campaigns, archive, webhook logs, settings, any YÖNETİM tool** — no access.

What they **do** reach: the lead lists/slide-over (filtered to their leads), the calendars (their visits/move-ins), tasks (their leads), and the PMS (their properties only).

### 8.1 Navigation for the role

A trimmed sidebar: their leads (a filtered Leadler-style list), their calendars, their tasks, and PMS. No Günüm, no analytics, no admin. Role-gated render — the partner operator's sidebar is built from an allowlist, not the full nav minus hidden items (allowlist is safer — a new nav item added later doesn't accidentally appear for partners).

---

## 9. API layer

- Every PMS and lead write endpoint already guards Operator+ (from the PMS plan); add `partner_operator` to the **write-allowed** set **but** rely on RLS + the §6 triggers for the _scoping_ (the endpoint guard says "can write at all," RLS says "can write THIS row").
- Endpoints that must **reject** partner operators outright: quick-search, analytics, My Day, campaigns, archive, reassign. Return 403.
- Trigger exceptions (`PARTNER_SCOPE`, the loss/reassign blocks) map to clean Turkish messages via the error mapper.

---

## 10. Build phases

**Phase A — Foundation**

1. `partners` table + seed Academic House; `partner_id` on `properties` (set AH properties); `partner_id` on `salespeople`.
2. `partner_operator` role value + helpers (`current_partner_id`, `is_partner_operator`, `property_belongs_to_current_partner`).
3. Interested-hotel → `interested_property_ids` array + GIN index + backfill. (Coordinate with the Chatwoot multi-select sync change.)
4. `lead_partner_owner()` cascade function + unit tests (each cascade branch, override behavior, disappearance).
5. `pnpm gen:types`.

**Phase B — RLS (the security review unit)**

1. Enumerate every lead-related table from the real schema (grep FKs).
2. Add partner SELECT policies (all) + partner write policies (leads, lead_details, contact_history, visits, tasks, lead_rooms).
3. §6 triggers: interested-scope, purchased_room scope, no-loss, no-reassign.
4. Property/PMS policies (§5.1): properties/room_types/rooms/lead_rooms scoped to partner.
5. **Review as one unit:** for each table, confirm the partner sees only their leads and can't write outside scope. Penetration-test: as a partner operator, attempt to read a non-AH lead, create a lead interested in a competitor, set purchased_room to a competitor, mark loss, reassign, vacate a non-AH placement — all must fail.

**Phase C — Surface exclusions & nav**

1. Disable quick-search for the role (entrypoint + RPC guard).
2. 403 the analytics/My Day/campaigns/archive/reassign endpoints for the role.
3. Allowlist sidebar for partner operators (leads, calendars, tasks, PMS).
4. Hide write controls the role can't use (delete, archive, loss, reassign, interested-property edit) in the lead UI.

**Phase D — Onboarding**

1. Create the first Academic House Operator account (role + partner_id).
2. Verify end-to-end with a real AH property and a test lead through the cascade (interest → visit → purchase, watching visibility follow the cascade).

---

## 11. Flagged confirmations

1. **`visit_hotel` source** (§2.5) — confirm it's `visits.property_id`; define "most recent visit" if multiple. The cascade's visit path depends on it.
2. **`lead_details ↔ leads` join key** — `lead_uuid` assumed; confirm.
3. **Every lead-related table enumerated** (§5) — produce the real list from the schema; a missed table is a leak.
4. **`OLD` availability in UPDATE policies** (§6.4) — if not accessible, move no-loss/no-reassign to `BEFORE UPDATE` triggers.
5. **Chatwoot multi-select sync** — the interested-property set reconciliation (§2.4) is non-trivial; spec the bidirectional merge.
6. **Second-partner future** (§4.3) — interest-path tie rule when >1 partner; non-issue today, note for later.

---

## 12. The single most important rule

**Partner isolation is only as tight as the loosest lead-related table.** The `lead_partner_owner` cascade is correct, but it protects nothing on a table that has no policy calling it. Phase B's enumerate-every-table step and the penetration test are not optional — they are the difference between real isolation and a model that looks tight but leaks through `contact_history` or `lead_messages`. Review Phase B as a security boundary, table by table.

_End of Partner Access build doc._
