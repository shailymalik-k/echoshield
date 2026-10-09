# 🌊 EchoShield — 3D Ocean Data Visualization Platform

> **Smart India Hackathon 2026 · Problem Statement 26067**
> Organization: **INCOIS** (Indian National Centre for Ocean Information Services) · Ministry of Earth Sciences (MoES)
> Category: Software · Theme: Smart Automation

A web-based interactive 3D visualization platform that turns real ocean-model outputs and in-situ observations into explorable, judge-friendly visuals — volumetric temperature/salinity fields over the Indian Ocean, Argo float overlays, depth/time animation and honest handling of what the data does *not* contain.

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [How It Works — End-to-End Analysis](#-how-it-works--end-to-end-analysis)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Real Data](#-real-data)
- [API Reference](#-api-reference)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Testing & Quality](#-testing--quality)
- [Configuration](#-configuration)
- [Roadmap](#-roadmap)
- [Team](#-team)
- [License & Acknowledgements](#-license--acknowledgements)

---

## 🎯 Problem Statement

**PS-26067** (INCOIS / MoES): Build a scalable, web-based interactive 3D visualization system that lets scientists, students and decision-makers explore ocean model outputs and in-situ observations — depth profiles, time animation, variable switching — using open standards (NetCDF, OPeNDAP, WMS/WCS, CF conventions).

**The hard parts:**

| Challenge | How EchoShield addresses it |
|---|---|
| Multi-GB scientific formats in a browser | Lazy xarray reads → downsampled JSON grids (NaN-safe, ≤100k points), never full-file dumps |
| Heterogeneous sources (local NetCDF, ERDDAP, OPeNDAP, THREDDS, Argo) | One registry with deterministic dataset IDs, ISO 19115 metadata sidecars, canonical CF variable mapping |
| Missing data must never be fabricated | Explicit contracts: currents → `{"available": false}`, gliders → `{"configured": false}`, NaN → `null`, upstream failures → clean 503 |
| Judges need it to *just run* | Offline-first demo mode: local Argo cache + launchers that need zero network access |

## 💡 Our Solution

**EchoShield** is a three-tier platform:

1. **FastAPI application layer** — validated REST API (`/api/v1`) serving gridded model slices, profiles, point samples and Argo observations from the real INCOIS ARGO Monthly VAM product.
2. **Scientific data layer** — xarray/netCDF4 lazy I/O locally and remotely (OPeNDAP/pydap), argopy for Argo ingestion, THREDDS client for OPeNDAP/WMS delegation (scientific serving is *never* reimplemented).
3. **React 19 + Three.js presentation layer** — a GPU-rendered volumetric "ocean box" you can fly through, scrub through time, peel by depth and inspect pixel-by-pixel, backed by deck.gl 2-D maps.

### Feature highlights

- 🧊 **Volumetric rendering**: 24 stacked depth planes as GPU `DataTexture`s with colormapped LUTs, active-depth glow edge and vertical exaggeration
- ⏱️ **Time animation**: rAF-driven playback across 271 monthly timesteps (2004→2026) with prefetch-ahead so scrubbing never stalls
- 🎚️ **Full control set**: depth slider, canonical variable selector, editable colorbar ranges/colormaps, layer toggles
- 🗺️ **2-D map sync**: deck.gl heatmap + ArcGIS basemap + Argo float scatter, pickable hover inspection
- 📈 **Profile charts**: Recharts temperature/salinity columns at any grid point (inverted depth axis)
- 🔬 **Instrument overlay**: pulsing Argo float markers with drill-down profiles; honest glider placeholder
- 🛰️ **Services panel**: per-dataset OPeNDAP / WMS / ERDDAP / THREDDS-catalog endpoints surfaced from `/model/{id}/services`
- 🖼️ **WMS raster overlay**: one-click WMS tiles over the 2-D map (per-upstream `LAYERS` naming handled automatically)
- 🛡️ **Error contracts the UI respects**: 404 permanent · 422 silent · 503 → retry banner with readiness recovery

<!-- 📸 TODO before final submission: add screenshots/GIF here -->
<!-- ▶️ TODO: add 2–3 min demo video link -->

---

## 🧭 How It Works — End-to-End Analysis

> A complete walkthrough of the codebase: what data flows in, how it is transformed, and how it reaches GPU-rendered 3D pixels — from raw INCOIS files to an interactive ocean in the browser.

### What this project is (in one breath)

**EchoShield** = a browser-based 3D ocean viewer. It takes INCOIS's gridded ocean model output (temperature/salinity/currents/chlorophyll over the Indian Ocean, from surface to 2000 m depth) and real Argo float observations, and lets a scientist — or a student — fly through the ocean in 3D, scrub through time (2004→2026), peel layers by depth, click any point to see values, and compare what the model predicted vs. what instruments actually measured.

### What data the project uses (required by PS-26067)

| # | Dataset | ID | Type | Role |
|---|---|---|---|---|
| 1 | **INCOIS ARGO Monthly VAM** (~280 MB NetCDF) | `incois_argo_mnt_VAM` | Local gridded model | Flagship: TEMP(°C) + SAL(PSU), 271 monthly steps (2004→2026), 24 depths (5→2000 m), 60×90 grid covering Indian Ocean (30–120°E, 30°S–30°N) |
| 2 | INCOIS ARGO 10-day VAM / McCreary products | via ISO 19115 | Remote ERDDAP | Registered metadata + service URLs |
| 3 | INCOIS Value Added Products geostrophic currents (`GEO_U`/`GEO_V`) | remote ERDDAP | Gridded model | Current vector layer |
| 4 | INCOIS IRS P4 OCM Chlorophyll | remote ERDDAP | Satellite-derived grid (2556×4315) | Surface chlorophyll layer |
| 5 | **Argo floats** (~50 live Indian-Ocean floats) | `/argo/*` | In-situ profiles | Instrument overlay: lat/lon/time/depth/temp/salinity |
| 6 | Synthetic test fixture (~80 KB) | `local_synthetic_ocean` | Local | Deterministic offline testing incl. currents |
| 7 | Gliders / CTD / BGC / ADCP | `GLIDER_DATA_URL` seam | Pluggable | Architecture-ready; no fabricated public source |

### Dataset links

| Dataset | Source | URL |
|---|---|---|
| INCOIS ARGO Monthly VAM | INCOIS ERDDAP | https://erddap.incois.gov.in/erddap/griddap/incois_argo_mnt_VAM |
| INCOIS ARGO 10-day VAM | INCOIS ERDDAP | https://erddap.incois.gov.in/erddap/griddap/incois_argo_10d_VAM |
| Monthly McCreary model | INCOIS ERDDAP | https://erddap.incois.gov.in/erddap/griddap/incois_argo_mnt_McCreary |
| SST Weekly | INCOIS ERDDAP | https://erddap.incois.gov.in/erddap/griddap/incois_argo_sst_weekly |
| Indian Argo Floats | INCOIS ERDDAP (tabledap) | https://erddap.incois.gov.in/erddap/tabledap/Indian_ARGO_Floats |
| Argo GDAC | Ifremer | via `argopy` library |

### What gaps this fills (from the PS)

| Gap in PS-26067 | EchoShield's answer |
|---|---|
| No web-based 3D ocean rendering | Three.js/WebGL volumetric "ocean box", runs in any browser, zero install |
| No unified display of Argo/Glider + model | Pulsing instrument markers co-rendered inside the same 3D scene; click → depth-profile chart |
| No interactive controls | Depth slider, time animation, variable selector, editable colorbar (colormap/min-max/log-linear), opacity, vertical exaggeration |
| Can't ingest new sources without re-engineering | Plugin registry — new dataset = one registry entry; new variable = one line in `variable_mapping.py`; new sensor = one client interface implementation |
| Tools too complex for non-experts | Intuitive UI doubles as science-outreach/e-learning tool |

Plus a differentiator beyond the PS: **model-vs-Argo validation** (bias/MAE/RMSE panel) — directly serves INCOIS forecasters correlating predictions with observational evidence.

### The pipeline — step by step from scratch

#### Stage A — Data lands on disk (offline prep)

```
scripts/fetch_incois_vam.py  → data/sample_netcdf/incois_argo_mnt_VAM_<hash>.nc (~280 MB)
scripts/download_argo.py     → data/argo_cache/<WMO>.nc (real float profiles, offline demo)
data/datasets/datasets.json  → manifest of registered products
```

#### Stage B — Backend startup: discovery & registration (`backend/app/services/dataset_registry.py`)

1. Scans data roots for NetCDF files, ISO 19115 XML sidecars, optional THREDDS catalog.
2. When a file matches its ISO sidecar (`...VAM_<hash>.nc` ↔ `...VAM_iso19115.xml`), the ISO product ID becomes the stable dataset ID and enriches title/provider/license/bounds.
3. Files register as `local_*`; corrupt ones are isolated with a warning — never crash the registry.
4. Security: only registered IDs are openable → no path traversal, no arbitrary URLs.
5. Curated remote sources (`curated_sources.py`) add `GEO_U`/`GEO_V` currents and OCM chlorophyll.

#### Stage C — Making heterogeneous data speak one language (`ingestion/`)

This is the scientific heart:

- **`netcdf_parser.py`** — lazy xarray opens (never reads 280 MB at once; only the requested slab, ~7 ms warm). Extracts slices/profiles/points, downsamples grids >100k points, converts NaN→`null`.
- **`variable_mapping.py`** — resolves coordinates via CF precedence (`standard_name`→`axis`→units→known names); maps raw names to canonical ones: `TEMP→temperature`, `SAL→salinity`, `GEO_U→u_current`. Frontend never needs to know source naming quirks.
- **Vertical honesty** — depth stays meters, pressure stays dbar; `vertical_kind` travels with every response; descending/negative depth axes normalized without swapping physical levels.
- **`argo_client.py` / `argo_local.py`** — argopy remote vs. local-cache provider behind one interface (`ARGO_PROVIDER=auto|local|remote`).
- **`glider_netcdf.py` + `services/glider.py`** — pluggable seam; returns honest `{"configured": false}` until a real authorized source exists.
- **`text_parser.py`, `iso19115_parser.py`, `thredds_client.py`** — ASCII/CSV ingestion, metadata records, THREDDS discovery.

**Design rule: missing data is never fabricated.** No currents in VAM? → `{"available": false}`. Unreachable upstream? → clean 503 with retry/circuit-breaker applied. NaN → `null`, always.

#### Stage D — REST contract (`api/routes/model_data.py`, `argo.py`, `glider.py`)

Read-only JSON under `/api/v1`. Key endpoints:

| Endpoint | Feeds which UI feature |
|---|---|
| `GET /model/datasets` | Dataset picker |
| `GET /model/{id}/extent` | One-call startup payload (times, depths, bounds, variables) |
| `GET /model/{id}/slice?variable&time_index&depth&bbox` | One color-mapped 2D horizontal plane |
| `POST /model/{id}/slice/batch` | Up to 10 depth planes in ONE round-trip → feeds the 3D volume |
| `GET /model/{id}/profile` / `point` | Profile chart / hover inspector |
| `GET /model/{id}/currents` | Flow arrows/particles (or explicit unavailable contract) |
| `GET /model/{id}/services` | OPeNDAP/WMS/ERDDAP URLs handed straight to map tiles |
| `GET /argo/floats` → `/argo/{wmo}/profile` | Markers → drill-down chart |
| `GET /argo/{wmo}/compare?dataset_id=` | Bias/MAE/RMSE validation panel |

#### Stage E — Frontend pipeline (`frontend/src/`)

Simple → advanced flow:

1. **State** (`store/oceanStore.js`, Zustand): single source of truth — active dataset/variable/timeIndex/activeDepth + view toggles + colorbar settings. Defaults prefer the real VAM product.
2. **Data hooks** (`hooks/useOceanData.js`, TanStack Query): caching, request cancellation, bbox-aware keys, prefetch-ahead during animation. `useTimeAnimation.js` drives rAF playback across 271 timesteps.
3. **3D scene** (`components/Viewer3D/OceanViewer.jsx`): React Three Fiber `<Canvas>` with adaptive DPR (device-aware), WebGL-context-loss recovery, error boundary.
4. **VolumeRenderer.jsx — the core trick**: the "volume" is a stack of textured horizontal planes:
   ```
   slice batch JSON → Web Worker (valuesToTextureAsync: numbers → LUT colormap → RGBA pixels)
                    → THREE.DataTexture per plane → plane mesh positioned at depthToY(depth)
                    → active-depth plane gets glow edge + higher opacity
   ```
   Vertical exaggeration slider scales Y spacing; opacity slider sets material transparency. Bounded to ≤8 depth planes by default so the browser never chokes.
5. **Supporting layers**: `OceanSurface` (animated water shader w/ normal texture), `OceanFloor`, `CurrentArrows` (particle budget 1600 @30 Hz), `IsosurfaceRenderer` (optional Marching Cubes — off by default since it's expensive), `InstrumentMarkers` (pulsing Argo spheres, budget 80).
6. **Smart requests** (`ViewportDataController.jsx`): camera distance → geographic LOD. Zoomed out = full Indian Ocean extent; zoom in = smaller bbox requested from server. Zooming literally reduces data shipped.
7. **2D map sync** (`Map2D/OceanMap.jsx`, deck.gl): heatmap of the same slice + ArcGIS basemap + Argo scatter + WMS raster overlay (per-upstream `LAYERS` naming handled automatically).
8. **Analysis panels**: `ProfileChart.jsx` (Recharts, inverted depth axis), `HoverInspector.jsx` (`/point` query), `ModelComparisonPanel.jsx` (validation metrics), `ServicesPanel.jsx`, `ColorbandLegend.jsx`, `UpstreamBanner.jsx` (503 retry UX).

#### End-to-end example (what happens when you drag the depth slider)

```
user drags to 500 m → oceanStore.setActiveDepth(500)
→ useSliceStack re-keys query → POST /slice/batch {time_index, depths…}
→ backend: registry lookup → canonical var resolution → lazy xarray slab read
  → downsample if needed → NaN→null → gzip JSON
→ Web Worker colormaps each grid → GPU textures → planes restack in 3D
→ active plane glows; legend recolors; total latency ≈ tens of ms warm
```

#### Performance engineering (why it doesn't melt the browser)

Camera LOD · server-side subsetting+downsampling · batched requests · client+server TTL caches (128 entries/30 min) · gzip · adaptive DPR · worker-thread texture conversion · reduced post-processing (Bloom+Vignette only) · strict budgets on particles/markers.

### Acronyms

| Acronym | Full Form |
|---|---|
| INCOIS | Indian National Centre for Ocean Information Services |
| MoES | Ministry of Earth Sciences |
| EEZ | Exclusive Economic Zone |
| NetCDF | Network Common Data Form |
| OPeNDAP | Open-source Project for a Network Data Access Protocol |
| ERDDAP | Environmental Research Division's Data Access Program |
| WMS / WCS | Web Map Service / Web Coverage Service |
| OGC | Open Geospatial Consortium |
| CF | Climate and Forecast (conventions) |
| VAM | Variational Analysis Methodology |
| BGC | BioGeoChemical |
| CTD | Conductivity, Temperature, Depth |
| ADCP | Acoustic Doppler Current Profiler |
| Argo | Global array of autonomous profiling floats |
| GDAC | Global Data Assembly Centre |
| LOD | Level of Detail |
| DPR | Device Pixel Ratio |
| LUT | Look-Up Table (color mapping) |

### Honest remaining gaps

- Real authorized INCOIS glider missions not yet connected (seam ready via `GLIDER_DATA_URL`)
- Dedicated CTD/BGC/ADCP/mooring/HF-radar adapters pending
- Automated perf benchmarks (FPS/GPU memory) pending
- WCS advertised only when actually configured — never faked

---

## 🛠️ Tech Stack

### Frontend (`frontend/`)

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 6 (ESM) |
| 3D Rendering | Three.js ^0.182 via @react-three/fiber ^9, drei, postprocessing |
| Mapping | deck.gl ^9 (TileLayer, HeatmapLayer, BitmapLayer, ScatterplotLayer), react-map-gl |
| State | Zustand ^5 (client state) + TanStack Query ^5 (server state, caching, prefetch) |
| Styling | Tailwind CSS v4 (CSS-first `@theme` config) |
| Charts | Recharts ^2 |
| Animation | GSAP ^3 (camera fly-to, number rolls), Framer Motion ^12 |
| Quality | oxlint, production build w/ vendor chunk splitting |

### Backend (`backend/`)

| Layer | Technology |
|---|---|
| API | FastAPI + Pydantic v2 (strict response models), uvicorn |
| Scientific I/O | xarray, netCDF4 / h5netcdf, dask (lazy), pydap (OPeNDAP) |
| Observations | argopy (Argo ERDDAP/GDAC), pluggable local-cache provider |
| Metadata | ISO 19115 XML parser, CF standard-name variable classification |
| Config | pydantic-settings (all infra via environment, nothing hardcoded) |
| Quality | pytest (132 tests incl. value-level checks against real data), mypy `--strict` (clean), ruff |

### Data & Infrastructure

| Concern | Choice |
|---|---|
| Source product | INCOIS ERDDAP — ARGO Monthly VAM gridded NetCDF (~280 MB, real) |
| Scientific serving | THREDDS (OPeNDAP/WMS/fileServer URLs advertised, not proxied) |
| Caching | FileCache TTL JSON (Argo searches/float details), LRU open-dataset pool |
| Packaging | uv workspace, npm; docker-compose full stack (THREDDS + FastAPI) built & live-verified |

---

## 🏗️ Architecture

```
                    ┌──────────────────────────────┐
                    │   React 19 + Three.js SPA    │
                    │  (vite :5173 → proxy /api)   │
                    └──────────────┬───────────────┘
                                   │ REST /api/v1
                    ┌──────────────▼───────────────┐
                    │        FastAPI app           │
                    │  validation · contracts      │
                    ├────────┬─────────┬───────────┤
                    │ Model  │  Argo   │  Glider   │
                    │ Service│ Client  │  (stub)   │
                    └───┬────┴────┬────┴───────────┘
                        │         │
             ┌──────────▼──┐  ┌───▼──────────────┐
             │   xarray    │  │     argopy       │
             │ netCDF4/dask│  │ ERDDAP/GDAC/local│
             └──────┬──────┘  └──────────────────┘
                    │
      ┌─────────────┼──────────────────────┐
      ▼             ▼                      ▼
 local NetCDF   remote OPeNDAP /      ISO 19115
 (INCOIS VAM)   ERDDAP / THREDDS      metadata
```

Design rules enforced in code:

- **Registry-gated access** — the API can only open datasets registered at startup; no arbitrary server paths.
- **Canonical variables** — frontend speaks stable names (`temperature`, `salinity`, …); raw source names (`TEMP`, `SAL`) keep working.
- **Orientation contract** — every grid is `values[i][j] = latitude[i] × longitude[j]`; NaN becomes `null`, never `NaN`/`Infinity` in JSON.
- **Optional ≠ broken** — an unreachable Argo upstream degrades to a null client (503 responses); startup always succeeds if model data is readable.

---

## 📊 Real Data

The flagship dataset is the **actual INCOIS product**, registered automatically at startup:

| Property | Value |
|---|---|
| Product | `incois_argo_mnt_VAM` — INCOIS ARGO Monthly data, Variational Analysis Methodology |
| Provider | INCOIS (via INCOIS ERDDAP griddap) |
| Variables | `TEMP` (°C), `SAL` (PSU) → exposed canonically as `temperature`, `salinity` |
| Time axis | 271 monthly steps, 2004-01-15 → 2026-07-15 |
| Depth axis | 24 levels: 5, 10, 20 … 1800, 2000 m (native meters, positive-down) |
| Grid | 60 × 90 — 30.5–119.5 °E, 29.5 °S–29.5 °N |
| Size | ~280 MB NetCDF (lazy-opened; only requested slabs are read) |
| Currents | Genuinely absent → API returns explicit `{"available": false}` (never fabricated) |

Utility scripts:

```bash
uv run python scripts/fetch_incois_vam.py         # real ~280 MB INCOIS VAM product (one-time, before offline deploys)
uv run python scripts/download_argo.py --box 50 100 -10 30 --start 2023-01-01 \
    # ↑ cache real Argo float profiles (one <WMO>.nc each) for offline demos
```

### Data & assets shipped in-repo (deploy-ready)

Everything needed to run a fresh clone is committed — no manual downloads
required for a working demo:

| Asset | Purpose |
|---|---|
| `data/datasets/datasets.json` | Dataset registry (7 INCOIS products) loaded at backend startup |
| `data/*_iso19115.xml` | ISO 19115 metadata records backing `/model/{id}/metadata` |
| `data/sample_netcdf/synthetic_ocean.nc` | Tiny (~80 KB) labelled synthetic dataset — registered as `local_synthetic_ocean`, works out of the box |
| `frontend/public/assets/waternormals.jpg` | three.js water-normal texture for the 3D ocean surface |
| `frontend/fetch-assets.ps1` | Re-downloads the water texture if it ever goes missing |

The only file **not** in git is the ~280 MB `incois_argo_mnt_VAM` NetCDF
(GitHub hard-limits files at 100 MB). Fetch it once with
`scripts/fetch_incois_vam.py`; without it the app falls back to the
synthetic dataset and/or live ERDDAP access.

---

## 🔌 API Reference

Base URL: `/api/v1` · Interactive docs: `http://localhost:8000/docs`

### Health
| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness + optional-dependency import status |
| GET | `/health/ready` | Readiness checks array (registry, argo, thredds…) |

### Model data
| Method | Path | Description |
|---|---|---|
| GET | `/model/datasets` | Registered datasets with **real** time counts + spatial bounds |
| GET | `/model/{id}/extent` | Single-call startup payload: time range, all depths, lat/lon footprint, variables |
| GET | `/model/{id}/metadata` | Dimensions, variables, coordinates, attributes, ranges |
| GET | `/model/{id}/variables` | Variable list with canonical mapping + units |
| GET | `/model/{id}/times` | First/last timestep + count |
| GET | `/model/{id}/times/list` | Full decoded ISO time axis (cap 2000) |
| GET | `/model/{id}/timestamps` | Explicit `[{"index": i, "iso": …}]` pairs for scrubbers/deep-links |
| GET | `/model/{id}/depths` | Vertical levels (native units; see `vertical_kind`) |
| GET | `/model/{id}/slice` | 2-D horizontal slice (`variable,time_index,depth,bbox`) with auto-downsampling |
| POST | `/model/{id}/slice/batch` | Up to 10 slices in one round-trip, read concurrently |
| GET | `/model/{id}/profile` | Vertical profile at nearest grid point |
| GET | `/model/{id}/point` | Multi-variable nearest-grid sample |
| GET | `/model/{id}/currents` | `(u,v)` field or explicit unavailability contract |
| GET | `/model/{id}/services` | Advertised OPeNDAP/WMS/ERDDAP endpoints (WCS only if real) |

### Argo observations
| Method | Path | Description |
|---|---|---|
| GET | `/argo/floats` | Float search in bbox (+optional time window; defaults to a rolling 90-day active-floats window so upstream queries stay fast); cached 1 h |
| GET | `/argo/floats/{wmo}` | Float detail: availability, ranges, recent profiles |
| GET | `/argo/floats/{wmo}/profile` | One profile (latest or by cycle) |

### Gliders (honest stub)
| Method | Path | Description |
|---|---|---|
| GET | `/glider/status` | `{"configured": false}` until a provider plugin exists |
| GET | `/glider/missions` | Mission listing (empty until configured) |

**Response guarantees:** unknown entities → `404` · bad parameters → `422` · upstream outage → `503` with actionable detail. All numbers are finite or `null`.

---

## 🚀 Getting Started

**Prerequisites:** Python ≥ 3.12 with [uv](https://docs.astral.sh/uv/), Node.js ≥ 20, Git.

### 1 · Backend

```bash
cd backend
uv sync                       # locked dependency install
./run.ps1                     # Windows  — sets demo defaults (ARGO_PROVIDER=local)
# or: ./run.sh                # Linux/macOS
# or manually:
ARGO_PROVIDER=local uv run uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` — you should already see the real VAM product listed.

> `ARGO_PROVIDER=local` serves Argo from `data/argo_cache/*.nc` when offline.
> Use `auto` (default) to prefer local files then fall back to remote, or `remote` to force live argopy.
> Populate the cache with `scripts/download_argo.py` (needs Internet once).

### 2 · Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173  (proxies /api → :8000)
```

### 3 · Full stack with Docker (THREDDS + backend)

```bash
docker compose -f infra/docker-compose.yml up -d --build
# THREDDS UI   → http://localhost:8080/thredds/catalog.html
# FastAPI docs → http://localhost:8000/docs
```

The image ships public CA certificates (GlobalSign R3 root + OV 2018
intermediate) so INCOIS ERDDAP's TLS chain verifies inside the container,
advertises browser-reachable THREDDS URLs (`localhost:8080`), and queries
Argo via ERDDAP within a bounded time window (`ARGO_SOURCE=erddap`,
`ARGO_API_TIMEOUT=180`). The first `/argo/floats` call can take ~1–2 min
upstream; results are cached for 1 h.

### 4 · Verify the loop

```bash
curl http://localhost:8000/api/v1/model/incois_argo_mnt_VAM/extent
curl -X POST http://localhost:8000/api/v1/model/incois_argo_mnt_VAM/slice/batch \
     -H "Content-Type: application/json" \
     -d '{"slices":[{"variable":"temperature","time_index":130,"depth_meters":5}]}'
```

Then open the dashboard: pick the VAM dataset, drag the depth slider, hit play on time controls.

---

## 📁 Project Structure

```
Echosheild/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # health, model_data, argo, glider routers
│   │   ├── core/                # settings, logging, reliability helpers
│   │   ├── ingestion/           # netcdf_parser, iso19115, thredds/argo clients
│   │   ├── models/              # pydantic schemas (response contracts)
│   │   └── services/            # dataset_registry, model_service, cache
│   ├── tests/                   # 132 tests (incl. real-data integration)
│   ├── run.ps1 / run.sh         # one-command launchers
│   └── pyproject.toml           # deps, pytest, ruff, mypy(strict) config
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Viewer3D/        # OceanViewer, VolumeRenderer, OceanSurface…
│   │   │   ├── Map2D/           # OceanMap (deck.gl)
│   │   │   ├── Controls/        # depth/time/colorbar/variable/layer controls
│   │   │   ├── ProfileChart/
│   │   │   ├── Layout/
│   │   │   └── UI/              # banners, inspector, status, loaders
│   │   ├── hooks/               # TanStack Query wrappers, animation loop
│   │   ├── services/            # typed fetch layer (/api/v1)
│   │   ├── store/               # zustand ocean store
│   │   └── utils/               # colormaps, depth scaling, formatters
│   └── vite.config.js           # port 5173 + /api proxy + chunk splitting
├── scripts/                     # download_argo, download_sample_data, manifest…
├── docs/                        # api-contract.md, frontend-handoff.md
└── data/                        # sample_netcdf/, argo_cache/  (gitignored)
```

---

## ✅ Testing & Quality

```bash
# Backend (from repo root)
uv run --project backend pytest backend/tests -q     # 132 passed
uv run --project backend ruff check backend/app      # lint
cd backend && uv run --project . mypy app            # strict type-check: clean

# Frontend
cd frontend && npm run lint && npm run build
```

Highlights of the test suite: value-level parity between API slices/profiles and direct xarray reads of the real INCOIS file, NaN→null contracts, error-code matrix (404/422/503), batch-vs-single parity, corrupt-file isolation, and offline-argo degradation.

---

## ⚙️ Configuration

All configuration flows through environment variables (or `backend/.env`) — see `backend/app/core/config.py`:

| Variable | Default | Purpose |
|---|---|---|
| `DATA_ROOT` | `<repo>/data` | Root for all data trees |
| `NETCDF_DATA_ROOT` | `$DATA_ROOT/sample_netcdf` | Local gridded products scanned at startup |
| `ARGO_CACHE_DIR` | `$DATA_ROOT/argo_cache` | Per-WMO Argo profile files (offline mode) |
| `GLIDER_CACHE_DIR` | `$DATA_ROOT/glider_cache` | Reserved for future glider provider |
| `ARGO_PROVIDER` | `auto` | `auto` / `local` / `remote` |
| `ARGO_SOURCE` | `erddap` | argopy source: `erddap` (fast bulk queries) or `gdac` (slow per-float downloads) |
| `ARGO_API_TIMEOUT` | `120` | Seconds budgeted for one remote Argo query (compose sets 180) |
| `ARGO_ERDDAP_URL` / `ARGO_GDAC_URL` | unset | Override the argopy server endpoints |
| `THREDDS_BASE_URL` | unset | Enables deterministic THREDDS service URLs |
| `CORS_ORIGINS` | `localhost:5173,3000` | Comma-separated allow-list |
| `CACHE_TTL_SECONDS` | `3600` | Argo FileCache TTL |
| `MAX_GRID_POINTS` | `100000` | Slice downsampling threshold |

---

## 🗺️ Roadmap

- [ ] Isosurface extraction (marching cubes) alongside plane stacks
- [ ] MOSDAC satellite ingestion (`scripts/sync_mosdac.py` stub ready)
- [ ] Glider provider plugin (seam + schema already in place)
- [ ] BGC (oxygen/chlorophyll) variables when upstream product available
- [ ] WebSocket push for long-running remote dataset opens
- [x] Docker compose hardening incl. THREDDS container smoke test *(live-verified 2026-08-23: healthy THREDDS, WMS GetMap 200 PNG, 50 Argo floats)*

---

## 👥 Team EchoShield

| Name | Email |
|---|---|
| Kartikey Singh *(Team Leader)* | kartikey.24b1531026@abes.ac.in |
| Kartik Sharma | kartik.24b15310207@abes.ac.in |
| Devansh Dhama | devansh.24b0101418@abes.ac.in |
| Shaily Malik | shaily.24b0101617@abes.ac.in |
| Shrishti Saini | shrishti.24b0101294@abes.ac.in |
| Chandrachud Siddharth | chandrachud.24b0101356@abes.ac.in |

---

## 📄 License & Acknowledgements

Released under the [MIT License](backend/pyproject.toml).

- **INCOIS / MoES** for the ARGO Monthly VAM product and problem mentorship
- The **Argo program** — data collected and made freely available by the international Argo project ([doi:10.17882/42182](https://doi.org/10.17882/42182))
- Open-source scientific Python (xarray, argopy, FastAPI) and React/Three.js communities

<p align="center">Built with 🌊 for Smart India Hackathon 2026</p>
