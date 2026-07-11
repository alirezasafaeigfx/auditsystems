# GTM Local Execution Runbook

Tracks: #28 and parent #24.

This runbook is for work that requires a local browser, authenticated communication accounts, or private prospect data. Do not commit prospect names, personal contact details, private notes, or outreach history to Git.

## Required private workspace

Create a directory outside all Git repositories, for example:

```text
~/Private/asdev-audit-gtm/
├── prospects.csv
├── mini-audits/
├── outreach-log.csv
├── proposals/
└── evidence/
```

Protect the directory with normal OS account permissions. Do not sync it to a public drive or paste it into issues.

## Prospect register

Use these columns:

```text
prospect_id,company,website,segment,country,language,contact_channel,contact_address_or_url,contact_role,public_issue_1,evidence_url_1,public_issue_2,evidence_url_2,public_issue_3,evidence_url_3,proposed_offer,qualification_score,status,next_action_at,reply_type,call_status,proposal_status,outcome,loss_reason,notes
```

Allowed statuses:

```text
new,researched,mini_audit_ready,contacted,positive,negative,follow_up_due,call_requested,call_booked,proposal_sent,won,lost,do_not_contact
```

## Qualification score

Score each prospect from 0 to 10:

- active commercial website: 0–2
- visible and verifiable technical issue: 0–2
- reachable business contact path: 0–2
- likely fit for an ASDEV Audit package: 0–2
- issue appears important enough to justify action: 0–2

Keep prospects scoring 6 or higher. Prioritize 8–10 for mini-audits.

Disqualify:

- no active public website
- no legitimate business contact path
- only private or intrusive testing could verify the issue
- request would require guaranteed ranking, traffic, or revenue claims
- site is clearly abandoned
- duplicate prospect or existing do-not-contact record

## Research rules

1. Use only public pages and normal browser behavior.
2. Do not bypass authentication, bot protection, rate limits, or access controls.
3. Do not run destructive, high-volume, or security-intrusive scans.
4. Record the exact evidence URL and observation date.
5. Label every item as confirmed observation or hypothesis.
6. Do not invent Core Web Vitals, traffic, ranking, revenue, backlink, or conversion values.
7. Stop research on a site if access terms or behavior make the activity inappropriate.

## Three-finding mini-audit

Prepare mini-audits only for the 10 highest-priority prospects.

Each finding must include:

- title
- severity
- evidence class: observed or unavailable
- exact public evidence URL
- concise evidence description
- likely impact written as a bounded possibility, not a guarantee
- one practical next action
- verification method
- limitations

Recommended coverage:

- one technical/indexability or delivery issue
- one performance/mobile/accessibility issue
- one trust/content/schema/conversion-path issue

Do not force three findings when evidence is weak. A two-finding honest mini-audit is better than a fabricated third finding.

## Outreach quality gate

Do not send a message unless:

- the company and domain match
- the recipient/channel is a legitimate business contact path
- the message references at least one real finding
- evidence can be reproduced from the recorded URL
- the CTA points to the approved qualification path
- no public price, guaranteed result, or unsupported metric appears
- the message is individually reviewed

Suggested CTA:

```text
https://audit.alirezasafaeisystems.ir/qualification?source=outbound&placement=<channel>&offer=request_assessment
```

## Send cadence

- send in small reviewed batches, not a blind bulk blast
- recommended initial batch: 5 messages
- review delivery/replies before the next batch
- maximum one follow-up per prospect unless they engage
- honor opt-outs immediately
- stop a channel if bounce, complaint, or negative-response quality indicates poor targeting

## Channel evidence

For every send, record:

- UTC timestamp
- channel
- recipient role or business inbox
- prospect ID
- finding referenced
- message version
- delivery result
- reply classification
- next action

Never commit screenshots containing email addresses, phone numbers, DMs, or personal identifiers.

## Response classification

Use:

- positive — interested, asks a question, requests details, or accepts a call
- neutral — acknowledges but no action
- negative — declines
- invalid — bounced, wrong contact, or inaccessible channel
- opt_out — asks not to be contacted

## Call and proposal gate

Before requesting a call, confirm:

- prospect understands the finding is preliminary
- no guaranteed result is implied
- the 20-minute call has a specific review purpose

Before sending a proposal, confirm:

- package selected
- scope and crawl limit
- inputs/access required
- deliverables
- exclusions
- SLA
- revision/support boundary
- verification method
- commercial terms approved by the owner

## Aggregate GitHub update

Only post aggregate, non-personal information to #28:

```text
Prospects researched: N/50
Qualified prospects: N/50
Mini-audits ready: N/10
Messages sent: N/40
Positive responses: N/8
Calls requested/booked: N/5
Proposals sent: N/3
Paid pilots: N/1
Invalid contacts: N
Opt-outs: N
Top channel blocker: ...
Top message blocker: ...
Next action: ...
```

## Stop conditions

Stop and report a blocker when:

- an authenticated account cannot be safely accessed
- the sender identity/signature is not approved
- legal/compliance constraints are unclear
- complaint or bounce rate indicates the channel should pause
- public evidence is too weak to personalize messages honestly
- a proposal requires unapproved pricing or payment terms

## Completion evidence

#28 may close only when either:

- the acceptance targets are achieved, or
- a documented channel/message blocker verdict includes batch sizes, results, evidence quality, and the next tested hypothesis.
