// Gezi günlüğü: durak notları, görüldü işaretleri ve mekan puanları düz metin özet olarak.
import type { Trip } from '../plan/types';
import { stopsInOrder } from '../plan/normalize';
import { eventKey, stopKey, venueKey, type UserState } from './userState';
import { formatDate, weekdayName } from './format';
import { tr } from '../i18n/tr';

export function journalText(t: Trip, us: UserState | undefined): string {
  const L: string[] = [tr.journal.heading(t.title), `${formatDate(t.startDate)} – ${formatDate(t.endDate)}`, ''];
  let any = false;
  t.days.forEach((d, i) => {
    const lines: string[] = [];
    for (const s of stopsInOrder(d)) {
      const k = stopKey(s);
      const note = us?.notes[k];
      const seen = !!us?.visited[k];
      if (!note && !seen) continue;
      lines.push(`${s.order}. ${s.name}${seen ? ` (${tr.journal.seen})` : ''}`);
      if (note) lines.push(`   ${note.replace(/\n/g, '\n   ')}`);
    }
    const venues = [...d.breakfast, ...(d.lunch ? [d.lunch.main, ...(d.lunch.backup ? [d.lunch.backup] : [])] : []), ...d.dinner, ...d.snacks];
    for (const v of venues) {
      const k = venueKey(v);
      const r = us?.ratings[k];
      const note = us?.notes[k];
      if (!r && !note) continue;
      lines.push(`${v.code} ${v.name}${r ? ` — ${'★'.repeat(r)}${'☆'.repeat(5 - r)} (${r}/5)` : ''}`);
      if (note) lines.push(`   ${note}`);
    }
    for (const e of d.eveningEvents ?? []) if (us?.going[eventKey(e)]) lines.push(`🎟 ${e.title}${e.startTime ? ` · ${e.startTime}` : ''}`);
    if (!lines.length) return;
    any = true;
    L.push(`${tr.day.label(i + 1)} · ${formatDate(d.date)} ${weekdayName(d.date)} · ${d.title}`, ...lines, '');
  });
  if (!any) L.push(tr.journal.noEntries);
  return L.join('\n');
}
