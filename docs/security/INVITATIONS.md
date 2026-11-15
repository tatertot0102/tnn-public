# Invite-only server endpoint — review package

`supabase/functions/invite-staff/index.ts` is an undeployed Edge Function. Its isolated handler uses injected adapters in tests so no account is created and no email is sent. Exec/admin authorization is evaluated on the server, from a getUser-verified session ID and the live profiles row. Caller metadata, user-supplied roles, and browser route guards cannot grant this permission. New profiles receive the live member default via handle_new_user. The request must contain only email and full_name; redirects are fixed by server configuration. Authorization/database/provider failures fail closed.

Supabase runtime supplies SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Set TNN_INVITE_REDIRECT_URL to the approved onboarding destination on https://platform.bthstnn.org or https://bthstnn.org; HTTPS is mandatory. Missing configuration prevents startup. No service credential belongs in VITE_ variables or client JavaScript. Browser CORS accepts only those two production origins. Preview/local origins require an explicit code/config review before integration testing.

From either authenticated CMS, the client contract is:

```js
const { data, error } = await supabase.functions.invoke('invite-staff', {
  body: { email, full_name: fullName },
})
```

No invitation is sent merely by deploying this function. Invoking it successfully sends an actual invitation and creates an account: that is a production data/email action requiring owner approval for a specific test recipient. No live test invitation was sent here.

The platform code links editors to `https://bthstnn.org/#/newsroom/videos` from SegmentDetail.jsx and uses videos rows for draft/planning links. This is code evidence of a public CMS handoff, not proof of current editor usage. {{TODO: confirm active CMS and onboarding redirect, then replace its browser auth.admin invitation call and align role controls with admin-only role changes}}. Preserve exact B1 recovery before applying any such security patch. No UI changes are included here.

{{TODO: test the Edge Function entry point in the Supabase runtime, JWT verification behavior, invite acceptance, provider rate limits, and both CMS clients in a disposable Supabase environment}}. Node tests cover the handler boundary with mocked provider adapters, not actual email delivery. Existing signup remains disabled. {{TODO: add an approved invitation quota/audit design before broad rollout if exec invite abuse is a concern}}.

Review commands (read-only/local):

```sh
node --test scripts/test-invite-staff.mjs
node scripts/test-security-proposal.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js
```

Deployment, redirect allowlisting, actual invitations and SQL application remain approval-gated. The exact proposed SQL is docs/security/proposals/001-security.up.sql with 001-security.down.sql as rollback. Rolling back restores the pre-existing vulnerabilities.

## Client integration continuation

The recovered public CMS Team page now calls invite-staff with email/full_name and never supplies a role. Execs/admins can invite; only admins can edit sign-in roles in the UI. The live profiles role constraint was used to replace the invalid alumni option with exec-roles. The server role guard remains the actual enforcement and must be reviewed/applied with the UI rollout; hiding/disabling a control is not authorization.

A source-observed onboarding destination is `https://bthstnn.org/login/?recovery=1`: the recovered login form explicitly uses this query to show password setup, and Supabase's invite link supplies the session. Set this server-owned redirect only after owner approval/allowlisting. {{TODO: verify real invite acceptance/session exchange in disposable Supabase before production invitations}}. This is not an assertion about which CMS the staff currently uses.

Client verification: the page builds successfully. Browser checks at 390/768/1440 cover exec, admin and member fixtures. Exec/admin can send a mocked invitation with only email/full_name; members have no invite action. Exec role selectors are disabled and admin role selectors are enabled. All six simulated sends were intercepted and never reached Supabase; no actual email/account was created. Eighteen before/after screenshots were captured, with no browser errors or horizontal overflow. The actual Edge Function still requires an approved deployment, redirect allowlist and disposable acceptance test.
