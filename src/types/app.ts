import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Mitglieder {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    geburtsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    email?: string;
    telefon?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    eintrittsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    mitgliedsstatus?: LookupValue;
    bemerkung?: string;
  };
}

export interface Kurse {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    kursname?: string;
    beschreibung?: string;
    kursleiter_vorname?: string;
    kursleiter_nachname?: string;
    startdatum?: string; // Format: YYYY-MM-DD oder ISO String
    kursort?: string;
    max_teilnehmer?: number;
    kursgebuehr?: number;
    kursstatus?: LookupValue;
  };
}

export interface Anmeldungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    mitglied?: RecordUrl; // applookup -> URL zu 'Mitglieder' Record
    kurs?: RecordUrl; // applookup -> URL zu 'Kurse' Record
    anmeldedatum?: string; // Format: YYYY-MM-DD oder ISO String
    anmeldestatus?: LookupValue;
    bezahlt?: boolean;
    bemerkung?: string;
  };
}

export const APP_IDS = {
  MITGLIEDER: '6ac3cf21158de3ef594db818',
  KURSE: '6ac3cf2625a0e189fb7d28b6',
  ANMELDUNGEN: '6ac3cf27f0ed894478338552',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'mitglieder': {
    mitgliedsstatus: [{ key: "aktiv", get label() { return lookupLabel('mitglieder', 'mitgliedsstatus', "aktiv") ?? "Aktiv"; } }, { key: "passiv", get label() { return lookupLabel('mitglieder', 'mitgliedsstatus', "passiv") ?? "Passiv"; } }, { key: "ausgetreten", get label() { return lookupLabel('mitglieder', 'mitgliedsstatus', "ausgetreten") ?? "Ausgetreten"; } }],
  },
  'kurse': {
    kursstatus: [{ key: "geplant", get label() { return lookupLabel('kurse', 'kursstatus', "geplant") ?? "Geplant"; } }, { key: "offen", get label() { return lookupLabel('kurse', 'kursstatus', "offen") ?? "Offen für Anmeldung"; } }, { key: "abgeschlossen", get label() { return lookupLabel('kurse', 'kursstatus', "abgeschlossen") ?? "Abgeschlossen"; } }, { key: "abgesagt", get label() { return lookupLabel('kurse', 'kursstatus', "abgesagt") ?? "Abgesagt"; } }],
  },
  'anmeldungen': {
    anmeldestatus: [{ key: "angemeldet", get label() { return lookupLabel('anmeldungen', 'anmeldestatus', "angemeldet") ?? "Angemeldet"; } }, { key: "warteliste", get label() { return lookupLabel('anmeldungen', 'anmeldestatus', "warteliste") ?? "Warteliste"; } }, { key: "storniert", get label() { return lookupLabel('anmeldungen', 'anmeldestatus', "storniert") ?? "Storniert"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'mitglieder': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'geburtsdatum': 'date/date',
    'email': 'string/email',
    'telefon': 'string/tel',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'eintrittsdatum': 'date/date',
    'mitgliedsstatus': 'lookup/select',
    'bemerkung': 'string/textarea',
  },
  'kurse': {
    'kursname': 'string/text',
    'beschreibung': 'string/textarea',
    'kursleiter_vorname': 'string/text',
    'kursleiter_nachname': 'string/text',
    'startdatum': 'date/datetimeminute',
    'kursort': 'string/text',
    'max_teilnehmer': 'number',
    'kursgebuehr': 'number',
    'kursstatus': 'lookup/select',
  },
  'anmeldungen': {
    'mitglied': 'applookup/select',
    'kurs': 'applookup/select',
    'anmeldedatum': 'date/date',
    'anmeldestatus': 'lookup/radio',
    'bezahlt': 'bool',
    'bemerkung': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateMitglieder = StripLookup<Mitglieder['fields']>;
export type CreateKurse = StripLookup<Kurse['fields']>;
export type CreateAnmeldungen = StripLookup<Anmeldungen['fields']>;