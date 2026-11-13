// Plan kutusu şifrelemesi (Geliştirme 4, Aşama B). Uygulama ve araclar/kutuya-koy.mjs aynı biçimi
// kullanır; ikisi de yalnız tarayıcının ve Node'un yerleşik Web Crypto arayüzünü kullanır.
//
//   Cihaz anahtarı: ECDH, P-256 eğrisi. Özel anahtar dışa aktarılamaz (extractable: false).
//   Plan: gzip ile sıkıştırılır, tek kullanımlık 256 bitlik anahtarla AES-GCM ile şifrelenir.
//   Anahtarın sarılması: her gönderimde geçici bir P-256 anahtarı üretilir; her alıcı için
//   ECDH(geçici özel, alıcı açık) → HKDF-SHA-256 → AES-GCM anahtarı; içerik anahtarı bununla şifrelenir.
//   Bütünlük: AES-GCM kimlik doğrulamalıdır; zarfın sürümü, zamanı ve geçici açık anahtar ek veri
//   (AAD) olarak şifreye bağlanır. Tek bayt değişirse açma başarısız olur.
// Safari: ECDH (P-256), HKDF, AES-GCM ve CompressionStream("gzip") Safari'de vardır (MDN: deriveKey
// 2020'den, CompressionStream Mayıs 2023'ten beri bütün tarayıcılarda); WebKit uçtan uca testinde
// bu yol çalıştırılır.

export type Bytes = Uint8Array<ArrayBuffer>;
export const KEY_PREFIX = 'tur-rehberi-anahtar:v1:';
export const BOX_FORMAT = 'tur-rehberi-kutu';
export const INDEX_FORMAT = 'tur-rehberi-kutu-dizin';
const CURVE = { name: 'ECDH', namedCurve: 'P-256' } as const;
const enc = new TextEncoder();

export interface Recipient {
  pi: string; // açık anahtarın parmak izi (16 onaltılık)
  iv: string;
  sk: string; // sarılmış içerik anahtarı
}
export interface Envelope {
  bicim: typeof BOX_FORMAT;
  v: 1;
  guncelleme: string; // ISO
  epk: string; // geçici açık anahtar (ham, taban 64)
  alicilar: Recipient[];
  iv: string;
  sifreli: string;
}
export interface IndexEntry {
  kimlik: string; // gezinin kimliğinden türetilmiş özet (açık metin değil)
  dosya: string;
  guncelleme: string;
  bayt: number;
  alicilar: string[]; // parmak izleri
}
export interface BoxIndex {
  bicim: typeof INDEX_FORMAT;
  v: 1;
  guncelleme: string;
  kayitlar: IndexEntry[];
}

export const b64 = (u: ArrayBuffer | Bytes) => {
  const a = u instanceof Uint8Array ? u : new Uint8Array(u);
  let s = '';
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000));
  return btoa(s);
};
export const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (u: ArrayBuffer) => [...new Uint8Array(u)].map((x) => x.toString(16).padStart(2, '0')).join('');

export async function fingerprint(pubRaw: Bytes): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', pubRaw)).slice(0, 16);
}
export const fpDisplay = (fp: string) => fp.match(/.{4}/g)!.join('-');

export function encodePublicKey(pubRaw: Bytes): string {
  return KEY_PREFIX + b64(pubRaw);
}
export function decodePublicKey(text: string): Bytes | null {
  const t = text.trim();
  if (!t.startsWith(KEY_PREFIX)) return null;
  try {
    const raw = unb64(t.slice(KEY_PREFIX.length));
    return raw.length === 65 && raw[0] === 4 ? raw : null;
  } catch {
    return null;
  }
}

/** Gezi kimliğinden dizin kimliği: açık metin değil (SHA-256 özeti). */
export async function entryId(tripId: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode('tur-rehberi-gezi:' + tripId))).slice(0, 24);
}

async function gzip(data: Bytes): Promise<Bytes> {
  return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
}
async function gunzip(data: Bytes): Promise<Bytes> {
  return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
}

async function kek(priv: CryptoKey, pubRaw: Bytes, epkRaw: Bytes, fp: string): Promise<CryptoKey> {
  const pub = await crypto.subtle.importKey('raw', pubRaw, CURVE, false, []);
  const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, priv, 256);
  const base = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: epkRaw, info: enc.encode('tur-rehberi-kutu v1 ' + fp) }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

const aad = (e: Pick<Envelope, 'v' | 'guncelleme' | 'epk'>) => enc.encode(`${BOX_FORMAT}|${e.v}|${e.guncelleme}|${e.epk}`);

/** Planı (JSON metni) verilen açık anahtarlara şifreler. */
export async function seal(plaintext: string, recipients: Bytes[], when = new Date().toISOString()): Promise<Envelope> {
  const eph = (await crypto.subtle.generateKey(CURVE, true, ['deriveBits'])) as CryptoKeyPair;
  const epkRaw = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const cek = crypto.getRandomValues(new Uint8Array(32));
  const env: Envelope = { bicim: BOX_FORMAT, v: 1, guncelleme: when, epk: b64(epkRaw), alicilar: [], iv: '', sifreli: '' };
  for (const pub of recipients) {
    const fp = await fingerprint(pub);
    const k = await kek(eph.privateKey, pub, epkRaw, fp);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const sk = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(fp) }, k, cek);
    env.alicilar.push({ pi: fp, iv: b64(iv), sk: b64(sk) });
  }
  const ck = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(env) }, ck, await gzip(enc.encode(plaintext)));
  env.iv = b64(iv);
  env.sifreli = b64(ct);
  return env;
}

export class BoxError extends Error {
  constructor(public code: 'not-for-me' | 'bad') {
    super(code);
  }
}

/** Zarfı cihazın özel anahtarıyla açar. Bu cihaza değilse 'not-for-me', bozuksa 'bad' hatası. */
export async function open(env: Envelope, priv: CryptoKey, pubRaw: Bytes): Promise<string> {
  if (!env || env.bicim !== BOX_FORMAT || env.v !== 1 || !Array.isArray(env.alicilar)) throw new BoxError('bad');
  const fp = await fingerprint(pubRaw);
  const r = env.alicilar.find((x) => x.pi === fp);
  if (!r) throw new BoxError('not-for-me');
  try {
    const epkRaw = unb64(env.epk);
    const k = await kek(priv, epkRaw, epkRaw, fp);
    const cek = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(r.iv), additionalData: enc.encode(fp) }, k, unb64(r.sk));
    const ck = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
    const z = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.iv), additionalData: aad(env) }, ck, unb64(env.sifreli));
    return new TextDecoder().decode(await gunzip(new Uint8Array(z)));
  } catch {
    throw new BoxError('bad');
  }
}

/** Yeni cihaz anahtar çifti: özel anahtar dışa aktarılamaz. */
export async function newDeviceKey(): Promise<{ priv: CryptoKey; pubRaw: Bytes }> {
  const kp = (await crypto.subtle.generateKey(CURVE, false, ['deriveBits'])) as CryptoKeyPair;
  const pubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  return { priv: kp.privateKey, pubRaw };
}
