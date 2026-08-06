---
name: Per-user MongoDB data directories
description: How this project's active MongoDB storage is organized after moving off shared collections, and the lookup mechanism public routes rely on.
---

This project's active storage (`MONGODB_URI` set, `MongoDBStorage` in
`server/mongo-storage.ts`) does not keep forms/responses/uploaded
databases/private-users in shared collections filtered by `userId`. Each
user has one dedicated collection, `user_<userId>_data`, holding every
piece of data they own together, tagged with a `kind` discriminator
(`form` | `response` | `userDatabase` | `privateUser`). The `users`
collection itself stays global — it's the identity registry, not "owned
data."

**Why:** the user explicitly asked for physical separation ("one high
level directory per user... all forms and databases beneath it"), not
just logical isolation via a shared collection + `userId` filter (which
was already in place and is the more common/idiomatic MongoDB pattern —
worth defaulting back to it if a future request just wants isolation,
not literal per-user collections).

**How to apply:** Because public-facing routes only carry an id or name
(a public form link, a response-edit link, private-user login by name) —
never the owning user's id — a small pointer collection `resource_index`
maps `{ id -> { kind, userId } }` (plus `name` for private users) so the
right per-user collection can be found. Always resolve the owner through
this index before reading/writing a resource by id; never guess a
`user_<id>_data` collection name from anything other than a value that
came from the index or from an already-known owner id. When adding a new
kind of owned data, mirror this pattern: give it a `kind` value, store it
in the owner's collection, and index every externally-referenceable id.

Pre-restructure data was migrated once, automatically, on server startup,
by copying old shared collections (`forms`, `responses`, `private_users`,
`user_databases`) into the new per-user collections, then renaming the
originals to `legacy_forms` / `legacy_responses` / `legacy_private_users`
/ `legacy_user_databases` (kept, not dropped, as a safety net). Responses
referencing a form that no longer existed were left out of the new
structure (skipped, not deleted) since no owner could be resolved for
them.
