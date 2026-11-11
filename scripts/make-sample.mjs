// Örnek gezi üreticisi. Çıktı: src/sample/ornek-plan.json
// Bütün mekanlar uydurmadır ve "ÖRNEK" etiketi taşır. Koordinatlar gerçek bir mekanı
// göstermez; bir merkez noktanın çevresine metre cinsinden kaydırılarak yerleştirilir.
import { writeFileSync, mkdirSync } from 'node:fs';

const CENTER = { lat: 44.4938, lng: 11.3426 };
const at = (northM, eastM) => ({
  lat: +(CENTER.lat + northM / 111320).toFixed(6),
  lng: +(CENTER.lng + eastM / (111320 * Math.cos((CENTER.lat * Math.PI) / 180))).toFixed(6),
});
const src = (slug) => [
  { title: 'ÖRNEK kaynak A', url: `https://example.com/ornek/${slug}` },
  { title: 'ÖRNEK kaynak B', url: `https://example.org/ornek/${slug}` },
];
const V = '2026-11-11';

const stop = (order, name, kind, pos, extra) => ({
  order,
  name: `ÖRNEK ${name}`,
  kind,
  lat: pos ? pos.lat : null,
  lng: pos ? pos.lng : null,
  coordSource: pos ? 'other' : null,
  address: `ÖRNEK ${name} Sokağı No: ${order}, ÖRNEK Kent`,
  visitMinutes: kind === 'main' ? 60 : 20,
  openHours: '09:00-18:00',
  closedDays: 'Pazartesi',
  closedWeekdays: ['mon'],
  fee: kind === 'main' ? '10 Avro' : 'Ücretsiz',
  ticketOrBooking: null,
  bestTime: 'Sabah erken',
  sources: src(`durak-${order}-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`),
  verifiedAt: V,
  ...extra,
});

const venue = (code, name, pos, extra) => ({
  code,
  name: `ÖRNEK ${name}`,
  lat: pos.lat,
  lng: pos.lng,
  coordSource: 'other',
  address: `ÖRNEK ${name} Caddesi, ÖRNEK Kent`,
  whatToEat: ['ÖRNEK ev yapımı makarna', 'ÖRNEK mevsim salatası'],
  priceLevel: 2,
  reservation: 'none',
  reservationNote: null,
  closedDays: null,
  closedWeekdays: [],
  queueNote: null,
  suitsWhom: 'Herkese uygun, sade bir seçenek.',
  sources: src(`mekan-${code.toLowerCase()}`),
  verifiedAt: V,
  ...extra,
});

