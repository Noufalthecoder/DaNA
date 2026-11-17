# Third-party notices

DaNA is built on open-source components and public data. Each keeps its own licence.
We checked the licence of every package installed in `web/node_modules` and of the
Python packages in `api/requirements.txt` and their dependencies.

## Direct dependencies

| Area | Component | Licence |
|---|---|---|
| Web | React, React DOM, Framer Motion, Lenis, `@supabase/supabase-js` | MIT |
| Web | Lucide icons (`lucide-react`) | ISC |
| Web | Vite and build tooling | MIT |
| API | FastAPI, Pydantic, PyJWT | MIT |
| API | Uvicorn, httpx, python-dotenv | BSD-3-Clause |
| API | pytest (tests only) | MIT |
| Platform | Supabase | Apache-2.0 |
| Platform | PostgreSQL | PostgreSQL Licence |

## Results of the licence check

- No GPL, AGPL or LGPL package was found, including transitive dependencies.
- `certifi` (a transitive Python dependency) is MPL-2.0, a file-level licence. We use it unmodified.
- `caniuse-lite` (build-time browser data) is CC BY 4.0. It is not shipped to users.
- Everything else found is MIT, ISC, BSD or Apache-2.0.

## Data and standards

| Item | Licence / terms |
|---|---|
| SimpleMaps World Cities Database (Basic) | CC BY 4.0. Credit: [SimpleMaps](https://simplemaps.com/data/world-cities). Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| HL7 FHIR R4 | Open standard. HL7 and FHIR are registered trademarks of Health Level Seven International |

## Third-party services (used under their API terms)

- Google Gemini text-to-speech (Arabic and Urdu voice).
- Anthropic API (DaNA guide assistant).
- Supabase Auth and database hosting; Vercel and Render hosting.

Prototype data is test data only. No real patient data is used.
