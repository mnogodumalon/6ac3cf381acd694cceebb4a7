import type { Anmeldungen } from './app';

export type EnrichedAnmeldungen = Anmeldungen & {
  mitgliedName: string;
  kursName: string;
};
