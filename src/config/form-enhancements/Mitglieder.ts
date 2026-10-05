// Auto-generated. Per-entity form-enhancements config for "Mitglieder".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [{"row": ["vorname", "nachname"], "cols": "1fr 1fr"}, "mitgliedsstatus", {"row": ["eintrittsdatum", "geburtsdatum"], "cols": "1fr 1fr"}, {"row": ["email", "telefon"], "cols": "1fr 1fr"}, {"row": ["strasse", "hausnummer"], "cols": "2fr 1fr"}, {"row": ["plz", "ort"], "cols": "1fr 2fr"}, "bemerkung"],
  defaults: {
    'eintrittsdatum': { kind: 'today' },
    'mitgliedsstatus': { kind: 'lookup', key: 'aktiv', label: 'Aktiv' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
