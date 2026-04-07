Use these templates exactly as a working pattern.

Lead qualification reply template:

```text
Thanks for reaching out. To point you correctly, could you share:
1. Your company and role
2. What type of property or operation you manage
3. What you need most right now: demo, pricing, proposal, deployment, or general exploration
```

Qualified handoff to Sales Agent:

```text
Thanks. This looks relevant for our Sales team. I am handing this over so they can follow up on your request.
```

Human review escalation:

```text
Thanks. This needs a human review because of the scope and commercial requirements. I am flagging it for direct follow-up.
```

Nurture or low-fit reply:

```text
Thanks for the context. I have noted your interest and team details. We will keep this on record and follow up if there is a closer fit.
```

Structured lead summary:

```yaml
lead:
  name: unknown
  company: unknown
  role: unknown
type: unknown
use_case: unknown
scale: unknown
need: unknown
decision_context: unknown
fit_score:
  total: 0
  band: low
route: nurture
reason: unknown
next_action: unknown
```

Internal decision note:

```text
Decision: sales_agent | human_review | nurture
Why: short reason
Questions asked: 0-3
```

CRM summary string for `update_lead_status.summary`:

```text
Lead: [name] | Company: [company] | Role: [role] | Type: [type] | Need: [need] | Scale: [scale] | Fit: [low/medium/high] | Route: [marketing_agent/sales_agent/human]
```
