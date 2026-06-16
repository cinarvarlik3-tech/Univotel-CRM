/**
 * SWR hooks for PMS screens.
 */
import useSWR from 'swr';
import type { PmsRoomWithOccupancy, PmsUnplacedLead } from '@/types/domain';

interface PmsProperty {
  id: string;
  hotel_name: string;
  district: string | null;
  status: string;
  is_available: boolean;
}

interface PmsRoomType {
  id: string;
  name: string;
  capacity: number;
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  return json.data;
}

/** Active properties for PMS chooser and filters. */
export function usePmsProperties() {
  return useSWR<PmsProperty[]>('/api/pms/properties', fetcher);
}

/** Rooms + occupancy for a property. */
export function usePmsRooms(propertyId: string | null) {
  return useSWR<PmsRoomWithOccupancy[]>(
    propertyId ? `/api/pms/rooms?propertyId=${propertyId}` : null,
    fetcher,
  );
}

/** Active room types for a property (change-room flow). */
export function usePmsRoomTypes(propertyId: string | null) {
  return useSWR<PmsRoomType[]>(
    propertyId ? `/api/pms/room-types?propertyId=${propertyId}` : null,
    fetcher,
  );
}

/** Unplaced worklist; propertyId omitted = all properties. */
export function usePmsUnplaced(opts?: {
  propertyId?: string | null;
  viewAll?: boolean;
  studentGender?: string;
  schoolShortname?: string;
}) {
  const params = new URLSearchParams();
  if (!opts?.viewAll && opts?.propertyId) params.set('propertyId', opts.propertyId);
  if (opts?.studentGender) params.set('studentGender', opts.studentGender);
  if (opts?.schoolShortname) params.set('schoolShortname', opts.schoolShortname);

  const qs = params.toString();
  const url = `/api/pms/unplaced${qs ? `?${qs}` : ''}`;

  return useSWR<PmsUnplacedLead[]>(url, fetcher);
}
