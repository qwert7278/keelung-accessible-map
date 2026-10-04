# Homepage POV story — 2026-10-04

## Scope

Added the wheelchair first-person illustrative video after the four barrier stories and before the existing CTA. Statement now covers images and video. Existing story text, FAQ, schema, publisher, footer, contact and map/report code preserved.

## Assets

- public/videos/wheelchair-pov-demo.mp4: 4,371,802 bytes (4.37 MB); 1280x720, 24 fps, H.264/yuv420p, 20.041667 seconds, no audio.
- public/images/barriers/wheelchair-pov-video-poster.webp: 89,858 bytes; extracted at 6 seconds.
- FFmpeg libx264 slow, CRF 25, faststart. MP4 moov atom starts at offset 32; mdat at 6627. Raw 36,289,252-byte source excluded from Git/public.

## Runtime

src/home-story.ts uses IntersectionObserver: preload within 250px and autoplay at >=55% visible. Muted inline loop; leaves or hidden document pause; re-entry resumes unless user paused. Data-src and preload none avoid initial media download. Playback Promise rejection and scroll/preference races are handled. Reduced motion never auto-loads/plays/reveals; explicit play remains available.

GSAP 3.15.0 is dynamically imported only on the first eligible enter. Small opacity/y and scale .97-to-1 reveal; no ScrollTrigger, pin, scrub or scroll interception. src/home-story-entry.ts and src/home-story.css only affect this homepage block. External 48px keyboard-operable control does not cover the image; responsive 16:9 frame reserves its geometry.

## Validation

Exact release snapshot excludes concurrent CSS/Cookie/document work. 166 unit tests including 6 media lifecycle regressions passed; emitted Node API checks, lint, build, SEO and diff check passed. Browser desktop/mobile and reduced-motion results recorded with production release evidence in output. Codec compatibility is confirmed by format inspection; no physical iPhone/Android claim.

## Release

Single GitHub main to existing Vercel production workflow. Verify READY, deployed SHA, homepage block, poster, video Content-Type and byte-range response. No database changes for this task. Stop after this homepage story scope.