const N = {
  meydan:
    'Bu meydan uydurma bir kentin uydurma kalbidir; burada anlatılan her şey uygulamayı denemeniz için yazıldı. Hikayeye göre kent, iki dere arasındaki bu düzlükte kurulan haftalık pazarla doğdu. Köylüler buğdaylarını, çömlekçiler testilerini buraya getirdi; pazar büyüdükçe çevresine evler, evlerin arasına sokaklar eklendi. Meydanın ortasındaki taş çeşme pazarın ilk günlerinden kalmadır derler, ama bu bir rivayettir. Şimdi çevrenize bakın. Kemerli revakların altında gölge arayan insanları göreceksiniz. Yerdeki taşların bazıları ötekilerden daha koyudur; eski pazar tezgahlarının yerini gösterir. Saat kulesine doğru dönün ve kulenin altındaki küçük kapıya dikkat edin. Bir sonraki durağa o kapının önünden geçerek gideceğiz. Acele etmeyin, çeşmenin suyundan bir yudum alın ve meydanın sesini dinleyin.',
  kule:
    'Saat kulesi, rivayete göre, bir tüccarın kente armağanıdır. Tüccar uzak limanlardan döndüğünde herkesin aynı saati bilmesini istemiş, çünkü pazarın ne zaman açılıp kapanacağı her gün tartışma konusu olurmuş. Kule önce ahşaptan yapılmış, yangından sonra taşla yeniden kurulmuş. Bu bilgiler örnek içindir; gerçek bir kuleye ait değildir. Kulenin dibinde durun ve yukarı bakın. Saatin kadranında rakam yerine on iki küçük kabartma göreceksiniz. Her biri bir ayı ve o ayın işini anlatır: hasat, bağbozumu, odun kesimi. Merdivenler dar ve diktir, yukarı çıkarsanız tırabzana tutunun. Tepeden bakınca kırmızı kiremitli çatıların arasında iki derenin izini sürebilirsiniz. Kent hala onların çizdiği yolu izler.',
  muze:
    'Bu küçük müze, kentin uydurma tarihini anlatan eşyaları bir araya getirir. Anlatım uygulamayı denemek için yazıldı; burada sözü geçen eşyalar gerçek değildir. İlk salonda pazar günlerinden kalan tartılar ve ölçü kapları durur. Tüccarlar birbirine güvenmezmiş, bu yüzden kentin resmi ölçüleri bu salonda saklanırmış. İkinci salona geçince duvardaki büyük haritaya bakın. Haritada kent bugünkünden çok küçüktür ve iki derenin arasında bir ada gibi durur. Haritanın köşesindeki imzayı bulmaya çalışın. Kimin çizdiği bilinmez, ama imzanın yanında küçük bir balık resmi vardır. Son salonda pencerenin önüne oturup biraz dinlenin. Avlunun ortasındaki limon ağacı müzenin en yaşlı sakinidir, en azından öyle anlatılır.',
  bahce:
    'Bu bahçe bir zamanlar bir manastırın sebze bahçesiymiş. Bu da örnek bir hikayedir. Keşişler burada kent pazarına satılacak otları yetiştirirmiş; fesleğen, adaçayı ve kekik hala bahçenin kenarlarında kendiliğinden büyür. Yürüyüş yolunu izleyin ve ilk kavşakta sola dönün. Taş bir havuzun başına varacaksınız. Havuzun suyu yukarıdaki dereden gelir ve hiç kurumadığı söylenir. Kenardaki taşlara oyulmuş harfleri görebilirsiniz; her biri bahçede çalışan bir ailenin baş harfidir. Öğleden sonra güneş havuzun suyuna vurunca bahçenin bütün renkleri değişir. Burası yürüyüşe ara vermek için iyi bir yerdir. Bankların birine oturun, kentin uğultusunun ne kadar uzaktan geldiğine dikkat edin.',
  kopru:
    'Eski köprü iki dereden büyüğünün üzerinden geçer. Örnek hikayeye göre köprü yapılmadan önce dereyi bir salla geçerlermiş ve salcı, kentin en zengin adamıymış. Köprü yapılınca salcı işsiz kalmış, ama kent ona köprünün ortasındaki küçük evi vermiş. O ev hala oradadır; şimdi bir dondurmacıdır. Köprünün ortasına gelince durun ve akıntı yönüne bakın. Suyun içinde eski sal iskelesinin taşlarını görebilirsiniz. Köprünün korkuluklarında yüzlerce küçük çentik vardır. Her yıl ilk sel geldiğinde suyun yüksekliği buraya işaretlenirmiş. En yüksek çentiği bulun; o yıl suyun köprünün üstünden aştığı anlatılır. Bu anlatım uygulamayı denemek için yazıldı.',
  pazar:
    'Kapalı pazar, meydandaki açık pazarın büyüyüp çatı altına girmiş halidir. Bu bir örnek anlatımdır. Sabahları balıkçılar, öğleye doğru peynirciler ve fırıncılar tezgah açar. İçeri girince önce kokuya dikkat edin; her koridorun kendine ait bir kokusu vardır. Sağdaki koridor taze ekmek, soldaki olgun peynir kokar. Ortadaki büyük tezgahta yerel zeytinyağları sıralanır ve satıcılar tatmanız için ekmek dilimleri uzatır. Tavana bakın; demir kirişlerin arasında eski pazar fenerleri asılıdır. Pazarın çıkışında küçük bir kahve tezgahı vardır, ayakta içilen sert bir kahveyle yola devam edebilirsiniz. Akşamüstü pazar erken kapanır, alışverişi öğleden önce yapın.',
  surlar:
    'Kent surlarının bu bölümü, örnek hikayede kentin en eski parçasıdır. Surlar pazarı ve evleri korumak için yapılmış, ama hiçbir zaman büyük bir kuşatma görmemiş. Kentliler bu yüzden surlara biraz da gülümseyerek bakar. Surun üstündeki yürüyüş yolunu izleyin. Her yüz adımda bir küçük gözetleme kulesi göreceksiniz. Kulelerin duvarlarında nöbetçilerin can sıkıntısından kazıdığı resimler vardır: gemiler, atlar ve bir tanesinde de çok büyük bir peynir. Batıya dönük kulede durun. Gün batımında güneş tam karşıdaki tepenin ardına iner ve surların taşları kızıla boyanır. Bu anlatım uygulamayı denemek içindir; burada anlatılanlar gerçek bir yere ait değildir.',
  teras:
    'Bu teras kentin en yüksek noktasıdır ve günü bitirmek için seçildi. Örnek hikayeye göre burada bir zamanlar rüzgar değirmeni varmış; pazarın unu burada öğütülürmüş. Değirmen yıkılmış ama taşları terasın duvarına örülmüş. Duvarın üstündeki yuvarlak taşı bulun; değirmenin eski taşıdır. Buradan bakınca gün boyunca gezdiğiniz yerleri tek tek seçebilirsiniz: meydan, saat kulesi, köprü ve surlar. Akşam ışıkları yanmaya başlayınca kentin iki derenin arasına nasıl sıkıştığını daha iyi görürsünüz. Rüzgar sert eser, yanınıza bir hırka alın. Bu anlatım örnektir; uygulamanın sesli anlatımını denemeniz için yazıldı.',
};

