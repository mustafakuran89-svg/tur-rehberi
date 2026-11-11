// İçe aktarma hattı: JSON çözme → şema doğrulaması → etap süreleri → kural denetimi.
import { parsePlanText, validatePlan, type SchemaProblem } from './validate';
import { fillLegDurations } from './normalize';
import { checkPlan, type RuleWarning } from './rules';
import type { Trip } from './types';
import { isBackup } from '../lib/store';
import { isShare } from '../lib/share';
import type { UserState } from '../lib/userState';

export type ImportResult =
  | { kind: 'error'; message: string; problems: SchemaProblem[] }
  | { kind: 'trips'; items: { trip: Trip; warnings: RuleWarning[]; filled: number }[]; fromBackup: boolean; sharedUser?: Partial<UserState> };

export function processImportText(text: string): ImportResult {
  const parsed = parsePlanText(text);
  if (!parsed.ok) return { kind: 'error', message: parsed.message, problems: [] };
  return processImportData(parsed.data);
}

export function processImportData(data: unknown): ImportResult {
  const fromBackup = isBackup(data);
  const shared = isShare(data) ? data : null;
  const candidates: unknown[] = fromBackup ? (data as { trips: unknown[] }).trips : shared ? [shared.trip] : [data];
  const items: { trip: Trip; warnings: RuleWarning[]; filled: number }[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const v = validatePlan(candidates[i]);
    if (!v.ok) {
      const prefix = fromBackup ? `${i + 1}. gezi › ` : '';
      return { kind: 'error', message: '', problems: v.problems.map((p) => ({ ...p, path: prefix + p.path })) };
    }
    const { trip, filled } = fillLegDurations(v.trip);
    items.push({ trip, warnings: checkPlan(trip), filled });
  }
  return { kind: 'trips', items, fromBackup, sharedUser: shared?.user };
}
