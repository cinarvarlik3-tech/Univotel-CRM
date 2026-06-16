# Univotel CRM — PMS (Property Management System) Implementation Plan

**Date:** 2026-06-15 (revised with implementation decisions)
**Companion to:** the CRM cockpit/overhaul plans (separate feature; shares the `properties`, `leads`, `lead_details` tables and the role model)
**Target:** Cursor — build in the phases at §11; each phase is independently reviewable. **Do not start implementation until MCP tools are configured and pre-flight (§11.0) is complete.**
**Stack:** Next.js 15 Pages Router, Supabase Postgres, TypeScript, Zod, shadcn/ui, Tailwind, Supabase Edge Functions + Database Webhooks

---

## 1. Overview

The PMS turns the CRM into a room-occupancy management tool. A paid lead (kapora onward) has committed to a **room type** (`purchased_room`); the PMS is where an Operator assigns them to a **specific physical room** and manages occupancy across each property — floor by floor, room by room — with a worklist (the Unplaced Customers panel) driving placement.

**The core data chain:** a physical `room` belongs to a `room_type`, which belongs (via `hotel_id`) to a `property`. A `lead_rooms` row places one lead in one room. A lead may only be placed in a room whose type equals their `purchased_room`. Capacity and type-match are enforced at the **database level** — the UI prevents violations for UX, the DB guarantees them.

### 1.1 Hard rules (enforced everywhere — see §4 for the DB triggers)

1. **Type-match:** a lead is placeable in a room **iff** `room.room_type_id == lead_details.purchased_room`. DB-enforced.
2. **Capacity:** a room holds at most `capacity` active occupants. DB-enforced.
3. **`vacated_at IS NULL` is the single canonical "active placement" predicate.** Every occupancy query — unplaced list, occupant counts, `is_full`, card colors, capacity checks, room contents — filters on `vacated_at IS NULL`. Applied consistently or the system contradicts itself.
4. **Purchased property is derived, never stored:** `purchased_room → room_types.hotel_id → properties.id`. No `purchased_property` column.
5. **Writes (place/remove/relocate/change) are Operator+ only.** Salespeople have read-only PMS access. Note-writing is Operator+; salespeople read notes.
6. **UUID parity with univotel:** `hotels`/`room_types` must use univotel's exact UUIDs as CRM primary keys. **Confirmed:** CRM `properties.id` currently does **not** match univotel `hotels.id` (CRM used `gen_random_uuid()`). A one-time properties re-key (§11.1) is required before sync or `room_types` FKs can work.

