/**
 * Mitglied zu Kurs anmelden — 4-Schritt-Wizard.
 * Steps: 1) Mitglied wählen → 2) Kurs wählen → 3) Doppel-Anmeldung & Plätze prüfen, Bemerkung → 4) Prüfen & anmelden.
 * Reads: mitglieder, kurse, anmeldungen (Zähler für Duplikat-Check und Kursauslastung).
 * Writes: anmeldungen (Status automatisch „angemeldet“ oder „Warteliste“ bei vollem Kurs).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, BudgetTracker, StepNav, SummaryStep, SuccessStep.
 */
import { useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { BudgetTracker } from '@/components/blocks/BudgetTracker';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import {
  fieldText, fieldDate, fieldNumber, fieldRef, fieldLookup,
  useRecordCount, combineFilters, refFilter,
} from '@/lib/journey';
import { useMitgliedZuKursAnmeldenFlow } from '@/lib/journey/flows/MitgliedZuKursAnmelden';
import { tx } from '@/i18n';

const ACTIVE = "r.v_anmeldestatus in ['angemeldet', 'warteliste']";
const isActive = (key?: string) => key === 'angemeldet' || key === 'warteliste';

function dateLabel(iso: string | null): string {
  if (!iso) return '';
  try {
    return format(parseISO(iso), iso.length > 10 ? 'dd.MM.yyyy HH:mm' : 'dd.MM.yyyy');
  } catch {
    return iso;
  }
}

export default function MitgliedZuKursAnmeldenPage() {
  const [step, setStep] = useState(1);
  // The plan's rule for the status reads the live capacity numbers through this ref.
  const capacity = useRef<{ belegt: number | null; max: number | null }>({ belegt: null, max: null });

  const flow = useMitgliedZuKursAnmeldenFlow({
    steps: { mitglied: 1, kurs: 2, bemerkung: 3 },
    items: {
      mitglied: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: fieldText(r, 'email'),
      }),
      kurs: r => ({
        id: r.id,
        title: fieldText(r, 'kursname'),
        subtitle: [dateLabel(fieldDate(r, 'startdatum')), fieldText(r, 'kursort')].filter(Boolean).join(' · '),
        stats: fieldNumber(r, 'max_teilnehmer') != null
          ? [{ label: tx('Plätze'), value: fieldNumber(r, 'max_teilnehmer') as number }]
          : undefined,
      }),
    },
    compute: {
      anmeldestatus: () => {
        const { belegt, max } = capacity.current;
        return max != null && belegt != null && belegt >= max ? 'warteliste' : 'angemeldet';
      },
    },
  });

  const f = flow.forms.anmeldungen;
  const kursId = (f.get('kurs') as string | null) || undefined;
  const mitgliedId = (f.get('mitglied') as string | null) || undefined;
  const kursRecord = kursId ? flow.picks.kurs.recordOf(kursId) : undefined;
  const maxTeilnehmer = kursRecord ? fieldNumber(kursRecord, 'max_teilnehmer') : null;

  const belegt = useRecordCount(flow.port, 'anmeldungen', {
    filter: kursId ? combineFilters(refFilter('kurs', kursId), tx('r.v_anmeldestatus == \'angemeldet\'')) : undefined,
    where: a => fieldRef(a, 'kurs') === kursId && fieldLookup(a, 'anmeldestatus')?.key === 'angemeldet',
    enabled: Boolean(kursId),
  });
  const doppelt = useRecordCount(flow.port, 'anmeldungen', {
    filter: kursId && mitgliedId
      ? combineFilters(refFilter('kurs', kursId), refFilter('mitglied', mitgliedId), ACTIVE)
      : undefined,
    where: a => fieldRef(a, 'kurs') === kursId && fieldRef(a, 'mitglied') === mitgliedId
      && isActive(fieldLookup(a, 'anmeldestatus')?.key),
    enabled: Boolean(kursId && mitgliedId),
  });

  capacity.current = { belegt: belegt.count, max: maxTeilnehmer };
  const voll = maxTeilnehmer != null && belegt.count != null && belegt.count >= maxTeilnehmer;
  const bereitsAngemeldet = (doppelt.count ?? 0) > 0;

  const checkNext = () => {
    if (!flow.validateStep(3)) return false;
    if (doppelt.loading || doppelt.count == null) return tx('Die Prüfung läuft noch — einen Moment bitte.');
    if (bereitsAngemeldet) return tx('Dieses Mitglied ist für den Kurs bereits angemeldet.');
    return true;
  };

  return (
    <IntentWizardShell
      title={tx('Mitglied zu Kurs anmelden')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Ein Mitglied für einen Kurs anmelden, bei vollem Kurs mit Warteliste.'),
        needs: [tx('Name des Mitglieds'), tx('Kurs')],
      }}
    >
      <WizardStep label={tx('Mitglied')} description={tx('Welches aktive Mitglied soll angemeldet werden?')}>
        <EntitySelectStep
          {...flow.picks.mitglied.select}
          {...flow.pick('mitglied')}
          avatar="initials"
          searchPlaceholder={tx('Name oder E-Mail …')}
        />
      </WizardStep>

      <WizardStep label={tx('Kurs')} description={tx('Für welchen offenen Kurs?')} needs={['mitglied']}>
        <EntitySelectStep
          {...flow.picks.kurs.select}
          {...flow.pick('kurs')}
          avatar="none"
          searchPlaceholder={tx('Kursname …')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Prüfung')}
        description={tx('Wir prüfen, ob das Mitglied schon angemeldet ist und ob noch Plätze frei sind.')}
        needs={['mitglied', 'kurs']}
      >
        <div className="space-y-4">
          {bereitsAngemeldet ? (
            <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {tx('Dieses Mitglied ist für den Kurs bereits angemeldet.')}
            </p>
          ) : doppelt.count === 0 ? (
            <p className="rounded-xl bg-secondary p-3 text-sm">{tx('Noch keine Anmeldung für diesen Kurs — alles in Ordnung.')}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{tx('Prüfe vorhandene Anmeldungen …')}</p>
          )}
          {maxTeilnehmer != null && belegt.count != null && (
            <BudgetTracker
              format="count"
              unit={tx('Plätze')}
              budget={maxTeilnehmer}
              booked={belegt.count}
              label={tx('Kursauslastung')}
            />
          )}
          {voll && (
            <p className="rounded-xl bg-secondary p-3 text-sm">
              {tx('Der Kurs ist voll — die Anmeldung kommt auf die Warteliste.')}
            </p>
          )}
          <Bound form={f} name="bemerkung" rows={3} />
          <StepNav onBack={() => setStep(2)} onNext={checkNext} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{
              key: 'anmeldestatus',
              label: tx('Status der Anmeldung'),
              value: voll ? tx('Warteliste') : tx('Angemeldet'),
            }]}
            whatHappensNext={tx('Die Anmeldung wird gespeichert; die Kursgebühr bleibt zunächst unbezahlt.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          restartLabel={tx('Weiteres Mitglied anmelden')}
          next={[
            { label: tx('Zahlung erfassen'), href: '#/intents/zahlung-erfassen' },
            { label: tx('Anmeldung stornieren'), href: '#/intents/anmeldung-stornieren' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
