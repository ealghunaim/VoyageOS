/** Traced landmark silhouettes (from real SVG references), tinted per trip.
 * Resolution: city → country map → none (TripArt then shows the generative skyline). */
/* eslint-disable @typescript-eslint/no-var-requires */
const IMAGES: Record<string, any> = {
  doha: require('../../assets/landmarks/doha.png'),
  dubai: require('../../assets/landmarks/dubai.png'),
  bahrain: require('../../assets/landmarks/bahrain.png'),
  jeddah: require('../../assets/landmarks/jeddah.png'),
  muscat: require('../../assets/landmarks/muscat.png'),
  maldives: require('../../assets/landmarks/maldives.png'),
  london: require('../../assets/landmarks/london.png'),
  paris: require('../../assets/landmarks/paris.png'),
  rome: require('../../assets/landmarks/rome.png'),
  milan: require('../../assets/landmarks/milan.png'),
  newyork: require('../../assets/landmarks/newyork.png'),
  sanfrancisco: require('../../assets/landmarks/sanfrancisco.png'),
  losangeles: require('../../assets/landmarks/losangeles.png'),
  chicago: require('../../assets/landmarks/chicago.png'),
  sydney: require('../../assets/landmarks/sydney.png'),
  switzerland: require('../../assets/landmarks/switzerland.png'),
  barcelona: require('../../assets/landmarks/barcelona.png'),
  venice: require('../../assets/landmarks/venice.png'),
  naples: require('../../assets/landmarks/naples.png'),
  kuwait: require('../../assets/landmarks/kuwait.png'),
  libya: require('../../assets/landmarks/libya.png'),
  damascus: require('../../assets/landmarks/damascus.png'),
  lebanon: require('../../assets/landmarks/lebanon.png'),
  giza: require('../../assets/landmarks/giza.png'),
};

const ALIASES: [string[], string][] = [
  [['doha', 'qatar'], 'doha'],
  [['dubai', 'burj'], 'dubai'],
  [['bahrain', 'manama'], 'bahrain'],
  [['jeddah'], 'jeddah'],
  [['muscat', 'oman'], 'muscat'],
  [['maldives', 'male', 'mahe', 'seychelles'], 'maldives'],
  [['london'], 'london'],
  [['paris', 'eiffel'], 'paris'],
  [['rome', 'roma'], 'rome'],
  [['milan', 'milano'], 'milan'],
  [['new york', 'nyc', 'manhattan', 'brooklyn'], 'newyork'],
  [['san francisco', 'golden gate', 'oakland'], 'sanfrancisco'],
  [['los angeles', 'hollywood'], 'losangeles'],
  [['chicago'], 'chicago'],
  [['sydney'], 'sydney'],
  [['switzerland', 'alps', 'zermatt', 'chamonix', 'geneva', 'zurich', 'interlaken'], 'switzerland'],
  [['barcelona'], 'barcelona'],
  [['venice', 'venezia'], 'venice'],
  [['naples', 'napoli'], 'naples'],
  [['kuwait'], 'kuwait'],
  [['libya', 'tripoli', 'benghazi'], 'libya'],
  [['damascus', 'syria'], 'damascus'],
  [['lebanon', 'beirut', 'baalbek'], 'lebanon'],
  [['giza', 'cairo', 'egypt', 'pyramid'], 'giza'],
];

export function landmarkImage(seed: string): any | null {
  const s = (seed || '').toLowerCase();
  for (const [keys, key] of ALIASES) {
    if (keys.some(k => s.includes(k))) return IMAGES[key];
  }
  return null;
}
