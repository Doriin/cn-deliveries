/**
 * Approximate coordinates of Moldovan localities and Chișinău sectors, for the Radar design's map of the day.
 * Only used to place dots on a picture; nothing is routed or priced from it.
 */
type LL = [lat: number, lng: number];

/** The depot: central Chișinău. */
export const DEPOT: LL = [47.0245, 28.8323];

const PLACES: Record<string, LL> = {
  // Chișinău and its sectors
  chisinau: [47.0245, 28.8323], centru: [47.0225, 28.8335], botanica: [46.9905, 28.8565], ciocana: [47.0385, 28.8905],
  riscani: [47.0475, 28.8545], buiucani: [47.0345, 28.7955], telecentru: [47.0055, 28.8155], "posta veche": [47.0505, 28.8705], sculeni: [47.0335, 28.7765],
  // around the capital
  durlesti: [47.0186, 28.7603], codru: [46.9751, 28.8167], stauceni: [47.092, 28.865], cricova: [47.1385, 28.8615], ghidighici: [47.0985, 28.8003],
  gratiesti: [47.0935, 28.8135], truseni: [47.0712, 28.6932], "vadul lui voda": [47.0912, 29.0759], singera: [46.918, 28.9713], bubuieci: [46.9858, 28.9363],
  colonita: [47.0371, 28.9977], tohatin: [47.0329, 28.9735], bacioi: [46.912, 28.882], budesti: [46.9631, 28.9902], ialoveni: [46.9433, 28.78],
  // towns
  balti: [47.7617, 27.9289], orhei: [47.3844, 28.8244], ungheni: [47.2108, 27.8006], cahul: [45.9075, 28.1944], comrat: [46.2981, 28.6567],
  soroca: [48.1558, 28.2975], hincesti: [46.8309, 28.5907], straseni: [47.1414, 28.6103], criuleni: [47.2131, 29.1592], "anenii noi": [46.8789, 29.2311],
  edinet: [48.1681, 27.3051], causeni: [46.6375, 29.4114], floresti: [47.8914, 28.3011], drochia: [48.0352, 27.8123], cimislia: [46.5197, 28.7836],
  singerei: [47.6389, 28.1431], nisporeni: [47.0817, 28.1786], calarasi: [47.2544, 28.3081], "riscani town": [47.9558, 27.5536], falesti: [47.5739, 27.7092],
  telenesti: [47.4997, 28.3656], rezina: [47.7492, 28.9622], "stefan voda": [46.5153, 29.6631], leova: [46.4786, 28.2553], briceni: [48.3628, 27.0778],
  ocnita: [48.4111, 27.4797], glodeni: [47.7708, 27.5144], donduseni: [48.2225, 27.5853], cantemir: [46.2781, 28.2014], basarabeasca: [46.3336, 28.9614],
  taraclia: [45.9, 28.6689], soldanesti: [47.8161, 28.7969], dubasari: [47.2631, 29.1608], tiraspol: [46.8403, 29.6433], tighina: [46.8306, 29.4767],
  bender: [46.8306, 29.4767], "ceadir lunga": [46.0625, 28.8306], vulcanesti: [45.6844, 28.4036], codreanca: [47.1328, 28.6869], peresecina: [47.2667, 28.7667],
};

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
const KEYS = Object.keys(PLACES).sort((a, b) => b.length - a.length);

/** Where a parcel goes, from its locality, or a Chișinău sector named in the address. */
export function locate(city: string | null, addr: string): LL | null {
  const c = city ? fold(city) : "";
  const a = fold(addr);
  const inCapital = !c || c.includes("chisinau");
  if (inCapital) {
    for (const k of ["botanica", "ciocana", "riscani", "buiucani", "centru", "telecentru", "posta veche", "sculeni"]) if (a.includes(k)) return PLACES[k];
  }
  if (c) {
    if (PLACES[c]) return PLACES[c];
    const k = KEYS.find((k) => c.includes(k) || (k.length > 4 && c.startsWith(k)));
    if (k) return PLACES[k];
  }
  return inCapital && c ? PLACES.chisinau : null;
}

/** Bearing (0 = north, clockwise, degrees) and distance (km) from the depot. */
export function fromDepot([lat, lng]: LL): { deg: number; km: number } {
  const R = 6371, toRad = Math.PI / 180;
  const [la1, lo1] = [DEPOT[0] * toRad, DEPOT[1] * toRad];
  const [la2, lo2] = [lat * toRad, lng * toRad];
  const dLa = la2 - la1, dLo = lo2 - lo1;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLo / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(h));
  const y = Math.sin(dLo) * Math.cos(la2), x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLo);
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return { deg, km };
}
