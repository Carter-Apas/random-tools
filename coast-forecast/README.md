# Coast forecast

Hourly swell, waves, wind and weather for your coastal places, starting with **Piha / Māori Bay** and **Te Ārai**,
with a TypeScript frontend/backend, Mono themes, JSON API, and a password-protected
forecast lab at **`/admin`**.

## Development

Use Node 22.13+ (22.x) or Node 24+:

```sh
npm ci
npm run dev
```

Open <http://localhost:5180>. Vite proxies `/api` and `/healthz` to the watched
TypeScript backend on 5181. Optional settings go in `.env`; see `.env.example`.
No `.env` file is required.

```sh
npm run build
npm start
```

Production serves both pages and API on 5180, overridable with `PORT`. `HOST`
defaults to `0.0.0.0`.

## Seven-day outlook

The forecast page shows **today and the next six days** for the selected place.
Each day shows the calibrated surf-height range, wind at 6am/noon/6pm, a daylight
average score, and three score bars for those same hours. Switch the scoring
activity between surfing, rock fishing and inshore boat fishing. Select a day to
open its hourly charts; the date picker and endpoint link stay in sync. The strip
scrolls horizontally on small screens. Unavailable days remain visible with no
invented wave height or score; cached fallback is explicitly labelled.

`GET /api/v1/outlook?spot=piha` (alias `/api/outlook`) returns a compact seven-day
JSON overview: place, date range, daily summaries, per-day errors/warnings/stale
flags, and 6am/noon/6pm wind and scores. `spot` is required. All unavailable days
produce HTTP 503 with the seven dated entries; partial results use HTTP 200.
The existing `/api/v1/forecast` response remains the detailed single-day API.

## Forecast lab

Visit `/admin` and choose a password on first use. Alternatively set
`ADMIN_PASSWORD` in the server environment to supply one. An environment password
overrides the saved password and disables first-time setup. The UI saves a salted
scrypt hash to `admin-password.json`, beside the configuration. Passwords are
never included in JSON configuration exports. Sign-in uses a twelve-hour HttpOnly,
SameSite=Strict cookie; HTTPS requests receive a Secure cookie. Sessions clear on
server restart. Sign out invalidates the current session. To reset a forgotten
saved password, stop the app and remove `admin-password.json`, then run setup
again; or set `ADMIN_PASSWORD` in the environment.

Use **Add place** to select another beach or fishing spot on the map, then save
configuration to add it to the public forecast page and JSON API. Places can be
renamed, moved or removed from the draft; at least one place must remain. Up to
32 places are supported. Each place gets independent activity curves.

