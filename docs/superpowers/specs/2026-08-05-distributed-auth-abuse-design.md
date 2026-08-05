# Distributed Authentication Abuse Controls Design

## Objective

Replace process-local authentication throttles and victim-wide account locks with one shared, privacy-safe abuse-control boundary for user login, signup, admin login, and authenticated billing checkout.

## Trust model

Authentication endpoints must not infer a client address from arbitrary forwarding headers. In production, client identity is available only when both conditions are true:

1. `AUTH_TRUST_PROXY_HEADERS=true`.
2. `AUTH_CLIENT_IP_HEADER` is exactly `x-forwarded-for` or `x-real-ip`.

The selected ingress must strip and overwrite that header and prevent direct origin bypass. Application code cannot prove those external controls; until they are configured and verified, authentication abuse controls fail closed with a generic 503 response.

In development and test, an unconfigured proxy contract uses an opaque local-development identity so local workflows do not require an ingress proxy. Production never uses that fallback.

## Privacy model

`IP_HASH_SALT` is used as an HMAC key. Redis keys contain only:

- the action name;
- an HMAC of client identity; and
- an HMAC of client identity plus normalized subject.

Raw email, username, user ID, IP address, report token, or forwarding-header value must not appear in Redis keys or structured authentication logs.

## Lockout-resistance model

Credential endpoints enforce two windows:

- client-only; and
- client-plus-subject.

There is deliberately no subject-only blocking key and no account lock. An attacker who knows a victim email can exhaust only the attacker's client identity and client/subject pair. A correct login from another valid client identity remains eligible to succeed.

## Backend policy

The implementation delegates storage to the existing distributed rate-limit backend (Upstash REST or configured local Redis). `disabled` and `error` backend states are unavailable in production and produce a generic 503. Non-production may continue with the existing development fallback.

Successful login does not reset shared fixed-window counters. This avoids cross-instance delete races and still allows correct credentials while the client remains under the bounded windows.

## Endpoint integration

- User login: enforce before password verification; remove `account-lockout.ts` usage and 423 responses.
- Signup: enforce after email normalization and before password validation, database lookup, or password hashing.
- Admin login: enforce before credential validation; remove process-local reset semantics.
- Billing checkout: enforce after authenticated user resolution and before invoice/provider work.

All responses remain generic and `Cache-Control: no-store`; rate-limited responses include a bounded `Retry-After` value.

## Verification

Unit and route tests must prove:

- spoofed forwarding headers are not trusted without explicit production opt-in;
- unsupported trusted-header configuration fails closed;
- keys contain no raw identifiers;
- the same subject from different clients has no shared subject-only blocking key;
- backend outage is fail-closed in production;
- credential routes stop before password/database/session work when controls are unavailable or limited;
- valid credentials are no longer rejected by a process-local account lock.

A real multi-instance Redis and authoritative ingress proof remains an external operational gate. No Redis image digest, proxy chain, trusted range, or header overwrite policy may be invented in this PR.
