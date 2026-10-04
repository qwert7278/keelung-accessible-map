# Safari processed JPEG fallback — 2026-10-04

Root cause: Safari Canvas WebP encoding can return PNG, null or empty output. The former strict WebP contract rejected that branch; a WASM WebP fallback has now been replaced by the explicitly requested native JPEG fallback.

## Implemented

- Prefer native Canvas WebP. If output is missing, empty, wrong MIME, throws, or cannot fit the hard size ceiling, encode the same resized white-background redraw as JPEG.
- WebP qualities .8/.7/.6; JPEG .82/.72/.62/.5. Keep the smallest usable result; target 300 KiB, hard maximum 1 MiB, longest side 1920 with no upscale. Redraw removes source EXIF; orientation-aware decoding, raw 20 MiB and 26 MP limits unchanged.
- Client sends format webp/jpeg; validates the returned exact operation path and sets matching Content-Type without upsert. No raw-file upload or PNG fallback.
- Signed Edge request gate and server-verified Auth remain required. Service-only new reserve_photo_verified_format RPC validates format, preserves owner/report/kind identity, quotas and expiry, and rejects operation format changes.
- Forward migration: `supabase/migrations/20261004183000_processed_jpeg_photos.sql`. Legacy reservation RPC remains WebP-compatible. Existing reports, claims, feed and cleanup retain their paths. Storage allows only .webp/image-webp or .jpg/image-jpeg with matching unexpired owned reservation and 1 MiB ceiling. No overwrite/delete grant added.
- Supabase migration applied successfully; prepare-photo Edge function ACTIVE version 4. Backend was updated before website release for rolling compatibility.

## Verification

Exact release snapshot excludes unrelated pending CSS/Cookie/document work. 160 unit tests passed; emitted Node endpoints verified; lint, build, SEO checks and diff check passed. Isolated PostgreSQL: 66 checks passed, including all 368 district insert paths, JPEG report/community/admin claims, retry/lost-ack recovery, format and MIME mismatch, invalid format, PNG, empty/oversized, wrong owner, unreserved, expired, overwrite, cleanup, permissions and quotas. All synthetic database data rolled back.

Chrome browser with synthetic photos: WebP returns RIFFWEBP / 640x480 / 1112 bytes; simulated unsupported WebP (PNG/null) returns JPEG signature / 640x480 / 2561 bytes. Failed replacement retains original Blob; picker cancellation retains drawer and text. JPEG fallback evidence: output/jpeg-fallback-verified.png.

Production readback confirms JPEG/WebP bucket MIME allow-list and 1 MiB limit; new RPC is service-role-only. No production QA accounts, reports or photos created.

## Required owner hardware retest

Physical iPhone Safari retest: **PENDING**. On roadtag.org, test camera and gallery (JPEG/HEIC), preview, cancel, remove and reselect, submit a genuine report, and inspect the resulting image path/MIME. Confirm the retained text and drawer behavior. Browser simulation and isolated SQL are not physical-device verification; MVP blocker is not fully closed until owner confirms PASS.

## Release

Publish this scoped commit through GitHub main to existing Vercel; verify READY, deployed SHA and roadtag.org assets. Do not revert the additive JPEG migration when rolling back frontend; legacy WebP clients remain compatible.
