-- Migration 0078: Team Panel aggregation RPCs (§6.2 / D25)
-- Implements SQL-side aggregations for new Team Panel metrics to avoid in-memory paging limits.
-- Includes: four conversion ratios, connect rate, loss-reason breakdown, stale-at-yeni count.

CREATE OR REPLACE FUNCTION get_team_panel_metrics(
  date_from TIMESTAMPTZ,
  date_to   TIMESTAMPTZ
)
RETURNS TABLE (
  salesperson_id           UUID,
  full_name                TEXT,
  -- Volume
  active_lead_count        BIGINT,
  message_count            BIGINT,
  call_count               BIGINT,
  answered_call_count      BIGINT,
  scheduled_visit_count    BIGINT,
  -- Outcomes
  downpayment_count        BIGINT,
  signed_count             BIGINT,
  -- Conversions (yeni→signed, yeni→downpayment, visit→downpayment, downpayment→signed)
  conv_yeni_to_signed      NUMERIC,
  conv_yeni_to_downpayment NUMERIC,
  conv_visit_to_downpayment NUMERIC,
  conv_downpayment_to_signed NUMERIC,
  -- Connect rate
  outbound_connect_rate    NUMERIC,
  -- Stale leads at yeni > 7 days
  stale_at_yeni_count      BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- All active salespeople
  agents AS (
    SELECT sp.id, sp.full_name, sp.chatwoot_user_id
    FROM salespeople sp
    WHERE sp.is_active = true
  ),
  -- Active lead counts per agent
  lead_counts AS (
    SELECT
      l.assigned_to AS agent_id,
      COUNT(*) AS active_lead_count
    FROM leads l
    WHERE l.is_deleted = false AND l.is_archived = false AND l.funnel_status != 'lost'
    GROUP BY l.assigned_to
  ),
  -- Message counts scoped per rep via chatwoot_user_id join (excludes campaigns)
  msg_counts AS (
    SELECT
      sp.id AS agent_id,
      COUNT(lm.id) AS message_count
    FROM salespeople sp
    JOIN lead_messages lm ON lm.sender_agent_id = sp.chatwoot_user_id::TEXT
    WHERE
      lm.created_at BETWEEN date_from AND date_to
      AND lm.sender_agent_id IS NOT NULL
    GROUP BY sp.id
  ),
  -- Call counts from contact_history (netgsm CDR, both directions)
  call_agg AS (
    SELECT
      -- CDR has no salesperson_id; attribute to lead assignee at time of call
      l.assigned_to AS agent_id,
      COUNT(*) AS call_count,
      COUNT(*) FILTER (
        WHERE (ch.metadata->>'duration_seconds')::INT > 0
      ) AS answered_call_count
    FROM contact_history ch
    JOIN leads l ON l.uuid = ch.lead_uuid
    WHERE
      ch.interaction_source = 'netgsm'
      AND ch.created_at BETWEEN date_from AND date_to
      AND l.assigned_to IS NOT NULL
    GROUP BY l.assigned_to
  ),
  -- Visit counts (scheduled) per agent
  visit_counts AS (
    SELECT
      v.created_by AS agent_id,
      COUNT(*) AS scheduled_visit_count
    FROM visits v
    WHERE v.created_at BETWEEN date_from AND date_to
    GROUP BY v.created_by
  ),
  -- Stage transition counts using lead_stage_history
  transitions AS (
    SELECT
      lsh.changed_by AS agent_id,
      lsh.from_status,
      lsh.to_status
    FROM lead_stage_history lsh
    WHERE
      lsh.changed_at BETWEEN date_from AND date_to
      AND lsh.changed_by IS NOT NULL
  ),
  downpayment_counts AS (
    SELECT agent_id, COUNT(*) AS downpayment_count
    FROM transitions
    WHERE to_status = 'kapora-alindi'
    GROUP BY agent_id
  ),
  signed_counts AS (
    SELECT agent_id, COUNT(*) AS signed_count
    FROM transitions
    WHERE to_status = 'sozlesme-imzalandi'
    GROUP BY agent_id
  ),
  -- Base counts for conversion denominators
  yeni_leads AS (
    SELECT l.assigned_to AS agent_id, COUNT(DISTINCT l.uuid) AS cnt
    FROM leads l
    WHERE l.is_deleted = false
    GROUP BY l.assigned_to
  ),
  visit_leads AS (
    SELECT lsh.changed_by AS agent_id, COUNT(DISTINCT lsh.lead_uuid) AS cnt
    FROM lead_stage_history lsh
    WHERE lsh.to_status = 'ziyaret' AND lsh.changed_at BETWEEN date_from AND date_to
    GROUP BY lsh.changed_by
  ),
  -- Outbound call connect rate
  outbound_calls AS (
    SELECT
      l.assigned_to AS agent_id,
      COUNT(*) FILTER (WHERE (ch.metadata->>'direction') = 'outbound') AS outbound_total,
      COUNT(*) FILTER (
        WHERE (ch.metadata->>'direction') = 'outbound'
        AND (ch.metadata->>'duration_seconds')::INT > 0
      ) AS outbound_answered
    FROM contact_history ch
    JOIN leads l ON l.uuid = ch.lead_uuid
    WHERE
      ch.interaction_source = 'netgsm'
      AND ch.created_at BETWEEN date_from AND date_to
      AND l.assigned_to IS NOT NULL
    GROUP BY l.assigned_to
  ),
  -- Stale at yeni > 7 days
  stale_yeni AS (
    SELECT
      l.assigned_to AS agent_id,
      COUNT(*) AS stale_at_yeni_count
    FROM leads l
    -- Most recent stage history entry for current stage
    JOIN LATERAL (
      SELECT lsh.created_at
      FROM lead_stage_history lsh
      WHERE lsh.lead_uuid = l.uuid
      ORDER BY lsh.created_at DESC
      LIMIT 1
    ) latest_stage ON true
    WHERE
      l.funnel_status = 'yeni'
      AND l.is_deleted = false
      AND l.is_archived = false
      AND EXTRACT(EPOCH FROM (NOW() - latest_stage.created_at)) / 86400 > 7
    GROUP BY l.assigned_to
  )

  SELECT
    a.id                                                             AS salesperson_id,
    a.full_name,
    COALESCE(lc.active_lead_count, 0)                               AS active_lead_count,
    COALESCE(mc.message_count, 0)                                   AS message_count,
    COALESCE(ca.call_count, 0)                                      AS call_count,
    COALESCE(ca.answered_call_count, 0)                             AS answered_call_count,
    COALESCE(vc.scheduled_visit_count, 0)                           AS scheduled_visit_count,
    COALESCE(dc.downpayment_count, 0)                               AS downpayment_count,
    COALESCE(sc.signed_count, 0)                                    AS signed_count,
    -- Conversions: ratio or NULL if no denominator
    CASE WHEN COALESCE(yl.cnt, 0) > 0
      THEN ROUND(COALESCE(sc.signed_count, 0)::NUMERIC / yl.cnt * 100, 1)
      ELSE NULL
    END                                                              AS conv_yeni_to_signed,
    CASE WHEN COALESCE(yl.cnt, 0) > 0
      THEN ROUND(COALESCE(dc.downpayment_count, 0)::NUMERIC / yl.cnt * 100, 1)
      ELSE NULL
    END                                                              AS conv_yeni_to_downpayment,
    CASE WHEN COALESCE(vl.cnt, 0) > 0
      THEN ROUND(COALESCE(dc.downpayment_count, 0)::NUMERIC / vl.cnt * 100, 1)
      ELSE NULL
    END                                                              AS conv_visit_to_downpayment,
    CASE WHEN COALESCE(dc.downpayment_count, 0) > 0
      THEN ROUND(COALESCE(sc.signed_count, 0)::NUMERIC / dc.downpayment_count * 100, 1)
      ELSE NULL
    END                                                              AS conv_downpayment_to_signed,
    CASE WHEN COALESCE(oc.outbound_total, 0) > 0
      THEN ROUND(COALESCE(oc.outbound_answered, 0)::NUMERIC / oc.outbound_total * 100, 1)
      ELSE NULL
    END                                                              AS outbound_connect_rate,
    COALESCE(sy.stale_at_yeni_count, 0)                             AS stale_at_yeni_count
  FROM agents a
  LEFT JOIN lead_counts lc ON lc.agent_id = a.id
  LEFT JOIN msg_counts mc ON mc.agent_id = a.id
  LEFT JOIN call_agg ca ON ca.agent_id = a.id
  LEFT JOIN visit_counts vc ON vc.agent_id = a.id
  LEFT JOIN downpayment_counts dc ON dc.agent_id = a.id
  LEFT JOIN signed_counts sc ON sc.agent_id = a.id
  LEFT JOIN yeni_leads yl ON yl.agent_id = a.id
  LEFT JOIN visit_leads vl ON vl.agent_id = a.id
  LEFT JOIN outbound_calls oc ON oc.agent_id = a.id
  LEFT JOIN stale_yeni sy ON sy.agent_id = a.id
  ORDER BY a.full_name;
END;
$$;

-- Loss-reason breakdown RPC (separate to keep get_team_panel_metrics clean)
CREATE OR REPLACE FUNCTION get_loss_reason_breakdown(
  date_from TIMESTAMPTZ,
  date_to   TIMESTAMPTZ,
  p_agent_id UUID DEFAULT NULL
)
RETURNS TABLE (
  salesperson_id UUID,
  loss_reason    TEXT,
  cnt            BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lsh.changed_by AS salesperson_id,
    l.loss_reason,
    COUNT(*) AS cnt
  FROM lead_stage_history lsh
  JOIN leads l ON l.uuid = lsh.lead_uuid
  WHERE
    lsh.to_status = 'lost'
    AND lsh.changed_at BETWEEN date_from AND date_to
    AND lsh.changed_by IS NOT NULL
    AND (p_agent_id IS NULL OR lsh.changed_by = p_agent_id)
    AND l.loss_reason IS NOT NULL
  GROUP BY lsh.changed_by, l.loss_reason
  ORDER BY cnt DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_team_panel_metrics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_loss_reason_breakdown(TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;
