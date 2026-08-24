# Camera AI Processor V1

Camera AI Processor is the Edge-side runtime that turns camera snapshots into normalized detections and submits them through the canonical Detection Intelligence Runtime.

Flow:

```text
Backend/local camera registry
-> go2rtc stream key
-> snapshot capture
-> detector adapter
-> normalized detections
-> Ochiga backend
-> bounded event aggregation and canonical evidence
```

## What V1 Does

- Loads enabled cameras from `CAMERA_REGISTRY_URL` or the local registry fallback.
- Resolves each camera to its go2rtc stream key.
- Captures snapshots from go2rtc using `/api/frame.jpeg?src=<stream>`.
- Supports a no-op detector for safe dry runs.
- Supports an external detector bridge through `YOLO_BRIDGE_URL`.
- Normalizes provider output into the shared detection vocabulary.
- Posts normalized detections to `POST /edge/cameras/:cameraId/detections` using the bound Edge identity.

V1 does not run heavy YOLO locally. Local model execution belongs in a later runtime phase.

## Event Types

Allowed event types:

- `person_detection`
- `vehicle_detection`
- `suspicious_motion`
- `line_crossing`
- `zone_intrusion`
- `camera_tamper`
- `camera_offline`

Unsupported labels from a detector are ignored.

## Commands

```bash
npm run edge:camera-ai:dry-run
npm run edge:camera-ai:once
npm run edge:camera-ai
```

`edge:camera-ai:dry-run` loads the registry, resolves snapshot URLs, and runs the no-op/external detector path without posting events.

`edge:camera-ai:once` currently runs one safe dry-run pass. Use the raw script for live one-pass posting:

```bash
node scripts/camera-ai-processor.js --once
```

`edge:camera-ai` runs continuously. Use a process manager for production supervision.

## Required Environment

For registry and posting:

```bash
CLOUD_URL=https://your-backend
SITE_ID=<estate_id>
AGENT_ID=<edge_node_id>
OYI_EDGE_AGENT_TOKEN=<edge token>
CAMERA_REGISTRY_URL=https://your-backend/cameras/edge-registry/estate/<estate_id>
```

For go2rtc:

```bash
GO2RTC_API_URL=http://127.0.0.1:1984
```

For external YOLO bridge:

```bash
YOLO_BRIDGE_URL=http://127.0.0.1:8090
YOLO_BRIDGE_TIMEOUT_MS=12000
```

The bridge should accept:

```json
{
  "camera_id": "camera-id",
  "stream_key": "go2rtc-stream-key",
  "image_base64": "...",
  "metadata": {}
}
```

and return:

```json
{
  "ok": true,
  "detections": [
    {
      "type": "person",
      "confidence": 0.91,
      "bbox": [0, 0, 100, 200],
      "zone": "main_gate"
    }
  ]
}
```

## Security Rules

- Do not commit camera/DVR credentials.
- Use `credential_ref` and local `EDGE_CREDENTIAL_*` environment variables.
- Do not post raw RTSP URLs or secrets.
- Do not fabricate detections.
- Do not send every event as a push notification. Backend camera policy decides escalation.

## Backend Endpoint

The live Edge path posts to:

```text
POST /edge/cameras/:cameraId/detections
```

Headers:

```text
Authorization: Bearer <edge-token>
x-edge-token: <edge-token>
x-edge-agent-id: <agent-id>
```

Payload:

```json
{
  "site_id": "estate-id",
  "agent_id": "edge-node-id",
  "provider": "external_detector",
  "model": "configured-provider-model",
  "detections": [
    {
      "type": "person",
      "confidence": 0.91,
      "observed_at": "2026-08-24T12:00:00Z",
      "bounding_box": { "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.5 }
    }
  ]
}
```

Backend persists normalized detections, aggregates meaningful `camera_events`, associates Camera Media evidence and publishes concise Oyi evidence.