### 1.2 Decisions log

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | `capacity` on a room is **joined** from `room_types` (not copied) — same type ⇒ same capacity, no drift.                                                                                                                                                                                                                                                                                                                                                       |
| P2  | `size` on a room is an **independent column**, defaulted from `room_types.size_m2` at creation but editable (physical rooms of one type can differ slightly).                                                                                                                                                                                                                                                                                                  |
| P3  | `occupant_count` / `is_full` / card color are **computed at read time** from active `lead_rooms` rows — not stored, cannot desync.                                                                                                                                                                                                                                                                                                                             |
| P4  | Cross-DB sync = **Supabase Database Webhooks → CRM Edge Function upsert**, keyed on shared UUID; handles insert/update/delete; nightly reconciliation backstop. One-way (univotel → CRM).                                                                                                                                                                                                                                                                      |
| P5  | Type-match and capacity enforced at **DB level** (triggers); UI hides invalid options; API returns clean errors.                                                                                                                                                                                                                                                                                                                                               |
| P6  | Floor numbering: lowest floor = "floor 1" naming; negative floors use their own hundreds digit (-3 ⇒ 10x, -2 ⇒ 20x…). `floor` stored as int4 (the real signed floor).                                                                                                                                                                                                                                                                                          |
| P7  | `room_position` = Postgres **enum** (`corner`, `middle`; extensible by migration).                                                                                                                                                                                                                                                                                                                                                                             |
| P8  | `purchased_room` = a **room_type UUID** on `lead_details`. Source of truth for placement; changed only manually (side panel) or via the PMS "Change room/property" action.                                                                                                                                                                                                                                                                                     |
| P9  | Kapora & sözleşme transitions set the room **type** (`purchased_room`) via a popup; **physical placement is a separate, later PMS action.** "Kapora Attı" from the visit-result flow opens the same type popup.                                                                                                                                                                                                                                                |
| P10 | **Relocate** = move to a different physical room **of the same purchased type** (no type dropdown). **Change room/property** = change type (updates `purchased_room`) and place, atomically; or change type only → lead returns to Unplaced list.                                                                                                                                                                                                              |
| P11 | **Soft-vacate, never hard-delete** placements. `lead_rooms.vacated_at` timestamp. Loss → vacate + stage→lost. Remove (Çıkar) → vacate, **funnel stage untouched** (lead stays active and reappears as unplaced).                                                                                                                                                                                                                                               |
| P12 | **Unplaced** = has `purchased_room` AND no `lead_rooms` row with `vacated_at IS NULL`.                                                                                                                                                                                                                                                                                                                                                                         |
| P13 | **Operator role** = salesperson permissions + PMS write. Read open to all authenticated; write gated Operator+.                                                                                                                                                                                                                                                                                                                                                |
| P14 | Placement note = single editable `lead_details.placement_note` text column; Operator-written, salesperson-readable.                                                                                                                                                                                                                                                                                                                                            |
| P15 | **Navigation:** PMS is a **standalone sidebar item at the bottom**, in **no section**, visible to **all authenticated** users. Not inside YÖNETİM, not in a new OPERASYON section. Read access is what the page renders; write access is gated by role.                                                                                                                                                                                                        |
| P16 | **Room number uniqueness:** **per-property** via stored `rooms.property_id` + `UNIQUE (property_id, room_number)`. `property_id` is populated from `room_types.hotel_id` at insert and treated as immutable (no drift risk post-sync).                                                                                                                                                                                                                         |
| P17 | **Properties active-state:** Do **not** add a parallel `is_active` column on `properties` if `properties.status` already expresses inactive. Inspect `status` values first (`active` / `paused` / `closed` per migration 0002); map sync soft-deactivate onto `status`. Add `is_active` on `room_types` only if needed for sync DELETE semantics.                                                                                                              |
| P18 | **API write guards:** `requireOperatorWrite()` (or equivalent) is **mandatory in every PMS write endpoint from Phase C onward** — not deferred to Phase F. Phase F RLS is **defense-in-depth** on top of API guards, not the first line of defense.                                                                                                                                                                                                            |
| P19 | **Phase A split:** Two reviewable checkpoints — **A-schema** (migrations, triggers, placeholder data) must be reviewed and confirmed working **before** **A-sync** (Edge Function, webhooks, reconciliation) is built.                                                                                                                                                                                                                                         |
| P20 | **Sync DELETE:** Soft-deactivate only — never hard-delete `properties` or `room_types` rows that may have FK dependents. Map DELETE webhook events to `status` (properties) or `is_active` (room_types if needed).                                                                                                                                                                                                                                             |
| P21 | **Room seeding:** Phase A seeds a **small set of placeholder rooms** (a few per property, across a couple of floors, of real room types) — enough to test placement, capacity, color coding, and the unplaced flow end-to-end. **Real room data** is inserted later via a **pure data migration** into the same `rooms` table (no schema change).                                                                                                              |
| P22 | **Properties re-key:** Confirmed mismatch — univotel `hotels.id` ≠ CRM `properties.id`. Re-key is **step zero of Phase A** (after pre-flight). Migration is drafted as `old_id → new_id` mapping + cascading FK updates in a **single transaction**, **reviewed by owner before execution** — not run-then-review. `room_types` initial load (additive, low-risk) can proceed via MCP after re-key; only the properties re-key requires review-before-execute. |

### 1.3 CRM schema name mapping (plan examples → actual columns)

| Plan / example SQL              | Actual CRM                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| `lead_details.lead_id`          | `lead_details.lead_uuid`                                                                     |
| `leads.id` / `leads.name`       | `leads.uuid` / `leads.lead_name`                                                             |
| `leads.gender` / `leads.school` | `lead_details.student_gender` / `lead_details.school_shortname`                              |
| `properties.name`               | `properties.hotel_name`                                                                      |
| `move_in_date`                  | `lead_details.move_in`                                                                       |
| `actual_move_in_date`           | `lead_details.actual_move_in_date`                                                           |
| `lead_rooms.lead_id` → `leads`  | `lead_rooms.lead_id` → `leads.uuid` (FK column name TBD in migration; join via `leads.uuid`) |

### 1.4 Coexistence with legacy inventory tables

The CRM already has `property_room_types` / `property_rooms` (counter-based availability model). PMS uses the **new** `room_types` / `rooms` / `lead_rooms` tables only. Legacy tables are **not** migrated or dropped in this work; deprecate later if unused.

---

## 2. Migrations — tables synced from univotel

These come **from univotel's Supabase** preserving UUIDs (§5 covers the live sync; initial load is via MCP after properties re-key). Schemas below are the CRM-side shape they must land in.

### 2.1 `properties` (already exists) ← univotel `hotels`

Already present in the CRM. **After re-key (§11.1),** `properties.id` will equal univotel `hotels.id`. The sync (§5) keeps it mirrored on insert/update/delete.

Relevant columns the PMS reads: `id`, `hotel_name`, `status`. Sync soft-deactivate maps univotel DELETE → `properties.status = 'closed'` (or `'paused'` — confirm during pre-flight column mapping) unless investigation shows a better mapping.

> **Pre-flight (§11.0):** Inspect `properties.status` CHECK constraint (`active` / `paused` / `closed` per migration 0002). Confirm it can represent inactive for sync DELETE. **Do not add `is_active`** on `properties` if `status` suffices (P17).

