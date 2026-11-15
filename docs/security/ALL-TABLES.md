# All-schema table inventory

From the live catalog and full schema dump: all 68 base tables, not only the public schema. ACLs and managed-schema definitions are in live-schema-full-2026-11-15.sql. RLS disabled on a managed table does not alone establish public API exposure; schema usage, table grants, API exposure, inherited roles and SECURITY DEFINER paths must also be considered.

| Schema | Table | RLS | Policies |
| --- | --- | --- | --- |
| auth | audit_log_entries | True | 0 |
| auth | custom_oauth_providers | False | 0 |
| auth | flow_state | True | 0 |
| auth | identities | True | 0 |
| auth | instances | True | 0 |
| auth | mfa_amr_claims | True | 0 |
| auth | mfa_challenges | True | 0 |
| auth | mfa_factors | True | 0 |
| auth | mfa_recovery_code_sets | False | 0 |
| auth | mfa_recovery_codes | False | 0 |
| auth | oauth_authorizations | False | 0 |
| auth | oauth_client_states | False | 0 |
| auth | oauth_clients | False | 0 |
| auth | oauth_consents | False | 0 |
| auth | one_time_tokens | True | 0 |
| auth | refresh_tokens | True | 0 |
| auth | saml_providers | True | 0 |
| auth | saml_relay_states | True | 0 |
| auth | schema_migrations | True | 0 |
| auth | scim_tokens | False | 0 |
| auth | scim_users | False | 0 |
| auth | sessions | True | 0 |
| auth | sso_domains | True | 0 |
| auth | sso_providers | True | 0 |
| auth | users | True | 0 |
| auth | webauthn_challenges | False | 0 |
| auth | webauthn_credentials | False | 0 |
| net | _http_response | False | 0 |
| net | http_request_queue | False | 0 |
| public | approval_feedback | True | 3 |
| public | approval_gate_approvers | True | 4 |
| public | approval_gates | True | 4 |
| public | channel_group_members | True | 2 |
| public | channel_groups | True | 2 |
| public | channel_members | True | 3 |
| public | channels | True | 4 |
| public | media_share_links | True | 3 |
| public | messages | True | 3 |
| public | milestones | True | 2 |
| public | notifications | True | 3 |
| public | profiles | True | 6 |
| public | segment_deliverables | True | 4 |
| public | segment_media | True | 4 |
| public | segment_roles | True | 2 |
| public | segments | True | 4 |
| public | subtasks | True | 4 |
| public | tasks | True | 4 |
| public | videos | True | 5 |
| realtime | messages_2026_11_11 | False | 0 |
| realtime | messages_2026_11_12 | False | 0 |
| realtime | messages_2026_11_13 | False | 0 |
| realtime | messages_2026_11_14 | False | 0 |
| realtime | messages_2026_11_15 | False | 0 |
| realtime | messages_2026_11_16 | False | 0 |
| realtime | messages_2026_11_17 | False | 0 |
| realtime | schema_migrations | False | 0 |
| realtime | subscription | False | 0 |
| storage | bucket_lifecycle_states | True | 0 |
| storage | buckets | True | 0 |
| storage | buckets_analytics | True | 0 |
| storage | buckets_vectors | True | 0 |
| storage | lifecycle_abandoned_artifacts | True | 0 |
| storage | migrations | True | 0 |
| storage | objects | True | 7 |
| storage | s3_multipart_uploads | True | 0 |
| storage | s3_multipart_uploads_parts | True | 0 |
| storage | vector_indexes | True | 0 |
| supabase_functions | hooks | False | 0 |
| supabase_functions | migrations | False | 0 |
| vault | secrets | False | 0 |

All 19 public tables have RLS enabled and contain all 73 policies in this snapshot. The identity proposal covers the 18 internal public tables, excluding videos and the public_profiles view.

Managed-schema concerns: net HTTP queues have PUBLIC table ACLs and net schema usage grants; supabase_functions hooks/migrations have anon/authenticated ACLs; realtime.subscription allows anon/authenticated SELECT. These were inventoried, not modified. {{TODO: verify effective access and API schema exposure with Supabase support/disposable environment before changing managed objects}}. Auth and vault tables with disabled RLS predominantly rely on trusted-role grants; no credential/table contents were queried for this inventory.

API exposure probes are recorded in api-schema-check-*.json. They failed at the gateway: the public key from the checked-in env and live bundle returned Invalid API key; the current publishable key returned Secret API key required. Therefore no conclusion about exposed schemas can be drawn from those probes. A database setting query for pgrst.db_schemas returned no rows. {{TODO: inspect gateway/API configuration and validate public client access; do not add a service key to the public site}}.