const day1Stops = [
  stop(1, 'Pazar Meydanı', 'main', at(0, 0), { narration: N.meydan, practicalLine: 'En iyi sabah dokuzdan önce; çeşmenin suyu içilebilir.', legToNext: { mode: 'walk', minutes: 6, approx: false } }),
  stop(2, 'Saat Kulesi', 'main', at(320, 180), { narration: N.kule, practicalLine: 'Merdiven dar; 20 dakika ayırın, çantayı aşağıda bırakın.', legToNext: { mode: 'walk', minutes: null, approx: false } }),
  stop(3, 'Kent Müzesi', 'main', at(560, -120), { narration: N.muze, practicalLine: 'Bilet girişte alınır; müze pazartesi kapalı.', legToNext: { mode: 'walk', minutes: null, approx: false } }),
  stop(4, 'Çeşme Sokağı', 'minor', at(800, 60), { narration: 'Bu dar sokak, adını sokağın başındaki küçük çeşmeden alır. Örnek bir duraktır. Çeşmenin üstündeki aslan başına dikkat edin, ağzından değil kulağından su akar.', practicalLine: 'Fotoğraf için öğleden önce gelin.', visitMinutes: 15, closedDays: null, closedWeekdays: [], fee: null, legToNext: { mode: 'walk', minutes: null, approx: false } }),
  stop(5, 'Manastır Bahçesi', 'main', at(1050, 320), { narration: N.bahce, practicalLine: 'Gölgelik az; şapka ve su alın.', legToNext: null }),
];