### 2.2 `room_types` (new) ← univotel `room_types`

```sql
-- Mirrored from univotel.room_types, UUIDs preserved.
CREATE TABLE room_types (
  id          UUID PRIMARY KEY,                       -- univotel room_types.id, preserved
  hotel_id    UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,  -- = univotel hotel_id
  name        TEXT NOT NULL,
  size_m2     NUMERIC,                                -- nominal size; default source for rooms.size
  capacity    INT4 NOT NULL,                          -- person count for this type; join source for rooms.capacity
  is_active   BOOLEAN NOT NULL DEFAULT true,          -- sync DELETE → false (P20); properties uses status instead
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_room_types_hotel ON room_types(hotel_id);
```

> **Capacity source (P1):** Capacity belongs to the _type_. `rooms.capacity` is **joined from `room_types.capacity`**, not from the property. **Pre-flight (§11.0):** Inspect univotel `room_types` schema via MCP and identify the per-type capacity/person-count column to map here.

**Initial load:** After properties re-key, Cursor loads `room_types` directly via MCP (additive, low-risk). UUIDs preserved; `hotel_id` must resolve to re-keyed `properties.id`.

---

## 3. Migrations — new CRM-native tables

### 3.1 `room_position` enum + `rooms`

```sql
CREATE TYPE room_position AS ENUM ('corner', 'middle');   -- extensible by future migration

CREATE TABLE rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,  -- P16: denormalized from room_types.hotel_id at insert; immutable
  room_type_id  UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  room_number   TEXT NOT NULL,                 -- "101", "205" (text: leading zeros, letters possible)
  floor         INT4 NOT NULL,                 -- real signed floor (P6); display naming derived
  size          NUMERIC,                        -- independent (P2); default-filled from room_types.size_m2 at create
  room_position room_position,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (property_id, room_number)            -- P16: per-property uniqueness
);
CREATE INDEX idx_rooms_property ON rooms(property_id);
CREATE INDEX idx_rooms_type ON rooms(room_type_id);
CREATE INDEX idx_rooms_floor ON rooms(floor);
```

- **`property_id` (P16):** Set at insert from `room_types.hotel_id` (via trigger or application layer). Treated as immutable after write — no drift risk because `room_type_id → hotel_id` is sync-owned and stable. Enables per-property uniqueness and simpler property-scoped queries without joining through `room_types`.
- **`capacity` is NOT a column** (P1) — read via `JOIN room_types` → `room_types.capacity`.
- **`is_full` / `occupant_count` are NOT columns** (P3) — computed at read (§6.1).

**Placeholder seeding (P21, A-schema):** After `room_types` load, seed a few placeholder `rooms` rows per property (2–3 room types × 2 floors × a handful of room numbers). Enough to exercise placement, capacity limits, color coding, and unplaced flow. Mark placeholders in migration comments or a `is_placeholder` comment in seed SQL for clarity.

**Future real-room insert (data-only, post-PMS-launch):** Real rooms replace/augment placeholders via a **pure data migration** — no schema change. Expected gathering-sheet columns (1:1 with `rooms` table):

| Gathering sheet column | `rooms` column  | Notes                                                        |
| ---------------------- | --------------- | ------------------------------------------------------------ |
| `property`             | —               | Reference only (human label); insert uses `property_id` UUID |
| `room_number`          | `room_number`   | Direct                                                       |
| `floor`                | `floor`         | Direct (signed int4)                                         |
| `room_type_id`         | `room_type_id`  | **Actual UUID** from univotel — no name-matching             |
| `size`                 | `size`          | Direct                                                       |
| `room_position`        | `room_position` | `corner` or `middle`                                         |

Insert script derives `property_id` from `room_types.hotel_id` for each `room_type_id` row. Placeholder rows may be deleted or superseded in the same migration.

### 3.2 `lead_rooms` (placement / occupancy)

```sql
CREATE TABLE lead_rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  lead_id     UUID NOT NULL REFERENCES leads(uuid) ON DELETE RESTRICT,
  placed_by   UUID REFERENCES salespeople(id),     -- operator who placed
  placed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  vacated_at  TIMESTAMPTZ,                          -- NULL = active placement (P3, P11, P12)
  vacated_by  UUID REFERENCES salespeople(id),
  vacate_reason TEXT,                               -- 'removed' | 'lost' | 'relocated' | 'type_changed'
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_lead_rooms_room_active ON lead_rooms(room_id) WHERE vacated_at IS NULL;
CREATE INDEX idx_lead_rooms_lead_active ON lead_rooms(lead_id) WHERE vacated_at IS NULL;
```

- **One active placement per lead:** partial unique index:

```sql
CREATE UNIQUE INDEX uniq_active_placement_per_lead
  ON lead_rooms(lead_id) WHERE vacated_at IS NULL;
```

- Relocate / change-room = **vacate the old active row + insert a new active row** (preserves history), not an update of `room_id`.

