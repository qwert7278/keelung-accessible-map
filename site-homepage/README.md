# Road Recall public homepage source

> ARCHIVED — 2026-10-02: The owner selected GitHub `main` → Vercel as the only production release pipeline. This historical export is not an editable source or deployment target. Do not merge, synchronize, or publish it. See [the current maintenance workflow](../docs/single-release-workflow.md). The notes below describe the former setup.

This directory is part of the main Road Recall repository. Treat its reviewed HTML and assets as canonical source only if the active site build explicitly consumes them. Do not make a second, independently maintained homepage here or in a hosting provider editor.

At the time this note was written, the Vite app entry and this exported static homepage were separate inputs, and the Vercel build did not prove that this folder was served at `/`. The ChatGPT Site also had a separately bound source. This is a known source-of-truth gap, not a completed synchronization setup. See [`../docs/agent-memory.md`](../docs/agent-memory.md). Before claiming homepage parity, first wire the canonical homepage into the main repo's local/Vercel route and create a reproducible publisher for any other host; then verify each live URL.

The page uses only a Supabase publishable key if connected to public report data. Never add a service-role key or other server secret to this folder.
