/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'mitglieder'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.mitglieder.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.mitglieder.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.mitglieder.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.mitglieder              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   mitglieder: vorname, nachname, geburtsdatum, email, telefon, strasse, hausnummer, plz, …  ·  ← anmeldungen (list + contextual +)
 *   kurse: kursname, beschreibung, kursleiter_vorname, kursleiter_nachname, startdatum, kursort, max_teilnehmer, kursgebuehr, …  ·  ← anmeldungen (list + contextual +)
 *   anmeldungen: mitglied, kurs, anmeldedatum, anmeldestatus, bezahlt, bemerkung  ·  → mitglieder · → kurse
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Mitglieder, Kurse, Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichAnmeldungen } from '@/lib/enrich';
import type { EnrichedAnmeldungen } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { MitgliederDialog, type MitgliederDialogDefaults } from '@/components/dialogs/MitgliederDialog';
import { MitgliederDetails } from '@/components/details/MitgliederDetails';
import { KurseDialog, type KurseDialogDefaults } from '@/components/dialogs/KurseDialog';
import { KurseDetails } from '@/components/details/KurseDetails';
import { AnmeldungenDialog, type AnmeldungenDialogDefaults } from '@/components/dialogs/AnmeldungenDialog';
import { AnmeldungenDetails } from '@/components/details/AnmeldungenDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'mitglieder'; record: Mitglieder }
  | { type: 'kurse'; record: Kurse }
  | { type: 'anmeldungen'; record: EnrichedAnmeldungen };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
  /** May the signed-in user create/change records of this list? (the
   *  platform's rights — show a „+ Neu“ only when true; openCreate/openEdit
   *  refuse with a notice otherwise). */
  canWrite: boolean;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  mitglieder: EntityCrudApi<Mitglieder, MitgliederDialogDefaults>;
  kurse: EntityCrudApi<Kurse, KurseDialogDefaults>;
  anmeldungen: EntityCrudApi<Anmeldungen, AnmeldungenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { mitglieder: Mitglieder[]; kurse: Kurse[]; anmeldungen: EnrichedAnmeldungen[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [mitgliederDialog, setMitgliederDialog] = useState<{ defaults?: MitgliederDialogDefaults; editing?: Mitglieder } | null>(null);
  const [kurseDialog, setKurseDialog] = useState<{ defaults?: KurseDialogDefaults; editing?: Kurse } | null>(null);
  const [anmeldungenDialog, setAnmeldungenDialog] = useState<{ defaults?: AnmeldungenDialogDefaults; editing?: Anmeldungen } | null>(null);
  const enrichedAnmeldungen = useMemo(() => enrichAnmeldungen(data.anmeldungen, { mitgliederMap: data.mitgliederMap, kurseMap: data.kurseMap }), [data.anmeldungen, data.mitgliederMap, data.kurseMap]);

  function detailMitglieder(record: Mitglieder, push = false) {
    const item: OverlayItem = { type: 'mitglieder', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitMitglieder(fields: Mitglieder['fields']) {
    const editing = mitgliederDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setMitglieder(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateMitgliederEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('mitglieder')} — ${t('crud_updated')}`, async () => {
        data.setMitglieder(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateMitgliederEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createMitgliederEntry(fields);
      undoToast(`${appLabel('mitglieder')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailKurse(record: Kurse, push = false) {
    const item: OverlayItem = { type: 'kurse', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKurse(fields: Kurse['fields']) {
    const editing = kurseDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKurse(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKurseEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kurse')} — ${t('crud_updated')}`, async () => {
        data.setKurse(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKurseEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createKurseEntry(fields);
      undoToast(`${appLabel('kurse')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAnmeldungen(record: Anmeldungen, push = false) {
    const rec = enrichedAnmeldungen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'anmeldungen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAnmeldungen(fields: Anmeldungen['fields']) {
    const editing = anmeldungenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAnmeldungen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAnmeldungenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('anmeldungen')} — ${t('crud_updated')}`, async () => {
        data.setAnmeldungen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAnmeldungenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAnmeldungenEntry(fields);
      undoToast(`${appLabel('anmeldungen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <MitgliederDialog
        open={mitgliederDialog !== null}
        onClose={() => setMitgliederDialog(null)}
        onSubmit={submitMitglieder}
        defaultValues={mitgliederDialog?.defaults}
        recordId={mitgliederDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Mitglieder']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Mitglieder']}
      />
      <KurseDialog
        open={kurseDialog !== null}
        onClose={() => setKurseDialog(null)}
        onSubmit={submitKurse}
        defaultValues={kurseDialog?.defaults}
        recordId={kurseDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Kurse']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kurse']}
      />
      <AnmeldungenDialog
        open={anmeldungenDialog !== null}
        onClose={() => setAnmeldungenDialog(null)}
        onSubmit={submitAnmeldungen}
        defaultValues={anmeldungenDialog?.defaults}
        recordId={anmeldungenDialog?.editing?.record_id}
        mitgliederList={data.mitglieder}
        kurseList={data.kurse}
        enablePhotoScan={AI_PHOTO_SCAN['Anmeldungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Anmeldungen']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'mitglieder') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('mitglieder')} subtitle={top.record.fields.geburtsdatum ? formatDate(top.record.fields.geburtsdatum) : undefined} />
                <MitgliederDetails
                  record={top.record}
                  anmeldungenList={data.anmeldungen}
                  onOpenAnmeldungen={(r) => detailAnmeldungen(r, true)}
                  onAddAnmeldungen={perms.canWrite('anmeldungen') ? () => setAnmeldungenDialog({ defaults: { mitglied: createRecordUrl(APP_IDS.MITGLIEDER, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'kurse') {
            return (
              <>
                <RecordHeader title={top.record.fields.kursname ?? appLabel('kurse')} subtitle={top.record.fields.startdatum ? formatDate(top.record.fields.startdatum) : undefined} />
                <KurseDetails
                  record={top.record}
                  anmeldungenList={data.anmeldungen}
                  onOpenAnmeldungen={(r) => detailAnmeldungen(r, true)}
                  onAddAnmeldungen={perms.canWrite('anmeldungen') ? () => setAnmeldungenDialog({ defaults: { kurs: createRecordUrl(APP_IDS.KURSE, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'anmeldungen') {
            return (
              <>
                <RecordHeader title={appLabel('anmeldungen')} subtitle={top.record.fields.anmeldedatum ? formatDate(top.record.fields.anmeldedatum) : undefined} />
                <AnmeldungenDetails
                  record={top.record}
                  mitgliederList={data.mitglieder}
                  onOpenMitglieder={(r) => detailMitglieder(r, true)}
                  kurseList={data.kurse}
                  onOpenKurse={(r) => detailKurse(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'mitglieder') return perms.canWrite('mitglieder');
          if (top.type === 'kurse') return perms.canWrite('kurse');
          if (top.type === 'anmeldungen') return perms.canWrite('anmeldungen');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'mitglieder') setMitgliederDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'kurse') setKurseDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'anmeldungen') setAnmeldungenDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    mitglieder: {
      openCreate: (defaults?: MitgliederDialogDefaults) => (perms.canWrite('mitglieder') ? setMitgliederDialog({ defaults }) : refuse()),
      openEdit: (record: Mitglieder) => (perms.canWrite('mitglieder') ? setMitgliederDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Mitglieder) => detailMitglieder(record, false),
      canWrite: perms.canWrite('mitglieder'),
    },
    kurse: {
      openCreate: (defaults?: KurseDialogDefaults) => (perms.canWrite('kurse') ? setKurseDialog({ defaults }) : refuse()),
      openEdit: (record: Kurse) => (perms.canWrite('kurse') ? setKurseDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Kurse) => detailKurse(record, false),
      canWrite: perms.canWrite('kurse'),
    },
    anmeldungen: {
      openCreate: (defaults?: AnmeldungenDialogDefaults) => (perms.canWrite('anmeldungen') ? setAnmeldungenDialog({ defaults }) : refuse()),
      openEdit: (record: Anmeldungen) => (perms.canWrite('anmeldungen') ? setAnmeldungenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Anmeldungen) => detailAnmeldungen(record, false),
      canWrite: perms.canWrite('anmeldungen'),
    },
    enriched: { mitglieder: data.mitglieder, kurse: data.kurse, anmeldungen: enrichedAnmeldungen },
  };
}
