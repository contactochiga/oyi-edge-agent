# Oyi Edge Agent Phase 1 Camera Protocol Onboarding

This document covers the minimum safe lab path before a 120-unit estate deployment. Phase 1 is protocol-first: any camera, DVR, or NVR that exposes a compatible stream can be onboarded. Hikvision is only one provider example.

Phase 1 does not include local AI detection or full offline command execution.

## Supported Providers

Use these provider values in registry records and backend payloads:

- `generic_rtsp`
- `onvif`
- `hikvision`
- `dahua`
- `uniview`
- `tuya_camera`
- `other`

## Supported Protocols

Use these protocol values:

- `rtsp`
- `onvif`
- `hls`
- `mjpeg`
- `http_snapshot`

For Phase 1 playback through go2rtc, `rtsp` and ONVIF-derived RTSP are the primary paths. HLS, MJPEG, and HTTP snapshot are represented in the registry contract so we can support providers that expose those directly.

## Required Edge Agent Environment

```bash
AGENT_ID=edge-lab-01
SITE_ID=<estate_uuid>
CLOUD_URL=https://oyi-os.onrender.com
OYI_EDGE_AGENT_TOKEN=<same value configured on backend>
# EDGE_AGENT_TOKEN is supported as a fallback.

# Optional static camera discovery for first bench test
CAMERA_IP=192.168.1.64
ONVIF_PORT=80
ONVIF_USER=<local camera user>
ONVIF_PASS=<local camera password>
CAMERA_PROVIDER=generic_rtsp
CAMERA_PROTOCOL=rtsp
CAMERA_CREDENTIAL_REF=local:generic-rtsp-main
```

The agent sends `x-edge-token` and `Authorization: Bearer <token>` on every cloud request. The raw token is never logged.

## Required Backend Environment

```bash
OYI_EDGE_AGENT_TOKEN=<shared secret>
# or comma-separated rotation list
OYI_EDGE_AGENT_TOKENS=<token-1>,<token-2>

EDGE_HEARTBEAT_INTERVAL_MS=30000
EDGE_DISCOVERY_INTERVAL_MS=120000
EDGE_CONFIG_PULL_INTERVAL_MS=180000
EDGE_QUEUE_FLUSH_INTERVAL_MS=5000
```

Apply these migrations before production sync validation:

```bash
supabase db push
# or apply manually in Supabase SQL editor:
# /Users/ochigaidoko/Documents/Ochiga-backend/migrations/2026-05-21-pilot-onboarding-foundation.sql
# /Users/ochigaidoko/Documents/Ochiga-backend/migrations/2026-05-22-edge-phase1-hardening.sql
```

## Backend Routes Added For Phase 1

- `POST /edge/agent/register`
- `POST /edge/agent/heartbeat`
- `GET /edge/agent/config`
- `POST /edge/discovery/push`
- `POST /edge/cameras/:cameraId/stream-health`

All routes require edge token authentication.

## Camera / DVR / NVR Information Needed

For every camera/channel:

- `camera_id`
- `name`
- `provider`
- `protocol`
- `host` or `ip`
- `nvr_id` if attached to a DVR/NVR
- `channel` if channel-based
- `rtsp_path_template` when RTSP path must be generated
- `hls_url`, `mjpeg_url`, or `snapshot_url` when the provider exposes those directly
- `credential_ref`, for example `local:generic-rtsp-main`
- physical location / zone

Do not put raw camera passwords in frontend records, Office export, Facility UI, discovery payloads, or logs.

## Local Camera Registry Format

Use:

```bash
/Users/ochigaidoko/oyi-edge-agent/examples/camera-registry.example.json
```

The example includes:

- a generic RTSP camera
- an ONVIF camera that can resolve into an RTSP stream
- a Hikvision NVR channel using a provider-specific optional RTSP template

## Credential References

For real config generation, credentials are loaded from environment variables derived from `credential_ref`.

Examples:

