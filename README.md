# Oyi Edge Agent

Oyi Edge Agent is the local physical-building runtime for Oyi deployments.

It owns device/camera discovery, go2rtc configuration, local runtime health, heartbeat, backend connectivity, durable outbox replay, and hardware-adjacent execution support. It does not own Ochiga Office CRM, lead-agent, dashboard, OMA/OSA, or corporate workflow behavior; those now live in the standalone `ochiga-office` repository.

## Current Capabilities

- Agent registration
- Periodic heartbeats
- Periodic discovery push
- Durable local outbox queue on failed cloud delivery
- Exponential retry/backoff replay from outbox
- Periodic remote config pull
- Health endpoint (`/healthz`)
- Camera registry readiness checks
- go2rtc config generation
- Camera AI dry-run/event normalization path
- Structured JSON logs
- Graceful shutdown on `SIGINT`/`SIGTERM`

## Required Environment Variables

- `AGENT_ID`
- `SITE_ID`
- `CLOUD_URL`

## Optional Environment Variables

- `OYI_EDGE_AGENT_TOKEN` or `EDGE_AGENT_TOKEN`
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
- `GO2RTC_API_URL` (default: `http://127.0.0.1:1984`)
- `LEGACY_MODE` (`true` or `false`, default: `false`)

## Cloud Endpoint Expectations

- `POST EDGE_REGISTER_PATH`
- `POST EDGE_HEARTBEAT_PATH`
- `POST EDGE_DISCOVERY_PUSH_PATH`
- `GET EDGE_CONFIG_PATH?site_id=...&agent_id=...`

If an existing backend only supports discovery, set `LEGACY_MODE=true`.

## Local Validation

```bash
npm run validate:release
```

The validation path is Edge-only and fails if Office lead-agent or CRM files are reintroduced.

## Run

```bash
npm start
```

## Health Check

```bash
curl http://127.0.0.1:9090/healthz
```

The response includes uptime, outbox depth, interval timers, go2rtc health, and last success/error per task.
