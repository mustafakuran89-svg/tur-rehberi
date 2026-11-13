import { tr } from '../i18n/tr';
import { updateUserState, type SavedPlace, type UserState } from '../lib/userState';

/** Tek dokunuşla kaydet (Kaydettiklerim). Kayıt planın anlık görüntüsünü tutar. */
export function SaveButton({ tripId, us, place }: { tripId: string; us: UserState | undefined; place: Omit<SavedPlace, 'savedAt'> }) {
  const on = !!us?.saved?.[place.key];
  return (
    <button
      className={`btn btn-small ${on ? 'btn-primary' : 'btn-ghost'}`}
      aria-pressed={on}
      data-testid="save"
      onClick={() =>
        updateUserState(tripId, (u) => {
          const saved = { ...(u.saved ?? {}) };
          if (saved[place.key]) delete saved[place.key];
          else saved[place.key] = { ...place, savedAt: new Date().toISOString() };
          return { ...u, saved };
        })
      }
    >
      {on ? `★ ${tr.saved.unsave}` : `☆ ${tr.saved.save}`}
    </button>
  );
}
