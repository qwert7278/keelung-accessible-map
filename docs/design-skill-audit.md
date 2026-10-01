# Design skill audit — Beta V2

Date: 2026-09-30

## Skills and scope

- Taste Skill: applied to the map-first public entry surface only. This is a reporting utility, so its landing-page patterns were not extended into the multi-step form or admin product.
- Impeccable: applied in Operate mode to the existing application UI. The design direction is a restrained civic service: map, report action, visible case status, readable evidence provenance, and predictable dialogs.
- Declared design read: refine an existing civic reporting tool for Keelung residents, wheelchair users, older adults, and caregivers; prioritize the map and reporting task.
- Dials: variance 3/5, motion 2/5, density 5/5.

## Design decisions

- Replaced the oversized intro with a task title and one sentence; the existing map/list workspace remains the primary surface.
- Added a skippable three-screen first-visit guide and retained the permanent Help entry.
- Added a fixed mobile report action with bottom safe-area spacing; reduced map height slightly so controls and status legend remain visible.
- Used a bottom sheet for mobile case detail and separated initial, community, and admin improvement evidence.
- Kept OSM as the default provider and retained the current restrained color/status system.

## Tool limitation

The Impeccable context bootstrap was attempted once but its engine required a network download and a write outside the workspace (`C:\Users\qwert\.impeccable\bin\0.1.8`). That context loader could not run in this sandbox. The available Operate guidance, installed skill instructions, current app source, repository docs, and before screenshots were used instead. No critique-mode agent review was claimed.

## Reference patterns

- [SafeStep](https://github.com/ShreyaLbs/safestep-access-map): map and list remain one workspace; visible status and direct actions.
- [Project Sidewalk](https://github.com/ProjectSidewalk/SidewalkWebpage): brief instruction before contribution; no gamification added.
- [CivicLens](https://github.com/OSSWT/CivicLens): original, community, and admin evidence receive separate labels.
- [g0v Roadpin](https://github.com/g0v/roadpin): direct Taiwanese civic language.
- [Taiwan Road Construction Map](https://github.com/tbdavid2019/tw_road_fix_map): documented as a later, separate official-data layer; not part of this iteration.
