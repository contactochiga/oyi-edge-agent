# Oyi Edge Camera Deployment

This is the safe Phase 1 deployment path for estate DVR/NVR/IP cameras.

## Requirements

- Mac laptop, mini PC, or local gateway on the same LAN/VLAN as the DVR/NVR/cameras.
- go2rtc installed locally.
- DVR/NVR RTSP enabled.
- Camera/DVR credentials stored locally only.
- Backend edge token configured through environment variables.
- Facility user with camera permissions for playback verification.

## Environment

```bash
AGENT_ID=edge-estate-01
SITE_ID=<estate_id>
CLOUD_URL=https://<backend-host>
OYI_EDGE_AGENT_TOKEN=<edge-token>
GO2RTC_API_URL=http://127.0.0.1:1984
CAMERA_REGISTRY_PATH=edge/camera/registry/local.camera-registry.json
EDGE_CREDENTIAL_GENERIC_RTSP_MAIN_USER=<local-user>
EDGE_CREDENTIAL_GENERIC_RTSP_MAIN_PASS=<local-password>
```

Do not commit `.env` files or `edge/camera/registry/local*.json`.

## Local Registry

Create `edge/camera/registry/local.camera-registry.json` from `examples/camera-registry.example.json`.

Recommended fields:

- `camera_id`
- `name`
- `location`
- `provider`
- `protocol`
- `host` or `dvr_ip`
- `channel` or `channel_number`
- `rtsp_path_template`
- `credential_ref`
- `estate_id`
- `edge_node_id`
- `enabled`

## DVR RTSP Templates

- Hikvision / HiLook: `/Streaming/Channels/{channel}01`
- Dahua: `/cam/realmonitor?channel={channel}&subtype=0`
- Uniview: `/media/video{channel}`
- Generic/Xmeye: verify with VLC before onboarding.

## Commands

```bash
npm run edge:health
npm run edge:go2rtc:dry-run
npm run edge:go2rtc:config
go2rtc -config /Users/ochigaidoko/oyi-edge-agent/go2rtc.generated.yaml
npm run edge:camera
```

## Verification

1. Open go2rtc UI at `http://127.0.0.1:1984`.
2. Confirm the stream opens locally.
3. Test the raw RTSP URL in VLC if go2rtc fails.
4. Confirm Edge `/healthz` reports `go2rtc_reachable: true`.
5. Confirm backend receives edge heartbeat.
6. Confirm backend receives stream health with `edge_hls_url`.
7. Open Facility OS camera page and test playback.

## Privacy

Facility cameras are estate scoped.
Home cameras must use `privacy_scope: home`.
Office/project camera visibility must be explicitly permissioned.

## Backend Registry Pull

After a Facility Manager imports a DVR/NVR, the backend exposes the Edge-ready registry through:

```bash
GET /cameras/edge-registry/estate/:estateId
```

The Edge runtime can generate go2rtc config directly from that contract:

```bash
CAMERA_REGISTRY_URL="https://api.example.com/cameras/edge-registry/estate/<estate-id>" \
CAMERA_REGISTRY_TOKEN="<edge-or-service-token>" \
npm run edge:go2rtc:dry-run
```

For production config generation, add local credential environment variables matching each `credential_ref`, then run:

```bash
npm run edge:go2rtc:config
```

Do not store DVR or camera passwords in the backend, Facility UI, git, or generated documentation. Passwords remain on the Edge machine as local environment variables or a local secrets manager.
