# Oyi Edge Agent Repository Separation Audit

Audit date: 2026-08-23
Compared revisions: `oyi-edge-agent@5226af2` (pre-cleanup) and `ochiga-office@baefa3f` (extraction baseline), then `ochiga-office@73dd14c` (audited current local production branch).

## Decision

`oyi-edge-agent` is a local, hardware-adjacent runtime. Ochiga Office is a separately deployed corporate application. No Office server, frontend, schema, prompt pack, knowledge base, static product surface, or deployment definition is required by `agent.js` or the camera runtime.

The standalone Office repository was created by commit `baefa3f` at the same time as the Edge cleanup commit. At extraction, every old Office/Lead Agents path was copied to Office; the only files deliberately not copied were the Edge runtime and camera assets. The Office repository has since advanced independently and has recorded production deployments. This establishes the standalone repository as canonical.

## Classification

| Class | Paths | Decision and evidence |
| --- | --- | --- |
| A. Oyi Edge Agent | `agent.js`; `edge/camera/**`; `go2rtc.yaml`; `examples/camera-registry.example.json`; `EDGE_PHASE_1_CAMERA_PROTOCOL_ONBOARDING.md`; camera/setup/benchmark scripts | Keep. These implement registration, heartbeat, discovery, durable outbox, config pull, health, go2rtc preparation, and camera-event processing. They were not copied into the Office extraction. |
| B. Ochiga Office duplicate | `lead-agents-server.js`; `src/lead-agents/**`; `public/dashboard/**`; `public/widget/**`; `src/intelligence-core/index.js`; `config/openai/**`; `db/lead-agents-schema.sql`; `evals/lead-agents/**`; `knowledge/**`; `prompt-packs/**`; Office-only scripts and environment example | Remove. Canonical copies exist in `ochiga-office`; most are byte-identical at extraction and current Office has subsequently extended them. No surviving Edge entrypoint imports them. |
| C. Plan Studio | `src/lead-agents/plan-studio.js`; `public/plan-studio/**` | Rehome to the standalone Office repository. All three files are byte-identical between Edge `main` and Office extraction/current checkout. Office serves the static paths and `/api/plan-studio/*`; its Vercel config proxies those APIs to its Render service. Edge has no Plan Studio consumer. |
| D. Shared runtime required by Edge | Event normalization formerly reached through `src/intelligence-core/index.js` | Keep only the required contract as `src/edge/intelligence-events.js`. `scripts/camera-ai-processor.js` and `scripts/smoke-tier1-foundations.js` now import this Edge-owned module. The old intelligence core is canonical in Office and was otherwise unused by Edge. |
| E. Obsolete/dead in Edge | `public/digital-twin/**`; `scripts/export-digital-twin-assets.js`; Office commercial/product docs; `render.yaml`; `vercel.json` | Remove from Edge. Digital Twin is a separate product surface copied into Office and not imported by Edge. Both deployment files exclusively described the Office static app and `ochiga-lead-agents` service. |
| F. Unknown | None after dependency and content comparison | All pre-cleanup files are accounted for. |

## Office replacement proof

- The Office extraction baseline contains all historical Lead Agents modules, both prompt packs, the knowledge corpus, schema, evals, dashboard, widget, Plan Studio, Digital Twin static surface, Render service, and Vercel routes.
- At extraction, files that differed were Office-specific forward changes or repository wrappers: Office added its own environment/configuration, intake runtime, schema additions, tests, and Office-oriented package/build validation. No Edge-only runtime was lost.
- The standalone Office repository's `render.yaml` starts `npm run office:start` for `ochiga-lead-agents`; its `vercel.json` serves `/office/`, widget assets, Plan Studio APIs, Digital Twin APIs, and Lead Agents APIs.
- The local Vercel link names project `ochiga-office`, and GitHub deployment records show repeated Production deployments from the Office repository, including revision `73dd14c` on 2026-08-22.
- `oyi-edge-agent` has no import from `src/lead-agents`, no import from the removed general intelligence core, and no runtime reference to the removed public assets or Office deployment commands.

## Plan Studio ownership

Plan Studio is not an edge execution component. It is a design/plan intelligence surface with browser assets, an authenticated API runtime, persistent project storage, OpenAI-assisted parsing/Q&A, and Office permissions (`planstudio.read`, `planstudio.write`). Its browser, backend, permissions, routes, build manifest, Vercel proxy, and documentation all exist together in `ochiga-office`. The safe rehome was therefore already completed by the Office extraction; this repository removes its duplicate rather than creating another copy.

## Deployment after separation

This repository has no Vercel or Render application definition. The Edge Agent is installed at a building/local node and launched with `npm start` (or a host process manager). It connects outward to the configured `CLOUD_URL`, exposes a local `/healthz`, and optionally talks to local go2rtc and a detector bridge. Cloud deployment definitions would misrepresent that topology.

The legacy Vercel project `oyi-edge-agent` was disconnected from this GitHub repository on 2026-08-23 after its final preview confirmed it still expected the removed Office `public/` output. The canonical `ochiga-office` Vercel project and its Git connection were not changed.

## Remaining cross-system mentions

References to Office in `EDGE_PHASE_1_CAMERA_PROTOCOL_ONBOARDING.md` are integration verification instructions only: the backend projects camera state for Office/Facility visibility. References in `README.md` and structural lint are explicit ownership boundaries and regression guards. None is executable Office code.
