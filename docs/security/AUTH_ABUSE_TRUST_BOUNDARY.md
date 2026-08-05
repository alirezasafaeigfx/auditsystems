# Authentication Abuse-Control Trust Boundary

## Application contract

User login, signup, admin login, and billing checkout use shared distributed fixed-window controls. Each operation consumes two opaque keys:

1. client identity;
2. client identity plus normalized subject.

There is no subject-only key and no account-wide lock. A remote attacker who knows a victim email can exhaust only the attacker's client and client/subject windows; another valid client identity can still present correct credentials.

Keys and structured authentication logs use HMAC digests derived with `IP_HASH_SALT`. They must not contain raw email, username, user ID, IP address, report token, or forwarding-header value.

## Production proxy contract

Production authentication endpoints fail closed unless:

```dotenv
AUTH_TRUST_PROXY_HEADERS="true"
AUTH_CLIENT_IP_HEADER="x-forwarded-for"
```

or the header is explicitly set to `x-real-ip`.

Enabling these variables is safe only after the authoritative ingress configuration proves all of the following:

- the selected header is removed from untrusted client requests;
- the ingress overwrites it with the observed client address;
- direct access to the application origin cannot bypass that ingress;
- every trusted proxy hop follows one documented ownership and overwrite policy.

The application validates only the opt-in and allowlisted header name. It cannot validate firewall topology, proxy source ranges, CDN behavior, or origin bypass from inside a request handler.

## Backend contract

Authentication controls use the existing Upstash REST or local Redis backend. In production, a missing, disabled, or failing backend produces a generic 503 and no credential or billing work proceeds.

Before rollout, operations must verify shared state across at least two application processes and demonstrate that a backend outage produces the documented fail-closed response. This repository does not pin a new Redis container because no authoritative approved image digest was provided for this workstream.

## Development behavior

When `NODE_ENV` is not `production` and trusted proxy headers are not configured, the limiter uses one opaque local-development client identity. This preserves local tests and development without teaching the application to trust spoofable forwarding headers. It is never used in production.

## Evidence still required outside this PR

- authoritative proxy/CDN/Nginx chain;
- selected header and overwrite/strip policy;
- bypass prevention and trusted source controls;
- production shared Redis configuration and multi-instance proof;
- sanitized outage evidence.

Do not mark the external ingress portion of Issue #78 Workstream D complete until those items are verified.
