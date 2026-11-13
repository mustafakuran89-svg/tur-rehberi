#!/usr/bin/env node
// Plan kutusuna gezi koyar (Geliştirme 4, Aşama B). Yalnız Node'un yerleşik kitaplıklarıyla çalışır.
//
// Kullanım (depo kökünde):
//   node araclar/kutuya-koy.mjs <plan.json>            planı doğrular, şifreler, kutuya koyar
//   node araclar/kutuya-koy.mjs --kaldir <gezi-kimligi> geziyi kutudan çıkarır
// Seçenekler: --anahtarlar kutu/anahtarlar.txt  --kutu public/kutu  --sema plan.schema.json
//             --bolgeler haritalar/bolgeler.json
//
// Şifreleme uygulamadakiyle aynıdır (src/lib/boxCrypto.ts): ECDH P-256 + HKDF-SHA-256 + AES-256-GCM,
// plan gzip ile sıkıştırılır. Araç plan içeriğini ekrana, günlüğe ya da dosyaya açık yazmaz.
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { randomBytes, webcrypto } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

const subtle = webcrypto.subtle;
const enc = new TextEncoder();
const CURVE = { name: 'ECDH', namedCurve: 'P-256' };
export const KEY_PREFIX = 'tur-rehberi-anahtar:v1:';
const b64 = (u) => Buffer.from(u).toString('base64');
const hex = (u) => Buffer.from(u).toString('hex');

// ---------------------------------------------------------------- şema doğrulayıcı (alt küme)
// plan.schema.json'un kullandığı JSON Schema 2020-12 sözcükleri: type, enum, const, required,
// properties, additionalProperties, items, minItems, maxItems, minLength, minimum, maximum, pattern,
// $ref (yerel), oneOf, anyOf.
export function validate(schema, data) {
  const errors = [];
  const resolve = (ref) => ref.replace(/^#\//, '').split('/').reduce((o, k) => o[k], schema);
  const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
  const check = (s, v, path) => {
    if (s.$ref) return check(resolve(s.$ref), v, path);
    let ok = true;
    const err = (m) => {
      errors.push(`${path || '/'}: ${m}`);
      ok = false;
    };
    if (s.oneOf || s.anyOf) {
      const alts = s.oneOf ?? s.anyOf;
      const before = errors.length;
      const pass = alts.filter((a) => {
        const n = errors.length;
        const r = check(a, v, path);
        errors.length = n;
        return r;
      }).length;
      errors.length = before;
      if (s.oneOf ? pass !== 1 : pass < 1) err('seçeneklerden birine uymuyor');
    }
    if (s.type) {
      const types = Array.isArray(s.type) ? s.type : [s.type];
      const t = typeOf(v);
      if (!types.includes(t) && !(t === 'integer' && types.includes('number'))) {
        err(`tür ${types.join('|')} olmalı`);
        return false;
      }
    }
    if (s.enum && !s.enum.some((e) => e === v)) err(`izinli değer değil: ${JSON.stringify(v)}`);
    if ('const' in s && s.const !== v) err('sabit değere uymuyor');
    if (typeof v === 'string') {
      if (s.minLength != null && v.length < s.minLength) err('çok kısa');
      if (s.pattern && !new RegExp(s.pattern, 'u').test(v)) err('biçim uymuyor');
    }
    if (typeof v === 'number') {
      if (s.minimum != null && v < s.minimum) err('çok küçük');
      if (s.maximum != null && v > s.maximum) err('çok büyük');
    }
    if (Array.isArray(v)) {
      if (s.minItems != null && v.length < s.minItems) err('çok az öge');
      if (s.maxItems != null && v.length > s.maxItems) err('çok fazla öge');
      if (s.items) v.forEach((x, i) => check(s.items, x, `${path}/${i}`) || (ok = false));
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const r of s.required ?? []) if (!(r in v)) err(`zorunlu alan yok: ${r}`);
      for (const [k, x] of Object.entries(v)) {
        if (s.properties?.[k]) check(s.properties[k], x, `${path}/${k}`) || (ok = false);
        else if (s.additionalProperties === false) err(`bilinmeyen alan: ${k}`);
      }
    }
    return ok;
  };
  check(schema, data, '');
  return errors;
}