const day2Stops = [
  stop(1, 'Eski Köprü', 'main', at(-300, -250), { narration: N.kopru, practicalLine: 'Köprü her saat açık; sabah erken sakin.', closedDays: null, closedWeekdays: [], fee: 'Ücretsiz', legToNext: { mode: 'walk', minutes: 7, approx: false } }),
  stop(2, 'Kapalı Pazar', 'main', at(-520, 30), { narration: N.pazar, practicalLine: 'Öğleden önce gelin; nakit getirin.', closedDays: 'Pazar', closedWeekdays: ['sun'], fee: 'Ücretsiz', legToNext: { mode: 'walk', minutes: null, approx: false } }),
  stop(3, 'Gizli Avlu', 'minor', null, { narration: 'Bu avlunun koordinatı bilerek boş bırakıldı; uygulama onu haritaya koymaz, adresiyle listeler. Örnek bir duraktır.', practicalLine: 'Koordinatı olmayan yerlerin nasıl göründüğünü gösterir.', visitMinutes: 15, closedDays: null, closedWeekdays: [], fee: null, legToNext: { mode: 'walk', minutes: 8, approx: false } }),
  stop(4, 'Sur Kapısı', 'main', at(-900, 350), { narration: N.surlar, practicalLine: 'Surun üstü rüzgarlı; kaygan taşlara dikkat.', legToNext: { mode: 'drive', minutes: null, approx: false } }),
  stop(5, 'Tepe Terası', 'main', at(-1900, 1400), { narration: N.teras, practicalLine: 'Gün batımından yarım saat önce orada olun.', closedDays: null, closedWeekdays: [], fee: 'Ücretsiz', bestTime: 'Gün batımı', legToNext: null }),
];

const breakfasts = (base) => [
  venue('K1', 'Fırın Kahvaltısı', at(base[0] - 80, base[1] - 60), { whatToEat: ['ÖRNEK sıcak çörek', 'ÖRNEK kaymaklı tost'], priceLevel: 1, suitsWhom: 'Hızlı ve ekonomik başlamak isteyenlere.' }),
  venue('K2', 'Avlu Kahvesi', at(base[0] + 60, base[1] - 140), { whatToEat: ['ÖRNEK yumurtalı tava', 'ÖRNEK reçel tabağı'], priceLevel: 2, suitsWhom: 'Sakin, oturarak kahvaltı isteyenlere.' }),
  venue('K3', 'Pazar Tezgahı', at(base[0] - 150, base[1] + 90), { whatToEat: ['ÖRNEK peynirli ekmek', 'ÖRNEK taze sıkma meyve suyu'], priceLevel: 1, queueNote: 'Sabah 9 civarı kuyruk olur.', suitsWhom: 'Yerlilerin arasında ayakta kahvaltı edenlere.' }),
];
const dinners = (base) => [
  venue('A1', 'Usta Lokantası', at(base[0] + 100, base[1] + 120), { whatToEat: ['ÖRNEK yöre makarnası', 'ÖRNEK fırın sebze'], priceLevel: 2, reservation: 'recommended', reservationNote: 'Hafta sonu bir gün önceden arayın.', suitsWhom: 'Yörenin klasik yemeklerini tatmak isteyenlere.' }),
  venue('A2', 'Teras Lokantası', at(base[0] + 240, base[1] - 80), { whatToEat: ['ÖRNEK ızgara balık', 'ÖRNEK limonlu tatlı'], priceLevel: 3, reservation: 'required', suitsWhom: 'Manzaralı ve sakin bir akşam isteyenlere.' }),
  venue('A3', 'Köşe Dürümcüsü', at(base[0] - 60, base[1] + 200), { whatToEat: ['ÖRNEK sıcak dürüm', 'ÖRNEK ayran'], priceLevel: 1, suitsWhom: 'Yorgun, hızlı ve ekonomik yemek isteyenlere.' }),
];

