// Approved AITinerary mobile palette
// (see AITinerary-mobile-only-design.md §3)
export const colors = {
  canvas: '#F8FAF9', // app background
  surface: '#FFFFFF',
  surfaceAlt: '#F1F6F5',
  surfaceMuted: '#EAF0EE',
  ink: '#123C3A', // deep teal — headings and strong text
  inkSoft: '#172B3A', // main body text
  secondary: '#687784',
  muted: '#9AA5AC',
  line: '#E3EBEA',
  lineStrong: '#CFDAD8',
  forest: '#0D9C9A', // primary teal — primary actions + active navigation
  forestDeep: '#123C3A',
  teal: '#0D9C9A',
  tealSoft: '#DDF4F0', // soft teal highlight surfaces
  sage: '#63A08F',
  sageSoft: '#E3F0EB',
  clay: '#F0785A', // coral — small accents, used sparingly
  claySoft: '#FBE4DB',
  sand: '#F6E8D6',
  cream: '#FFF9F0',
  white: '#FFFFFF',
  success: '#25865A',
  danger: '#B94A48',
  dangerSoft: '#F7E3E2',
  warning: '#B7791F',
  warningSoft: '#F9EFDA',
  overlay: 'rgba(18, 60, 58, 0.55)',
};

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  black: 'Inter_800ExtraBold',
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const layout = {
  screenPadding: 20,
  maxWidth: 480,
  bottomNavSpace: 132,
};

const unsplash = (id: string, width = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=75`;

export const photos = {
  cebu: unsplash('photo-1559128010-7c1ad6e1b6a5'),
  manila: unsplash('photo-1518005020951-eccb494ad742'),
  palawan: unsplash('photo-1518509562904-e7ef99cdcc86'),
  bohol: unsplash('photo-1512100356356-de1b84283e18'),
  tokyo: unsplash('photo-1540959733332-eab4deabeeaf'),
  singapore: unsplash('photo-1525625293386-3f8f99389edd'),
  beach: unsplash('photo-1507525428034-b723cf961d3e'),
  beachQuiet: unsplash('photo-1439066615861-d1af74d74000'),
  sunset: unsplash('photo-1505228395891-9a51e7e86bf6'),
  island: unsplash('photo-1552465011-b4e21bf6e79a'),
  mountains: unsplash('photo-1501785888041-af3ef285b470'),
  lake: unsplash('photo-1476514525535-07fb3b4ae5f1'),
  nature: unsplash('photo-1469474968028-56623f02e42e'),
  food: unsplash('photo-1504674900247-0877df9cc836'),
  streetFood: unsplash('photo-1555939594-58d7cb561ad1'),
  culture: unsplash('photo-1528181304800-259b08848526'),
  resort: unsplash('photo-1540541338287-41700207dee6'),
  travel: unsplash('photo-1488646953014-85cb44e25828'),
  coffee: unsplash('photo-1495474472287-4d71bcdd2085'),
  landscape: unsplash('photo-1500530855697-b586d89ba3ee'),
  city: unsplash('photo-1525625293386-3f8f99389edd'),
  market: unsplash('photo-1533105079780-92b9be482077'),
};

export const photoForDestination = (destination = '', region = '') => {
  const key = `${region} ${destination}`.toLowerCase();
  if (key.includes('palawan') || key.includes('el nido') || key.includes('coron')) return photos.palawan;
  if (key.includes('bohol') || key.includes('chocolate')) return photos.bohol;
  if (key.includes('manila') || key.includes('makati') || key.includes('bgc')) return photos.manila;
  if (key.includes('cebu') || key.includes('mactan') || key.includes('lapu')) return photos.cebu;
  if (key.includes('tokyo') || key.includes('asakusa') || key.includes('shibuya') || key.includes('shinjuku')) return photos.tokyo;
  if (key.includes('singapore') || key.includes('marina') || key.includes('chinatown')) return photos.singapore;
  return photos.beach;
};

export const photoForTheme = (theme = '', index = 0) => {
  const key = theme.toLowerCase();
  if (key.includes('food') || key.includes('eat') || key.includes('market')) return photos.food;
  if (key.includes('culture') || key.includes('heritage') || key.includes('church')) return photos.culture;
  if (key.includes('mountain') || key.includes('hill') || key.includes('nature')) return photos.nature;
  if (key.includes('island') || key.includes('beach') || key.includes('coast')) return photos.beach;
  if (key.includes('city') || key.includes('urban')) return photos.city;
  return [photos.beach, photos.nature, photos.food, photos.culture][index % 4];
};

export const shadows = {
  soft: {
    shadowColor: '#1C2B20',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  lifted: {
    shadowColor: '#1C2B20',
    shadowOpacity: 0.12,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
  nav: {
    shadowColor: '#1C2B20',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
};

export const destinationPicks = [
  {
    id: 'cebu',
    label: 'Cebu',
    mood: 'Island + food',
    blurb: 'Reef mornings and lechon nights.',
    photo: photos.cebu,
    icon: 'sunny-outline' as const,
    coords: { latitude: 10.3157, longitude: 123.8854 },
  },
  {
    id: 'manila',
    label: 'Manila',
    mood: 'City + culture',
    blurb: 'Old walls, new galleries, late tables.',
    photo: photos.manila,
    icon: 'business-outline' as const,
    coords: { latitude: 14.5995, longitude: 120.9842 },
  },
  {
    id: 'palawan',
    label: 'Palawan',
    mood: 'Lagoon escape',
    blurb: 'Limestone coves and quiet water.',
    photo: photos.palawan,
    icon: 'boat-outline' as const,
    coords: { latitude: 9.8349, longitude: 118.7384 },
  },
  {
    id: 'bohol',
    label: 'Bohol',
    mood: 'Nature + beaches',
    blurb: 'Green hills, tarsiers, slow coasts.',
    photo: photos.bohol,
    icon: 'leaf-outline' as const,
    coords: { latitude: 9.6479, longitude: 123.8551 },
  },
  {
    id: 'tokyo',
    label: 'Tokyo',
    mood: 'City + culture',
    blurb: 'Temples, ramen, neon nights.',
    photo: photos.tokyo,
    icon: 'train-outline' as const,
    coords: { latitude: 35.6762, longitude: 139.6503 },
  },
  {
    id: 'singapore',
    label: 'Singapore',
    mood: 'Gardens + city',
    blurb: 'Hawker food and skyline walks.',
    photo: photos.singapore,
    icon: 'business-outline' as const,
    coords: { latitude: 1.3521, longitude: 103.8198 },
  },
];

export const heroHeadlines: Record<string, string> = {
  cebu: 'Island mornings,\ncity flavors.',
  manila: 'A big city with\na softer side.',
  palawan: 'Lagoons worth\nslowing down for.',
  bohol: 'Green hills and\nquiet coastlines.',
  tokyo: 'Neon nights and\ntemple mornings.',
  singapore: 'Gardens, hawkers,\nand skyline walks.',
};
