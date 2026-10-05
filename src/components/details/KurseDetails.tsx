import type { Kurse, Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface KurseDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Kurse;
  /** 1:N „Anmeldungen" (kurs): VOLLE Liste — der Block filtert auf diesen Record. */
  anmeldungenList: Anmeldungen[];
  /** Zeilen-Klick → overlay.push auf das Anmeldungen-Detail (nie der Edit-Dialog). */
  onOpenAnmeldungen: (record: Anmeldungen) => void;
  /** Kontextuelles „+": öffnet den Anmeldungen-Dialog mit diesem Record vorgesetzt. */
  onAddAnmeldungen?: () => void;
}

export function KurseDetails({
  record,
  anmeldungenList,
  onOpenAnmeldungen,
  onAddAnmeldungen,
}: KurseDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('kurse', 'kursname')} value={record.fields.kursname} format="text" />
        <RecordField label={fieldLabel('kurse', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('kurse', 'kursleiter_vorname')} value={record.fields.kursleiter_vorname} format="text" />
        <RecordField label={fieldLabel('kurse', 'kursleiter_nachname')} value={record.fields.kursleiter_nachname} format="text" />
        <RecordField label={fieldLabel('kurse', 'startdatum')} value={record.fields.startdatum} format="datetime" />
        <RecordField label={fieldLabel('kurse', 'kursort')} value={record.fields.kursort} format="text" />
        <RecordField label={fieldLabel('kurse', 'max_teilnehmer')} value={record.fields.max_teilnehmer} format="text" />
        <RecordField label={fieldLabel('kurse', 'kursgebuehr')} value={record.fields.kursgebuehr} format="text" />
        <RecordField label={fieldLabel('kurse', 'kursstatus')} value={record.fields.kursstatus} format="pill" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('anmeldungen')}
        items={anmeldungenList.filter(r => extractRecordId(r.fields.kurs) === record.record_id)}
        map={r => ({ name: appLabel('anmeldungen'), meta: r.fields.anmeldedatum })}
        onOpen={onOpenAnmeldungen}
        onAdd={onAddAnmeldungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.KURSE} recordId={record.record_id} readOnly={!perms.canWrite('kurse')} />
    </>
  );
}
