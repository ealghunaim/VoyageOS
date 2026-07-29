/** Live FX via open.er-api.com — free, no key, daily rates, covers Gulf currencies. */
const CCY: Record<string, string> = {
  QA: 'QAR', KW: 'KWD', AE: 'AED', SA: 'SAR', BH: 'BHD', OM: 'OMR', EG: 'EGP', JO: 'JOD', LB: 'LBP', IQ: 'IQD',
  US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD',
  IT: 'EUR', FR: 'EUR', DE: 'EUR', ES: 'EUR', NL: 'EUR', GR: 'EUR', PT: 'EUR', IE: 'EUR', AT: 'EUR', BE: 'EUR',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', TR: 'TRY',
  JP: 'JPY', CN: 'CNY', HK: 'HKD', SG: 'SGD', KR: 'KRW', TH: 'THB', MY: 'MYR', ID: 'IDR', PH: 'PHP', VN: 'VND', IN: 'INR',
  MV: 'MVR', LK: 'LKR', PK: 'PKR', BD: 'BDT', BR: 'BRL', MX: 'MXN', ZA: 'ZAR', RU: 'RUB', MA: 'MAD',
};
export function currencyForCountry(cc?: string | null): string | null {
  return cc ? (CCY[cc.toUpperCase()] ?? null) : null;
}
const cache: Record<string, { rates: Record<string, number>; ts: number }> = {};
export async function getRate(base: string, target: string): Promise<number | null> {
  const b = base.toUpperCase(), t = target.toUpperCase();
  if (b === t) return 1;
  const now = Date.now();
  if (!cache[b] || now - cache[b].ts > 6 * 3600 * 1000) {
    try {
      const r = await fetch(`https://open.er-api.com/v6/latest/${b}`);
      const j = await r.json();
      if (j && j.rates) cache[b] = { rates: j.rates, ts: now };
    } catch { return null; }
  }
  return cache[b]?.rates?.[t] ?? null;
}
