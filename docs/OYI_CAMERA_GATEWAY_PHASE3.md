# Oyi Camera Gateway Phase 3

Oyi Edge owns private-network discovery, ONVIF authentication, RTSP reachability, local credential resolution and go2rtc configuration. Ochiga Backend owns commands, tenant authorization, candidate reconciliation, canonical `facility_cameras` identity, provisioning and safe surface projection.

Lifecycle: authorized command → node-bound config delivery → Edge discovery → sanitized candidate → explicit provisioning → canonical camera → canonical go2rtc stream id → health/events.

Credentials use opaque `local:*` references. The Edge resolves them from its local environment and never returns usernames, passwords or RTSP URIs. Generated go2rtc configuration is atomically replaced with mode `0600`; go2rtc remains an externally supervised process.

Discovery candidates are not cameras. IP addresses may change; stable ONVIF endpoint UUID, serial, hardware or MAC identity is preferred. Consumer discovery requires an explicit home scope and an Edge node opted into consumer discovery.

When cloud connectivity is lost, configured local streams and go2rtc can continue. Commands and results wait for authenticated synchronization; the Edge does not invent canonical camera records while offline.
