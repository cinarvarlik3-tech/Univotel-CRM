/**
 * Shared extended filter state for active and old lead list toolbars.
 */

/** Tri-state presence filter for nullable columns. */
export type PresenceFilter = 'any' | 'yes' | 'no';

/** Extended filter fields beyond enum dropdowns in `filters` record. */
export interface ExtendedListFilterFields {
  budgetTier: string;
  /** Old leads list only — old_lead_details still uses numeric budget range. */
  budgetMin: string;
  budgetMax: string;
  moveInFrom: string;
  moveInTo: string;
  lastContactFrom: string;
  lastContactTo: string;
  unassignedOnly: boolean;
  missingUniversity: boolean;
  missingGender: boolean;
  missingBudget: boolean;
  hasParentPhone: PresenceFilter;
  hasParentName: PresenceFilter;
  hasRecHotel: PresenceFilter;
  dormAwaiting: string[];
  interestedHotel: string;
  roomType: string;
  preferredDistrict: string;
  nationality: string;
  /** Active leads only — hotel recommendation inputs. */
  campus: string;
  roomCategory: string;
  districtPreference: string;
}

/** Default values for extended list filter fields. */
export const DEFAULT_EXTENDED_LIST_FILTER_FIELDS: ExtendedListFilterFields = {
  budgetTier: '',
  budgetMin: '',
  budgetMax: '',
  moveInFrom: '',
  moveInTo: '',
  lastContactFrom: '',
  lastContactTo: '',
  unassignedOnly: false,
  missingUniversity: false,
  missingGender: false,
  missingBudget: false,
  hasParentPhone: 'any',
  hasParentName: 'any',
  hasRecHotel: 'any',
  dormAwaiting: [],
  interestedHotel: '',
  roomType: '',
  preferredDistrict: '',
  nationality: '',
  campus: '',
  roomCategory: '',
  districtPreference: '',
};
