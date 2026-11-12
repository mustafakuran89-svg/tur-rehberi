// Rehber ağzı (Geliştirme 3, Aşama C.2): tur modunda uygulamanın kendi kurduğu cümleler.
// Bu cümleler bilgi eklemez: yalnızca plandaki adı, süreyi ve sırayı söyler. Her tür için birkaç
// değişke vardır; art arda aynı cümle söylenmez. Yer adlarına ek getirilmez (ses uyumu yanlış
// çıkmasın diye): "Geldik: Belvedere." biçimi kullanılır.

type Fn<A extends unknown[]> = (...a: A) => string;

const walk = (min: number | null) => (min ? ` Yürüyüş yaklaşık ${min} dakika.` : '');
const toward = (dir: string | null) => (dir ? ` Yönümüz ${dir}.` : '');

export const GUIDE = {
  arrival: [
    (name: string) => `Geldik: ${name}. Biraz soluklanın, anlatmaya başlıyorum.`,
    (name: string) => `İşte ${name}. Etrafınıza bir bakın, sonra size buranın hikayesini anlatayım.`,
    (name: string) => `Şimdi buradayız: ${name}. Hoş geldiniz.`,
    (name: string) => `${name}. Rahat bir yer bulun, birlikte bakalım.`,
  ] as Fn<[string]>[],
  next: [
    (name: string, dir: string | null, min: number | null) => `Sıradaki durağımız: ${name}.${toward(dir)}${walk(min)}`,
    (name: string, dir: string | null, min: number | null) => `Şimdi bir sonraki durağa geçiyoruz: ${name}.${walk(min)}${toward(dir)}`,
    (name: string, dir: string | null, min: number | null) => `Hazır olduğunuzda yola çıkalım. Gideceğimiz yer: ${name}.${toward(dir)}${walk(min)}`,
  ] as Fn<[string, string | null, number | null]>[],
  meal: [
    (meal: string, venue: string) => `${meal} zamanı yaklaşıyor. Planımızdaki yer: ${venue}.`,
    (meal: string, venue: string) => `Biraz sonra ${meal.toLocaleLowerCase('tr')} molası. Seçtiğimiz yer: ${venue}.`,
  ] as Fn<[string, string]>[],
  dayStart: [
    (dayNo: number, first: string, count: number) => `Günaydın. ${dayNo}. günümüzde ${count} durak var. İlk durağımız: ${first}.`,
    (dayNo: number, first: string, count: number) => `${dayNo}. gün başlıyor. Bugün ${count} durak gezeceğiz. Başlangıç: ${first}.`,
  ] as Fn<[number, string, number]>[],
  dayEnd: [
    () => 'Bugünün duraklarını tamamladık. Dinlenmeyi unutmayın.',
    () => 'Günün sonuna geldik. Bugün birlikte yürüdüğünüz için teşekkürler.',
  ] as Fn<[]>[],
};

export type GuideKind = keyof typeof GUIDE;

const last: Partial<Record<GuideKind, number>> = {};

/** Türün değişkelerinden birini seçer; bir önceki seçilenle aynısı gelmez. */
export function guideLine<K extends GuideKind>(kind: K, ...args: Parameters<(typeof GUIDE)[K][number]>): string {
  const list = GUIDE[kind] as unknown as ((...a: unknown[]) => string)[];
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && i === last[kind]) i = (i + 1) % list.length;
  last[kind] = i;
  return list[i](...args).replace(/\s+/g, ' ').trim();
}

/** Testler için: son seçimleri unut. */
export function resetGuide(): void {
  for (const k of Object.keys(last) as GuideKind[]) delete last[k];
}
