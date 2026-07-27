// Curated nationality list (code, name) — searchable in Profile; free-typed
// two-letter codes also accepted. Expand any time.
export const COUNTRIES: [string, string][] = [
  ['KW','Kuwait'],['SA','Saudi Arabia'],['AE','United Arab Emirates'],['QA','Qatar'],
  ['BH','Bahrain'],['OM','Oman'],['JO','Jordan'],['LB','Lebanon'],['EG','Egypt'],
  ['IQ','Iraq'],['SY','Syria'],['PS','Palestine'],['YE','Yemen'],['MA','Morocco'],
  ['DZ','Algeria'],['TN','Tunisia'],['LY','Libya'],['SD','Sudan'],['TR','Türkiye'],
  ['IR','Iran'],['PK','Pakistan'],['IN','India'],['BD','Bangladesh'],['LK','Sri Lanka'],
  ['PH','Philippines'],['ID','Indonesia'],['MY','Malaysia'],['SG','Singapore'],
  ['TH','Thailand'],['VN','Vietnam'],['CN','China'],['JP','Japan'],['KR','South Korea'],
  ['GB','United Kingdom'],['IE','Ireland'],['FR','France'],['DE','Germany'],
  ['IT','Italy'],['ES','Spain'],['PT','Portugal'],['NL','Netherlands'],['BE','Belgium'],
  ['CH','Switzerland'],['AT','Austria'],['SE','Sweden'],['NO','Norway'],['DK','Denmark'],
  ['FI','Finland'],['PL','Poland'],['CZ','Czechia'],['GR','Greece'],['RU','Russia'],
  ['UA','Ukraine'],['US','United States'],['CA','Canada'],['MX','Mexico'],['BR','Brazil'],
  ['AR','Argentina'],['CL','Chile'],['CO','Colombia'],['AU','Australia'],['NZ','New Zealand'],
  ['ZA','South Africa'],['NG','Nigeria'],['KE','Kenya'],['ET','Ethiopia'],['GH','Ghana'],
];
export const flagOf = (cc?: string | null) =>
  cc && cc.length === 2
    ? String.fromCodePoint(...cc.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)))
    : '';
export const countryName = (cc?: string | null) =>
  COUNTRIES.find(([c]) => c === (cc || '').toUpperCase())?.[1] ?? (cc || '');
