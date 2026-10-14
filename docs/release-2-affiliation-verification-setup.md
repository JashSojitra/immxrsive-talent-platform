# Release 2 M2 affiliation verification setup

Release 2 M2 verifies control of an approved Algoma University email after a
student signs in with GitHub. GitHub identity and university affiliation remain
separate: a GitHub email address never grants verified-student access.

## Email delivery

Email delivery is server-only and selectable. Set `EMAIL_PROVIDER=gmail` for
Gmail SMTP or `EMAIL_PROVIDER=resend` for the existing Resend adapter. The
selected adapter fails closed if its own configuration or delivery fails; the
application never falls through to the other provider or reports fake success.
For backward compatibility, an omitted `EMAIL_PROVIDER` selects Resend, but new
configurations should always set the provider explicitly.

### Gmail SMTP

Use a dedicated Gmail or Google Workspace account when possible:

1. Enable 2-Step Verification on the Google account.
2. Create an App Password for this application. Do not use the normal account
   password and never commit the App Password.
3. Add the complete verification configuration to the ignored `.env.local`
   file for local development:

```text
EMAIL_PROVIDER=gmail
GMAIL_SMTP_USER=<complete Gmail or Google Workspace email address>
GMAIL_SMTP_APP_PASSWORD=<16-character Google App Password>
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<random value with at least 32 characters>
ALGOMA_APPROVED_EMAIL_DOMAINS=algomau.ca
AFFILIATION_VERIFICATION_TTL_MINUTES=30
```

The adapter connects only to `smtp.gmail.com` on port 465 with implicit TLS,
TLS 1.2 or newer, and bounded connection, greeting, and socket timeouts. The
actual From address is always `GMAIL_SMTP_USER`, displayed as `NOT ImmXrsive`;
it cannot be supplied by an API caller. File and URL access from message content
are disabled.

For Vercel Preview and Production, add the same three variables separately in
the Vercel project settings for each intended environment as Secret values,
then redeploy that environment; environment changes do not alter an existing
deployment. Scope Preview credentials to the intended branch where practical.
Do not add Gmail credentials to Development unless Vercel-hosted development
builds must send mail. `BETTER_AUTH_URL` must separately match the trusted URL
for each deployed environment. Rotate a credential by creating a new App
Password, updating every intended environment, redeploying, verifying a send,
and then revoking the old App Password.

Vercel permits outbound SMTP except on port 25, so this adapter's port 465 is
supported. The route awaits SMTP submission before returning, as required for
function reliability. Vercel nevertheless recommends a transactional email API
such as Resend for production-scale delivery; it avoids long-lived SMTP
connections and provides stronger delivery analytics. Keep Resend available as
the operational fallback choice, but switch providers explicitly rather than
falling back during a request.

Gmail applies account-specific sending limits and anti-abuse controls, may
temporarily block serverless hosting IPs, and is not designed for high-volume
transactional delivery. A successful SMTP submission means Gmail accepted the
message for processing; it does not prove inbox delivery. Confirm operation by
requesting one link to an authorized test `algomau.ca` mailbox, checking the
sender and both HTML/plain-text content, opening the link while signed in to the
same account, and reviewing spam/quarantine if it does not arrive.

### Resend alternative

To use Resend, add and verify a sending domain and DNS records, create a
restricted API key, choose a From address on that domain, and configure:

```text
EMAIL_PROVIDER=resend
RESEND_API_KEY=<server-only Resend API key>
AFFILIATION_EMAIL_FROM=NOT ImmXrsive <verify@verified-domain.example>
ALGOMA_APPROVED_EMAIL_DOMAINS=algomau.ca
AFFILIATION_VERIFICATION_TTL_MINUTES=30
```

`BETTER_AUTH_URL` supplies the public origin for verification links and
`BETTER_AUTH_SECRET` protects rate-limit identifiers. Neither secret may use a
`NEXT_PUBLIC_` prefix. If the provider key or sender is absent, the API returns
`EMAIL_NOT_CONFIGURED`; it never reports a fake successful delivery.

SMTP errors exposed to the client are sanitized and contain no credentials,
provider authentication details, raw token, or recipient address. Resends keep
the existing user/email rate limits, supersede older outstanding challenges,
and make only the newest successfully submitted link usable. Gmail SMTP has no
provider idempotency API; a stable message ID reduces accidental duplication,
but an ambiguous network failure can still result in a delivered message whose
challenge was invalidated. A retry is safe because older links remain unusable.

## Security behavior

- Verification tokens contain 256 random bits and expire after at most 30
  minutes.
- Only a SHA-256 token digest is stored in PostgreSQL. Raw tokens are sent to
  the requested address and are never logged.
- Each link is bound to both the authenticated internal user and normalized
  institutional email, is single-use, and is consumed atomically with the
  verified affiliation record.
- Requesting another link supersedes every outstanding link for that user.
- A unique database constraint prevents the same verified university email
  from belonging to more than one internal account.
- Durable HMAC-keyed counters limit sends by internal user and email, and
  confirmation attempts by internal user and network address.
- Existing Release 1 student records are not claimed or linked by this
  milestone.

## Database rollout

Migration `0002_rainy_wallflower.sql` adds the affiliation, challenge, and
rate-limit tables. The checked-in runners validate logical database identity and
explicitly reject the protected production Supabase project. Verify local
isolation first, then migrate the intended development or disposable test target:

```text
npm run env:check
npm run db:migrate
npm run db:migrate:test
```

Do not apply any migration to production with the development runner. Production
rollout requires a separately reviewed and authorized release operation.

## Manual verification checklist

1. Sign in with GitHub at `/student/sign-in`.
2. Open `/student/verify` and request a link for an `algomau.ca` address.
3. Confirm the email is branded, the link uses the expected HTTPS application
   origin, and no token appears in application logs.
4. Open the link while signed in to the requesting account and select **Verify
   affiliation**.
5. Confirm `/student/dashboard` shows the verified university email.
6. Confirm replaying the link is rejected and a different GitHub account cannot
   use it.
