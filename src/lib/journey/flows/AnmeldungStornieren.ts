/**
 * useAnmeldungStornierenFlow — the plumbing of the flow « Anmeldung stornieren », generated from the plan.
 *
 * Changes `anmeldungen`: the record to change is picked (`flow.pick('anmeldungen')`), the form is prefilled with its values; ; sets `anmeldestatus` itself.
Changes `anmeldungen` (only when the person fills it): the record to change is picked (`flow.pick('anmeldungen2')`), the form is prefilled with its values; ; sets `anmeldestatus` itself.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 3)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useAnmeldungStornierenFlow({
 *     steps: { anmeldungen: 1, anmeldungen2: 2 },
 *     items: { anmeldungen: r => ({ id: r.id, title: fieldText(r, 'bemerkung') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     // the record this flow changes: <EntitySelectStep {...flow.picks.anmeldungen.select} {...flow.pick('anmeldungen')} />
 *     // the record this flow changes: <EntitySelectStep {...flow.picks.anmeldungen2.select} {...flow.pick('anmeldungen2')} />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import { useState } from 'react';
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep, type SummaryItem,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
import { entityLabel } from '@/lib/journey/rules';
export type AnmeldungStornierenFieldKey = 'anmeldungen' | 'anmeldungen2';

export interface AnmeldungStornierenForms {
  anmeldungen: StepForm<'anmeldungen'>;
  anmeldungen2: StepForm<'anmeldungen'>;
}

// Alias so the option generics stay readable.
type Key = AnmeldungStornierenFieldKey;

export interface AnmeldungStornierenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    anmeldungen?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    anmeldungen2?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"anmeldungen": 1, "anmeldungen2": 2};
export const ANMELDUNGSTORNIEREN_REVIEW_STEP = 3;

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

export function useAnmeldungStornierenFlow(options: AnmeldungStornierenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const [anmeldungenTargetId, setAnmeldungenTargetId] = useState<string | null>(null);
  const [anmeldungen2TargetId, setAnmeldungen2TargetId] = useState<string | null>(null);
  const anmeldungen = useStepForm('anmeldungen', {
    fields: [],
    steps: only(steps, []) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, []),
    messages: only(options.messages as Record<string, string> | undefined, []),
  });
  const anmeldungen2 = useStepForm('anmeldungen', {
    fields: [],
    steps: only(steps, []) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, []),
    messages: only(options.messages as Record<string, string> | undefined, []),
  });
  const forms: AnmeldungStornierenForms = { anmeldungen, anmeldungen2 };
  const formList: StepForm[] = [anmeldungen, anmeldungen2];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    anmeldungen: useRecordSearch(servicePort, 'anmeldungen', withPickPolicy('anmeldungen', {
      searchFields: ["bemerkung"] as never,
      filter: "r.v_anmeldestatus in ['angemeldet', 'warteliste']",
      where: (r: JourneyRecord) => ["angemeldet", "warteliste"].includes(fieldLookup(r, "anmeldestatus")?.key ?? ''),
      toItem: options.items?.anmeldungen as never,
    })),
    anmeldungen2: useRecordSearch(servicePort, 'anmeldungen', withPickPolicy('anmeldungen2', {
      searchFields: ["bemerkung"] as never,
      filter: "r.v_anmeldestatus in ['angemeldet', 'warteliste']",
      where: (r: JourneyRecord) => ["angemeldet", "warteliste"].includes(fieldLookup(r, "anmeldestatus")?.key ?? ''),
      toItem: options.items?.anmeldungen2 as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:anmeldung-stornieren:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:anmeldung-stornieren:write:${entity}.${field}`,
  });
  const picks = {
    anmeldungen: { ...searches.anmeldungen, select: { ...searches.anmeldungen.select, create: false as boolean, hint: hintFor('anmeldungen', 'anmeldungen', {"conditions": [{"field": "anmeldestatus", "op": "in", "value": ["angemeldet", "warteliste"]}], "mode": "all"} as PickWhere | null) } },
    anmeldungen2: { ...searches.anmeldungen2, select: { ...searches.anmeldungen2.select, create: false as boolean, hint: hintFor('anmeldungen2', 'anmeldungen', {"conditions": [{"field": "anmeldestatus", "op": "in", "value": ["angemeldet", "warteliste"]}], "mode": "all"} as PickWhere | null) } },
  };

  const anmeldungen2Filled = hasValues(anmeldungen2);
  const plan: PlanStep[] = [
    {
      key: 'anmeldungen', entity: 'anmeldungen', form: anmeldungen,
      updates: () => anmeldungenTargetId ?? undefined,
      // the review names the record this step changes; "Ändern" leads back to its pick
      target: () => anmeldungenTargetId
        ? { key: 'target:anmeldungen', label: entityLabel('anmeldungen'), value: picks.anmeldungen.labelOf(anmeldungenTargetId) ?? anmeldungenTargetId, step: steps.anmeldungen }
        : undefined,
      values: (): FormValues => ({
        anmeldestatus: policyFixedValue('anmeldungen', 'anmeldestatus') ?? "storniert",
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('anmeldungen', 'anmeldestatus', policyFixedValue('anmeldungen', 'anmeldestatus') ?? "storniert")],
    },
    ...(anmeldungen2Filled ? [{
      key: 'anmeldungen2', entity: 'anmeldungen', form: anmeldungen2, primary: true,
      updates: () => anmeldungen2TargetId ?? undefined,
      // the review names the record this step changes; "Ändern" leads back to its pick
      target: () => anmeldungen2TargetId
        ? { key: 'target:anmeldungen2', label: entityLabel('anmeldungen'), value: picks.anmeldungen2.labelOf(anmeldungen2TargetId) ?? anmeldungen2TargetId, step: steps.anmeldungen2 }
        : undefined,
      values: (): FormValues => ({
        anmeldestatus: policyFixedValue('anmeldungen', 'anmeldestatus') ?? "angemeldet",
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('anmeldungen', 'anmeldestatus', policyFixedValue('anmeldungen', 'anmeldestatus') ?? "angemeldet")],

      // the planner's assumptions that first act here — shown once with „Passt“ / „ändern“
      notices: () => [{"assumed": "die Anmeldung mit dem \u00e4ltesten Anmeldedatum", "id": "nachruecken-warteliste", "question": "Wer r\u00fcckt bei Stornierung von der Warteliste nach?"}],
    } as PlanStep] : []),
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'anmeldung-stornieren' });

  /** The record(s) this flow CHANGES: picked through {...flow.picks.<entity>.select} {...flow.pick('<entity>')};
   *  picking prefills the form with the record's current values, and the plan step updates that record. */
  const targets = {
    anmeldungen: {
      selectedId: anmeldungenTargetId,
      onSelect: (id: string) => {
        setAnmeldungenTargetId(id);
        const rec = picks.anmeldungen.recordOf(id);
        if (rec) anmeldungen.reset({ });
      },
      get record(): JourneyRecord | undefined { return anmeldungenTargetId ? picks.anmeldungen.recordOf(anmeldungenTargetId) : undefined; },
    },
    anmeldungen2: {
      selectedId: anmeldungen2TargetId,
      onSelect: (id: string) => {
        setAnmeldungen2TargetId(id);
        const rec = picks.anmeldungen2.recordOf(id);
        if (rec) anmeldungen2.reset({ });
      },
      get record(): JourneyRecord | undefined { return anmeldungen2TargetId ? picks.anmeldungen2.recordOf(anmeldungen2TargetId) : undefined; },
    },
  };
  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: AnmeldungStornierenFieldKey) => {
    if (field in targets) {
      const t = targets[field as keyof typeof targets];
      return { selectedId: t.selectedId, onSelect: t.onSelect };
    }
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
  const pickMany = (field: AnmeldungStornierenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)))    && Object.entries(targets).every(([k, t]) => steps[k] !== n || !!t.selectedId);
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); setAnmeldungenTargetId(null); setAnmeldungen2TargetId(null); };

  return {
    slug: 'anmeldung-stornieren' as const,
    draftKey: 'anmeldung-stornieren' as const,
    entity: 'anmeldungen' as const,
    form: anmeldungen2,
    forms, formList, picks, submit, steps, targets,    reviewStep: ANMELDUNGSTORNIEREN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type AnmeldungStornierenFlow = ReturnType<typeof useAnmeldungStornierenFlow>;
