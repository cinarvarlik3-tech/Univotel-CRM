update leads
set source_details = jsonb_set(
  source_details,
  '{chatwoot_url}',
  to_jsonb(
    replace(
      source_details->>'chatwoot_url',
      '/app/conversations/',
      '/app/accounts/1/conversations/'
    )
  )
)
where source_details->>'chatwoot_url' like '%/app/conversations/%'
  and source_details->>'chatwoot_url' not like '%/app/accounts/%';
