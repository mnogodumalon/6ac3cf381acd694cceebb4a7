import type { Mitglieder, Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface MitgliederDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Mitglieder;
  /** 1:N „Anmeldungen" (mitglied): VOLLE Liste — der Block filtert auf diesen Record. */
  anmeldungenList: Anmeldungen[];
  /** Zeilen-Klick → overlay.push auf das Anmeldungen-Detail (nie der Edit-Dialog). */
  onOpenAnmeldungen: (record: Anmeldungen) => void;
  /** Kontextuelles „+": öffnet den Anmeldungen-Dialog mit diesem Record vorgesetzt. */
  onAddAnmeldungen?: () => void;
}

export function MitgliederDetails({
  record,
  anmeldungenList,
  onOpenAnmeldungen,
  onAddAnmeldungen,
}: MitgliederDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('mitglieder', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('mitglieder', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('mitglieder', 'geburtsdatum')} value={record.fields.geburtsdatum} format="date" />
        <RecordField label={fieldLabel('mitglieder', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('mitglieder', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('mitglieder', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('mitglieder', 'hausnummer')} value={record.fields.hausnummer} format="text" />
        <RecordField label={fieldLabel('mitglieder', 'plz')} value={record.fields.plz} format="text" />
        <RecordField label={fieldLabel('mitglieder', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('mitglieder', 'eintrittsdatum')} value={record.fields.eintrittsdatum} format="date" />
        <RecordField label={fieldLabel('mitglieder', 'mitgliedsstatus')} value={record.fields.mitgliedsstatus} format="pill" />
        <RecordField label={fieldLabel('mitglieder', 'bemerkung')} value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('anmeldungen')}
        items={anmeldungenList.filter(r => extractRecordId(r.fields.mitglied) === record.record_id)}
        map={r => ({ name: appLabel('anmeldungen'), meta: r.fields.anmeldedatum })}
        onOpen={onOpenAnmeldungen}
        onAdd={onAddAnmeldungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.MITGLIEDER} recordId={record.record_id} readOnly={!perms.canWrite('mitglieder')} />
    </>
  );
}