**Map & shoreline** opens a [Leaflet](https://leafletjs.com/) map using
[OpenStreetMap](https://www.openstreetmap.org/copyright) tiles, without an API key.
Click **Place point** to select the weather location and **Marine sample** to pick
nearby open water. Both pins can be dragged. Pan/zoom works normally; coordinate
fields also work when tiles are unavailable.

Set the abstract coastal reference with **Point toward sea** (one click from the
place) or **Draw along shore** (two clicks). **Flip sea side** swaps land/sea;
the gold sea handle can also be dragged to rotate it. The saved offshore bearing
represents the land side: wind FROM that direction is offshore. Swell FROM the
opposite, sea side approaches the shore. The map, place summary, and all three
direction curve editors show matching land/sea/shore-parallel guides. These are
orientation references; existing scoring curves remain at absolute bearings.
New places start with curves aligned to their chosen shore reference.

Tiles load directly from OpenStreetMap in the browser only while the map is open,
with attribution and an origin referrer. No tile prefetching, geocoder, account or
paid map service is used. Standard tiles are subject to the
[OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

The lab follows **place → activity → variables**. Surfing, rock fishing and
inshore boat fishing each have independent curves for each coast. Open a variable
to edit its graph in the animated dialog:

- Drag control points or edit their exact input/points values.
- Double-click or use **Add point** for more spline segments.
- **Draw curve** replaces the section you draw over, preserving points outside it.
- Choose smooth, linear or stepped interpolation; use undo/redo while editing.
- Negative points are allowed, down to −10,000. A large penalty can cancel all
  positive contributions. The visible Y range is adjustable; **Fit range** fits it.
- Direction curves join at 0°/360° and use FROM bearings: north 0°, east 90°,
  south 180°, west 270°.
- Use keyboard arrows on a focused point; Shift moves faster. Numeric controls
  are also available. A curve can contain 2–256 points.

**Use this curve** applies it to your unsaved draft. **Save configuration** saves
all places and activities together, including map references and sampling points. Switching places/activities retains drafts;
leaving the page with unsaved changes prompts the browser. Reset affects only the
selected activity and remains a draft until saved.

The simulator accepts independent fake swell/weather inputs and shows earned
points, the available maximum, each contribution and the resulting score. Its
**Curve maxima** preset sets every enabled input at its own mathematical maximum;
**Wrong wind** demonstrates penalties, and **Calm fishing** provides a calmer
scenario. **Load tomorrow** copies the forecast’s 6am conditions without changing
the forecast. The browser and backend use the same interpolation/scoring module.
There are no upstream requests while drawing or simulating.

Export JSON includes the current draft, including unsaved curves. Import previews
the filename/version before applying and atomically replaces all places and all
activities after server validation. Invalid imports leave the saved configuration
unchanged. Configuration contains data only; executable expressions are not used.

## Point normalization

```text
maximum = sum(maximum of each enabled curve)
earned = sum(each enabled curve evaluated at its input)
score = clamp(100 × earned / maximum, 0, 100)
```

The final score is rounded to an integer. There are no separate percentage
weights or hidden threshold caps. A curve’s positive maximum naturally sets its
influence. Negative values subtract from the raw total before normalization. An
entirely negative curve contributes its actual maximum to the denominator; each
activity must have a strictly positive combined maximum to save.

Smooth splines preserve the shape of each segment without overshooting the
control-point values, so their true maximum is the highest control point. Linear
and step curves follow the same maximum rule. Outside the control-point range,
endpoint values are held; directions wrap at 360°. Disabled curves contribute
neither points nor maxima. Missing input for an enabled curve produces an
unavailable score, not zero. User-defined curves determine all penalties; weather
codes, direction and height have no additional hard-coded score caps.

Each hourly score contains `value`, `label`, signed `points`, `maxPoints`, and
`factors` containing the input, earned points and maximum for each enabled curve.
The scoring version is **`curves-v2`**. Labels are excellent ≥80, good ≥60,
fair ≥40, poor below 40. Combined fishing is the lower of rock and inshore scores.
`summary.scores` averages scored daylight hours and reports `scoredHours`,
`daylightHours` and `bestHour`; hourly scores remain available at night.

Starting curves are personal conditions preferences, not provider ratings, catch
predictions or safety assessments. Tides, access, local hazards, water quality,
bathymetry and species are not modelled.

## Persistence and host mounting

The default path is **`.data/settings.json`**, overridable with `SETTINGS_FILE`.
The password hash is saved beside it. Files are written atomically before changes
are acknowledged. Settings survive process restarts. Mount that directory to keep
both configuration and password when replacing containers. Use one replica with
this JSON-file store.

From this app directory, the provided Compose file uses a **host bind mount**:

```sh
mkdir -p .data
docker compose up --build -d
```

Open <http://localhost:8086>. The container runs as UID/GID 1000; the host directory
must be writable by that user. `compose.yaml` refuses to create a missing host
directory as root. `.data` and `.env` are ignored and excluded from image builds.
Set `ADMIN_PASSWORD` in the environment or `.env` for Compose, or choose the
password in the browser after starting the container.

From the repository root, without Compose:

```sh
docker build -t coast-forecast:latest coast-forecast
mkdir -p coast-forecast/.data
docker run --rm -p 8086:80 \
  --mount type=bind,src="$(pwd)/coast-forecast/.data",dst=/app/.data \
  coast-forecast:latest
```

In Kubernetes, mount a writable volume at `/app/.data` for UID/GID 1000. Without a
mount, settings are lost when the container is replaced. Forecasts are held only
in memory and are never written to that directory. `/healthz` reports process
liveness without depending on upstream providers.

## JSON format and migration

Exported and saved files have `schemaVersion: 3`, with `spots` keyed by stable
place ID. Each place contains its `name`, `coast`, `note`, `latitude`, `longitude`,
`marineLatitude`, `marineLongitude`, `surfHeightFactor`, `offshoreFromDegrees`,
`calibrated`, and `scoring` with `surfing`, `rockFishing`, `inshoreFishing`. Every
activity contains a `curves` array. Each curve has:

```json
{
  "variable": "windSpeed",
  "enabled": true,
  "interpolation": "smooth",
  "points": [
    { "x": 0, "y": 25 },
    { "x": 10, "y": 15 },
    { "x": 25, "y": -100 },
    { "x": 100, "y": -200 }
  ]
}
```

Variables cover wind speed/direction/gusts, primary swell height/period/direction,
combined waves, estimated surf, secondary swell height/direction, rain/chance,
air/water temperature and WMO weather code. Curves must have increasing, unique
input values within their variable’s domain. There can be one curve per variable.
`GET /api/openapi.json` documents the complete schema.

Version 2 curve configurations and unversioned threshold settings are converted
on startup. Their original file is kept as `settings.json.v2.bak` or
`settings.json.v1.bak`, and the new file is written in version 3 format. Version 2
curve values and both original locations are preserved exactly.
Calibration and threshold intent are retained through curve control points; the
old percentage formula is intentionally replaced. Import also accepts version 2 and legacy
threshold files. Invalid versions or values are rejected.

`SPOT_CONFIG_FILE` can still provide startup overrides for calibration, land/sea
sampling coordinates and scoring curves. Reset uses these startup defaults;
saved admin configuration takes precedence. The response exposes the actual
weather/marine model grid coordinates. Changing the offshore bearing changes
wind-orientation labels, while scoring direction curves remain absolute bearings.

## API

```sh
curl 'http://localhost:5180/api/v1/forecast'
curl 'http://localhost:5180/api/v1/forecast?spot=piha'
curl 'http://localhost:5180/api/v1/forecast?spot=te-arai&date=tomorrow'
curl 'http://localhost:5180/api/v1/spots'
curl 'http://localhost:5180/api/v1/outlook?spot=piha'
curl 'http://localhost:5180/api/openapi.json'
```

Unversioned `/api/forecast` and `/api/spots` are aliases. Omit `spot` to return
`{ date, timezone, forecasts, errors }`; one failed location does not hide the others.
Use `today`, `tomorrow` (default) or YYYY-MM-DD, today through six days ahead, in
**Pacific/Auckland**. UTC instants are `time`; `localTime` is Auckland wall time.
GET/HEAD are supported. Invalid/duplicate parameters return 400, total upstream
failure 503. Optional `surf_factor` (0.1–3) and `offshore_from` (0–359) require a
spot and apply only to that request.

Units: metres, seconds, km/h, °C and millimetres. Bearings describe where wind and
swell come FROM. Rain is the preceding hour’s accumulation. Missing values are
null; zero is a modelled zero. An incomplete day’s rain total is null. Raw total
wave height, primary swell, and estimated surf are separate fields.

`firstLight` / `lastLight` are civil dawn/dusk (Sun centre 6° below the horizon),
calculated with [SunCalc](https://github.com/mourner/suncalc) for the requested
coordinates/date, in Auckland time including DST. Terrain/clouds affect visible
light. Sunrise and sunset remain separate provider values.

Authenticated admin endpoints:

- `GET /api/admin/session`: sign-in/setup state (available before sign-in).
- `POST /api/admin/setup`, `POST /api/admin/login`: JSON `{ "password": "…" }`.
- `POST /api/admin/logout`: invalidate this session.
- `GET /api/admin/settings`: current configuration and reset defaults.
- `GET /api/admin/config`: export all configured places and curves as version 3 JSON without credentials.
- `PUT /api/admin/config`: validate and atomically import the complete document.
- `PUT /api/admin/spots/{spot}`: name, sampling coordinates, orientation, calibration or activity curves. Add/remove places by replacing the complete configuration.
- `DELETE /api/admin/spots/{spot}`: reset one place to startup defaults.

All admin configuration reads/writes require the session cookie, including the
`/api/v1/admin/…` aliases. Cross-origin browser mutations are refused. Forecast
routes remain accessible without an admin session.

## Forecast source and caching

[Open-Meteo weather](https://open-meteo.com/en/docs) and
[marine](https://open-meteo.com/en/docs/marine-weather-api) data is cached in server
memory for **one hour per pair of weather/marine sampling coordinates and NZ-local
seven-day window**. The first request for any day fetches today through today + six
days in **two upstream HTTP requests**: one weather, one marine. The overview and
all detailed day forecasts share those responses. Concurrent requests coalesce;
curve edits and switching dates only recalculate scores. Locations sharing the
same coordinates reuse raw data while retaining their own calibration and scores.
Moving a sampling point or crossing NZ midnight starts a new window.

First request after expiry refreshes it. A failed refresh can return data up to
six hours old, explicitly marked `stale` with warnings. Cache clears on restart.
There is no background polling. Multiple containers have independent caches.

With two places and continuous use, the usual budget is four upstream HTTP
requests per hourly refresh (roughly 100 per day including a midnight rollover).
Restarts, failed refreshes and new coordinates can add requests. Open-Meteo's
[free limits](https://open-meteo.com/en/terms) are 10,000 calls/day, 5,000/hour and
600/minute; its [call accounting](https://open-meteo.com/en/pricing) can count large
variable/time requests as multiple calls. A seven-day strip does not make seven
provider requests per place. Browser refresh and day selection reuse the cache.

Personal non-commercial use needs no API key; `OPEN_METEO_API_KEY` selects the
customer hosts for a subscription. Allow outbound HTTPS to weather/marine APIs.
No secret reaches the browser. Significant waves and surf-face height can differ;
the surf estimate remains total waves × the calibration factor, not a nearshore
model. Piha is a regional outlook and Māori Bay may differ with shelter/sandbanks.

## Validation

```sh
npm run lint
npm run format:check
npm run build
npm test
```

Tests cover curve maxima and no overshoot, negative cancellation, normalization,
missing inputs, wrapping directions, forecast/simulator agreement, JSON round
trips, atomic failures, legacy migration, password setup/login/logout/expiry,
persistence, custom locations/migration/shoreline geometry, NZ dates/DST, seven-day batching, shared cache/coalescing, per-date sun times, midnight rollover, and partial provider availability.

Each app retains its own lockfile, Docker context, ESLint v4 preset, Prettier
settings and versioned Mono snapshot. Forecast attribution: Open-Meteo, CC BY 4.0.
See [Open-Meteo’s terms](https://open-meteo.com/en/terms) for hosted-service usage.
