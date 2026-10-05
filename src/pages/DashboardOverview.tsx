import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { IconPlus, IconUsers, IconCalendarEvent, IconSchool } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import type { EnrichedAnmeldungen } from '@/types/enriched';
import type { Anmeldungen } from '@/types/app';
import { lookupOption } from '@/types/app';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { tx, dateFnsLocale, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { Button } from '@/components/ui/button';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatCard, StatCardRow } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { CalendarWidget, type CalendarEvent } from '@/components/widgets/CalendarWidget';
import { ChartWidget, type ChartRow } from '@/components/widgets/ChartWidget';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { mitglieder, kurse, anmeldungen, setAnmeldungen, fetchAll } = data;
  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type !== 'anmeldungen') return undefined;
      const a = top.record;
      if (a.fields.anmeldestatus?.key === 'warteliste') return { label: tx('Nachrücken lassen'), onClick: () => promote(a) };
      if (a.fields.anmeldestatus?.key === 'angemeldet' && !a.fields.bezahlt) return { label: tx('Als bezahlt markieren'), onClick: () => markPaid(a) };
      return undefined;
    },
  });
  const enrichedAnmeldungen: EnrichedAnmeldungen[] = crud.enriched.anmeldungen;
  const clock = useClock();
  const [onlyOpen, setOnlyOpen] = useState(false);

  // --- shared write paths (list actions + overlay footer) ---
  const patchAnmeldung = (a: Anmeldungen, patch: Partial<Anmeldungen['fields']>, apiPatch: Record<string, unknown>, msg: string) => {
    const before = a.fields;
    setAnmeldungen(prev => prev.map(r => r.record_id === a.record_id ? { ...r, fields: { ...r.fields, ...patch } } : r));
    LivingAppsService.updateAnmeldungenEntry(a.record_id, apiPatch).catch(() => fetchAll());
    undoToast(msg, () => {
      setAnmeldungen(prev => prev.map(r => r.record_id === a.record_id ? { ...r, fields: before } : r));
      const back: Record<string, unknown> = {};
      for (const k of Object.keys(apiPatch)) back[k] = (before as Record<string, unknown>)[k] ?? null;
      LivingAppsService.updateAnmeldungenEntry(a.record_id, back).catch(() => fetchAll());
    });
  };
  const nameOf = (a: Anmeldungen) => enrichedAnmeldungen.find(e => e.record_id === a.record_id)?.mitgliedName || tx('Mitglied');
  const markPaid = (a: Anmeldungen) =>
    patchAnmeldung(a, { bezahlt: true }, { bezahlt: true }, tx`${nameOf(a)} — als bezahlt markiert`);
  const promote = (a: Anmeldungen) =>
    patchAnmeldung(
      a,
      { anmeldestatus: lookupOption('anmeldungen', 'anmeldestatus', 'angemeldet') },
      { anmeldestatus: 'angemeldet' },
      tx`${nameOf(a)} — nachgerückt`,
    );

  // --- derived data ---
  const belegt = useMemo(() => {
    const m = new Map<string, number>();
    anmeldungen.forEach(a => {
      if (a.fields.anmeldestatus?.key !== 'angemeldet') return;
      const id = extractRecordId(a.fields.kurs);
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    });
    return m;
  }, [anmeldungen]);
  const wartend = useMemo(() => {
    const m = new Map<string, number>();
    anmeldungen.forEach(a => {
      if (a.fields.anmeldestatus?.key !== 'warteliste') return;
      const id = extractRecordId(a.fields.kurs);
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    });
    return m;
  }, [anmeldungen]);

  const offeneKurse = kurse.filter(k => k.fields.kursstatus?.key === 'offen');
  const aktive = mitglieder.filter(m => m.fields.mitgliedsstatus?.key === 'aktiv');
  const kapazitaet = offeneKurse.reduce((s, k) => s + (k.fields.max_teilnehmer ?? 0), 0);
  const belegtOffen = offeneKurse.reduce((s, k) => s + (belegt.get(k.record_id) ?? 0), 0);

  const unbezahlt = enrichedAnmeldungen
    .filter(a => a.fields.anmeldestatus?.key === 'angemeldet' && !a.fields.bezahlt)
    .sort((a, b) => (a.fields.anmeldedatum ?? '').localeCompare(b.fields.anmeldedatum ?? ''));
  const warteliste = enrichedAnmeldungen
    .filter(a => a.fields.anmeldestatus?.key === 'warteliste')
    .sort((a, b) => (a.fields.anmeldedatum ?? '').localeCompare(b.fields.anmeldedatum ?? ''));

  const events: CalendarEvent[] = kurse
    .filter(k => k.fields.startdatum && (!onlyOpen || k.fields.kursstatus?.key === 'offen'))
    .map(k => {
      const n = belegt.get(k.record_id) ?? 0;
      const max = k.fields.max_teilnehmer;
      const w = wartend.get(k.record_id) ?? 0;
      const st = k.fields.kursstatus?.key;
      const voll = max != null && n >= max;
      return {
        id: `kurs:${k.record_id}`,
        start: (k.fields.startdatum ?? '').slice(0, 16),
        title: k.fields.kursname ?? '—',
        subtitle: [
          max != null ? `${n}/${max}` : `${n}`,
          w > 0 ? tx`${w} auf Warteliste` : '',
          k.fields.kursstatus?.label ?? '',
        ].filter(Boolean).join(' · '),
        tone: st === 'abgesagt' ? 'destructive' : st === 'abgeschlossen' ? 'default' : voll ? 'warning' : st === 'offen' ? 'success' : 'primary',
      } as CalendarEvent;
    });

  const chartRows = useMemo<ChartRow<EnrichedAnmeldungen>[]>(
    () => enrichedAnmeldungen
      .filter(a => a.fields.anmeldestatus?.key !== 'storniert')
      .map(a => ({ id: `anmeldung:${a.record_id}`, data: a })),
    [enrichedAnmeldungen],
  );

  const openAnmeldung = (id: string) => {
    const rec = anmeldungen.find(a => a.record_id === id);
    if (rec) crud.anmeldungen.openDetail(rec);
  };

  // --- header context line ---
  const naechster = kurse
    .filter(k => k.fields.startdatum && k.fields.startdatum.slice(0, 16) >= format(clock, "yyyy-MM-dd'T'HH:mm") && k.fields.kursstatus?.key !== 'abgesagt')
    .sort((a, b) => (a.fields.startdatum ?? '').localeCompare(b.fields.startdatum ?? ''))[0];
  const unbezahltNamen = namen(unbezahlt.map(a => a.mitgliedName));
  const wartelisteNamen = namen(warteliste.map(a => a.mitgliedName));
  let context: string;
  if (unbezahlt.length > 0) {
    context = tx`Bei ${unbezahltNamen} steht die Kursgebühr noch aus.`;
  } else if (warteliste.length > 0) {
    context = tx`Auf der Warteliste: ${wartelisteNamen}.`;
  } else if (naechster) {
    const kn = naechster.fields.kursname ?? '';
    const wann = formatDate(naechster.fields.startdatum);
    context = tx`Als Nächstes startet ${kn} am ${wann}.`;
  } else {
    context = tx`Alles erledigt — keine offenen Zahlungen oder Wartelisten.`;
  }

  const newKurs = () => crud.kurse.openCreate({ kursstatus: 'geplant' });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground">{context}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {crud.anmeldungen.canWrite && (
            <Button size="sm" onClick={() => crud.anmeldungen.openCreate({ anmeldestatus: 'angemeldet', anmeldedatum: format(clock, 'yyyy-MM-dd') })}>
              <IconPlus size={16} className="shrink-0" />
              <span>{tx('Anmeldung')}</span>
            </Button>
          )}
          {crud.kurse.canWrite && (
            <Button size="sm" variant="outline" onClick={newKurs}>
              <IconPlus size={16} className="shrink-0" />
              <span>{tx('Kurs')}</span>
            </Button>
          )}
        </div>
      </div>

      <DashboardGrid
        variant="split"
        hero={kurse.length === 0 && crud.kurse.canWrite ? (
          <HeroBanner icon={<IconSchool size={18} />} action={{ label: tx('Ersten Kurs anlegen'), onClick: newKurs }}>
            {tx('Noch kein Kurs vorhanden — lege deinen ersten Kurs an, dann können sich Mitglieder anmelden.')}
          </HeroBanner>
        ) : undefined}
        kpis={
          <StatCardRow>
            <StatCard
              title={tx('Offene Kurse')}
              value={offeneKurse.length}
              description={onlyOpen ? tx('Nur offene Kurse im Kalender') : tx('Antippen zum Filtern')}
              icon={<IconCalendarEvent size={18} className="text-muted-foreground" />}
              onClick={() => setOnlyOpen(v => !v)}
              active={onlyOpen}
            />
            <StatCard
              title={tx('Freie Plätze')}
              value={Math.max(kapazitaet - belegtOffen, 0)}
              description={tx`${belegtOffen} von ${kapazitaet} Plätzen belegt`}
              icon={<IconUsers size={18} className="text-muted-foreground" />}
              tone={kapazitaet > 0 && belegtOffen >= kapazitaet ? 'warning' : 'default'}
            />
            <StatCard
              title={tx('Aktive Mitglieder')}
              value={aktive.length}
              description={tx`von ${mitglieder.length} Mitgliedern`}
              icon={<IconUsers size={18} className="text-muted-foreground" />}
            />
          </StatCardRow>
        }
        aside={
          <>
            <WorkList
              title={tx('Gebühr offen')}
              items={unbezahlt.map(a => ({
                id: a.record_id,
                title: a.mitgliedName || '—',
                secondLine: (
                  <>
                    <span className="font-medium text-amber-600">{tx('Unbezahlt')}</span>
                    <span className="text-muted-foreground"> · {a.kursName}</span>
                  </>
                ),
                action: { label: tx('Bezahlt'), onClick: () => markPaid(a) },
              }))}
              onItemClick={openAnmeldung}
              max={5}
              empty={{ text: tx('Alle Kursgebühren sind bezahlt.') }}
            />
            <WorkList
              title={appLabel('anmeldungen') + ' · ' + tx('Warteliste')}
              items={warteliste.map(a => {
                const kid = extractRecordId(a.fields.kurs);
                const kurs = kid ? data.kurseMap.get(kid) : undefined;
                const max = kurs?.fields.max_teilnehmer;
                const frei = kid != null && (max == null || (belegt.get(kid) ?? 0) < max);
                return {
                  id: a.record_id,
                  title: a.mitgliedName || '—',
                  secondLine: (
                    <>
                      <span className="font-medium text-primary">{frei ? tx('Platz frei') : tx('Kurs voll')}</span>
                      <span className="text-muted-foreground"> · {a.kursName}</span>
                    </>
                  ),
                  action: frei ? { label: tx('Nachrücken'), onClick: () => promote(a) } : undefined,
                };
              })}
              onItemClick={openAnmeldung}
              max={5}
              empty={{ text: tx('Niemand wartet auf einen Platz.') }}
            />
            <ChartWidget<EnrichedAnmeldungen>
              title={tx('Anmeldungen pro Kurs')}
              rows={chartRows}
              dimension={{ kind: 'category', accessor: r => r.data.kursName, label: tx('Kurs') }}
            />
          </>
        }
        primary={
          <CalendarWidget
            events={events}
            defaultView="agenda"
            views={['agenda', 'month', 'week']}
            locale={dateFnsLocale()}
            onEventClick={ev => {
              const rec = kurse.find(k => k.record_id === ev.id.split(':')[1]);
              if (rec) crud.kurse.openDetail(rec);
            }}
            onEmptyClick={crud.kurse.canWrite ? (d => crud.kurse.openCreate({ kursstatus: 'geplant', startdatum: format(d, "yyyy-MM-dd'T'HH:mm") })) : undefined}
          />
        }
      />
      {crud.surfaces}
    </div>
  );
}
