// The orchestrator's plan, as far as the running app needs it
// (docs/orchestrator/SPEC.md). Generated — do not edit; regenerated on every
// build and update from the stored plan. Without a plan every map is empty.
//
//   SYSTEM_ASSIGNED entity → fields a tool fills when a record is CREATED — the
//                   value does not exist before; dialogs hide these on create and
//                   the form-polish sets no default on them. A scheduled or
//                   update-triggered tool owns its field but is NOT in here.
//   PLAN_SENTENCES  slug → the plan in the owner's words (flows' field page)
//
// The runtime write guard (FLOW_WRITES/OWNERSHIP, planGuard.ts) left on
// 23.09.2026: a flow page composes against its generated hook, whose submit
// plan IS the Schreibliste — there is no way to spell a write outside it.

export const SYSTEM_ASSIGNED: Record<string, string[]> = {};

export const PLAN_SENTENCES: Record<string, string[]> = {
  "mitglied-zu-kurs-anmelden": [
    "Legt an: anmeldungen",
    "Automatisch: anmeldedatum (heutiges Datum, automatisch), anmeldestatus (Angemeldet, solange die Zahl der angemeldeten Teilnehmer die maximale Teilnehmerzahl de …), bezahlt (fester Wert „false“)"
  ],
  "zahlung-erfassen": [
    "Ändert: anmeldungen",
    "Automatisch: bezahlt (fester Wert „true“)"
  ],
  "anmeldung-stornieren": [
    "Ändert: anmeldungen",
    "Automatisch: anmeldestatus (fester Wert „storniert“), anmeldestatus (fester Wert „angemeldet“)"
  ]
};

export const PLAN_SUMMARY = "Die Anwendung verwaltet einen kleinen Verein: Sie führt die Mitglieder, die angebotenen Kurse und die Anmeldungen der Mitglieder zu den Kursen. So ist jederzeit sichtbar, wer in welchem Kurs angemeldet ist, wer auf der Warteliste steht und wer die Kursgebühr bezahlt hat.";

/** slug → the lists a flow writes (the plan's Schreibliste). The nav leaves a
 *  flow out for a user who may not write one of them (lib/permissions.ts). */
export const FLOW_ENTITIES: Record<string, string[]> = {
  "mitglied-zu-kurs-anmelden": [
    "anmeldungen"
  ],
  "zahlung-erfassen": [
    "anmeldungen"
  ],
  "anmeldung-stornieren": [
    "anmeldungen"
  ]
};
