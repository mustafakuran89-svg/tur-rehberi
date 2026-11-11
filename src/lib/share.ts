// Paylaşım dosyası: plan + kullanıcı notları/işaretleri tek dosyada. Karşı taraf "Plan içe aktar"
// ile açar. YouTube anahtarı ayarlardadır; bu dosyaya hiçbir koşulda girmez.
import { getTrip, putTrip, saveImported } from './store';
import { getUserState, normalizeUserState, putUserState, type UserState } from './userState';
import type { Trip } from '../plan/types';

export const SHARE_FORMAT = 'tur-rehberi-paylasim';

export interface ShareFile {
  format: typeof SHARE_FORMAT;
  createdAt: string;
  trip: Trip;
  user: Omit<UserState, 'tripId'>;
}

export async function makeShare(key: string): Promise<ShareFile | null> {
  const rec = await getTrip(key);
  if (!rec) return null;
  const { tripId: _omit, ...user } = await getUserState(key);
  void _omit;
  return { format: SHARE_FORMAT, createdAt: new Date().toISOString(), trip: rec.trip, user };
}

export function isShare(x: unknown): x is ShareFile {
  return !!x && typeof x === 'object' && (x as ShareFile).format === SHARE_FORMAT && typeof (x as ShareFile).trip === 'object';
}

/** Paylaşımla gelen kullanıcı durumunu gezi kimliğiyle kaydeder (mevcut durumun üzerine yazar). */
export async function saveSharedUser(tripId: string, user: Partial<UserState>): Promise<void> {
  await putUserState(normalizeUserState({ ...user, tripId }));
}

/** Paylaşım menüsüyle gönderir; desteklenmiyorsa dosyayı indirir. */
export async function shareFile(filename: string, data: unknown, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const text = JSON.stringify(data, null, 2);
  const file = new File([text], filename, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}

export { putTrip, saveImported };