const day1 = {
  date: '2027-05-14',
  title: 'Meydan ve kule',
  theme: 'Kentin kalbi: pazar meydanından manastır bahçesine',
  area: 'ÖRNEK Eski Kent',
  timeline: [
    { time: '08:30 civarı', title: 'Kahvaltı', kind: 'breakfast', stopOrder: null, venueCodes: ['K1', 'K2', 'K3'], fixed: false, note: null },
    { time: '09:30', title: 'Pazar Meydanı', kind: 'stop', stopOrder: 1, venueCodes: [], fixed: false, note: null },
    { time: '10:30–11:00', title: 'Saat Kulesi', kind: 'stop', stopOrder: 2, venueCodes: [], fixed: true, note: 'Kuleye çıkış biletli ve saatlidir.' },
    { time: '11:30 civarı', title: 'Kent Müzesi', kind: 'stop', stopOrder: 3, venueCodes: [], fixed: false, note: null },
    { time: '13:00 civarı', title: 'Öğle yemeği', kind: 'lunch', stopOrder: null, venueCodes: ['O1', 'O2'], fixed: false, note: null },
    { time: '14:30–15:30', title: 'Dinlenme ve serbest dolaşma', kind: 'free', stopOrder: null, venueCodes: [], fixed: false, note: null },
    { time: '15:30 civarı', title: 'Çeşme Sokağı', kind: 'stop', stopOrder: 4, venueCodes: [], fixed: false, note: null },
    { time: '16:00 civarı', title: 'Dondurma molası', kind: 'snack', stopOrder: null, venueCodes: ['S1'], fixed: false, note: null },
    { time: '16:30 civarı', title: 'Manastır Bahçesi', kind: 'stop', stopOrder: 5, venueCodes: [], fixed: false, note: null },
    { time: '19:30 civarı', title: 'Akşam yemeği', kind: 'dinner', stopOrder: null, venueCodes: ['A1', 'A2', 'A3'], fixed: false, note: null },
  ],
  stops: day1Stops,
  breakfast: breakfasts([0, 0]),
  lunch: {
    main: venue('O1', 'Esnaf Lokantası', at(620, 40), { whatToEat: ['ÖRNEK günün tenceresi', 'ÖRNEK pilav'], priceLevel: 1, suitsWhom: 'Yerlilerle birlikte hızlı öğle yemeği isteyenlere.' }),
    backup: venue('O2', 'Bahçe Kafe', at(700, -200), { whatToEat: ['ÖRNEK sebzeli tart', 'ÖRNEK limonata'], priceLevel: 2, suitsWhom: 'Gölgede oturup dinlenmek isteyenlere.' }),
  },
  dinner: dinners([300, 100]),
  snacks: [venue('S1', 'Köprü Dondurmacısı', at(900, 200), { whatToEat: ['ÖRNEK fıstıklı dondurma', 'ÖRNEK limonlu dondurma'], priceLevel: 1, suitsWhom: 'Öğleden sonra serinlemek isteyenlere.' })],
  flex: {
    swappable: 'Müze ile Saat Kulesi yer değiştirebilir; kule bileti saatlidir, ona göre ayarlayın.',
    skipIfTired: 'Çeşme Sokağı atlanabilir.',
    ifExtraTime: 'Manastır Bahçesi’nden sonra köprüye kadar yürüyün.',
    ifRain: 'Bahçe yerine müzede daha uzun kalın.',
  },
  notes: null,
};

