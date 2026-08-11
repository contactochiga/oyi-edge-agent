# Oyi Edge Credential Rotation Checklist

This checklist intentionally lists credential names only. Do not paste live values into this file.

| Variable | Provider/System | Runtime | Automatic Rotation Safe? | Manual Action Required |
| --- | --- | --- | --- | --- |
| `OYI_EDGE_AGENT_TOKEN` | Ochiga Backend Edge API | Edge agent heartbeat/discovery/config | No | Add a replacement backend token, deploy/update Edge, verify heartbeat, then revoke old token. |
| `EDGE_AGENT_TOKEN` | Ochiga Backend Edge API | Legacy Edge token alias | No | Replace with `OYI_EDGE_AGENT_TOKEN` where possible; rotate with backend owner if still used. |
| `ONVIF_USER` | Local camera/NVR | Edge camera discovery | No | Rotate on camera/NVR, update Edge secret, verify discovery. |
| `ONVIF_PASS` | Local camera/NVR | Edge camera discovery | No | Rotate on camera/NVR, update Edge secret, verify discovery. |
| `EDGE_CREDENTIAL_*_USER` | Local camera/NVR | go2rtc stream generation | No | Rotate on camera/NVR and update the matching Edge credential reference. |
| `EDGE_CREDENTIAL_*_PASS` | Local camera/NVR | go2rtc stream generation | No | Rotate on camera/NVR and update the matching Edge credential reference. |
| `CAMERA_REGISTRY_TOKEN` | Ochiga Backend camera registry | Edge camera registry fetch | No | Rotate with backend owner and verify registry fetch. |
| `BACKEND_TOKEN` | Ochiga Backend | Legacy backend auth alias | No | Replace with narrower Edge token where possible; rotate with backend owner if still used. |
| `YOLO_BRIDGE_URL` credentials, if embedded externally | Local AI bridge | Edge camera AI | Unknown | Verify bridge auth ownership; move credentials out of URLs before rotation where possible. |
