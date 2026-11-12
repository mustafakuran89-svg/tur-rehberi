// Uygulama hangi ortamda çalışıyor: Ana Ekrana eklenmiş uygulama mı, Safari sekmesi mi?
// WebKit (webkit.org/blog/10218, 24.03.2020): Ana Ekrana eklenen web uygulaması Safari'nin
// parçası değildir, kendi kullanım sayacını tutar ve verisinin silinmesi beklenmez; Safari'de
// 7 gün kullanılmayan sitenin betikle yazılan verisi silinebilir. Hazırlık hangi ortamda
// yapıldıysa orada geçerlidir.
export type AppMode = 'home' | 'safari' | 'browser';

export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || !!window.matchMedia?.('(display-mode: standalone)').matches;
}

export function isAppleTouch(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function appMode(): AppMode {
  if (isStandalone()) return 'home';
  return isAppleTouch() ? 'safari' : 'browser';
}
