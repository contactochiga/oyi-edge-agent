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

## Plug-and-play Edge setup

For a new estate, the normal path is:

1. Import DVR/NVR or cameras in Facility OS.
2. Copy the backend registry URL for the estate or set `CLOUD_URL` + `SITE_ID`.
3. Store DVR/camera credentials locally on the Edge node as environment variables.
4. Generate go2rtc config from the backend registry.
5. Start go2rtc and the Oyi Edge agent.

Example:

```bash
CLOUD_URL="https://<backend-host>" \
SITE_ID="<estate-id>" \
AGENT_ID="edge-estate-01" \
CAMERA_REGISTRY_TOKEN="<edge-or-service-token>" \
EDGE_CREDENTIAL_HIKVISION_MAIN_USER="<local-dvr-user>" \
EDGE_CREDENTIAL_HIKVISION_MAIN_PASS="<local-dvr-password>" \
npm run edge:setup
```

`npm run edge:setup` does not print credentials. It reports whether backend registry access, go2rtc, camera registry, and credential references are ready.

Generate runtime config:

```bash
npm run edge:go2rtc:config
```

Generated config is written to:

```bash
edge/camera/go2rtc/go2rtc.generated.yaml
```

This file is ignored by git because it may contain local stream credentials.

## MacBook temporary Edge

Use this for first estate deployment or a short pilot.

```bash
npm run edge:health
npm run edge:go2rtc:dry-run
npm run edge:go2rtc:config
/Users/ochigaidoko/go2rtc/go2rtc -config edge/camera/go2rtc/go2rtc.generated.yaml
npm run edge:camera
```

The MacBook must be on the same LAN/VLAN as the DVR/NVR. If the chairman's DVR app can stream locally but Oyi cannot, check VLAN routing, RTSP enablement, and DVR user permissions first.

## Dedicated mini PC permanent Edge

Use this once the camera pilot is stable.

- Install Node.js LTS.
- Install go2rtc.
- Clone `oyi-edge-agent`.
- Configure `.env` locally; never commit it.
- Use a process manager such as `pm2`, `launchd`, or `systemd` to run go2rtc and `npm run edge:camera`.
- Confirm `/healthz` stays reachable from the facility network.

## Health check

```bash
npm run edge:health
```

Health output includes:

- Edge registered
- Backend reachable
- go2rtc reachable
- cameras loaded
- streams configured
- credential refs present/missing without revealing secrets

Use strict mode before declaring the Edge node production-ready:

```bash
node scripts/check-camera-runtime-readiness.js --strict
```

## Troubleshooting

- `backend reachable: false`: verify `CLOUD_URL`, network access, and token.
- `registry loaded: false`: verify `CAMERA_REGISTRY_URL` or `SITE_ID`, and `CAMERA_REGISTRY_TOKEN`.
- `credentials configured: false`: add `EDGE_CREDENTIAL_<REF>_USER` and `EDGE_CREDENTIAL_<REF>_PASS` for each credential reference.
- `go2rtc reachable: false`: start go2rtc and verify `GO2RTC_API_URL`.
- `HLS missing` in Facility: the backend has the camera registry, but an Edge node on the private LAN has not published stream health yet.
