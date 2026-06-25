/**
 * FMS selection context — threads partner/property filters across dashboard widgets.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { UNATTRIBUTED_PARTNER_ID } from '@/lib/finance/constants';

export type FmsSelection = {
  partnerId: string | null;
  propertyId: string | null;
};

type FmsSelectionContextValue = FmsSelection & {
  setPartnerId: (id: string | null) => void;
  setPropertyId: (id: string | null) => void;
  /** Set partner + property together (property pick must not clear itself). */
  setPartnerAndProperty: (partnerId: string | null, propertyId: string | null) => void;
  clearPartner: () => void;
  clearProperty: () => void;
  isUnattributed: boolean;
};

const FmsSelectionContext = createContext<FmsSelectionContextValue | null>(null);

export function FmsSelectionProvider({ children }: { children: ReactNode }) {
  const [partnerId, setPartnerIdState] = useState<string | null>(null);
  const [propertyId, setPropertyIdState] = useState<string | null>(null);

  const setPartnerId = useCallback((id: string | null) => {
    setPartnerIdState(id);
    setPropertyIdState(null);
  }, []);

  const setPropertyId = useCallback((id: string | null) => {
    setPropertyIdState(id);
  }, []);

  const setPartnerAndProperty = useCallback(
    (nextPartnerId: string | null, nextPropertyId: string | null) => {
      setPartnerIdState(nextPartnerId);
      setPropertyIdState(nextPropertyId);
    },
    [],
  );

  const clearPartner = useCallback(() => setPartnerId(null), [setPartnerId]);
  const clearProperty = useCallback(() => setPropertyIdState(null), []);

  const value = useMemo(
    () => ({
      partnerId,
      propertyId,
      setPartnerId,
      setPropertyId,
      setPartnerAndProperty,
      clearPartner,
      clearProperty,
      isUnattributed: partnerId === UNATTRIBUTED_PARTNER_ID,
    }),
    [
      partnerId,
      propertyId,
      setPartnerId,
      setPropertyId,
      setPartnerAndProperty,
      clearPartner,
      clearProperty,
    ],
  );

  return <FmsSelectionContext.Provider value={value}>{children}</FmsSelectionContext.Provider>;
}

export function useFmsSelection(): FmsSelectionContextValue {
  const ctx = useContext(FmsSelectionContext);
  if (!ctx) {
    throw new Error('useFmsSelection must be used within FmsSelectionProvider');
  }
  return ctx;
}
