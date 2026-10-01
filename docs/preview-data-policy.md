# Preview data policy

Date: 2026-09-30.

Earlier read-only browser verification found that the Vercel Preview and Production app display the same three user-provided sample reports and their images use the same Supabase Storage host. Treat both environments as connected to shared real data until the Supabase project configuration proves otherwise.

- Do not submit synthetic reports, community updates, or admin status changes from a Preview deployment that may share Production Supabase.
- Do not upload test images to the shared public Storage bucket.
- Do not rerun cloud write smoke tests against this shared project.
- Local Demo Mode is the safe place to test the report-success state; it stores demo changes in the current browser only.
- The preferred long-term QA boundary is a separate Supabase project or an approved Supabase development branch with isolated storage and Auth.
- No paid Supabase project or branch is created by this V2 work.
- Keep the existing three public samples intact; do not alter their content or photos as test fixtures.
