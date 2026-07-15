# Legacy Unsubscribe Token Migration Policy

## Decision

Legacy unsigned unsubscribe tokens (base64("unsub:orgId")) are NOT supported.

## Rationale

1. Security: Unsigned tokens are forgeable
2. Impact: Attacker could unsubscribe any organization
3. Migration: All existing unsubscribe links invalidated
4. User impact: Users must request new links through UI

## Implementation

verifyUnsubToken in src/lib/hmac-tokens.ts rejects any token without valid HMAC signature.
