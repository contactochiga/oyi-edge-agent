# Oyi Camera Media Runtime Phase 4

Edge captures current frames from go2rtc by canonical camera ID. Capture is timeout-bound, limited to 5 MiB, and verifies JPEG/WebP signatures before upload. RTSP details never leave Edge. Backend derives ownership from the authenticated site/node and assigned canonical camera.

Failed uploads enter the existing durable outbox, now stored with mode `0600` and bounded to 25 MiB/20 media items by default. Oldest staged media is evicted under pressure; canonical idempotency keys prevent replay duplicates. Operators can tune `MEDIA_STAGING_MAX_BYTES` and `MEDIA_STAGING_MAX_FILES`.

Successful captures establish genuine frame freshness. A live go2rtc process without a valid frame does not. Current go2rtc configuration provides frame capture but no proven bounded pre-event ring buffer. Phase 4 therefore supports snapshot-first media and a clip contract only; it does not claim pre-roll, continuous recording, or historical footage.
