// Auto-generated. Per-entity form-enhancements config for "Anmeldungen".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["mitglied", "kurs", {"row": ["anmeldedatum", "anmeldestatus"], "cols": "1fr 1fr"}, "bezahlt", "bemerkung"],
  defaults: {
    'anmeldedatum': { kind: 'today' },
    'anmeldestatus': { kind: 'lookup', key: 'angemeldet', label: 'Angemeldet' },
    'bezahlt': { kind: 'literal', value: false },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