const day2 = {
  date: '2027-05-15',
  title: 'Köprüden tepeye',
  theme: 'Dere kıyısı, kapalı pazar ve gün batımı',
  area: 'ÖRNEK Dere Kıyısı',
  timeline: [
    { time: '08:30 civarı', title: 'Kahvaltı', kind: 'breakfast', stopOrder: null, venueCodes: ['K1', 'K2', 'K3'], fixed: false, note: null },
    { time: '09:30', title: 'Eski Köprü', kind: 'stop', stopOrder: 1, venueCodes: [], fixed: false, note: null },
    { time: '10:30 civarı', title: 'Kapalı Pazar', kind: 'stop', stopOrder: 2, venueCodes: [], fixed: false, note: null },
    { time: '11:30 civarı', title: 'Gizli Avlu', kind: 'stop', stopOrder: 3, venueCodes: [], fixed: false, note: null },
    { time: '13:00 civarı', title: 'Öğle yemeği', kind: 'lunch', stopOrder: null, venueCodes: ['O1', 'O2'], fixed: false, note: null },
    { time: '14:30–16:30', title: 'Dinlenme', kind: 'free', stopOrder: null, venueCodes: [], fixed: false, note: null },
    { time: '17:00 civarı', title: 'Sur Kapısı', kind: 'stop', stopOrder: 4, venueCodes: [], fixed: false, note: null },
    { time: '19:40', title: 'Tepe Terası, gün batımı', kind: 'stop', stopOrder: 5, venueCodes: [], fixed: true, note: 'Gün batımı ÖRNEK saat 20:30.' },
    { time: '21:00 civarı', title: 'Akşam yemeği', kind: 'dinner', stopOrder: null, venueCodes: ['A1', 'A2', 'A3'], fixed: false, note: null },
  ],
  stops: day2Stops,
  breakfast: breakfasts([-250, -300]),
  lunch: {
    main: venue('O1', 'Balıkçı Tezgahı', at(-560, 80), { whatToEat: ['ÖRNEK kızarmış hamsi', 'ÖRNEK balık çorbası'], priceLevel: 2, closedWeekdays: ['mon'], closedDays: 'Pazartesi', suitsWhom: 'Pazarın içinde taze balık isteyenlere.' }),
    backup: venue('O2', 'Pazar Börekçisi', at(-480, -60), { whatToEat: ['ÖRNEK peynirli börek', 'ÖRNEK çay'], priceLevel: 1, suitsWhom: 'Ayakta, hızlı bir şey isteyenlere.' }),
  },
  dinner: dinners([-1700, 1300]),
  snacks: [venue('S1', 'Pazar Kahvecisi', at(-540, 0), { whatToEat: ['ÖRNEK sert kahve', 'ÖRNEK bademli kurabiye'], priceLevel: 1, suitsWhom: 'Ayakta kısa bir kahve molası isteyenlere.' })],
  flex: {
    swappable: 'Kapalı Pazar ile Eski Köprü yer değiştirebilir.',
    skipIfTired: 'Gizli Avlu atlanabilir.',
    ifExtraTime: 'Surun üstünde bir kule daha yürüyün.',
    ifRain: 'Kapalı Pazar’da daha uzun kalın; teras yerine pazar kahvecisinde oturun.',
  },
  notes: null,
};

const phrases = [
  ['Buongiorno', 'Bon curno', 'Günaydın / iyi günler', 'Öğleye kadar selamlaşırken'],
  ['Buonasera', 'Bonasera', 'İyi akşamlar', 'Öğleden sonra ve akşam'],
  ['Grazie', 'Gratsiye', 'Teşekkürler', null],
  ['Per favore', 'Per favore', 'Lütfen', null],
  ['Scusi', 'Skuzi', 'Affedersiniz', 'Birine seslenirken'],
  ['Arrivederci', 'Arrivederçi', 'Hoşça kalın', 'Ayrılırken'],
  ['Sì / No', 'Si / No', 'Evet / Hayır', null],
  ['Quanto costa?', 'Kuanto kosta?', 'Ne kadar?', 'Alışverişte'],
  ['Il conto, per favore', 'İl konto per favore', 'Hesap lütfen', 'Masada'],
  ['Vorrei questo', 'Vorrey kuesto', 'Bunu istiyorum', 'Sipariş verirken gösterip'],
  ['Un altro, per favore', 'Un altro per favore', 'Bir tane daha, lütfen', 'Sipariş verirken'],
  ['È buonissimo!', 'E buonissimo!', 'Çok lezzetli!', 'Yemekten sonra'],
  ['Non piccante, per favore', 'Non pikkante per favore', 'Acısız olsun, lütfen', 'Sipariş verirken'],
  ['Un tavolo per due', 'Un tavolo per due', 'İki kişilik bir masa', 'Lokantaya girince'],
  ['Acqua naturale', 'Akkua naturale', 'Sade su', 'Su isterken'],
  ['Dov’è il bagno?', 'Dove il banyo?', 'Tuvalet nerede?', null],
  ['Parla inglese?', 'Parla inglese?', 'İngilizce konuşuyor musunuz?', null],
].map(([original, pronunciationTr, meaning, context]) => ({ original, script: null, pronunciationTr, meaning, context }));