// ---------------------------------------------------------------- şifreleme
export async function fingerprint(pubRaw) {
  return hex(await subtle.digest('SHA-256', pubRaw)).slice(0, 16);
}
export async function entryId(tripId) {
  return hex(await subtle.digest('SHA-256', enc.encode('tur-rehberi-gezi:' + tripId))).slice(0, 24);
}
export function decodePublicKey(text) {
  const t = text.trim();
  if (!t.startsWith(KEY_PREFIX)) return null;
  const raw = new Uint8Array(Buffer.from(t.slice(KEY_PREFIX.length), 'base64'));
  return raw.length === 65 && raw[0] === 4 ? raw : null;
}
async function kek(priv, pubRaw, epkRaw, fp) {
  const pub = await subtle.importKey('raw', pubRaw, CURVE, false, []);
  const bits = await subtle.deriveBits({ name: 'ECDH', public: pub }, priv, 256);
  const base = await subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: epkRaw, info: enc.encode('tur-rehberi-kutu v1 ' + fp) }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
}

/** Uygulamadaki seal() ile aynı zarf. */
export async function seal(plaintext, recipients, when = new Date().toISOString()) {
  const eph = await subtle.generateKey(CURVE, true, ['deriveBits']);
  const epkRaw = new Uint8Array(await subtle.exportKey('raw', eph.publicKey));
  const cek = new Uint8Array(randomBytes(32));
  const env = { bicim: 'tur-rehberi-kutu', v: 1, guncelleme: when, epk: b64(epkRaw), alicilar: [], iv: '', sifreli: '' };
  for (const pub of recipients) {
    const fp = await fingerprint(pub);
    const k = await kek(eph.privateKey, pub, epkRaw, fp);
    const iv = new Uint8Array(randomBytes(12));
    const sk = await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(fp) }, k, cek);
    env.alicilar.push({ pi: fp, iv: b64(iv), sk: b64(sk) });
  }
  const ck = await subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const iv = new Uint8Array(randomBytes(12));
  const aad = enc.encode(`tur-rehberi-kutu|1|${env.guncelleme}|${env.epk}`);
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, ck, gzipSync(Buffer.from(plaintext, 'utf8')));
  env.iv = b64(iv);
  env.sifreli = b64(ct);
  return env;
}

// ---------------------------------------------------------------- anahtar listesi
/** Her satır: "etiket tur-rehberi-anahtar:v1:…" (# ile başlayan satır açıklamadır). */
export function readKeys(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const l = line.trim();
    if (!l || l.startsWith('#')) continue;
    const at = l.indexOf(KEY_PREFIX);
    if (at < 0) throw new Error(`anahtar satırı tanınmadı: ${l.slice(0, 30)}…`);
    const raw = decodePublicKey(l.slice(at));
    if (!raw) throw new Error(`anahtar bozuk: ${l.slice(0, at).trim() || '(etiketsiz)'}`);
    out.push({ label: l.slice(0, at).trim() || 'cihaz', raw });
  }
  return out;
}

// ---------------------------------------------------------------- bölge listesi
const slugify = (x) =>
  x.toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Gezinin alanı: durak, mekan, etkinlik, otel, keşfet ve havalimanı noktaları; çevresinde ~2 km pay. */
export function tripBbox(t) {
  const pts = [];
  const add = (x) => x && typeof x.lat === 'number' && typeof x.lng === 'number' && pts.push([x.lng, x.lat]);
  for (const d of t.days ?? []) {
    (d.stops ?? []).forEach(add);
    [...(d.breakfast ?? []), ...(d.dinner ?? []), ...(d.snacks ?? []), ...(d.lunch ? [d.lunch.main, d.lunch.backup] : [])].forEach(add);
    (d.eveningEvents ?? []).forEach(add);
  }
  add(t.lodging);
  (t.discover ?? []).forEach(add);
  (t.happenings ?? []).forEach(add);
  for (const tr of [t.arrival, t.departure]) if (tr) add({ lat: tr.hubLat, lng: tr.hubLng });
  if (!pts.length) return null;
  const lat = pts.map((p) => p[1]);
  const lng = pts.map((p) => p[0]);
  const mid = (Math.max(...lat) + Math.min(...lat)) / 2;
  const dLat = 2 / 111.32;
  const dLng = 2 / (111.32 * Math.cos((mid * Math.PI) / 180));
  const r = (x) => Math.round(x * 1000) / 1000;
  return [r(Math.min(...lng) - dLng), r(Math.min(...lat) - dLat), r(Math.max(...lng) + dLng), r(Math.max(...lat) + dLat)];
}

