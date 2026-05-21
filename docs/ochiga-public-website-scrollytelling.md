# Ochiga Public Website Scrollytelling Implementation

## Route
- Preview route: `/website/`
- Office route remains `/dashboard/` to avoid breaking current Office deployment.

## Current Implementation
The first pass ships a production-safe static scrollytelling scaffold:
- sticky cinematic infrastructure visual stage
- scroll-driven scene progress with CSS variables
- photorealistic-direction building placeholder built from layered CSS until final R3F/PBR assets are available
- operational nodes for access, CCTV, utilities, environment, and edge infrastructure
- glass operational panels
- lifecycle transition into Oyi Home onboarding
- product grid for Oyi Facility, Oyi Home/Oyi AI, Oyi Edge, and Oyi Plans

## Scene Map
1. Physical Infrastructure: dark architectural estate/building subject with subtle infrastructure nodes.
2. Operational Layer: physical building shifts toward wireframe and data overlays.
3. Live Infrastructure View: interactive operational zones and node-driven infrastructure panels.
4. Infrastructure Intelligence: heat-map/telemetry style state and operational awareness messaging.
5. Lifecycle Onboarding: Facility-to-Home provisioning story using operator/phone transition.
6. Ecosystem Vision: connected infrastructure ecosystem and enterprise CTA.

## R3F Upgrade Path
When moving from scaffold to full 3D, use this architecture:
- `WebsiteExperience`: route-level shell and scroll timeline provider.
- `InfrastructureCanvas`: React Three Fiber canvas, camera rig, postprocessing, and scene manager.
- `BuildingModel`: PBR Lagos smart-estate building asset with material dissolve uniforms.
- `OperationalLayer`: wireframe overlay, node anchors, data line renderers, telemetry particles.
- `CommandPanels`: HTML overlay layer synchronized to projected 3D node positions.
- `LifecycleScene`: desk monitor to phone camera transition.
- `EcosystemScene`: networked estate/building cluster.

## Scroll Coupling
- HTML scroll remains the source of truth.
- Camera position, material dissolve, node opacity, panel visibility, and scene transitions read from normalized scroll progress.
- HTML overlays should use the same scene index and projected 3D anchor coordinates so UI remains readable and accessible.

## Asset Requirements
- Photorealistic 10-floor premium estate/building GLB.
- PBR materials for glass, concrete, metal, road, utility zones, rooftop systems, basement/parking.
- Optional optimized LOD variants for mobile.
- KTX2 compressed textures before production.

## Production Notes
- Keep the public product family as Oyi Facility, Oyi Home, Oyi AI, and Oyi Edge.
- Do not expose internal Office OS, Audit Engine, or Realtime Engine as standalone public products.
- Keep messaging institutional and operational, not generic SaaS.
