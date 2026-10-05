/**
 * useMitgliedZuKursAnmeldenFlow — the plumbing of the flow « Mitglied zu Kurs anmelden », generated from the plan.
 *
 * Writes `anmeldungen`: asks `mitglied`, `kurs`, `bemerkung`; sets `anmeldedatum`, `bezahlt` itself.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 4)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *   compute   REQUIRED — the plan says these values are computed in the flow
 *             but leaves the rule to you: `anmeldestatus` (derived:computed:Angemeldet, solange die Zahl der angemeldeten Teilnehmer die maximale Teilnehmerzahl des Kurses nicht erreicht; sonst Warteliste) *
 *   const flow = useMitgliedZuKursAnmeldenFlow({
 *     steps: { mitglied: 1, kurs: 2, bemerkung: 3 },
 *     items: { mitglied: r => ({ id: r.id, title: fieldText(r, 'vorname') }) },
 *     compute: { anmeldestatus: forms => null },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.mitglied.select} {...flow.pick('mitglied')} />
 *     <EntitySelectStep {...flow.picks.kurs.select} {...flow.pick('kurs')} />
 *     <Bound form={flow.forms.anmeldungen} name="bemerkung" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep, type SummaryItem,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
export type MitgliedZuKursAnmeldenFieldKey = 'bemerkung' | 'kurs' | 'mitglied';

export interface MitgliedZuKursAnmeldenForms {
  anmeldungen: StepForm<'anmeldungen'>;
}

// Alias so the option generics stay readable.
type Key = MitgliedZuKursAnmeldenFieldKey;

export interface MitgliedZuKursAnmeldenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    mitglied?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    kurs?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
  /** The plan computes these in the flow but leaves the rule to the page. */
  compute: {
    anmeldestatus: (forms: MitgliedZuKursAnmeldenForms) => unknown;   // derived:computed:Angemeldet, solange die Zahl der angemeldeten Teilnehmer die maximale Teilnehmerzahl des Kurses nicht erreicht; sonst Warteliste
  };
}

const DEFAULT_STEPS: Record<string, number> = {"bemerkung": 3, "kurs": 2, "mitglied": 1};
export const MITGLIEDZUKURSANMELDEN_REVIEW_STEP = 4;

function fromPick<T>(pick: { recordOf(id: string): JourneyRecord | undefined }, form: StepForm, field: string, read: (r: JourneyRecord) => T): T | undefined {
  const id = form.get(field);
  const rec = typeof id === 'string' && id ? pick.recordOf(id) : undefined;
  return rec ? read(rec) : undefined;
}
function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Returns T, not Partial<T>: a Record's index signature is already "maybe
// absent", and Partial<Record<string, string>> does not assign to the
// Record<string, string> useStepForm wants (tsc, live 23.09.2026 — eight
// errors, one per hook, caught only in the sandbox build).
function only<T extends Record<string, unknown>>(obj: T | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out as T;
}

function hasValues(form: StepForm): boolean {
  return form.keys.some(k => !isEmptyValue(form.values[k]));
}

export function useMitgliedZuKursAnmeldenFlow(options: MitgliedZuKursAnmeldenFlowOptions) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const anmeldungen = useStepForm('anmeldungen', {
    fields: ["mitglied", "kurs", "bemerkung"],
    steps: only(steps, ["mitglied", "kurs", "bemerkung"]) as Record<string, number>,
    // the plan builds a value from these — required here, whatever the app's base view says
    required: { kurs: true },
    initial: only(options.initial as FormValues | undefined, ["mitglied", "kurs", "bemerkung"]),
    messages: only(options.messages as Record<string, string> | undefined, ["mitglied", "kurs", "bemerkung"]),
  });
  const forms: MitgliedZuKursAnmeldenForms = { anmeldungen };
  const formList: StepForm[] = [anmeldungen];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    mitglied: useRecordSearch(servicePort, 'mitglieder', withPickPolicy('mitglied', {
      searchFields: ["vorname", "nachname", "email"] as never,
      filter: "r.v_mitgliedsstatus == 'aktiv'",
      where: (r: JourneyRecord) => (fieldLookup(r, "mitgliedsstatus")?.key ?? null) === "aktiv",
      toItem: options.items?.mitglied as never,
    })),
    kurs: useRecordSearch(servicePort, 'kurse', withPickPolicy('kurs', {
      searchFields: ["kursname", "kursort"] as never,
      filter: "r.v_kursstatus == 'offen'",
      where: (r: JourneyRecord) => (fieldLookup(r, "kursstatus")?.key ?? null) === "offen",
      toItem: options.items?.kurs as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:mitglied-zu-kurs-anmelden:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:mitglied-zu-kurs-anmelden:write:${entity}.${field}`,
  });
  const picks = {
    mitglied: { ...searches.mitglied, select: { ...searches.mitglied.select, create: true as boolean, hint: hintFor('mitglied', 'mitglieder', {"conditions": [{"field": "mitgliedsstatus", "op": "eq", "value": "aktiv"}], "mode": "all"} as PickWhere | null) } },
    kurs: { ...searches.kurs, select: { ...searches.kurs.select, create: true as boolean, hint: hintFor('kurs', 'kurse', {"conditions": [{"field": "kursstatus", "op": "eq", "value": "offen"}], "mode": "all"} as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'anmeldungen', entity: 'anmeldungen', form: anmeldungen, primary: true,
      values: (): FormValues => ({
        anmeldedatum: policyFixedValue('anmeldungen', 'anmeldedatum') ?? todayIso(),
        bezahlt: policyFixedValue('anmeldungen', 'bezahlt') ?? false,
        anmeldestatus: options.compute.anmeldestatus(forms),
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('anmeldungen', 'bezahlt', policyFixedValue('anmeldungen', 'bezahlt') ?? false)],

      // the planner's assumptions that first act here — shown once with „Passt“ / „ändern“
      notices: () => [{"assumed": "unbegrenzt viele Anmeldungen", "id": "kein-limit-kurs", "question": "Was gilt bei Kursen ohne maximale Teilnehmerzahl?"}],
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'mitglied-zu-kurs-anmelden' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: MitgliedZuKursAnmeldenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return {
      selectedId: (typeof owner.get(field) === 'string' ? (owner.get(field) as string) : null) || null,
      // `field as never` collapsed the conditional SetArgs<E, never> to never and
      // no argument was assignable any more (tsc, live 23.09.2026); widen `set`
      // itself instead — the label stays a required third argument.
      onSelect: (id: string) => (owner.set as (k: string, v: unknown, l?: string) => void)(field, id, search?.labelOf(id)),
    };
  };
  /** Props for a multi-record pick step: {...flow.picks.x.select} {...flow.pickMany('x')} */
  const pickMany = (field: MitgliedZuKursAnmeldenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'mitglied-zu-kurs-anmelden' as const,
    draftKey: 'mitglied-zu-kurs-anmelden' as const,
    entity: 'anmeldungen' as const,
    form: anmeldungen,
    forms, formList, picks, submit, steps,    reviewStep: MITGLIEDZUKURSANMELDEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type MitgliedZuKursAnmeldenFlow = ReturnType<typeof useMitgliedZuKursAnmeldenFlow>;
