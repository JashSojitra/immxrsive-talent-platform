# Release 2 M2 affiliation verification setup

Release 2 M2 verifies control of an approved Algoma University email after a
student signs in with GitHub. GitHub identity and university affiliation remain
separate: a GitHub email address never grants verified-student access.

## Email delivery

The application uses the maintained Resend Node SDK from server-only code. A
Resend free account is sufficient for development-scale delivery; no purchase
is required. Before enabling delivery:

1. Add and verify a sending domain in Resend, including the required DNS
   records.
2. Create a restricted sending API key.
3. Choose a From address on the verified domain.
4. Set the environment variables below locally and in the intended Vercel
   environment.

```text
RESEND_API_KEY=<server-only Resend API key>
AFFILIATION_EMAIL_FROM=ImmXrsive <verify@verified-domain.example>
ALGOMA_APPROVED_EMAIL_DOMAINS=algomau.ca
AFFILIATION_VERIFICATION_TTL_MINUTES=30
```

`BETTER_AUTH_URL` supplies the public origin for verification links and
`BETTER_AUTH_SECRET` protects rate-limit identifiers. Neither secret may use a
`NEXT_PUBLIC_` prefix. If the provider key or sender is absent, the API returns
`EMAIL_NOT_CONFIGURED`; it never reports a fake successful delivery.

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
rate-limit tables. During development, apply it only to the disposable test
database with:

```text
npm run db:migrate:test
```

Do not apply the migration to production until it has been reviewed as part of
an authorized release operation.

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
