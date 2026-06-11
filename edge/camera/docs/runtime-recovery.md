# Oyi Edge Camera Runtime Recovery

This repo already contains the Phase 1 camera runtime foundation. Do not rebuild it from scratch.

## Recovered Runtime Evidence

- Repo config placeholder: `go2rtc.yaml`
- Registry example: `examples/camera-registry.example.json`
- go2rtc config generator: `scripts/generate-go2rtc-config.js`
- Camera protocol dry-run: `scripts/bench-camera-protocol-phase1.js`
- Previous local runtime folder: `/Users/ochigaidoko/go2rtc`
- Previous local binary: `/Users/ochigaidoko/go2rtc/go2rtc`
- Previous local config: `/Users/ochigaidoko/go2rtc/go2rtc.yaml`

The previous local go2rtc config may contain DVR/camera credentials. Do not copy it into the repo.

## Responsibility Split

- `oyi-edge-agent`: local camera/DVR access, go2rtc config/runtime supervision, stream health, local camera AI event production when available.
- `Ochiga-backend`: camera registry, estate binding, HLS token/proxy, camera events, activity/timeline/notifications.
- `facility-oyi`: camera operations UI, playback wall, scan/bind UI, AI profile display, event display.
- `Oyi Consumer`: no broad camera operations unless explicitly enabled later.

## Safe Commands

- Generate config dry-run: `npm run edge:go2rtc:dry-run`
- Generate config file: `npm run edge:go2rtc:config`
- Camera readiness check: `npm run edge:health`
- Protocol bench dry-run: `npm run edge:bench:camera:dry-run`
- Start local agent: `npm run edge:camera`

## Pilot DVR Registry Fields

- `dvr_name`
- `dvr_ip`
- `channel`
- `camera_id`
- `name`
- `location`
- `rtsp_path_template`
- `credential_ref`
- `enabled`
- `estate_id`
- `edge_node_id`

Use credential references such as `local:generic-rtsp-main`. Never commit camera usernames, passwords, or full credentialed RTSP URLs.
