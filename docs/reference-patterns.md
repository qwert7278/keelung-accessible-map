# 參考專案：可借鏡模式與取捨

Reviewed: 2026-09-30. The projects below inform product patterns only; no source code was copied.

| Reference | Useful pattern for Keelung Accessible Map | Do not import |
| --- | --- | --- |
| [SafeStep](https://github.com/ShreyaLbs/safestep-access-map) | Low-friction single map/list task, status text and icons, visible keyboard focus, reduced motion, broad mobility framing. | localStorage-only production data or unvalidated urgency scores. |
| [Project Sidewalk](https://github.com/ProjectSidewalk/SidewalkWebpage) | Explain tasks before data entry, define obstacle categories, offer list equivalents, treat crowdsourced quality carefully. | Gamification, Street View labeling workflow, or its large Postgres/PostGIS architecture for this Beta. |
| [CivicLens](https://github.com/OSSWT/CivicLens) | Preserve an evidence lifecycle from initial photo to improvement evidence, clear map-point reporting, and future geospatial search concept. | Demo/local-storage assumptions or an API-key-only admin boundary. |
| [g0v Roadpin](https://github.com/g0v/roadpin) | Taiwanese civic-tech language and distinction between public observations and government roadwork information. | Legacy Python/Node/Mongo stack. |
| [Taiwan Road Construction Map](https://github.com/tbdavid2019/tw_road_fix_map) | Clear official-data provenance, administrative filters, and mobile bottom-sheet patterns for a later layer. | Official roadworks layer in this Beta; it is a separate P2 feature and must remain visibly distinct from public reports. |

## Applied to this iteration

- Kept the existing Supabase/RLS data boundary and OSM-first map.
- Added persistent task help rather than first-visit-only onboarding.
- Kept the report list as a map equivalent, and clarified community suggestions versus admin status.
- Added direct report links and a public feedback/removal contact.
- Deferred PostGIS, government roadworks, route planning, classification, gamification, and urgency scoring.