### 3.3 `lead_details` additions

```sql
ALTER TABLE lead_details ADD COLUMN purchased_room  UUID REFERENCES room_types(id);  -- P8
ALTER TABLE lead_details ADD COLUMN placement_note  TEXT;                            -- P14
```

---

## 4. Database-level enforcement (the hard guarantees, P5)

Two triggers on `lead_rooms`, fired on INSERT (and on UPDATE that clears `vacated_at`, i.e. reactivation). Both check only **active** placements.

### 4.1 Type-match trigger

```sql
CREATE OR REPLACE FUNCTION enforce_placement_type_match() RETURNS trigger AS $$
DECLARE
  v_room_type UUID;
  v_purchased UUID;
BEGIN
  IF NEW.vacated_at IS NOT NULL THEN RETURN NEW; END IF;
  SELECT room_type_id INTO v_room_type FROM rooms WHERE id = NEW.room_id;
  SELECT purchased_room INTO v_purchased FROM lead_details WHERE lead_uuid = NEW.lead_id;
  IF v_purchased IS NULL OR v_room_type IS DISTINCT FROM v_purchased THEN
    RAISE EXCEPTION 'PLACEMENT_TYPE_MISMATCH: lead purchased_room % does not match room type %', v_purchased, v_room_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_placement_type_match
  BEFORE INSERT OR UPDATE ON lead_rooms
  FOR EACH ROW EXECUTE FUNCTION enforce_placement_type_match();
```

### 4.2 Capacity trigger

```sql
CREATE OR REPLACE FUNCTION enforce_room_capacity() RETURNS trigger AS $$
DECLARE
  v_capacity INT4;
  v_active   INT4;
BEGIN
  IF NEW.vacated_at IS NOT NULL THEN RETURN NEW; END IF;
  SELECT rt.capacity INTO v_capacity
    FROM rooms r JOIN room_types rt ON rt.id = r.room_type_id
    WHERE r.id = NEW.room_id;
  SELECT count(*) INTO v_active
    FROM lead_rooms
    WHERE room_id = NEW.room_id AND vacated_at IS NULL
      AND id IS DISTINCT FROM NEW.id;
  IF v_active + 1 > v_capacity THEN
    RAISE EXCEPTION 'ROOM_AT_CAPACITY: room % full (% / %)', NEW.room_id, v_active, v_capacity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_room_capacity
  BEFORE INSERT OR UPDATE ON lead_rooms
  FOR EACH ROW EXECUTE FUNCTION enforce_room_capacity();
```

- Race-condition guarantee: two operators grabbing the last bed — one insert wins, the other fails capacity check.
- API layer catches these exceptions → clean Turkish messages ("Oda dolu" / "Satın alınan oda tipi eşleşmiyor").

---

## 5. Cross-database sync (univotel → CRM)

One-way mirror of univotel `hotels` → CRM `properties` and univotel `room_types` → CRM `room_types`, preserving UUIDs (P4). Handles **insert, update, delete**. **Built only in Phase A-sync** — after A-schema is reviewed and confirmed (P19).

### 5.1 Mechanism: Database Webhooks → Edge Function upsert

- On **univotel's** Supabase: Database Webhooks on `hotels` and `room_types` fire on INSERT/UPDATE/DELETE, POSTing row payload to CRM Edge Function `sync-univotel`.
- On the **CRM**, Edge Function receives payload and:
  - INSERT/UPDATE → `INSERT ... ON CONFLICT (id) DO UPDATE` (idempotent upsert, keyed on preserved UUID).
  - DELETE → **soft-deactivate only (P20):** never hard-delete. `hotels` DELETE → `properties.status = 'closed'` (or mapped inactive value per §2.1). `room_types` DELETE → `room_types.is_active = false`. Reject or no-op if row has active placements referencing it (log warning).
- **Auth:** shared secret header; only univotel webhook can write.
- **Idempotency:** keyed on UUID; replayed events re-upsert harmlessly.

### 5.2 Reconciliation backstop

Nightly job (`pages/api/cron/pms-sync-reconcile.ts` or pg_cron) full-scans univotel `hotels`/`room_types` and upserts missed rows.

### 5.3 Initial load (A-schema, before A-sync)

1. **Properties re-key** (§11.1) — owner-reviewed, single transaction.
2. **`room_types`** bulk load via MCP — UUIDs preserved; chain integrity check:
   ```sql
   SELECT COUNT(*) FROM room_types rt
   LEFT JOIN properties p ON p.id = rt.hotel_id WHERE p.id IS NULL;
   ```
3. **Placeholder `rooms`** seed (§3.1).

A-sync webhooks are enabled **after** A-schema checkpoint is signed off.

---

## 6. The rooms UI (per-property occupancy screen)

### 6.1 Occupancy computation (read-time, P3)