```bash
EDGE_CREDENTIAL_GENERIC_RTSP_MAIN_USER=<camera_user>
EDGE_CREDENTIAL_GENERIC_RTSP_MAIN_PASS=<camera_password>

EDGE_CREDENTIAL_ONVIF_MAIN_USER=<camera_user>
EDGE_CREDENTIAL_ONVIF_MAIN_PASS=<camera_password>

EDGE_CREDENTIAL_HIKVISION_MAIN_USER=<camera_user>
EDGE_CREDENTIAL_HIKVISION_MAIN_PASS=<camera_password>
```

## go2rtc Setup

Dry-run config generation:

```bash
npm run edge:go2rtc:dry-run
```

Generate a real config once credentials are present:

```bash
node scripts/generate-go2rtc-config.js \
  --registry examples/camera-registry.example.json \
  --output go2rtc.generated.yaml
```

Run go2rtc as a separate supervised service for Phase 1:

```bash
go2rtc -config /Users/ochigaidoko/oyi-edge-agent/go2rtc.generated.yaml
```

Recommended deployment later:

- systemd service on Linux edge box
- Docker Compose service on mini PC/NVR gateway
- health check against `http://localhost:1984/api/streams`

## Stream Health Check

The edge runtime or bench script should report camera health to:

```http
POST /edge/cameras/:cameraId/stream-health
```

Payload:

```json
{
  "site_id": "<estate_uuid>",
  "agent_id": "edge-lab-01",
  "provider": "generic_rtsp",
  "protocol": "rtsp",
  "status": "pending|online|offline|error",
  "health_status": "pending_stream_details|online|offline|error",
  "edge_hls_url": "http://edge-host:1984/api/stream.m3u8?src=generic-rtsp-gate-01",
  "latency_ms": 120,
  "reconnect_count": 0,
  "provider_error": null
}
```

The backend emits `camera.status.updated` for Office/Facility visibility.

## Bench Test

Dry run without real credentials:

```bash
npm run edge:bench:camera:dry-run
```

Live backend test using generic RTSP defaults:

```bash
CLOUD_URL=https://oyi-os.onrender.com \
SITE_ID=<estate_uuid> \
AGENT_ID=edge-lab-01 \
OYI_EDGE_AGENT_TOKEN=<token> \
node scripts/bench-camera-protocol-phase1.js \
  --site-id <estate_uuid> \
  --agent-id edge-lab-01 \
  --camera-ip 192.168.1.64 \
  --camera-id generic-rtsp-gate-01 \
  --provider generic_rtsp \
  --protocol rtsp \
  --credential-ref local:generic-rtsp-main
```

Hikvision remains supported as an example:

```bash
node scripts/bench-camera-protocol-phase1.js \
  --site-id <estate_uuid> \
  --agent-id edge-lab-01 \
  --camera-ip 192.168.1.10 \
  --camera-id hikvision-nvr-channel-01 \
  --provider hikvision \
  --protocol rtsp \
  --credential-ref local:hikvision-main
```

The live test verifies:

- edge token is configured
- backend register works
- heartbeat persists
- camera placeholder is created from discovery
- go2rtc config can be generated
- stream health can be marked pending/online/error
- `camera.status.updated` can emit

## Facility Verification

In Facility OS:

- open Cameras module
- confirm camera placeholder appears
- confirm provider and protocol are visible in metadata
- confirm pending stream details are visible if HLS is not active
- confirm stream opens after `edge_hls_url` is active
- confirm Security/Live Infrastructure show camera and edge readiness states

## Office Verification

In Office OS:

- Platform Infrastructure should show edge token/backend readiness
- Live Infrastructure should receive edge/camera status once events are emitted
- Office export should include edge heartbeats and facility cameras when migrations are applied

## Troubleshooting

- `401 Invalid or missing edge token`: verify `OYI_EDGE_AGENT_TOKEN` or `OYI_EDGE_AGENT_TOKENS` on backend and agent.
- `missing_source`: apply migrations listed above.
- `pending_stream_details`: camera placeholder exists but stream details have not been confirmed.
- HLS playback fails: verify go2rtc is running and `edge_hls_url` is reachable from backend/facility client.
- RTSP fails: verify host, channel, `rtsp_path_template`, credential reference, and camera/NVR firewall/VLAN access.
- No Facility visibility: verify authenticated user has `cameras.view` / `devices.read` and belongs to the estate.
