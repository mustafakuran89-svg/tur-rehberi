import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installErrorCapture, addLog } from './lib/log';
import { ensureSample, requestPersist } from './lib/store';
import { applyTheme, getSettings } from './lib/settings';
import { App } from './App';
import './theme.css';
import './styles.css';

installErrorCapture();
applyTheme(getSettings().theme);

// Service worker: uygulama kabuğu önbelleğe alınır; yeni sürüm yayımlanınca kendini günceller.
// Kayıtlı geziler IndexedDB'de durduğu için güncellemede silinmez.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true, onRegisterError: (e) => addLog('info', `SW kaydı: ${String(e)}`) }))
    .catch((e) => addLog('info', `SW yüklenemedi: ${String(e)}`));
}

ensureSample().catch((e) => addLog('error', `Örnek gezi yüklenemedi: ${String(e)}`));
requestPersist().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
