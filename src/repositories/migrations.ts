import { CURRENT_SCHEMA_VERSION, emptyMiso, emptyProgress } from "./schema.ts";

export class SchemaMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchemaMigrationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Documents with no schemaVersion are treated as v0. */
function migrate0to1(raw: Record<string, unknown>): Record<string, unknown> {
  const progress = isRecord(raw.progress) ? raw.progress : emptyProgress();
  const miso = isRecord(raw.miso) ? raw.miso : emptyMiso();
  return {
    schemaVersion: 1,
    courses: asArray(raw.courses),
    units: asArray(raw.units),
    cards: asArray(raw.cards),
    reviews: asArray(raw.reviews),
    progress,
    miso,
  };
}

const migrations: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  0: migrate0to1,
};

export function migrateToCurrent(data: unknown): unknown {
  if (!isRecord(data)) {
    throw new SchemaMigrationError("Saved data is not an object.");
  }

  const version = data.schemaVersion === undefined ? 0 : data.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    throw new SchemaMigrationError("schemaVersion must be an integer.");
  }
  if (version < 0) {
    throw new SchemaMigrationError("schemaVersion is negative.");
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new SchemaMigrationError(
      `Saved data uses schema ${String(version)}, which this version of Miso cannot read.`,
    );
  }

  let current = data;
  for (let from = version; from < CURRENT_SCHEMA_VERSION; from += 1) {
    const migrate = migrations[from];
    if (!migrate) {
      throw new SchemaMigrationError(`Missing migration from schema ${String(from)}.`);
    }
    current = migrate(current);
  }
  return current;
}
