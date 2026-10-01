# Admin console — Beta V2.1

The Admin route now presents an operational queue beside the selected case, using the existing public colors and component language.

- Default queue: `待改善`; if empty, it falls back to `處理中`.
- Filters expose the open, in-progress, resolved, and all-case counts. Search narrows the visible queue.
- Each case offers the next valid action: open → in progress, in progress → resolved, resolved → open. The action selects the case and preloads its target status; it does not skip the edit/save step.
- The case editor displays current public status, access level, evidence, and community history. The admin note remains private and distinct from the public audit event.
- Save requires a non-empty admin note and explicit consent. Resolving requires an after photo unless one already exists. The control is disabled while incomplete or saving; success is displayed only after the repository/database update succeeds.
- The Demo-only banner says writes remain in this browser. A footer action opens the existing explanation and reset control; reset restores the eight synthetic seed reports.
- At mobile widths, the selected case becomes a full-height sheet with a prominent “返回案件” control. Desktop retains a two-column case list and editor.

Database RLS, explicit grants, the private admin allow-list, `is_admin()`, and database constraints remain the authorization layer. These UI checks improve clarity but are not treated as security controls.

## Local verification

Demo status update succeeded, adding one local admin history event. The “resolved without photo” negative path kept save disabled and displayed the required-photo message. The Demo reset control then restored the original eight examples. No Supabase mutation occurred.
