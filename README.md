# Oyi Edge Agent

Phase 1 edge-core daemon for Oyi Smart Estate OS.

## Current capabilities

- Agent registration
- Periodic heartbeats
- Periodic discovery push
- Durable local outbox queue on failed cloud delivery
- Exponential retry/backoff replay from outbox
- Periodic remote config pull
- Health endpoint (`/healthz`)
- Structured JSON logs
- Graceful shutdown on `SIGINT`/`SIGTERM`

## Required environment variables

- `AGENT_ID`
- `SITE_ID`
- `CLOUD_URL`

## Optional environment variables

- `CAMERA_IP`
- `ONVIF_PORT` (default: `8080`)
- `ONVIF_USER`
- `ONVIF_PASS`
- `EDGE_REGISTER_PATH` (default: `/edge/agent/register`)
- `EDGE_HEARTBEAT_PATH` (default: `/edge/agent/heartbeat`)
- `EDGE_DISCOVERY_PUSH_PATH` (default: `/edge/discovery/push`)
- `EDGE_CONFIG_PATH` (default: `/edge/agent/config`)
- `HEARTBEAT_INTERVAL_MS` (default: `30000`)
- `DISCOVERY_INTERVAL_MS` (default: `120000`)
- `CONFIG_PULL_INTERVAL_MS` (default: `180000`)
- `QUEUE_FLUSH_INTERVAL_MS` (default: `5000`)
- `REQUEST_TIMEOUT_MS` (default: `10000`)
- `RETRY_BASE_MS` (default: `2000`)
- `RETRY_MAX_MS` (default: `60000`)
- `LOCAL_QUEUE_PATH` (default: `./data/outbox.json`)
- `HEALTH_PORT` (default: `9090`)
- `LEGACY_MODE` (`true` or `false`, default: `false`)

## Cloud endpoint expectations

- `POST EDGE_REGISTER_PATH`
- `POST EDGE_HEARTBEAT_PATH`
- `POST EDGE_DISCOVERY_PUSH_PATH`
- `GET EDGE_CONFIG_PATH?site_id=...&agent_id=...`

If your existing backend only supports discovery, set:

- `LEGACY_MODE=true`

## Run

```bash
npm start
```

## Health check

```bash
curl http://127.0.0.1:9090/healthz
```

Response includes uptime, outbox depth, interval timers, and last success/error per task.

## Prompt packs

Reusable prompt assets live under [`prompt-packs/marketing-agent`](/Users/ochigaidoko/oyi-edge-agent/prompt-packs/marketing-agent).

Included files:

- [`SYSTEM_PROMPT.md`](/Users/ochigaidoko/oyi-edge-agent/prompt-packs/marketing-agent/SYSTEM_PROMPT.md): base behavior and routing rules
- [`SCORING_RUBRIC.md`](/Users/ochigaidoko/oyi-edge-agent/prompt-packs/marketing-agent/SCORING_RUBRIC.md): fit scoring model
- [`TEMPLATES.md`](/Users/ochigaidoko/oyi-edge-agent/prompt-packs/marketing-agent/TEMPLATES.md): qualification, handoff, escalation, and summary templates
- [`TOOLS.md`](/Users/ochigaidoko/oyi-edge-agent/prompt-packs/marketing-agent/TOOLS.md): CRM, solution-fit, scheduling, and escalation tool contract
- [`prompt-pack.json`](/Users/ochigaidoko/oyi-edge-agent/prompt-packs/marketing-agent/prompt-pack.json): simple manifest for loading the pack programmatically

Sales prompt assets live under [`prompt-packs/sales-agent`](/Users/ochigaidoko/oyi-edge-agent/prompt-packs/sales-agent).

- [`SYSTEM_PROMPT.md`](/Users/ochigaidoko/oyi-edge-agent/prompt-packs/sales-agent/SYSTEM_PROMPT.md): sales qualification and escalation rules
- [`SCORING_RUBRIC.md`](/Users/ochigaidoko/oyi-edge-agent/prompt-packs/sales-agent/SCORING_RUBRIC.md): sales fit scoring model
- [`TEMPLATES.md`](/Users/ochigaidoko/oyi-edge-agent/prompt-packs/sales-agent/TEMPLATES.md): discovery, booking, escalation, and summary templates
- [`TOOLS.md`](/Users/ochigaidoko/oyi-edge-agent/prompt-packs/sales-agent/TOOLS.md): tool usage contract for sales workflows
- [`prompt-pack.json`](/Users/ochigaidoko/oyi-edge-agent/prompt-packs/sales-agent/prompt-pack.json): manifest for loading the sales pack

Shared v1 lead-agent assets:

- [`config/openai/lead-agent-tools.json`](/Users/ochigaidoko/oyi-edge-agent/config/openai/lead-agent-tools.json): Responses API tool definitions
- [`db/lead-agents-schema.sql`](/Users/ochigaidoko/oyi-edge-agent/db/lead-agents-schema.sql): minimal CRM schema
- [`docs/lead-agents-v1.md`](/Users/ochigaidoko/oyi-edge-agent/docs/lead-agents-v1.md): stack, flow, routing, and storage notes

Run the lead-agents backend with:

```bash
npm run lead-agents:start
```

Production-ready backend modules live under [`src/lead-agents`](/Users/ochigaidoko/oyi-edge-agent/src/lead-agents), including:

- pluggable storage with file and Supabase drivers
- API-key auth and in-memory rate limiting
- Responses API orchestration and tool execution
- founder and demo webhook dispatch

Deployment and testing assets:

- [`render.yaml`](/Users/ochigaidoko/oyi-edge-agent/render.yaml): Render Blueprint for the lead-agents service
- [`.env.lead-agents.example`](/Users/ochigaidoko/oyi-edge-agent/.env.lead-agents.example): env template for local or hosted setup
- [`scripts/test-lead-agents.js`](/Users/ochigaidoko/oyi-edge-agent/scripts/test-lead-agents.js): mock-backed integration harness

Website widget assets:

- [`public/widget/index.html`](/Users/ochigaidoko/oyi-edge-agent/public/widget/index.html): local preview page for Oma
- [`public/widget/oma-widget.js`](/Users/ochigaidoko/oyi-edge-agent/public/widget/oma-widget.js): embeddable website widget script

Dashboard assets:

- [`public/dashboard/index.html`](/Users/ochigaidoko/oyi-edge-agent/public/dashboard/index.html): internal lead operations dashboard
- [`public/dashboard/dashboard.js`](/Users/ochigaidoko/oyi-edge-agent/public/dashboard/dashboard.js): dashboard client logic for lead desk workflows