```sql
SELECT r.id, r.property_id, r.room_number, r.floor, r.room_position, r.size,
       rt.id AS room_type_id, rt.name AS room_type_name, rt.capacity,
       COALESCE(active.cnt, 0) AS occupant_count,
       (COALESCE(active.cnt, 0) >= rt.capacity) AS is_full
FROM rooms r
JOIN room_types rt ON rt.id = r.room_type_id
LEFT JOIN (
  SELECT room_id, count(*) AS cnt
  FROM lead_rooms WHERE vacated_at IS NULL
  GROUP BY room_id
) active ON active.room_id = r.id
WHERE r.property_id = :propertyId
ORDER BY r.floor, r.room_number;
```

Occupant details from active `lead_rooms` joined to `leads` / `lead_details`. **Every** occupancy figure uses `vacated_at IS NULL`.

### 6.2 Layout

- **Entry (P15):** **Standalone PMS nav item at the bottom of the sidebar**, outside all sections, visible to **all authenticated** users. Not in YÖNETİM. Read = page content; write = role-gated controls hidden/disabled for salespeople.
- **Sidebar change (Phase B):** Add `{ href: '/pms', label: t('nav.pms'), icon: IconBed }` as a bottom standalone item in `components/layout/Sidebar.tsx` — same visual tier as Settings, not inside any `NavGroup`.
- **Property chooser first:** `/pms` lists properties; `/pms/[propertyId]` opens rooms UI.
- **Top controls:** property dropdown, floor filter, "only empty rooms" toggle, room-type filter — client-side over §6.1 data.
- **Grouped by floor (P6):** labeled sections ("1. Kat") with **3-column card grid**.

### 6.3 Room card

```
┌──────────────────────────────┐
│  101            ← room_number (above)
│ ┌──────────────────────────┐ │
│ │ [Occupant name]   [Edit] │ │   ← each active occupant + Edit button
│ │  Beklenen: 12 Eyl        │ │   ← lead_details.move_in (or "Taşındı: {actual_move_in_date}")
│ │ ─────────────────────────│ │
│ │ [Occupant name]   [Edit] │ │
│ │  Taşındı: 10 Eyl         │ │
│ └──────────────────────────┘ │
│  Çift Kişilik   ← room_type (below)
└──────────────────────────────┘
   card color = occupancy (see 6.4)

Empty room:
┌──────────────────────────────┐
│  102                         │
│   Bu oda boş                 │
│   [ + Yerleştir ]            │
│  Çift Kişilik                │
└──────────────────────────────┘
```

- Empty room: "Bu oda boş" + **Yerleştir** (Operator+ only; hidden/disabled for salespeople).

### 6.4 Color coding (computed, P3)

- `occupant_count == 0` → **green** (empty)
- `0 < occupant_count < capacity` → **orange** (partial)
- `occupant_count == capacity` → **red** (full)

Semantic tokens (emerald/amber/rose). Never stored.

### 6.5 Occupant Edit menu (Operator+ only)

1. **Çıkar (Remove)** → confirm → soft-vacate (`vacate_reason = 'removed'`). Funnel untouched (P11); lead reappears in Unplaced list.
2. **Taşı (Relocate)** → property + floor + room number dropdowns; same `purchased_room` type only; non-full rooms. Vacate (`relocated`) + insert new.
3. **Oda/Tesis Değiştir** → property + room type + floor + room. Type + room → update `purchased_room` + vacate (`type_changed`) + place atomically. Type only → update `purchased_room` + vacate → Unplaced list.

All Operator+; API surfaces §4 trigger errors.

---

## 7. The Unplaced Customers panel (the placement worklist)

Default-open side panel on the PMS screen only.

### 7.1 What it lists (P12)

```sql
SELECT l.uuid, l.lead_name, ld.purchased_room, ld.placement_note,
       l.funnel_status, ld.student_gender, ld.school_shortname,
       rt.name AS purchased_room_type_name,
       p.id AS purchased_property_id, p.hotel_name AS purchased_property_name
FROM leads l
JOIN lead_details ld ON ld.lead_uuid = l.uuid
JOIN room_types rt ON rt.id = ld.purchased_room
JOIN properties p ON p.id = rt.hotel_id
WHERE ld.purchased_room IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lead_rooms lr
    WHERE lr.lead_id = l.uuid AND lr.vacated_at IS NULL
  )
ORDER BY l.funnel_status, l.lead_name;
```

### 7.2 Row anatomy

- Name, purchased hotel + room type, funnel pill
- **Yerleştir** (Operator+), **Not Ekle** (Operator+)
- Chevron → expand `placement_note` (read by all)

### 7.3 Place flow

Filtered room dropdown: lead's `purchased_room` type × property × not full. Insert active `lead_rooms`; triggers are backstop.

### 7.4 Panel-level controls

- Property dropdown ↔ rooms UI property selector (slaved in single-property mode)
- "Tüm yerleştirilecekler" → all properties; detaches rooms UI driving
- Gender, school filters (client-side)

### 7.5 Roles (P13/P14)

