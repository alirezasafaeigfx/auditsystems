# AU-01 Report Access Design

## Outcome

Password-protected report content is rendered or serialized only after a short-lived, signed, report-bound authorization credential is validated. Public legacy shares without a password remain directly accessible. Expired and revoked shares remain unavailable regardless of credential state.

## Contract

- A successful password POST issues an HttpOnly, SameSite=Strict cookie whose name and payload contain only a digest of the report token.
- The credential expires after 15 minutes, is bound to one report, and fails closed when its secret, structure, signature, expiry, or report binding is invalid.
- HTML/RSC pages, report JSON, capture, and comparison apply the same decision before accessing protected content.
- Unauthorized HTML renders a localized password challenge without target URL, score, findings, metadata, or view-count mutation.
- PDF keeps its existing signed, expiring download-token plus paid-order authorization; the report share must also remain unexpired and unrevoked.
- Every private response remains `no-store`; credentials never enter query strings, redirects, analytics, or logs.
- No schema, stored report, payment entitlement, SSRF, DNS, rate-limit, infrastructure, or Production change is included.

## Secret and compatibility

`REPORT_ACCESS_SECRET` is a dedicated signing secret documented in `.env.example`. When it is unavailable, protected session creation and validation fail closed. Existing unpassworded legacy reports remain compatible.
