# Templates (snippet insertion)

Type: task
Status: open
Blocked by: 07, 08, 10

## Task

Implement Templates — flexible, reusable text snippets insertable at the cursor anywhere.

- CRUD templates; persisted via the store (#08).
- Insert at the current cursor using the same last-focused-editor + selection ref plumbing as #11.
- Surface in the nav/side area per the layout.

MVP = snippet templates only. Whole-thread **template skeletons** stay out of scope (see fog).

Done when a template inserts at the cursor and templates persist.