- See panel + notes: all authenticated
- Place / Remove / Relocate / Change / write notes: Operator+

---

## 8. Kapora / Sözleşme room-type popup (P9)

Sets room **type** (`purchased_room`), not physical room.

- **`kapora-alindi`** (incl. visit "Kapora Attı"): required modal — property + room type dropdowns → set `purchased_room` → Unplaced list.
- **`kapora-alindi` → `sozlesme-imzalandi`:** re-confirm popup, pre-filled.
- **Side panel `purchased_room` edit while placed:** block → "Bu lead bir odada — değişiklik için PMS'te 'Oda/Tesis Değiştir' kullanın". Unplaced: free edit.

**Intercept points:** `pages/api/visits/[id].ts` (outcome `downpayment`), `pages/api/leads/[id]/advance-stage.ts`, client visit/lead panels. Extend APIs to accept `purchased_room` in same transaction as stage advance.

---

## 9. API surface

**Read endpoints:** any authenticated user.

**Write endpoints (Phase C+):** **mandatory `requireOperatorWrite()` guard (P18)** in every handler — checks `operator` | `manager` | `superadmin` before any write. Phase F RLS adds defense-in-depth; API guard is first line.

All placement writes catch §4 trigger exceptions → clean Turkish messages.

| Endpoint                                | Method     | Purpose                            | Write guard              |
| --------------------------------------- | ---------- | ---------------------------------- | ------------------------ |
| `/api/pms/properties`                   | GET        | property list for chooser          | —                        |
| `/api/pms/rooms?propertyId=`            | GET        | rooms + computed occupancy (§6.1)  | —                        |
| `/api/pms/unplaced?propertyId=&filters` | GET        | unplaced worklist (§7.1)           | —                        |
| `/api/pms/place`                        | POST       | `{ leadId, roomId }`               | **requireOperatorWrite** |
| `/api/pms/vacate`                       | POST       | `{ leadRoomId, reason }`           | **requireOperatorWrite** |
| `/api/pms/relocate`                     | POST       | `{ leadId, toRoomId }`             | **requireOperatorWrite** |
| `/api/pms/change-room`                  | POST       | `{ leadId, newTypeId, toRoomId? }` | **requireOperatorWrite** |
| `/api/pms/placement-note`               | PATCH      | `{ leadId, note }`                 | **requireOperatorWrite** |
| `/api/pms/rooms` (admin)                | POST/PATCH | create/edit physical rooms         | **requireOperatorWrite** |

Helper location: `lib/auth/roles.ts` — `canWritePms(role)` / `requireOperatorWrite(session)`.

**RLS (Phase F):** `lead_rooms`, `rooms` writes require Operator+; reads open to authenticated. `properties`/`room_types` sync-owned (service role / Edge Function only).

---

## 10. Roles & RLS (P13)

- **`operator` role** = salesperson + PMS write. Manager/superadmin inherit.
- **PMS read:** any authenticated.
- **PMS write:** Operator, manager, superadmin.
- **Authorization layers (order matters):**
  1. **Phase C+ API guards (P18)** — `requireOperatorWrite()` on every write endpoint; primary enforcement.
  2. **Phase F RLS** — defense-in-depth on `rooms`, `lead_rooms`.
  3. **§4 triggers** — correctness (type/capacity), role-agnostic.

---

## 11. Build phases

Each phase independently reviewable. **Do not start until MCP tools are available.**

### 11.0 Pre-flight investigation (read-only, via MCP — before any migration)

Run **before writing any SQL**. Output feeds re-key draft and column mapping.

| #    | Investigation                                                                                                 | Output                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| PF-1 | **Capacity source:** inspect univotel `room_types` schema                                                     | Column name → `room_types.capacity` mapping                        |
| PF-2 | **FK inventory:** enumerate every CRM table/column referencing `properties.id`                                | Complete re-key remap checklist (see §11.1 starter list)           |
| PF-3 | **Column mapping:** read univotel `hotels` + `room_types` schemas                                             | Final upsert column map into CRM `properties` / `room_types` shape |
| PF-4 | **`properties.status`:** confirm values and whether sync DELETE can map to `status` without `is_active` (P17) | DELETE → `status` mapping decision                                 |

**Starter FK inventory (extend during PF-2):**

| Table                 | Column             | FK type                     | Re-key action                               |
| --------------------- | ------------------ | --------------------------- | ------------------------------------------- |
| `visits`              | `property_id`      | FK → `properties(id)`       | `UPDATE … SET property_id = mapping.new_id` |
| `property_room_types` | `property_id`      | FK → `properties(id)`       | Same (legacy; still referenced)             |
| `salespeople`         | `home_property_id` | FK → `properties(id)`       | Same                                        |
| `salespeople`         | `assigned_hotels`  | `UUID[]` (no FK)            | `array_replace` per element                 |
| `lead_details`        | `interested_hotel` | `TEXT[]` (names, not UUIDs) | **No UUID remap** — verify contents         |
| `room_types` (new)    | `hotel_id`         | FK → `properties(id)`       | Loaded **after** re-key with univotel UUIDs |

