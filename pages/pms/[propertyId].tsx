/**
 * PMS per-property occupancy screen — rooms grid + unplaced worklist.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { ChangeRoomDialog } from '@/components/pms/ChangeRoomDialog';
import { ConfirmRemoveDialog } from '@/components/pms/ConfirmRemoveDialog';
import { OccupantEditDialog } from '@/components/pms/OccupantEditDialog';
import { PlaceLeadDialog } from '@/components/pms/PlaceLeadDialog';
import { PlacementNoteDialog } from '@/components/pms/PlacementNoteDialog';
import { RelocateDialog } from '@/components/pms/RelocateDialog';
import { RoomFilters, filterRooms, type RoomFilterState } from '@/components/pms/RoomFilters';
import { RoomsGrid } from '@/components/pms/RoomsGrid';
import { UnplacedPanel } from '@/components/pms/UnplacedPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { useCanWritePms } from '@/hooks/useCanWritePms';
import { usePmsProperties, usePmsRooms, usePmsUnplaced } from '@/hooks/usePms';
import { useTranslation } from '@/hooks/useTranslation';
import type { PmsRoomWithOccupancy, PmsUnplacedLead } from '@/types/domain';

export default function PmsPropertyPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const canWrite = useCanWritePms();

  const propertyId = typeof router.query.propertyId === 'string' ? router.query.propertyId : null;

  const { data: properties } = usePmsProperties();
  const {
    data: rooms,
    error: roomsError,
    isLoading: roomsLoading,
    mutate: mutateRooms,
  } = usePmsRooms(propertyId);

  const [viewAll, setViewAll] = useState(false);
  const [unplacedGender, setUnplacedGender] = useState('all');
  const [unplacedSchool, setUnplacedSchool] = useState('all');
  const [filters, setFilters] = useState<RoomFilterState>({
    floor: 'all',
    roomTypeId: 'all',
    emptyOnly: false,
  });

  const { data: unplaced, mutate: mutateUnplaced } = usePmsUnplaced({
    propertyId,
    viewAll,
    studentGender: unplacedGender === 'all' ? undefined : unplacedGender,
    schoolShortname: unplacedSchool === 'all' ? undefined : unplacedSchool,
  });

  useEffect(() => {
    setFilters({ floor: 'all', roomTypeId: 'all', emptyOnly: false });
  }, [propertyId]);

  const [placeLead, setPlaceLead] = useState<PmsUnplacedLead | null>(null);
  const [scopedRoom, setScopedRoom] = useState<PmsRoomWithOccupancy | null>(null);
  const [noteLead, setNoteLead] = useState<PmsUnplacedLead | null>(null);
  const [editRoom, setEditRoom] = useState<PmsRoomWithOccupancy | null>(null);
  const [editLeadRoomId, setEditLeadRoomId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [relocateOpen, setRelocateOpen] = useState(false);
  const [changeRoomOpen, setChangeRoomOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const filteredRooms = useMemo(() => filterRooms(rooms ?? [], filters), [rooms, filters]);

  const refresh = useCallback(async () => {
    await Promise.all([mutateRooms(), mutateUnplaced()]);
  }, [mutateRooms, mutateUnplaced]);

  const editOccupant = editRoom?.occupants.find((o) => o.leadRoomId === editLeadRoomId);

  async function handlePlace(leadId: string, roomId: string) {
    const res = await fetch('/api/pms/place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, roomId }),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? 'Place failed');
    }
    await refresh();
  }

  async function handleSaveNote(leadId: string, note: string | null) {
    const res = await fetch('/api/pms/placement-note', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, note }),
    });
    if (!res.ok) throw new Error('Failed to save note');
    await mutateUnplaced();
  }

  async function handleRemove() {
    if (!editLeadRoomId) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/pms/vacate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadRoomId: editLeadRoomId, reason: 'removed' }),
      });
      if (!res.ok) throw new Error('Remove failed');
      setConfirmRemove(false);
      setEditRoom(null);
      setEditLeadRoomId(null);
      await refresh();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRelocate(leadId: string, toRoomId: string) {
    const res = await fetch('/api/pms/relocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, toRoomId }),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? 'Relocate failed');
    }
    setEditRoom(null);
    setEditLeadRoomId(null);
    setRelocateOpen(false);
    await refresh();
  }

  async function handleChangeRoom(leadId: string, newTypeId: string, toRoomId?: string) {
    const res = await fetch('/api/pms/change-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, newTypeId, toRoomId }),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? 'Change room failed');
    }
    setEditRoom(null);
    setEditLeadRoomId(null);
    setChangeRoomOpen(false);
    await refresh();
  }

  if (!propertyId) {
    return (
      <AppShell title={t('pms.title')}>
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  const propertyName = properties?.find((p) => p.id === propertyId)?.hotel_name ?? t('pms.title');

  return (
    <AppShell title={propertyName}>
      <div className="flex min-h-[calc(100vh-120px)] flex-col lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4 p-1">
          <RoomFilters
            rooms={rooms ?? []}
            filters={filters}
            onChange={setFilters}
            propertyOptions={properties ?? []}
            selectedPropertyId={propertyId}
            onPropertyChange={(id) => router.push(`/pms/${id}`)}
          />

          {roomsLoading && <Skeleton className="h-96 w-full" />}
          {roomsError && <p className="text-sm text-brand-red">{t('pms.failedToLoad')}</p>}
          {filteredRooms.length > 0 && (
            <RoomsGrid
              rooms={filteredRooms}
              locale={locale}
              canWrite={canWrite}
              onPlace={(room) => {
                setScopedRoom(room);
                setPlaceLead(null);
              }}
              onEditOccupant={(room, leadRoomId) => {
                setEditRoom(room);
                setEditLeadRoomId(leadRoomId);
              }}
            />
          )}
          {!roomsLoading && filteredRooms.length === 0 && !roomsError && (
            <p className="text-sm text-muted-foreground">
              {(rooms ?? []).length === 0 ? t('pms.noRoomsAtProperty') : t('pms.noRooms')}
            </p>
          )}
        </div>

        <UnplacedPanel
          leads={unplaced ?? []}
          properties={properties ?? []}
          selectedPropertyId={propertyId}
          viewAll={viewAll}
          canWrite={canWrite}
          genderFilter={unplacedGender}
          schoolFilter={unplacedSchool}
          onGenderFilterChange={setUnplacedGender}
          onSchoolFilterChange={setUnplacedSchool}
          onPropertyChange={(id) => {
            setViewAll(false);
            router.push(`/pms/${id}`);
          }}
          onViewAllChange={setViewAll}
          onPlace={(lead) => {
            setPlaceLead(lead);
            setScopedRoom(null);
          }}
          onEditNote={setNoteLead}
        />
      </div>

      <PlaceLeadDialog
        open={Boolean(placeLead) || Boolean(scopedRoom)}
        onOpenChange={(open) => {
          if (!open) {
            setPlaceLead(null);
            setScopedRoom(null);
          }
        }}
        lead={placeLead}
        scopedRoom={scopedRoom}
        unplacedLeads={unplaced ?? []}
        rooms={rooms ?? []}
        onConfirm={handlePlace}
      />

      <PlacementNoteDialog
        open={Boolean(noteLead)}
        onOpenChange={(open) => !open && setNoteLead(null)}
        lead={noteLead}
        onSave={handleSaveNote}
      />

      <OccupantEditDialog
        open={Boolean(editRoom && editLeadRoomId) && !relocateOpen && !changeRoomOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditRoom(null);
            setEditLeadRoomId(null);
          }
        }}
        room={editRoom}
        leadRoomId={editLeadRoomId}
        leadName={editOccupant?.leadName ?? null}
        onRemove={() => setConfirmRemove(true)}
        onRelocate={() => {
          setRelocateOpen(true);
        }}
        onChangeRoom={() => {
          setChangeRoomOpen(true);
        }}
      />

      <RelocateDialog
        open={relocateOpen}
        onOpenChange={(open) => {
          setRelocateOpen(open);
          if (!open) {
            setEditRoom(null);
            setEditLeadRoomId(null);
          }
        }}
        leadUuid={editOccupant?.leadUuid ?? null}
        leadName={editOccupant?.leadName ?? null}
        roomTypeId={editRoom?.roomTypeId ?? null}
        currentRoomId={editRoom?.id ?? null}
        currentPropertyId={propertyId}
        properties={properties ?? []}
        onConfirm={handleRelocate}
      />

      <ChangeRoomDialog
        open={changeRoomOpen}
        onOpenChange={(open) => {
          setChangeRoomOpen(open);
          if (!open) {
            setEditRoom(null);
            setEditLeadRoomId(null);
          }
        }}
        leadUuid={editOccupant?.leadUuid ?? null}
        leadName={editOccupant?.leadName ?? null}
        currentPropertyId={propertyId}
        properties={properties ?? []}
        onConfirm={handleChangeRoom}
      />

      <ConfirmRemoveDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        leadName={editOccupant?.leadName ?? null}
        loading={actionLoading}
        onConfirm={handleRemove}
      />
    </AppShell>
  );
}
