# Camera Observation Contract v1 — Slice14C

Coordinated local Backend/Edge change. Edge baseline: `5d30b63866197d6b674951bfdce2dd1211e76d24`; Backend baseline: `556ac32d3548b720783924cef0d78a9e2c2bf3dc`. No push/deployment. Full design/acceptance report: Backend `docs/WAVE6_SLICE14C_CAMERA_OBSERVATION_CONTRACT.md`.

## Wire and identity

GET `/edge/camera-observation-registry` with bound Edge credentials supplies canonical_camera_id separately from stream_id. POST `/edge/camera-observations` sends `{observations:[...]}`. Each item: schema_version=1, UUID observation_id, canonical UUID camera_id, edge_node_id, kind, source, original observed_at, result, allowlisted details. Server derives receipt time and tenant from authenticated identity. No Home/estate override, URL/credential/image data in observations. Batches <=128.

Producers:

- stream_configuration/go2rtc_registry: configured or not_configured.
- stream/go2rtc_inspection: inspected producer/consumer counts or explicit failed inspection. Producer presence is not decoded/moving video. Failed inspection never repeats cached health as new evidence.
- reachability/onvif_probe: authenticated attempt succeeded, authentication_failed or failed, mapped only to one unambiguous provisioned camera. Absent probes do not imply failure. Recorder/TCP tests remain limited existing evidence, not continuous recorder health.
- frame/go2rtc_snapshot or ai_snapshot: acquired or failed. Bounded JPEG/WebP signature validation only; no decoded/sensor-fresh claim.
- inference/external_detector: succeeded (including zero detections), failed, skipped or dropped, per sample. No persistent runtime redesign or cumulative AI-health claim.
- frame/media_ingestion is reserved for Backend media retry, denied on the public Edge endpoint.

Canonical IDs never derive from stream names/IPs. Snapshot command cameraId is canonical; streamId selects capture. Local registries need a canonical_camera_id (or actual UUID legacy identity); external-only aliases are skipped. AI defaults to the bound registry when no explicit registry override exists. Explicit old user-auth URLs may still return401 and must be corrected operationally, not bypassed.

## Persistence/replay

Backend migration `20260924093033_wave6_camera_observation_persistence.sql` adds nullable facility_cameras.runtime_observations and service-only `oyi_ingest_camera_observations(uuid,text,jsonb)`. Apply migration, then Backend, then Edge. Do not deploy Edge first.

Projection is latest per kind/source, not a journal. Source timestamp wins; equal timestamps use lexical observation-ID tie-break. Receipt never orders truth. A frame source retains latest attempt and last_success independently. Stable IDs/times remain in ordinary durable outbox or separate AI observation outbox through replay. Agent observation outbox capped256 batches/10MiB; AI capped500 batches. Eviction/crash can lose evidence; no lossless journal guarantee. Cached assignment enables observations during network loss; without canonical identity no observation is fabricated. Offline AI requires local registry availability.

New agent stops posting configuration-derived online status to legacy stream-health. No new canonical health signals. Legacy Backend fields/classifiers remain for later convergence. No final camera health, heartbeat changes, Twin migration or physical control added.

## Validation

Run `npm run smoke:camera-observations-slice14c`, gateway/media/detection/runtime-canonicalization smokes, check/lint/build/release validation. New tests exercise actual snapshot/runtime/processor with local fixtures, zero-detection success, failure/skip/drop, replay IDs/times and bounded batches. Backend real PostgreSQL suite imports this exact envelope builder and validates assignment/order/rollback/ACL and10/50/100 cameras.

No hardware acceptance claimed. Release diagnostics observed missing go2rtc/credentials and old registry401 despite a successful non-strict release-check exit. AI dry-run now cannot flush detections or execute inference. Runtime outbox files are not source artifacts and are ignored. Final coordinated commits are recorded in Git/completion report.
