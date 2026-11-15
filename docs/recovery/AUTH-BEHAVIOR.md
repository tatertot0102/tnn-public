# B3 auth evidence

AuthProvider/useAuth, ProtectedRoute, LoginPage and AdminLayout were recovered from the exact deployed bundle (SHA-256 recorded in generated source). Their original source files are facades to the recovered application declarations. Recovered functions retain compiled variable names and JSX-runtime calls; names were not guessed. All behavior below is seen directly in code, not inferred.

- AuthProvider calls getSession, then loads the matching profiles row. It subscribes to auth changes and unsubscribes on cleanup. PASSWORD_RECOVERY sets a recovery flag. Sign-out clears it. isExec accepts exec or admin; isAdmin accepts admin only.
- Password reset sends an email with redirect `${window.location.origin}/login/?recovery=1`. Updating a password clears recovery state only on success. No new role is taken from user metadata.
- ProtectedRoute waits for loading to finish, then checks for a session and redirects to /login if absent. It does not authorize roles or enforce RLS.
- LoginPage supports sign-in, password-reset email, password recovery, and a Production Platform link. Recovery query parameters and the PASSWORD_RECOVERY auth event are part of the bundle behavior. No signup UI is added.
- AdminLayout has Public CMS Dashboard, Video Publishing, Public Staff Profiles, a Production Platform link, View Public Site and sign-out; sidebar collapse state is local. The platform destination is https://platform.bthstnn.org/dashboard.
- VideoCMS and several management controls check specifically role === exec in the observed bundle, while AuthContext treats admin as exec-capable. This inconsistency is preserved for parity and flagged for the separate security patch.

## Limits and ambiguities

The original getSession/fetchProfile sequence has limited error handling and may race during auth transitions; this recovery does not invent a new lifecycle. Password-email delivery, allowed Supabase redirect URLs, the active CMS used by editors, current sessions, and production RLS behavior cannot be established from client code. No authenticated production session or account was created for verification. Client guards remain insufficient as data protection; see docs/security for the live baseline and proposed guards. {{TODO: authenticated end-to-end tests on a disposable Supabase environment before parity approval}}.

This is bundle-derived evidence, not a claim to have recovered the original variable names or JSX source. The archived partial VideoCMS source remains partial; the active VideoCMS implementation is complete compiled application code recovered from the bundle.