**Manual external task (owner, parallel to re-key):** Property UUIDs are referenced **outside the DB** — Excel pricing files, univotel.com, Make.com workflows, and any other integrations keyed on old CRM `properties.id`. **Owner remaps these manually** in parallel with the DB re-key. Flag on checklist; not automated by Cursor.

---

### 11.1 Step zero — Properties re-key (reviewed, not autonomous)

**Confirmed:** univotel `hotels.id` ≠ CRM `properties.id`. Required before `room_types.hotel_id` FKs or sync.

**Process:**

1. Build `old_id → new_id` mapping table by matching properties to univotel hotels (by `hotel_name` or other stable key — document match criteria in migration).
2. Draft migration SQL: single transaction wrapping:
   - Temp mapping table
   - `UPDATE properties SET id = new_id` (or insert-new/delete-old pattern if PK update unsupported — prefer safe cascade order)
   - Cascading `UPDATE` on every FK/array from PF-2 inventory
   - Verification queries (zero orphan FKs, row counts unchanged)
3. **Owner reviews migration draft before execution.** Not run-then-review — destructive, one-way.
4. After re-key: verify `properties.id` matches univotel `hotels.id` for all active hotels.

**Distinction:** Only this re-key step requires review-before-execute. **`room_types` initial load** (additive INSERT, preserved UUIDs) is low-risk and Cursor executes via MCP after re-key is confirmed.

---

### 11.2 Phase A-schema (checkpoint 1 — review before A-sync)

Migrations (sequential):

| Migration                           | Contents                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `0082_properties_rekey.sql`         | Mapping table + cascading FK updates (§11.1); **owner-reviewed**                           |
| `0083_pms_room_types.sql`           | `room_types` table + `is_active`; indexes; FK → `properties`                               |
| `0084_pms_rooms_and_enum.sql`       | `room_position` enum; `rooms` with **`property_id`** + `UNIQUE (property_id, room_number)` |
| `0085_pms_lead_rooms.sql`           | `lead_rooms`; partial indexes; `uniq_active_placement_per_lead`                            |
| `0086_pms_lead_details_columns.sql` | `purchased_room`, `placement_note`                                                         |
| `0087_pms_placement_triggers.sql`   | Type-match + capacity triggers (§4)                                                        |

**No `0087_pms_sync_columns.sql` / `properties.is_active`** — use `properties.status` for soft-deactivate if PF-4 confirms (P17).

**A-schema deliverables:**

1. All migrations above applied (re-key after owner sign-off).
2. `room_types` loaded via MCP (univotel UUIDs).
3. **Placeholder `rooms` seeded** (P21) — few per property, real types, 2+ floors.
4. §4 trigger tests: valid place, type mismatch reject, full room reject, concurrent double-place.
5. `pnpm gen:types`; update `types/domain.ts` PMS types.
6. Lib foundation (no UI): `lib/pms/queries.ts`, `placement-ops.ts`, `trigger-errors.ts`, `floor-display.ts`.

**Checkpoint:** Owner confirms schema + triggers + placeholder data work end-to-end (manual SQL or scratch API calls) **before A-sync begins.**

---

### 11.3 Phase A-sync (checkpoint 2 — after A-schema sign-off)

| Item           | Contents                                                                      |
| -------------- | ----------------------------------------------------------------------------- |
| Edge Function  | `supabase/functions/sync-univotel/index.ts` — upsert + soft-deactivate (§5.1) |
| Webhooks       | univotel `hotels` + `room_types` → Edge Function URL                          |
| Reconciliation | `pages/api/cron/pms-sync-reconcile.ts` nightly backstop                       |
| Env            | `UNIVOTEL_SYNC_SECRET`, univotel service credentials for reconcile            |

**A-sync deliverables:** Live one-way sync; DELETE → soft-deactivate only; idempotency verified.

---

### Phase B — Rooms UI (read)

1. **Navigation (P15):** standalone bottom sidebar item `/pms` — all authenticated; not in YÖNETİM.
2. Pages: `pages/pms/index.tsx` (chooser), `pages/pms/[propertyId].tsx` (grid shell).
3. Read APIs: `GET /api/pms/properties`, `GET /api/pms/rooms?propertyId=`.
4. Components: `PropertyChooser`, `RoomFilters`, `RoomsGrid`, `FloorSection`, `RoomCard` — floor grouping, 3-col cards, §6.4 colors, occupant lines (`move_in` / `actual_move_in_date`), empty-room state (no write buttons yet).
5. Hooks: `usePmsProperties`, `usePmsRooms`. i18n keys in `tr.ts` / `en.ts`.

---

### Phase C — Placement writes & occupant edit

**P18 mandatory:** every write endpoint calls `requireOperatorWrite()` before any DB write.

