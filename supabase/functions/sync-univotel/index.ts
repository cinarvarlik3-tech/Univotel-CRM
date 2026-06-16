/**
 * Edge Function: receives univotel Database Webhook payloads and upserts into CRM.
 * Auth: X-Webhook-Secret header must match UNIVOTEL_SYNC_SECRET.
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

function mapHotelStatus(isVisible: boolean | null): 'active' | 'paused' {
  return isVisible === false ? 'paused' : 'active';
}

async function handlePayload(crm: SupabaseClient, payload: WebhookPayload) {
  if (payload.table === 'hotels') {
    if (payload.type === 'DELETE') {
      const id = payload.old_record?.id as string;
      const { error } = await crm
        .from('properties')
        .update({ status: 'closed', is_available: false })
        .eq('id', id);
      if (error) throw error;
      return { table: 'properties', action: 'soft_deactivate', id };
    }
    const h = payload.record!;
    const status = mapHotelStatus(h.is_visible as boolean | null);
    const { error } = await crm.from('properties').upsert(
      {
        id: h.id,
        hotel_name: h.name,
        address: h.address,
        district: h.district,
        status,
        is_available: status === 'active',
      },
      { onConflict: 'id' },
    );
    if (error) throw error;
    return { table: 'properties', action: 'upsert', id: h.id as string };
  }

  if (payload.table === 'room_types') {
    if (payload.type === 'DELETE') {
      const id = payload.old_record?.id as string;
      const { error } = await crm.from('room_types').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      return { table: 'room_types', action: 'soft_deactivate', id };
    }
    const rt = payload.record!;
    const { error } = await crm.from('room_types').upsert(
      {
        id: rt.id,
        hotel_id: rt.hotel_id,
        name: rt.name,
        size_m2: rt.size_m2,
        capacity: rt.person_count,
        is_active: true,
      },
      { onConflict: 'id' },
    );
    if (error) throw error;
    return { table: 'room_types', action: 'upsert', id: rt.id as string };
  }

  throw new Error(`Unsupported table: ${payload.table}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const secret = Deno.env.get('UNIVOTEL_SYNC_SECRET');
  const incoming = req.headers.get('X-Webhook-Secret');

  if (!secret || incoming !== secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const crmUrl = Deno.env.get('SUPABASE_URL');
  const crmServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!crmUrl || !crmServiceKey) {
    return new Response(JSON.stringify({ error: 'CRM credentials not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = (await req.json()) as WebhookPayload;
    const crm = createClient(crmUrl, crmServiceKey);
    const result = await handlePayload(crm, payload);

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