const plan = {
  schemaVersion: 1,
  id: 'ornek-gezi',
  title: 'ÖRNEK Gezi: İki Günde ÖRNEK Kent',
  destinations: ['ÖRNEK Kent'],
  startDate: '2027-05-14',
  endDate: '2027-05-15',
  summary: 'Uygulamayı tanımak için hazırlanmış, uydurma mekanlardan oluşan iki günlük örnek gezi.',
  assumptions: [
    'Bu gezi örnektir: bütün mekan ve durak adları uydurmadır, gerçek bir yeri göstermez.',
    'Koordinatlar bir merkez noktanın çevresine yapay olarak yerleştirildi.',
    'Yürüyerek gezilir; ikinci gün tepeye araçla çıkılır.',
  ],
  weatherNote: 'ÖRNEK: mayıs ortası ılık; gündüz 22 °C civarı. Gün doğumu 05:40, gün batımı 20:30 civarı.',
  reservations: [
    { what: 'ÖRNEK Saat Kulesi çıkışı', when: '1. gün 10:30', note: 'Saatli bilet; bir gün önceden alın.', url: 'https://example.com/ornek/bilet' },
    { what: 'ÖRNEK Teras Lokantası (A2)', when: '1. ve 2. gün akşam', note: 'Rezervasyon gerekli.', url: null },
  ],
  cuisine: [
    { name: 'ÖRNEK yöre makarnası', description: 'El açması, kalın şerit makarna; tereyağı ve adaçayıyla.', where: 'A1 Usta Lokantası' },
    { name: 'ÖRNEK kızarmış hamsi', description: 'Mısır ununa bulanıp kızartılan küçük balık.', where: '2. gün O1 Balıkçı Tezgahı' },
    { name: 'ÖRNEK fıstıklı dondurma', description: 'Kentin yaz klasiği.', where: '1. gün S1 Köprü Dondurmacısı' },
  ],
  days: [day1, day2],
  phrases: [{ language: 'İtalyanca', langCode: 'it-IT', items: phrases }],
  practical: {
    transport: 'ÖRNEK: eski kent yürüyerek gezilir. Tepeye taksiyle 10 dakika.',
    moneyAndTipping: 'ÖRNEK: kart çoğu yerde geçer; pazarda nakit gerekir. Bahşiş zorunlu değil, %5-10 yaygın.',
    closedDays: 'ÖRNEK: müzeler pazartesi, kapalı pazar pazar günü kapalı.',
    emergency: [
      { label: 'Genel acil (Avrupa)', number: '112' },
      { label: 'ÖRNEK turizm polisi', number: '000 000 00 00' },
    ],
    notes: ['Bu bilgiler örnektir; gerçek bir gezide planı Claude’da üretin.'],
  },
  sources: [
    { title: 'ÖRNEK genel kaynak', url: 'https://example.com/ornek' },
  ],
  verifiedAt: V,
  notes: 'ÖRNEK veri. Gerçek mekan değildir.',
};

mkdirSync('src/sample', { recursive: true });
writeFileSync('src/sample/ornek-plan.json', JSON.stringify(plan, null, 2) + '\n', 'utf8');
console.log('src/sample/ornek-plan.json yazıldı');
