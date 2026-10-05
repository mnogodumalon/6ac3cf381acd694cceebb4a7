// Auto-generated. Per-entity form-enhancements config for "Kurse".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["kursname", "kursstatus", "startdatum", {"row": ["kursleiter_vorname", "kursleiter_nachname"]}, "kursort", {"row": ["max_teilnehmer", "kursgebuehr"], "cols": "1fr 1fr"}, "beschreibung"],
  defaults: {
    'startdatum': { kind: 'today', withTime: true },
    'kursstatus': { kind: 'lookup', key: 'geplant', label: 'Geplant' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
