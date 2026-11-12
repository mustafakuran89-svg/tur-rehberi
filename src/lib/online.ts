import { useSyncExternalStore } from 'react';

/** Bağlantı durumu (tarayıcının online/offline olayları). Çevrimdışıyken video oynatıcısı açılmaz. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (l) => {
      window.addEventListener('online', l);
      window.addEventListener('offline', l);
      return () => {
        window.removeEventListener('online', l);
        window.removeEventListener('offline', l);
      };
    },
    () => navigator.onLine,
  );
}
