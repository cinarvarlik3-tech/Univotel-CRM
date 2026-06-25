import { describe, expect, it } from 'vitest';
import {
  applyLossReasonUpdate,
  getLossRecoveryFinancialTarget,
} from '@/lib/leads/apply-loss-reason-update';

describe('applyLossReasonUpdate', () => {
  const base = {
    funnel_status: 'ziyaret-etti',
    funnel_status_before_lost: null,
    loss_reason: null,
  };

  it('moves to lost and saves prior stage when loss_reason is set', () => {
    expect(applyLossReasonUpdate(base, { loss_reason: 'price' })).toEqual({
      loss_reason: 'price',
      funnel_status: 'lost',
      funnel_status_before_lost: 'ziyaret-etti',
    });
  });

  it('does not overwrite saved stage when already lost', () => {
    expect(
      applyLossReasonUpdate(
        {
          funnel_status: 'lost',
          funnel_status_before_lost: 'ziyaret-etti',
          loss_reason: 'price',
        },
        { loss_reason: 'location' },
      ),
    ).toEqual({
      loss_reason: 'location',
      funnel_status: 'lost',
    });
  });

  it('restores prior stage when loss_reason is cleared on a lost lead', () => {
    expect(
      applyLossReasonUpdate(
        {
          funnel_status: 'lost',
          funnel_status_before_lost: 'ziyaret-etti',
          loss_reason: 'price',
        },
        { loss_reason: null },
      ),
    ).toEqual({
      loss_reason: null,
      funnel_status: 'ziyaret-etti',
      funnel_status_before_lost: null,
    });
  });

  it('defaults to yeni when clearing loss_reason without a saved stage', () => {
    expect(
      applyLossReasonUpdate(
        { funnel_status: 'lost', funnel_status_before_lost: null, loss_reason: 'price' },
        { loss_reason: null },
      ),
    ).toEqual({
      loss_reason: null,
      funnel_status: 'yeni',
      funnel_status_before_lost: null,
    });
  });

  it('does not restore when clearing loss_reason on a non-lost lead', () => {
    expect(
      applyLossReasonUpdate(
        { funnel_status: 'arandi', funnel_status_before_lost: null, loss_reason: null },
        { loss_reason: null },
      ),
    ).toEqual({});
  });

  it('returns empty when loss_reason is unchanged', () => {
    expect(
      applyLossReasonUpdate(
        { funnel_status: 'lost', funnel_status_before_lost: 'arandi', loss_reason: 'price' },
        { loss_reason: 'price' },
      ),
    ).toEqual({});
  });
});

describe('getLossRecoveryFinancialTarget', () => {
  it('returns kapora when clearing loss from a lead saved at kapora', () => {
    expect(
      getLossRecoveryFinancialTarget(
        {
          funnel_status: 'lost',
          funnel_status_before_lost: 'kapora-alindi',
          loss_reason: 'price',
        },
        { loss_reason: null },
      ),
    ).toBe('kapora-alindi');
  });

  it('returns sozlesme when clearing loss from a lead saved at sozlesme', () => {
    expect(
      getLossRecoveryFinancialTarget(
        {
          funnel_status: 'lost',
          funnel_status_before_lost: 'sozlesme-imzalandi',
          loss_reason: 'price',
        },
        { loss_reason: null },
      ),
    ).toBe('sozlesme-imzalandi');
  });

  it('returns null when recovery target is not a financial stage', () => {
    expect(
      getLossRecoveryFinancialTarget(
        {
          funnel_status: 'lost',
          funnel_status_before_lost: 'ziyaret-etti',
          loss_reason: 'price',
        },
        { loss_reason: null },
      ),
    ).toBeNull();
  });
});
