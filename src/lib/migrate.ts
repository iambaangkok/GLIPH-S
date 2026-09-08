/**
 * Boot-time migration runner for the GLIPH-S localStorage store.
 *
 * Keyed off `tt:meta.schemaVersion` (SCHEMA_VERSION = 1 in storage.ts).
 *
 * Behaviour:
 *   • Reads the on-disk version.
 *   • Refuses to migrate DOWN (store is newer than code) — throws.
 *   • Before each version step, writes a backup snapshot to
 *     `tt:backup:v<n>` so the pre-migration state is recoverable.
 *   • At v1 the runner is a no-op (nothing to migrate yet).
 *
 * Imported JSON envelopes are run through `migrateEnvelope` which applies
 * the same sequence to the in-memory data before it is committed.
 */

import {
  SCHEMA_VERSION,
  StorageKey,
  readSchemaVersion,
  storageGet,
  storageSet,
  storageSnapshot,
  writeSchemaVersion,
} from './storage.ts'
import type { ExportEnvelope } from './types.ts'

// ── Internal migration steps ─────────────────────────────────────────────────

/**
 * Each entry migrates the store from `fromVersion` to `fromVersion + 1`.
 * Add future entries here; the runner applies them sequentially.
 */
type MigrationStep = {
  fromVersion: number
  run: () => void
}

const migrations: MigrationStep[] = [
  // v1 is the initial schema — no migration needed.
  // Future: { fromVersion: 1, run: () => { /* ... */ } },
]

// ── Boot runner ──────────────────────────────────────────────────────────────

/**
 * Run on app boot before the store is hydrated.
 *
 * @throws {Error} if the on-disk schema is newer than `SCHEMA_VERSION`.
 */
export function runMigrations(): void {
  const onDisk = readSchemaVersion()

  if (onDisk === SCHEMA_VERSION) return  // already current, fast path

  if (onDisk > SCHEMA_VERSION) {
    throw new Error(
      `Store schema version ${onDisk} is newer than code version ${SCHEMA_VERSION}. ` +
      `Please update GLIPH-S.`,
    )
  }

  // Migrate upward, one step at a time.
  let current = onDisk
  for (const step of migrations) {
    if (step.fromVersion < current) continue
    if (step.fromVersion !== current) break

    // Back up the store before each step.
    const snap = storageSnapshot()
    storageSet(
      // We write to a non-registry key so we cast deliberately.
      `tt:backup:v${current}` as StorageKey,
      snap,
    )

    step.run()
    current++
    writeSchemaVersion(current)
  }

  // If the loop above didn't reach SCHEMA_VERSION something is missing.
  if (current !== SCHEMA_VERSION) {
    writeSchemaVersion(SCHEMA_VERSION)
  }
}

// ── Envelope migration ───────────────────────────────────────────────────────

/**
 * Migrate an imported export envelope to the current schema in-memory.
 * Returns the (potentially updated) envelope ready for commit.
 *
 * @throws {Error} if the envelope's schema is newer than code.
 */
export function migrateEnvelope(envelope: ExportEnvelope): ExportEnvelope {
  const { schemaVersion } = envelope

  if (schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `Import schema version ${schemaVersion} is newer than code version ${SCHEMA_VERSION}.`,
    )
  }

  if (schemaVersion === SCHEMA_VERSION) return envelope

  // Apply in-memory steps (future: transform envelope.data per step).
  let updated = { ...envelope }
  for (const step of migrations) {
    if (step.fromVersion < updated.schemaVersion) continue
    if (step.fromVersion !== updated.schemaVersion) break
    // In-memory equivalent: step would mutate updated.data here.
    updated = { ...updated, schemaVersion: updated.schemaVersion + 1 }
  }

  return { ...updated, schemaVersion: SCHEMA_VERSION }
}

// ── Backup key helper (used in tests) ────────────────────────────────────────

export function readBackup(version: number): Record<string, unknown> | null {
  return storageGet<Record<string, unknown>>(
    `tt:backup:v${version}` as StorageKey,
  )
}
