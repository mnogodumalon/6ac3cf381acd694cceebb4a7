/**
 * Zahlung erfassen — 3-Schritt-Wizard.
 * Steps: 1) Anmeldung mit unbezahlter Kursgebühr wählen → 2) Bemerkung zur Zahlung → 3) Prüfen & speichern.
 * Reads: anmeldungen (Mitglied/Kurs-Namen über die Referenzen). Writes: anmeldungen (update: bezahlt, bemerkung).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Field } from '@/components/blocks/Field';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldDate, fieldLookup, formatFieldValue, labelOf } from '@/lib/journey';
import { useZahlungErfassenFlow } from '@/lib/journey/flows/ZahlungErfassen';
import { tx } from '@/i18n';

export default function ZahlungErfassenPage() {
  const [step, setStep] = useState(1);
  const flow = useZahlungErfassenFlow({
    steps: { anmeldungen: 1, bemerkung: 2 },
    items: {
      anmeldungen: (a, ctx) => {
        const datum = fieldDate(a, 'anmeldedatum');
        return {
          id: a.id,
          title: ctx.ref('mitglied') ?? tx('Ohne Mitglied'),
          subtitle: [ctx.ref('kurs'), datum ? formatFieldValue('anmeldungen', 'anmeldedatum', datum) : null]
            .filter(Boolean)
            .join(' · '),
          status: fieldLookup(a, 'anmeldestatus') ?? undefined,
        };
      },
    },
  });

  return (
    <IntentWizardShell
      title={tx('Zahlung erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Vermerke, dass die Kursgebühr einer Anmeldung eingegangen ist.'),
        needs: [tx('Name des Mitglieds oder Kurs'), tx('Optional eine Notiz zur Zahlung')],
      }}
    >
      <WizardStep label={tx('Anmeldung')} description={tx('Wähle die Anmeldung, für die die Kursgebühr eingegangen ist.')}>
        <Field form={flow.forms.anmeldungen} name="anmeldungen" label={tx('Anmeldung')} hideLabel>
        <EntitySelectStep
          {...flow.picks.anmeldungen.select}
          {...flow.pick('anmeldungen')}
          avatar="initials"
          searchPlaceholder={tx('Anmeldung suchen …')}
          emptyText={tx('Alle Anmeldungen sind bezahlt. Neue Anmeldungen legst du im Ablauf „Mitglied zu Kurs anmelden“ an.')}
        />
        </Field>
        <StepNav onNext={() => flow.validateStep(1)} nextStepLabel={tx('Weiter')} />
      </WizardStep>
      <WizardStep label={tx('Zahlung')} description={tx('Notiere bei Bedarf, wie oder wann bezahlt wurde.')} needs={['anmeldungen']}>
        <div className="space-y-4">
          <Bound form={flow.forms.anmeldungen} name="bemerkung" rows={3} hint={tx('z. B. Überweisung vom 01.10.')} />
          <StepNav onBack={() => setStep(1)} onNext={() => flow.validateStep(2)} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'bezahlt', label: labelOf('anmeldungen', 'bezahlt'), value: tx('Ja') }]}
            whatHappensNext={tx('Die Anmeldung wird als bezahlt markiert.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          facts={[{ label: labelOf('anmeldungen', 'bezahlt'), value: tx('Ja') }]}
          next={[
            { label: tx('Mitglied zu Kurs anmelden'), href: '#/intents/mitglied-zu-kurs-anmelden' },
            { label: tx('Anmeldung stornieren'), href: '#/intents/anmeldung-stornieren' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
