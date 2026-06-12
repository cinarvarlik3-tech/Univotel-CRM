/** Thrown when a panel field PATCH fails; carries HTTP status when available. */
export class PanelSaveError extends Error {
  readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'PanelSaveError';
    this.statusCode = statusCode;
  }
}

const SAVE_TIMEOUT_MS = 3000;

/** User-facing toast copy with optional error code suffix. */
export function formatPanelSaveError(err: unknown): string {
  const base = 'Değişiklikler kaydedilemedi.';
  if (err instanceof Error && err.message === 'TIMEOUT') {
    return `${base} (TIMEOUT)`;
  }
  if (err instanceof PanelSaveError && err.statusCode != null) {
    return `${base} (${err.statusCode})`;
  }
  return base;
}

/**
 * Applies an optimistic patch immediately, persists in the background, and reverts
 * with a failure callback if the request errors or exceeds 3 seconds.
 */
export async function runOptimisticSave<T>({
  applyOptimistic,
  revert,
  persist,
  onFailure,
}: {
  applyOptimistic: () => void;
  revert: () => void;
  persist: () => Promise<T>;
  onFailure: (message: string) => void;
}): Promise<void> {
  applyOptimistic();

  const timeout = new Promise<never>((_, reject) => {
    window.setTimeout(() => reject(new Error('TIMEOUT')), SAVE_TIMEOUT_MS);
  });

  try {
    await Promise.race([persist(), timeout]);
  } catch (err) {
    revert();
    onFailure(formatPanelSaveError(err));
  }
}