/** Gezinin alanı hiçbir bölgeye sığmıyorsa bölge listesine ekler (adında tarih yok). */
export function addRegion(conf, t) {
  const bb = tripBbox(t);
  if (!bb) return null;
  const inside = (a, b) => a[0] >= b[0] && a[1] >= b[1] && a[2] <= b[2] && a[3] <= b[3];
  if (conf.bolgeler.some((b) => inside(bb, b.bbox))) return null;
  const ad = (t.destinations?.[0] ?? 'Bölge').replace(/\d{4}.*$/, '').trim();
  let id = slugify(ad) || 'bolge';
  let n = 2;
  while (conf.bolgeler.some((b) => b.id === id)) id = `${slugify(ad)}-${n++}`;
  const reg = { id, ad, bbox: bb, maxzoom: 15 };
  conf.bolgeler.push(reg);
  return reg;
}

// ---------------------------------------------------------------- ana akış
function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : def;
}

async function main() {
  const kutu = arg('--kutu', 'public/kutu');
  const keysFile = arg('--anahtarlar', 'kutu/anahtarlar.txt');
  const schemaFile = arg('--sema', 'plan.schema.json');
  const regionsFile = arg('--bolgeler', 'haritalar/bolgeler.json');
  const indexFile = `${kutu}/index.json`;
  mkdirSync(kutu, { recursive: true });
  const index = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : { bicim: 'tur-rehberi-kutu-dizin', v: 1, guncelleme: null, kayitlar: [] };
  const now = new Date().toISOString();

  const remove = arg('--kaldir');
  if (remove) {
    const kid = await entryId(remove);
    const e = index.kayitlar.find((x) => x.kimlik === kid);
    if (!e) {
      console.error('Bu kimlikte gezi kutuda yok.');
      process.exit(1);
    }
    if (existsSync(`${kutu}/${e.dosya}`)) unlinkSync(`${kutu}/${e.dosya}`);
    index.kayitlar = index.kayitlar.filter((x) => x !== e);
    index.guncelleme = now;
    writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n');
    console.log('Gezi kutudan çıkarıldı. Cihazlardaki kopya silinmez. Şimdi commit ve push edin.');
    return;
  }

  const planFile = process.argv.slice(2).find((a, i, all) => !a.startsWith('--') && !(all[i - 1] ?? '').startsWith('--'));
  if (!planFile) {
    console.error('Kullanım: node araclar/kutuya-koy.mjs <plan.json>   ya da   --kaldir <gezi-kimligi>');
    process.exit(2);
  }
  const text = readFileSync(planFile, 'utf8');
  let plan;
  try {
    plan = JSON.parse(text);
  } catch {
    console.error('Plan geçerli bir JSON değil.');
    process.exit(1);
  }
  const errs = validate(JSON.parse(readFileSync(schemaFile, 'utf8')), plan);
  if (errs.length) {
    console.error(`Plan şemaya uymuyor (${errs.length} sorun); kutuya konmadı:`);
    errs.slice(0, 20).forEach((e) => console.error('  ' + e));
    process.exit(1);
  }
  const keys = readKeys(readFileSync(keysFile, 'utf8'));
  if (!keys.length) {
    console.error(`${keysFile} içinde cihaz anahtarı yok.`);
    process.exit(1);
  }
  const env = await seal(JSON.stringify(plan), keys.map((k) => k.raw), now);
  const body = JSON.stringify(env);
  const kid = await entryId(plan.id);
  const old = index.kayitlar.find((x) => x.kimlik === kid);
  if (old && existsSync(`${kutu}/${old.dosya}`)) unlinkSync(`${kutu}/${old.dosya}`);
  const file = `k-${randomBytes(8).toString('hex')}.json`;
  writeFileSync(`${kutu}/${file}`, body);
  const entry = { kimlik: kid, dosya: file, guncelleme: now, bayt: Buffer.byteLength(body), alicilar: await Promise.all(keys.map((k) => fingerprint(k.raw))) };
  index.kayitlar = [...index.kayitlar.filter((x) => x.kimlik !== kid), entry];
  index.guncelleme = now;
  writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n');
  console.log(`${old ? 'Güncellendi' : 'Kutuya kondu'}: ${file} (${entry.bayt} bayt), ${keys.length} cihaz: ${keys.map((k) => k.label).join(', ')}`);

  if (existsSync(regionsFile)) {
    const conf = JSON.parse(readFileSync(regionsFile, 'utf8'));
    const reg = addRegion(conf, plan);
    if (reg) {
      writeFileSync(regionsFile, JSON.stringify(conf, null, 2) + '\n');
      console.log(`Çevrimdışı harita bölgesi eklendi: ${reg.ad} (${reg.bbox.join(', ')}).`);
    }
  }
  console.log('Şimdi commit ve push edin; yayın iş akışı siteyi kendiliğinden günceller.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error('Hata:', e.message);
    process.exit(1);
  });
}
