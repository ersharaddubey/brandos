# BrandStudio — Enterprise SaaS foundation

## Included in this update

- Organization registration creates an organization and its first `owner` user.
- Email/password login for organization users; legacy admin username/password login remains available for transition.
- Passwords are stored as salted scrypt hashes (not plaintext).
- Signed expiring bearer sessions; `/api/auth/me` verifies the account and organization.
- `owner`, `admin`, and `member` roles. Organization member listing, invitation creation, invitation acceptance, and member disable endpoints are available under `/api/team`.
- Organization scope is attached to the existing content models (identities, assets, asset groups, campaigns, generations, prompts, recycle bin) and autonomy records. Query/save/aggregate middleware applies the authenticated organization scope.
- Signup and sign-in screens, forgot-password request and reset-token form.

## Local setup

1. Install dependencies: `cd server && npm ci`, then `cd ../client && npm ci`.
2. Copy `server/.env.example` to `server/.env`.
3. Set `MONGO_URI`, a unique random `AUTH_SECRET` (at least 32 random bytes), and a strong `ADMIN_PASSWORD`. Do not deploy with the default admin credentials or placeholder secret.
4. Start MongoDB, then start the API (`cd server && npm run dev`) and frontend (`cd client && npm run dev`).
5. Open the frontend and choose **Create an organization account**. Passwords must be at least 12 characters.

## Existing database migration — IMPORTANT

Existing records without `organizationId` are not automatically exposed to new customer accounts. Back up MongoDB first. Create the first organization account, then set `LEGACY_ORG_SLUG` to its slug in `server/.env` and run:

```bash
cd server
node scripts/migrate-legacy-tenant.js
node scripts/migrate-legacy-tenant.js --apply
```

The first command is a dry run. The `--apply` command assigns all legacy unscoped content records to that organization and removes old global unique indexes on asset hashes/campaign names so tenant-scoped compound indexes can be used. Review the dry-run counts and backup before applying. Restart the API after migration.

## Team endpoints

- `GET /api/team/members` — owner/admin only.
- `POST /api/team/invitations` with `{ "email": "person@example.com", "role": "member" }` — owner/admin only. Returns a one-time invite token.
- `POST /api/team/invitations/accept` with `{ "token": "...", "name": "...", "password": "at-least-12-chars" }` — accepts an invite.
- `DELETE /api/team/members/:id` — disables a non-owner member; owner/admin only.

Invitation delivery is not wired to an email provider. Until SMTP/Resend/etc. is configured, copy the returned token into the invite acceptance flow yourself. Password-reset links are logged by the API for development/testing; configure a mail provider before production use. The UI's forgot-password action displays a generic response to avoid account enumeration.

## Important production work still required

This is a SaaS authentication and tenant-isolation foundation, not a production certification. Before opening public registration:

- Configure an email provider for verified email, password-reset delivery, and team invitations; add abuse/rate limits and CAPTCHA to public signup/reset endpoints.
- Add a polished team-management/billing UI and enforce subscription quotas. The organization plan field is currently a placeholder; no payment processor is connected.
- Review every future model, background worker, file/object-storage URL, export, and integration for tenant scoping. Local `/uploads` static serving and third-party storage policies need private/signed access before storing confidential customer assets.
- Add security review, audit logs, refresh/revocation strategy, session/device management, backup/restore drills, and production integration tests.
- Set a real image generator provider and its credentials/endpoint. The shipped configuration still defaults to `GENERATOR_PROVIDER=mock`; no real image generation is claimed by this update.

## Tests

`cd server && npm test` runs the Node test suite. `node --check` was run on the changed server modules. Full frontend production build and live MongoDB/API integration tests require installing all dependencies and a configured MongoDB instance.