1. Write APIs (§9): `place`, `vacate`, `relocate`, `change-room`, `placement-note`, room admin POST/PATCH — all via `lib/pms/placement-ops.ts` + `trigger-errors.ts`.
2. UI: `PlaceLeadDialog`, `OccupantEditPopover`, `ConfirmRemoveDialog`, `RelocateDialog`, `ChangeRoomDialog`.
3. Loss integration: when lead → `lost`, vacate active placement (`vacate_reason = 'lost'`) in `update-lead.ts` / `apply-loss-reason-update.ts`.

---

### Phase D — Unplaced Customers panel

1. `GET /api/pms/unplaced`; `UnplacedPanel`, `UnplacedLeadRow`, `PlacementNoteDialog`, `UnplacedFilters`.
2. Place from panel; property dropdown ↔ rooms UI sync; "view all" detaches; gender/school filters.

---

### Phase E — Funnel integration

1. `PurchasedRoomDialog` — kapora + sözleşme + visit "Kapora Attı".
2. Extend `advance-stage` and visit outcome APIs with `purchased_room`.
3. Side-panel guard: block `purchased_room` PATCH while actively placed.

---

### Phase F — Roles & RLS (defense-in-depth)

1. `operator` role migration; `canWritePms()` / `isOperatorOrAbove()` in `lib/auth/roles.ts`.
2. RLS on `rooms`, `lead_rooms` — Operator+ write; authenticated read.
3. UI: hide/disable write controls for salespeople (`useCanWritePms` hook).

**Note:** API guards from Phase C remain primary; Phase F does not replace them.

---

### Phase dependency graph

```
Pre-flight (11.0)
    → Re-key (11.1, owner-reviewed)
    → A-schema (11.2) ──[sign-off]──→ A-sync (11.3)
    → B (read UI) ──→ C (writes + requireOperatorWrite)
    → D (unplaced panel, needs C place flow)
    → E (funnel, needs purchased_room column + C guard)
    → F (operator role + RLS, defense-in-depth)
```

---

### Implementation file tree (new code)

```
supabase/migrations/
  0082_properties_rekey.sql          -- owner-reviewed
  0083_pms_room_types.sql
  0084_pms_rooms_and_enum.sql
  0085_pms_lead_rooms.sql
  0086_pms_lead_details_columns.sql
  0087_pms_placement_triggers.sql

supabase/functions/sync-univotel/index.ts   -- A-sync only

lib/pms/
  queries.ts, placement-ops.ts, trigger-errors.ts, floor-display.ts, room-picker.ts
lib/auth/roles.ts                           -- canWritePms() from Phase C; operator type in Phase F

pages/api/pms/          -- properties, rooms, unplaced, place, vacate, relocate, change-room, placement-note
pages/api/cron/pms-sync-reconcile.ts        -- A-sync only
pages/pms/index.tsx, [propertyId].tsx

components/pms/         -- PropertyChooser, RoomFilters, RoomsGrid, FloorSection, RoomCard,
                        -- UnplacedPanel, UnplacedLeadRow, PlaceLeadDialog, OccupantEditPopover, …
components/leads/PurchasedRoomDialog.tsx    -- Phase E

hooks/usePmsProperties.ts, usePmsRooms.ts, usePmsUnplaced.ts, useCanWritePms.ts
```

---

## 12. Resolved confirmations (formerly flagged)

| #   | Item                                  | Resolution                                                                                  |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | `room_number` uniqueness scope        | **Per-property** — `property_id` column + `UNIQUE (property_id, room_number)` (P16)         |
| 2   | univotel `room_types` capacity source | **Pre-flight PF-1** via MCP before migrations                                               |
| 3   | `properties.id` UUID parity           | **Confirmed mismatch** — one-time re-key required (§11.1, P22)                              |
| 4   | Sync DELETE semantics                 | **Soft-deactivate only** — `properties.status` + `room_types.is_active` (P20)               |
| 5   | `lead_details ↔ leads` join key       | **`lead_uuid`** (§1.3)                                                                      |
| 6   | Actual column names                   | **`lead_name`, `student_gender`, `school_shortname`, `move_in`, `hotel_name`** (§1.3, §7.1) |
| 7   | Navigation placement                  | **Standalone bottom sidebar item**, all authenticated (P15)                                 |
| 8   | `properties.is_active`                | **Do not add** if `status` suffices — investigate in PF-4 (P17)                             |
| 9   | API write guard timing                | **Phase C mandatory**; RLS Phase F is defense-in-depth (P18)                                |
| 10  | Room seeding                          | **Placeholders in A-schema**; real rooms later via data-only migration (P21)                |
| 11  | Phase A structure                     | **A-schema → sign-off → A-sync** (P19)                                                      |
| 12  | External UUID references              | **Manual owner task** parallel to re-key (§11.0)                                            |

---

_End of PMS implementation plan. Hard rules §1.1 and decisions P1–P22 are authoritative._
