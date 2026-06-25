-- 0098: Room-type revenue breakdown for FMS property pie chart.
-- Mirrors fms_revenue_breakdown but groups by room type within one property.

CREATE OR REPLACE FUNCTION fms_property_roomtype_breakdown(
  p_property_id   UUID,
  p_include_kapora BOOLEAN DEFAULT false
)
RETURNS TABLE (
  room_type_id      UUID,
  room_type_name    TEXT,
  customer_count    BIGINT,
  room_type_revenue NUMERIC
)
LANGUAGE sql SECURITY INVOKER STABLE AS $$
  SELECT
    rt.id                AS room_type_id,
    rt.name              AS room_type_name,
    COUNT(af.id)         AS customer_count,
    COALESCE(SUM(af.lead_revenue), 0) AS room_type_revenue
  FROM active_finance af
  JOIN leads l       ON l.uuid = af.lead_id
  JOIN room_types rt ON rt.id = af.purchased_room
  WHERE rt.hotel_id = p_property_id
    AND (p_include_kapora OR l.funnel_status <> 'kapora-alindi')
  GROUP BY rt.id, rt.name;
$$;

COMMENT ON FUNCTION fms_property_roomtype_breakdown IS
  'Per-room-type revenue for one property. Same kapora filter as fms_revenue_breakdown.';

REVOKE EXECUTE ON FUNCTION fms_property_roomtype_breakdown(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION fms_property_roomtype_breakdown(UUID, BOOLEAN) TO service_role;
