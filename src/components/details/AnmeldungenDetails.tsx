import type { Anmeldungen, Mitglieder, Kurse } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface AnmeldungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Anmeldungen;
  /** N:1-Ziel „Mitglieder": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  mitgliederList: Mitglieder[];
  /** Klick auf die Mitglieder-Relation → overlay.push auf dessen Detail. */
  onOpenMitglieder?: (record: Mitglieder) => void;
  /** N:1-Ziel „Kurse": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kurseList: Kurse[];
  /** Klick auf die Kurse-Relation → overlay.push auf dessen Detail. */
  onOpenKurse?: (record: Kurse) => void;
}

export function AnmeldungenDetails({
  record,
  mitgliederList,
  onOpenMitglieder,
  kurseList,
  onOpenKurse,
}: AnmeldungenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const mitgliedTarget = mitgliederList.find(r => r.record_id === extractRecordId(record.fields.mitglied));
  const kursTarget = kurseList.find(r => r.record_id === extractRecordId(record.fields.kurs));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('anmeldungen', 'anmeldedatum')} value={record.fields.anmeldedatum} format="date" />
        <RecordField label={fieldLabel('anmeldungen', 'anmeldestatus')} value={record.fields.anmeldestatus} format="pill" />
        <RecordField label={fieldLabel('anmeldungen', 'bezahlt')} value={record.fields.bezahlt} format="bool" />
        <RecordField label={fieldLabel('anmeldungen', 'bemerkung')} value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('anmeldungen', 'mitglied')}
          name={mitgliedTarget?.fields.vorname ?? '—'}
          meta={[mitgliedTarget?.fields.email, mitgliedTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={mitgliedTarget && onOpenMitglieder ? () => onOpenMitglieder!(mitgliedTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('anmeldungen', 'kurs')}
          name={kursTarget?.fields.kursname ?? '—'}
          meta={[kursTarget?.fields.kursleiter_vorname, kursTarget?.fields.kursleiter_nachname].filter(Boolean).join(' · ') || undefined}
          onClick={kursTarget && onOpenKurse ? () => onOpenKurse!(kursTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ANMELDUNGEN} recordId={record.record_id} readOnly={!perms.canWrite('anmeldungen')} />
    </>
  );
}
