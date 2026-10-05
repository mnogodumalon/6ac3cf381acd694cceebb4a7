/**
 * Anmeldung stornieren — 4-Schritt-Wizard.
 * Steps: 1) Anmeldung auswählen → 2) Stornierung bestätigen → 3) Nachrücker von der Warteliste wählen (optional) → 4) Prüfen & ausführen.
 * Reads: anmeldungen (mitglied, kurs, anmeldedatum, anmeldestatus). Writes: anmeldungen (Status storniert; optional Status angemeldet).
 * Composes: IntentWizardShell, EntitySelectStep, StepNav, StatusBadge, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Checkbox } from '@/components/ui/checkbox';
import { StepNav } from '@/components/blocks/StepNav';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldDate, fieldLookup } from '@/lib/journey';
import { useAnmeldungStornierenFlow } from '@/lib/journey/flows/AnmeldungStornieren';
import { formatDate } from '@/lib/formatters';
import { tx } from '@/i18n';

export default function AnmeldungStornierenPage() {
  const [step, setStep] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const flow = useAnmeldungStornierenFlow({
    steps: { anmeldungen: 1, anmeldungen2: 3 },
    items: {
      anmeldungen: (r, ctx) => ({
        id: r.id,
        title: ctx.ref('mitglied') ?? tx('Ohne Mitglied'),
        subtitle: [ctx.ref('kurs'), formatDate(fieldDate(r, 'anmeldedatum') ?? undefined)].filter(Boolean).join(' · '),
        status: fieldLookup(r, 'anmeldestatus') ?? undefined,
      }),
      anmeldungen2: (r, ctx) => ({
        id: r.id,
        title: ctx.ref('mitglied') ?? tx('Ohne Mitglied'),
        subtitle: [ctx.ref('kurs'), formatDate(fieldDate(r, 'anmeldedatum') ?? undefined)].filter(Boolean).join(' · '),
        status: fieldLookup(r, 'anmeldestatus') ?? undefined,
      }),
    },
  });

  const pickedId = flow.forms.anmeldungen.get('_recordId') as string | undefined;
  const picked = flow.targets.anmeldungen.record;
  const pickedStatus = picked ? fieldLookup(picked, 'anmeldestatus') : null;
  const pickedRec = picked ?? (pickedId ? flow.picks.anmeldungen.recordOf(pickedId) : undefined);
  const pickedKurs = pickedRec ? flow.picks.anmeldungen.refLabel(pickedRec, 'kurs') : undefined;
  const pickedMitglied = pickedRec ? flow.picks.anmeldungen.refLabel(pickedRec, 'mitglied') : undefined;

  return (
    <IntentWizardShell
      title={tx('Anmeldung stornieren')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine Anmeldung stornieren und optional den ersten Platz auf der Warteliste nachrücken lassen.'),
        needs: [tx('Name des Mitglieds oder Kurses')],
      }}
    >
      <WizardStep label={tx('Anmeldung')} description={tx('Welche Anmeldung soll storniert werden?')}>
        <EntitySelectStep
          {...flow.picks.anmeldungen.select}
          {...flow.pick('anmeldungen')}
          avatar="initials"
          searchPlaceholder={tx('Anmeldung suchen …')}
        />
      </WizardStep>

      <WizardStep label={tx('Bestätigen')} description={tx('Prüfe, ob du die richtige Anmeldung stornierst.')}>
        {picked ? (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-4 space-y-2 overflow-hidden">
              <div className="font-medium truncate">{pickedMitglied ?? tx('Ohne Mitglied')}</div>
              <div className="text-sm text-muted-foreground truncate">{pickedKurs ?? tx('Ohne Kurs')}</div>
              <div className="text-sm text-muted-foreground">
                {tx('Angemeldet am')} {formatDate(fieldDate(picked, 'anmeldedatum') ?? undefined)}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>{tx('Aktueller Status')}:</span>
                <StatusBadge statusKey={pickedStatus?.key} label={pickedStatus?.label} />
                <span aria-hidden>→</span>
                <StatusBadge statusKey="storniert" label={tx('Storniert')} />
              </div>
            </div>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <Checkbox checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} />
              <span>{tx('Ich bestätige, dass diese Anmeldung storniert werden soll.')}</span>
            </label>
            <StepNav
              onBack={() => setStep(1)}
              onNext={() => (confirmed ? flow.validateStep(1) : tx('Bitte bestätige die Stornierung.'))}
              nextLabel={tx('Ja, stornieren')}
              nextStepLabel={tx('Nachrücker wählen')}
            />
          </div>
        ) : (
          <StepNav onBack={() => setStep(1)} nextDisabled>
            {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
          </StepNav>
        )}
      </WizardStep>

      <WizardStep
        label={tx('Nachrücker')}
        description={tx('Wähle die erste Anmeldung auf der Warteliste dieses Kurses, die nachrücken soll — oder überspringe den Schritt.')}
      >
        <div className="space-y-4">
          <EntitySelectStep
            {...flow.picks.anmeldungen2.select}
            {...flow.pick('anmeldungen2')}
            create={false}
            avatar="initials"
            searchPlaceholder={tx('Wartelisten-Anmeldung suchen …')}
            emptyText={tx('Keine Anmeldung gefunden, die nachrücken kann.')}
          />
          <StepNav onBack={() => setStep(2)} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Die Anmeldung wird storniert. Eine gewählte Wartelisten-Anmeldung wird auf „Angemeldet“ gesetzt.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          actions={{ copy: false, print: false }}
          next={[
            { label: tx('Weitere Anmeldung stornieren'), onClick: () => { flow.reset(); setConfirmed(false); setStep(1); } },
            { label: tx('Mitglied zu Kurs anmelden'), href: '#/intents/mitglied-zu-kurs-anmelden' },
            { label: tx('Zahlung erfassen'), href: '#/intents/zahlung-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
