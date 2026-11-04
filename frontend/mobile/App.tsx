import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageBackground,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_600SemiBold_Italic,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  AppText,
  BottomNav,
  Button,
  Card,
  EmptyState,
  Field,
  IconBadge,
  MetaItem,
  ProgressBar,
  SectionHeader,
} from './ui';
import TripMap from './TripMap';
import type { TripMapStop } from './mapTypes';
import {
  colors,
  destinationPicks,
  fonts,
  heroHeadlines,
  layout,
  photoForDestination,
  photoForTheme,
  photos,
  radius,
  shadows,
} from './theme';

let MapView: any;
let Marker: any;

if (Platform.OS !== 'web') {
  const ReactNativeMaps = require('react-native-maps');
  MapView = ReactNativeMaps.default;
  Marker = ReactNativeMaps.Marker;
}

const resolveApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  if (Platform.OS === 'android') return 'http://10.0.2.2:8001';
  if (Platform.OS === 'ios') return 'http://127.0.0.1:8001';
  return 'http://localhost:8001';
};

const resolveGoogleMapsKey = () => {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  return key.trim();
};

const API_BASE_URL = resolveApiBaseUrl();
const API_FETCH_URL = `${API_BASE_URL}/trip/generate`;
const MAPS_CONFIG_URL = `${API_BASE_URL}/maps/config`;
const GOOGLE_MAPS_API_KEY = resolveGoogleMapsKey();

const STORAGE_KEYS = {
  savedTrips: '@aitinerary/saved-trips/v1',
  session: '@aitinerary/session/v1',
  onboardingSeen: '@aitinerary/onboarding-seen/v1',
} as const;

type StoredSession = {
  authenticated: boolean;
  name?: string;
  email?: string;
  guest?: boolean;
  token?: string;
};

type TabKey = 'plan' | 'saved' | 'insights' | 'profile';

type TripBrief = {
  destination: string;
  region?: string;
  days: number;
  budget: number;
  interests: string[];
  pace: 'relaxed' | 'balanced' | 'packed';
  travelers: 'solo' | 'couple' | 'family' | 'friends';
  month?: string;
  notes?: string;
};

const paceOptions: Array<'relaxed' | 'balanced' | 'packed'> = ['relaxed', 'balanced', 'packed'];
const travelerOptions: Array<'solo' | 'couple' | 'family' | 'friends'> = ['solo', 'couple', 'family', 'friends'];

const onboardingSlides = [
  {
    kicker: 'Plan with confidence',
    title: 'Build your perfect route',
    subtitle: 'A planner shaped around weather, pace, and the way you actually like to travel.',
    photo: photos.palawan,
  },
  {
    kicker: 'Made for the Philippines',
    title: 'Curated for island time',
    subtitle: 'From reef mornings to food-first city breaks, find ideas that fit your budget and energy.',
    photo: photos.bohol,
  },
  {
    kicker: 'Weather-aware by default',
    title: 'Travel with confidence',
    subtitle: 'See the best timing, route flow, backup plans, and spend breakdown before you commit.',
    photo: photos.beachQuiet,
  },
];


const vibes = ['Beach', 'Food', 'Culture', 'Adventure'];

type WeatherInfo = {
  temp: number;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

const fallbackWeather: Record<string, WeatherInfo> = {
  cebu: { temp: 28, label: 'clear', icon: 'sunny-outline' },
  manila: { temp: 31, label: 'city heat', icon: 'sunny-outline' },
  palawan: { temp: 29, label: 'calm seas', icon: 'partly-sunny-outline' },
  bohol: { temp: 27, label: 'light breeze', icon: 'partly-sunny-outline' },
  tokyo: { temp: 22, label: 'mild city', icon: 'cloud-outline' },
  singapore: { temp: 31, label: 'humid', icon: 'partly-sunny-outline' },
};

const describeWeatherCode = (code: number): Pick<WeatherInfo, 'label' | 'icon'> => {
  if (code === 0) return { label: 'clear', icon: 'sunny-outline' };
  if (code === 1 || code === 2) return { label: 'partly cloudy', icon: 'partly-sunny-outline' };
  if (code === 3) return { label: 'overcast', icon: 'cloud-outline' };
  if (code === 45 || code === 48) return { label: 'foggy', icon: 'cloud-outline' };
  if (code >= 51 && code <= 57) return { label: 'drizzle', icon: 'rainy-outline' };
  if (code >= 61 && code <= 67) return { label: 'rain', icon: 'rainy-outline' };
  if (code >= 80 && code <= 82) return { label: 'showers', icon: 'rainy-outline' };
  if (code >= 95) return { label: 'stormy', icon: 'thunderstorm-outline' };
  return { label: 'clear', icon: 'sunny-outline' };
};

const features = [
  {
    icon: 'earth-outline' as const,
    tone: 'forest' as const,
    title: 'Local-first routes',
    text: 'Built around communities and real local rhythm, not crowded tourist loops.',
  },
  {
    icon: 'time-outline' as const,
    tone: 'teal' as const,
    title: 'Smarter timing',
    text: 'Less traffic, better light, more energy left for the parts that matter.',
  },
  {
    icon: 'wallet-outline' as const,
    tone: 'clay' as const,
    title: 'Budget clarity',
    text: 'See where the money goes before you spend a single peso.',
  },
];

const formatNumber = (value: unknown) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return Math.round(number)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const formatPeso = (value: unknown) => `₱${formatNumber(value)}`;

const smallPhoto = (uri: string) => uri.replace('w=1200', 'w=700');

export default function App() {
  const [destination, setDestination] = useState('Cebu');
  const [region, setRegion] = useState('cebu');
  const [days, setDays] = useState('4');
  const [budget, setBudget] = useState('20000');
  const [notes, setNotes] = useState('Budget-friendly island hopping and local food');
  const [interests, setInterests] = useState<string[]>(['beach', 'food']);
  const [pace, setPace] = useState<'relaxed' | 'balanced' | 'packed'>('balanced');
  const [travelers, setTravelers] = useState<'solo' | 'couple' | 'family' | 'friends'>('solo');
  const [month, setMonth] = useState('June');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [selectedStop, setSelectedStop] = useState<{ dayIndex: number; stopIndex: number } | null>(null);
  const [mapsConfig, setMapsConfig] = useState<any>(null);
  const [liveWeather, setLiveWeather] = useState<WeatherInfo | null>(null);
  const [forecastWeather, setForecastWeather] = useState<{ temp: number; rainChance: number } | null>(null);
  const [mapStatus, setMapStatus] = useState<'openstreetmap' | 'google' | 'error'>('openstreetmap');
  const [isOnline, setIsOnline] = useState(true);
  const [savedTrips, setSavedTrips] = useState<any[]>([]);
  const [chatPrompt, setChatPrompt] = useState('Plan a 4-day Cebu trip for a couple with beaches and local food');
  const [chatLoading, setChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('plan');

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const [mapMode, setMapMode] = useState<'overview' | 'route' | 'stops'>('route');
  const [hydrated, setHydrated] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);
  const mapYRef = useRef(0);
  const formYRef = useRef(0);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_600SemiBold_Italic,
  });

  const isTripSaved = Boolean(
    result &&
      savedTrips.some(
        trip =>
          trip.destination === result.destination &&
          trip.region === result.region &&
          trip.summary === result.summary,
      ),
  );

  const fetchSavedTrips = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/trips/saved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data?.trips)) {
        setSavedTrips(
          data.trips.map((trip: any) => ({
            ...(trip.itinerary || {}),
            savedAt: trip.savedAt,
            savedId: trip.id,
          })),
        );
      }
    } catch {
      // Keep the current list if the backend is unavailable.
    }
  };

  const saveTripToBackend = async (token: string, itinerary: any) => {
    const response = await fetch(`${API_BASE_URL}/trips/saved`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itinerary }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.detail || 'Unable to save trip.');
    return data.id as number;
  };

  const deleteTripFromBackend = async (token: string, id: number) => {
    await fetch(`${API_BASE_URL}/trips/saved/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const update = () => setIsOnline(window.navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    const fetchMapsConfig = async () => {
      try {
        const response = await fetch(MAPS_CONFIG_URL);
        const data = await response.json();
        if (response.ok) setMapsConfig(data);
      } catch {
        setMapsConfig({
          google_maps_enabled: false,
          default_map_style: 'default',
          map_provider: 'openstreetmap',
          free_mode: true,
        });
      }
    };

    fetchMapsConfig();
  }, []);

  useEffect(() => {
    const coords =
      destinationPicks.find(pick => pick.id === region)?.coords ?? destinationPicks[0].coords;
    let active = true;

    setLiveWeather(null);
    setForecastWeather(null);

    const fetchWeather = async () => {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}` +
          `&longitude=${coords.longitude}&current=temperature_2m,weather_code&timezone=auto`;
        const response = await fetch(url);
        if (!response.ok) return;

        const data = await response.json();
        const current = data?.current;
        if (!active || typeof current?.temperature_2m !== 'number') return;

        const description = describeWeatherCode(Number(current.weather_code));
        setLiveWeather({
          temp: Math.round(current.temperature_2m),
          label: description.label,
          icon: description.icon,
        });
      } catch {
        // Keep the local fallback when the weather service is unavailable.
      }
    };

    const fetchForecast = async () => {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}` +
          `&longitude=${coords.longitude}&daily=temperature_2m_max,precipitation_probability_max&timezone=auto&forecast_days=7`;
        const response = await fetch(url);
        if (!response.ok) return;

        const data = await response.json();
        const maxes = data?.daily?.temperature_2m_max;
        const rains = data?.daily?.precipitation_probability_max;
        if (!active || !Array.isArray(maxes) || maxes.length === 0) return;

        const avgTemp = Math.round(
          maxes.reduce((sum: number, value: number) => sum + Number(value || 0), 0) / maxes.length,
        );
        const rainChance = Array.isArray(rains)
          ? Math.max(...rains.map((value: number) => Number(value || 0)))
          : 0;
        setForecastWeather({ temp: avgTemp, rainChance });
      } catch {
        // Keep the local fallback when the forecast service is unavailable.
      }
    };

    fetchWeather();
    fetchForecast();
    return () => {
      active = false;
    };
  }, [region]);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const [tripsRaw, sessionRaw, onboardingRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.savedTrips),
          AsyncStorage.getItem(STORAGE_KEYS.session),
          AsyncStorage.getItem(STORAGE_KEYS.onboardingSeen),
        ]);

        if (!active) return;

        if (tripsRaw) {
          const parsed = JSON.parse(tripsRaw);
          if (Array.isArray(parsed)) {
            setSavedTrips(parsed.filter((trip: any) => trip && Array.isArray(trip.days)));
          }
        }

        if (sessionRaw) {
          const session = JSON.parse(sessionRaw) as StoredSession;
          if (session?.authenticated) {
            setIsAuthenticated(true);
            setAuthName(session.name || '');
            setAuthEmail(session.email || '');
            setShowOnboarding(false);
            if (session.token) {
              setAuthToken(session.token);
              fetchSavedTrips(session.token).catch(() => {});
            }
          }
        }

        if (onboardingRaw === 'true') setShowOnboarding(false);
      } catch {
        // Missing or corrupt storage should never block the app.
      } finally {
        if (active) setHydrated(true);
      }
    };

    hydrate();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || authToken) return;
    AsyncStorage.setItem(STORAGE_KEYS.savedTrips, JSON.stringify(savedTrips)).catch(() => {});
  }, [savedTrips, hydrated, authToken]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: result ? 1 : 0,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [result, fadeAnim]);

  const scrollToTop = () => {
    (scrollRef.current as any)?.scrollTo?.({ y: 0, animated: true });
  };

  const changeTab = (tab: TabKey) => {
    setActiveTab(tab);
    scrollToTop();
  };

  const scrollToForm = () => {
    (scrollRef.current as any)?.scrollTo?.({ y: Math.max(0, formYRef.current - 12), animated: true });
  };

  const persistSession = (session: StoredSession) => {
    AsyncStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session)).catch(() => {});
  };

  const markOnboardingSeen = () => {
    setShowOnboarding(false);
    AsyncStorage.setItem(STORAGE_KEYS.onboardingSeen, 'true').catch(() => {});
  };

  const handleSignOut = () => {
    if (authToken) {
      fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
      setSavedTrips([]);
    }
    setIsAuthenticated(false);
    setAuthName('');
    setAuthEmail('');
    setAuthPassword('');
    setAuthToken(null);
    setActiveTab('plan');
    AsyncStorage.removeItem(STORAGE_KEYS.session).catch(() => {});
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload: TripBrief = {
        destination,
        region,
        days: Number(days),
        budget: Number(budget),
        interests,
        pace,
        travelers,
        month,
        notes,
      };

      const response = await fetch(API_FETCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail?.[0]?.msg ?? data?.error ?? 'Trip generation failed');
      }

      setResult(data);
      setActiveTab('plan');
      scrollToTop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleChatPlan = async () => {
    if (!chatPrompt.trim()) return;

    setChatLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: chatPrompt }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || 'Unable to generate a trip from this prompt.');

      if (data?.itinerary) {
        setResult(data.itinerary);
        setActiveTab('plan');
        scrollToTop();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setChatLoading(false);
    }
  };

  const handleAuthSubmit = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setError('Enter an email and password to continue.');
      return;
    }

    setError(null);
    try {
      const endpoint = authMode === 'signup' ? '/auth/signup' : '/auth/login';
      const body =
        authMode === 'signup'
          ? { name: authName.trim(), email: authEmail.trim(), password: authPassword }
          : { email: authEmail.trim(), password: authPassword };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || 'Unable to sign in.');

      setIsAuthenticated(true);
      setShowOnboarding(false);
      setAuthName(data.user?.name || authName.trim());
      setAuthEmail(data.user?.email || authEmail.trim());
      setAuthToken(data.token);
      persistSession({
        authenticated: true,
        name: data.user?.name || authName.trim(),
        email: data.user?.email || authEmail.trim(),
        guest: false,
        token: data.token,
      });
      await fetchSavedTrips(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleGuestContinue = () => {
    setError(null);
    setAuthName('');
    setAuthEmail('');
    setAuthToken(null);
    setIsAuthenticated(true);
    setShowOnboarding(false);
    persistSession({ authenticated: true, guest: true });
  };

  const handleShareTrip = async () => {
    if (!result) return;

    const summaryText = [
      `AITinerary: ${result.destination}`,
      `${result.summary}`,
      `Budget: ${formatPeso(result.total_budget)} • ${result.days?.length ?? 0} days`,
      'Planned with local weather-aware route logic.',
    ].join('\n');

    try {
      await Share.share({ message: summaryText, title: `${result.destination} itinerary` });
    } catch {
      setError('Unable to share this itinerary right now.');
    }
  };

  const toggleSaveTrip = async () => {
    if (!result) return;

    const alreadySaved = savedTrips.some(
      trip =>
        trip.destination === result.destination &&
        trip.region === result.region &&
        trip.summary === result.summary,
    );

    if (authToken) {
      const existing = savedTrips.find(
        trip =>
          trip.destination === result.destination &&
          trip.region === result.region &&
          trip.summary === result.summary,
      );

      try {
        if (alreadySaved && existing?.savedId) {
          await deleteTripFromBackend(authToken, existing.savedId);
          setSavedTrips(current =>
            current.filter(trip => trip.savedId !== existing.savedId),
          );
        } else if (!alreadySaved) {
          const id = await saveTripToBackend(authToken, { ...result, savedAt: Date.now() });
          setSavedTrips(current => [...current, { ...result, savedAt: Date.now(), savedId: id }]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to update saved trips.');
      }
      return;
    }

    setSavedTrips(current => {
      if (alreadySaved) {
        return current.filter(
          trip =>
            !(
              trip.destination === result.destination &&
              trip.region === result.region &&
              trip.summary === result.summary
            ),
        );
      }

      return [...current, { ...result, savedAt: Date.now() }];
    });
  };

  const openSavedTrip = (trip: any) => {
    setResult(trip);
    changeTab('plan');
  };

  const toggleVibe = (option: string) => {
    const value = option.toLowerCase();
    setInterests(current =>
      current.includes(value) ? current.filter(item => item !== value) : [...current, value],
    );
  };

  const freeMapMode = Boolean(
    mapsConfig?.free_mode ||
      (!mapsConfig?.google_maps_enabled && mapsConfig?.map_provider !== 'google'),
  );
  const canUseGoogleMaps = Boolean(mapsConfig?.google_maps_enabled);
  const nativeMapAvailable = Platform.OS !== 'web' && Boolean(MapView) && Boolean(Marker);
  const activePick = destinationPicks.find(pick => pick.id === region) ?? destinationPicks[0];
  const activePhoto = photoForDestination(destination, region);
  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
  const monthMatchesNow = month === currentMonthName;
  const activeWeather =
    monthMatchesNow && forecastWeather
      ? {
          temp: forecastWeather.temp,
          label: `${forecastWeather.rainChance}% rain`,
          icon: (forecastWeather.rainChance > 45 ? 'rainy-outline' : 'partly-sunny-outline') as WeatherInfo['icon'],
        }
      : liveWeather ?? fallbackWeather[region] ?? fallbackWeather.cebu;
  const tripDayCount = Number(days) || 0;

  const InlineError = ({ message }: { message: string }) => (
    <View style={styles.inlineError}>
      <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
      <AppText variant="caption" style={styles.inlineErrorText}>
        {message}
      </AppText>
    </View>
  );

  const renderTopBar = () => (
    <View style={styles.topBar}>
      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <Ionicons name="compass" size={19} color={colors.cream} />
        </View>
        <View>
          <AppText style={styles.brand}>AITinerary</AppText>
          <AppText variant="eyebrow" style={styles.subBrand}>
            Philippines, thoughtfully planned
          </AppText>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.avatarButton}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        onPress={handleSignOut}
      >
        <AppText style={styles.avatarInitial}>{(authName || 'A').charAt(0).toUpperCase()}</AppText>
      </TouchableOpacity>
    </View>
  );

  const renderOnboarding = () => {
    const slide = onboardingSlides[onboardingIndex];
    const isLast = onboardingIndex === onboardingSlides.length - 1;

    return (
      <View style={styles.onboardingScreen}>
        <ImageBackground source={{ uri: slide.photo }} style={styles.onboardingPhoto}>
          <LinearGradient
            colors={['rgba(15,26,18,0.42)', 'rgba(15,26,18,0.08)', 'rgba(15,26,18,0.9)']}
            locations={[0, 0.42, 1]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView style={styles.onboardingSafe}>
            <View style={styles.onboardingInner}>
              <View style={styles.onboardingBrand}>
                <View style={styles.brandMarkLight}>
                  <Ionicons name="compass" size={20} color={colors.forestDeep} />
                </View>
                <AppText style={styles.onboardingBrandText}>AITinerary</AppText>
              </View>

              <View style={styles.onboardingBottom}>
              <View style={styles.dotsRow}>
                {onboardingSlides.map((item, index) => (
                  <View
                    key={item.title}
                    style={[styles.dot, index === onboardingIndex && styles.dotActive]}
                  />
                ))}
              </View>

              <AppText variant="eyebrow" style={styles.onboardingKicker}>
                {slide.kicker}
              </AppText>
              <AppText variant="display" style={styles.onboardingTitle}>
                {slide.title}
              </AppText>
              <AppText variant="body" style={styles.onboardingText}>
                {slide.subtitle}
              </AppText>

              <View style={styles.onboardingActions}>
                <Button
                  label={isLast ? 'Get started' : 'Continue'}
                  icon="arrow-forward"
                  variant="light"
                  onPress={() => {
                    if (isLast) {
                      markOnboardingSeen();
                      return;
                    }
                    setOnboardingIndex(index => index + 1);
                  }}
                  style={styles.onboardingPrimary}
                />
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={markOnboardingSeen}
                  style={styles.onboardingSkip}
                >
                  <AppText variant="label" style={styles.onboardingSkipText}>
                    Skip
                  </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </ImageBackground>
      </View>
    );
  };

  const renderAuth = () => (
    <ScrollView
      style={styles.authScreen}
      contentContainerStyle={styles.authScroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.authShell}>
        <ImageBackground
          source={{ uri: photos.island }}
          style={styles.authHero}
          imageStyle={styles.authHeroImage}
        >
          <LinearGradient
            colors={['rgba(15,26,18,0.55)', 'rgba(15,26,18,0.15)', 'rgba(15,26,18,0.86)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.authHeroContent}>
            <View style={styles.authBrandRow}>
              <View style={styles.brandMarkLight}>
                <Ionicons name="compass" size={20} color={colors.forestDeep} />
              </View>
              <AppText style={styles.onboardingBrandText}>AITinerary</AppText>
            </View>

            <View>
              <AppText variant="eyebrow" style={styles.authKicker}>
                Your next escape
              </AppText>
              <AppText variant="display" style={styles.authTitle}>
                Plan smarter trips in minutes.
              </AppText>
              <AppText variant="bodySm" style={styles.authText}>
                From island-hopping to food-first city breaks, build a route that fits your pace and
                budget.
              </AppText>

              <View style={styles.authFeatureRow}>
                {['Local-first', 'Weather', 'Budget'].map(tag => (
                  <View key={tag} style={styles.authFeaturePill}>
                    <AppText variant="caption" style={styles.authFeatureText}>
                      {tag}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.authFormWrap}>
          <Card style={styles.authCard}>
            <View style={styles.segmented}>
              {(['signin', 'signup'] as const).map(mode => {
                const active = authMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    activeOpacity={0.85}
                    style={[styles.segment, active && styles.segmentActive]}
                    onPress={() => setAuthMode(mode)}
                  >
                    <AppText
                      variant="label"
                      style={[styles.segmentText, active && styles.segmentTextActive]}
                    >
                      {mode === 'signin' ? 'Sign in' : 'Sign up'}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {authMode === 'signup' ? (
              <Field label="Full name">
                <TextInput
                  style={styles.input}
                  value={authName}
                  onChangeText={setAuthName}
                  placeholder="Alex Reyes"
                  placeholderTextColor={colors.muted}
                />
              </Field>
            ) : null}

            <Field label="Email">
              <TextInput
                style={styles.input}
                value={authEmail}
                onChangeText={setAuthEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Field>

            <Field label="Password">
              <TextInput
                style={styles.input}
                value={authPassword}
                onChangeText={setAuthPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                secureTextEntry
              />
            </Field>

            <Button
              label={authMode === 'signin' ? 'Continue to planner' : 'Create account'}
              icon="arrow-forward"
              onPress={handleAuthSubmit}
            />

            <Button
              label="Explore as guest"
              variant="ghost"
              onPress={handleGuestContinue}
              style={styles.authGuest}
            />

            {error ? <InlineError message={error} /> : null}
          </Card>

          <AppText variant="caption" style={styles.authFootnote}>
            By continuing you agree to plan responsibly — and leave every place a little better.
          </AppText>
        </View>
      </View>
    </ScrollView>
  );

  const renderDiscoverHeader = () => (
    <View style={styles.discoverHeader}>
      <AppText variant="eyebrow">Discover</AppText>
      <AppText variant="display" style={styles.discoverTitle}>
        Where to next?
      </AppText>
      <AppText variant="body" style={styles.discoverText}>
        Routes shaped around real weather, local rhythm, and the way you like to travel.
      </AppText>
    </View>
  );

  const renderDestinationRail = () => (
    <View style={styles.railWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
      >
        {destinationPicks.map(pick => {
          const selected = region === pick.id;
          return (
            <TouchableOpacity
              key={pick.id}
              activeOpacity={0.9}
              style={[styles.destCard, selected && styles.destCardActive]}
              onPress={() => {
                setRegion(pick.id);
                setDestination(pick.label);
              }}
            >
              <ImageBackground
                source={{ uri: smallPhoto(pick.photo) }}
                style={styles.destPhoto}
                imageStyle={styles.destPhotoImage}
              >
                <LinearGradient
                  colors={['rgba(18,30,21,0.02)', 'rgba(18,30,21,0.8)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.destTop}>
                  {selected ? (
                    <View style={styles.destCheck}>
                      <Ionicons name="checkmark" size={13} color={colors.forestDeep} />
                    </View>
                  ) : (
                    <View style={styles.destTag}>
                      <Ionicons name={pick.icon} size={12} color={colors.white} />
                    </View>
                  )}
                </View>
                <View style={styles.destBottom}>
                  <AppText variant="h3" style={styles.destName}>
                    {pick.label}
                  </AppText>
                  <AppText variant="caption" style={styles.destMood}>
                    {pick.mood}
                  </AppText>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderHero = () => (
    <ImageBackground source={{ uri: activePhoto }} style={styles.hero} imageStyle={styles.heroImage}>
      <LinearGradient
        colors={['rgba(18,30,21,0.04)', 'rgba(18,30,21,0.24)', 'rgba(18,30,21,0.88)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroTop}>
        <View style={styles.heroPill}>
          <View style={styles.liveDot} />
          <AppText variant="eyebrow" style={styles.heroPillText}>
            Featured route
          </AppText>
        </View>
        <View style={styles.heroPill}>
          <Ionicons name="calendar-outline" size={13} color={colors.white} />
          <AppText variant="eyebrow" style={styles.heroPillText}>
            {month}
          </AppText>
        </View>
      </View>

      <View style={styles.heroBottom}>
        <AppText variant="hero" style={styles.heroTitle}>
          {heroHeadlines[region] || 'A route with room to breathe.'}
        </AppText>
        <AppText variant="bodySm" style={styles.heroSubtitle}>
          {activePick.blurb}
        </AppText>
        <View style={styles.heroMetaRow}>
          <MetaItem light icon="location-outline" label={`${destination}`} />
          <MetaItem light icon="calendar-outline" label={`${tripDayCount} days`} />
          <MetaItem
            light
            icon={activeWeather.icon}
            label={`${activeWeather.temp}° ${activeWeather.label}`}
          />
        </View>
        <TouchableOpacity activeOpacity={0.9} style={styles.heroCta} onPress={scrollToForm}>
          <AppText variant="label" style={styles.heroCtaText}>
            Start planning
          </AppText>
          <Ionicons name="arrow-down" size={15} color={colors.forestDeep} />
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );

  const renderTripBrief = () => (
    <View style={styles.plannerCard}>
      <View style={styles.plannerHead}>
        <View style={styles.plannerHeadText}>
          <AppText variant="eyebrow">Smart planner</AppText>
          <AppText variant="h1" style={styles.plannerTitle}>
            Say it simply.
          </AppText>
          <AppText variant="bodySm" style={styles.plannerIntro}>
            Four answers shape the route. The rest we work out.
          </AppText>
        </View>
        <View style={styles.plannerBadge}>
          <AppText variant="caption" style={styles.plannerBadgeText}>
            2 min
          </AppText>
        </View>
      </View>

      <View style={styles.plannerBlock}>
        <AppText variant="eyebrow" style={styles.plannerStep}>
          01 — Where
        </AppText>
        <View style={styles.plannerPlaceRow}>
          <View style={styles.plannerPlaceMain}>
            <TextInput
              style={styles.plannerHeadlineInput}
              value={destination}
              onChangeText={setDestination}
              placeholder="Cebu"
              placeholderTextColor={colors.lineStrong}
            />
            <AppText variant="caption">Destination</AppText>
          </View>
          <View style={styles.plannerPlaceSide}>
            <TextInput
              style={styles.plannerSideInput}
              value={region}
              onChangeText={setRegion}
              placeholder="cebu"
              placeholderTextColor={colors.lineStrong}
              autoCapitalize="none"
            />
            <AppText variant="caption">Region</AppText>
          </View>
        </View>
      </View>

      <View style={styles.plannerBlock}>
        <AppText variant="eyebrow" style={styles.plannerStep}>
          02 — Time & spend
        </AppText>
        <View style={styles.plannerFigureRow}>
          <View style={styles.plannerFigure}>
            <TextInput
              style={styles.plannerFigureInput}
              value={days}
              onChangeText={setDays}
              keyboardType="numeric"
              placeholder="4"
              placeholderTextColor={colors.lineStrong}
            />
            <AppText variant="caption">days</AppText>
          </View>
          <View style={styles.plannerFigureRule} />
          <View style={styles.plannerFigure}>
            <TextInput
              style={styles.plannerFigureInput}
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
              placeholder="20000"
              placeholderTextColor={colors.lineStrong}
            />
            <AppText variant="caption">peso budget</AppText>
          </View>
        </View>
        <View style={styles.plannerMonthRow}>
          <AppText variant="caption" style={styles.plannerMonthLabel}>
            Going in
          </AppText>
          <TextInput
            style={styles.plannerMonthInput}
            value={month}
            onChangeText={setMonth}
            placeholder="June"
            placeholderTextColor={colors.lineStrong}
          />
        </View>
      </View>

      <View style={styles.plannerBlock}>
        <AppText variant="eyebrow" style={styles.plannerStep}>
          03 — Style
        </AppText>

        <View style={styles.plannerVibeGrid}>
          {vibes.map(option => {
            const value = option.toLowerCase();
            const active = interests.includes(value);
            return (
              <TouchableOpacity
                key={option}
                activeOpacity={0.8}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                style={styles.plannerVibe}
                onPress={() => toggleVibe(option)}
              >
                <View style={[styles.plannerChoiceDot, active && styles.plannerChoiceDotActive]}>
                  {active ? <Ionicons name="checkmark" size={10} color={colors.white} /> : null}
                </View>
                <AppText
                  variant="bodySm"
                  style={[styles.plannerVibeText, active && styles.plannerVibeTextActive]}
                >
                  {option}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.plannerStyleRow}>
          <View style={styles.plannerStyleCol}>
            <AppText variant="caption" style={styles.plannerStyleLabel}>
              Pace
            </AppText>
            {paceOptions.map(option => {
              const active = pace === option;
              return (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={styles.plannerOptionRow}
                  onPress={() => setPace(option)}
                >
                  <View style={[styles.plannerOptionDot, active && styles.plannerOptionDotActive]} />
                  <AppText
                    variant="bodySm"
                    style={[styles.plannerOptionText, active && styles.plannerOptionTextActive]}
                  >
                    {option}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.plannerStyleCol}>
            <AppText variant="caption" style={styles.plannerStyleLabel}>
              Travelers
            </AppText>
            {travelerOptions.map(option => {
              const active = travelers === option;
              return (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={styles.plannerOptionRow}
                  onPress={() => setTravelers(option)}
                >
                  <View style={[styles.plannerOptionDot, active && styles.plannerOptionDotActive]} />
                  <AppText
                    variant="bodySm"
                    style={[styles.plannerOptionText, active && styles.plannerOptionTextActive]}
                  >
                    {option}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.plannerBlock}>
        <AppText variant="eyebrow" style={styles.plannerStep}>
          04 — Notes
        </AppText>
        <TextInput
          style={styles.plannerNotesInput}
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything the planner should know?"
          placeholderTextColor={colors.muted}
        />
      </View>

      <Button
        label={loading ? 'Planning your route…' : 'Generate itinerary'}
        icon="arrow-forward"
        loading={loading}
        onPress={handleGenerate}
      />

      {error ? <InlineError message={error} /> : null}
    </View>
  );

  const renderChatPlanner = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.chatHead}>
        <IconBadge name="sparkles-outline" tone="teal" size={44} />
        <View style={styles.chatHeadText}>
          <AppText variant="h3">Ask the planner</AppText>
          <AppText variant="caption">Describe it the way you would tell a friend.</AppText>
        </View>
      </View>

      <TextInput
        style={[styles.input, styles.chatInput]}
        placeholder="e.g. Plan a 4-day Cebu trip for a couple with beaches and local food"
        placeholderTextColor={colors.muted}
        value={chatPrompt}
        onChangeText={setChatPrompt}
        multiline
      />

      <Button
        label={chatLoading ? 'Thinking…' : 'Generate from prompt'}
        icon="sparkles-outline"
        variant="secondary"
        loading={chatLoading}
        onPress={handleChatPlan}
      />
    </Card>
  );

  const renderFeatures = () => (
    <Card padded={false} style={styles.featuresCard}>
      {features.map((feature, index) => (
        <View key={feature.title} style={[styles.featureRow, index > 0 && styles.featureRowBorder]}>
          <IconBadge name={feature.icon} tone={feature.tone} size={44} />
          <View style={styles.featureText}>
            <AppText variant="h3">{feature.title}</AppText>
            <AppText variant="bodySm" style={styles.featureBody}>
              {feature.text}
            </AppText>
          </View>
        </View>
      ))}
    </Card>
  );

  const renderPlanHome = () => (
    <>
      {renderDiscoverHeader()}
      {!isOnline ? (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
          <AppText variant="caption" style={styles.offlineBannerText}>
            You are offline. Saved trips and cached weather are still available.
          </AppText>
        </View>
      ) : null}
      {renderDestinationRail()}
      {renderHero()}
      <View
        onLayout={event => {
          formYRef.current = event.nativeEvent.layout.y + 8;
        }}
      >
        {renderTripBrief()}
      </View>
      {renderChatPlanner()}
      {renderFeatures()}
      <AppText variant="caption" style={styles.attribution}>
        Weather and forecast by Open-Meteo
      </AppText>
    </>
  );

  const renderLoading = () => (
    <Card padded={false} style={styles.loadingCard}>
      <ImageBackground
        source={{ uri: photos.island }}
        style={styles.loadingImage}
        imageStyle={styles.loadingImageStyle}
      >
        <LinearGradient
          colors={['rgba(18,30,21,0.15)', 'rgba(18,30,21,0.72)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.white} />
        </View>
      </ImageBackground>
      <View style={styles.loadingBody}>
        <AppText variant="eyebrow">Building your route</AppText>
        <AppText variant="h1" style={styles.loadingTitle}>
          Designing your route
        </AppText>
        <AppText variant="bodySm" style={styles.loadingText}>
          Checking pace, weather, and realistic local stops. This usually takes a few seconds.
        </AppText>
        <View style={styles.loadingDots}>
          <View style={styles.loadingDot} />
          <View style={[styles.loadingDot, styles.loadingDotSoft]} />
          <View style={[styles.loadingDot, styles.loadingDotFaint]} />
        </View>
      </View>
    </Card>
  );

  const renderStat = (label: string, value: string, accent = false, compact = false) => (
    <View
      key={label}
      style={[styles.statTile, compact && styles.statTileCompact, accent && styles.statTileAccent]}
    >
      <AppText variant="eyebrow" style={[styles.statLabel, accent && styles.statLabelAccent]}>
        {label}
      </AppText>
      <AppText variant="h3" style={[styles.statValue, accent && styles.statValueAccent]}>
        {value}
      </AppText>
    </View>
  );

  const renderDay = (day: any, dayIndex: number) => {
    const stops = day.stops || [];
    return (
      <Card key={`${day.day}-${dayIndex}`} padded={false} style={styles.dayCard}>
        <ImageBackground
          source={{ uri: smallPhoto(photoForTheme(day.theme, dayIndex)) }}
          style={styles.dayPhoto}
          imageStyle={styles.dayPhotoImage}
        >
          <LinearGradient
            colors={['rgba(18,30,21,0.05)', 'rgba(18,30,21,0.82)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.dayPhotoTop}>
            <View style={styles.dayBadge}>
              <AppText variant="eyebrow" style={styles.dayBadgeText}>
                Day {dayIndex + 1}
              </AppText>
            </View>
            <View style={styles.riskBadge}>
              <AppText variant="eyebrow" style={styles.riskBadgeText}>
                {day.risk?.level || 'balanced'}
              </AppText>
            </View>
          </View>
          <View style={styles.dayPhotoBottom}>
            <AppText variant="h2" style={styles.dayDate}>
              {day.date_label}
            </AppText>
            <AppText variant="bodySm" style={styles.dayTheme}>
              {day.theme}
            </AppText>
          </View>
        </ImageBackground>

        <View style={styles.dayBody}>
          <AppText variant="bodySm" style={styles.dayRisk}>
            {day.risk?.summary || 'Balanced pace with room for flexibility.'}
          </AppText>

          {(day.transport || []).length ? (
            <View style={styles.transportCard}>
              {(day.transport || []).map((leg: any, idx: number) => (
                <View
                  key={`${leg?.mode ?? 'leg'}-${idx}`}
                  style={[styles.transportLeg, idx > 0 && styles.transportLegBorder]}
                >
                  <View style={styles.transportIcon}>
                    <Ionicons name="navigate" size={13} color={colors.teal} />
                  </View>
                  <View style={styles.transportLegText}>
                    <AppText variant="label" style={styles.transportMode}>
                      {typeof leg === 'string' ? leg : leg?.mode || 'Transfer'}
                    </AppText>
                    {typeof leg === 'object' && leg?.from_location ? (
                      <AppText variant="caption" style={styles.transportRoute} numberOfLines={1}>
                        {leg.from_location} → {leg.to_location}
                      </AppText>
                    ) : null}
                  </View>
                  {typeof leg === 'object' ? (
                    <View style={styles.transportNumbers}>
                      <AppText variant="caption" style={styles.transportMeta}>
                        {leg.eta_minutes ? `${leg.eta_minutes} min` : 'Flexible'}
                      </AppText>
                      {leg.fare ? (
                        <AppText variant="caption" style={styles.transportFare}>
                          {formatPeso(leg.fare)}
                        </AppText>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.timeline}>
            {stops.map((stop: any, stopIndex: number) => {
              const last = stopIndex === stops.length - 1;
              return (
                <TouchableOpacity
                  key={`${stop.name}-${stopIndex}`}
                  activeOpacity={0.85}
                  style={styles.stopRow}
                  onPress={() => {
                    setSelectedStop({ dayIndex, stopIndex });
                    setMapExpanded(true);
                    setTimeout(() => {
                      (scrollRef.current as any)?.scrollTo?.({
                        y: Math.max(0, mapYRef.current - 24),
                        animated: true,
                      });
                    }, 350);
                  }}
                >
                  <View style={styles.timelineRail}>
                    <View style={styles.stopDot} />
                    {!last ? <View style={styles.timelineLine} /> : null}
                  </View>
                  <View style={styles.stopBody}>
                    <View style={styles.stopTop}>
                      <View style={styles.stopTimePill}>
                        <Ionicons name="time-outline" size={11} color={colors.teal} />
                        <AppText variant="caption" style={styles.stopTime}>
                          {stop.start_time || stop.time || 'Flexible'}
                          {stop.end_time ? ` – ${stop.end_time}` : ''}
                        </AppText>
                      </View>
                      <AppText variant="caption" style={styles.stopCategory}>
                        {stop.category}
                      </AppText>
                    </View>
                    <AppText variant="h3" style={styles.stopName}>
                      {stop.name}
                    </AppText>
                    <View style={styles.stopLocation}>
                      <Ionicons name="location-outline" size={13} color={colors.muted} />
                      <AppText variant="caption" style={styles.stopArea}>
                        {stop.area || day.theme}
                      </AppText>
                      <Ionicons name="chevron-forward" size={13} color={colors.muted} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.dayFooter}>
            <View>
              <AppText variant="eyebrow">Estimated</AppText>
              <AppText variant="h3" style={styles.dayCost}>
                {day.total_cost || day.estimated_cost
                  ? formatPeso(day.total_cost ?? day.estimated_cost)
                  : 'Local route'}
              </AppText>
            </View>
            {day.backup_plan ? (
              <View style={styles.backupPill}>
                <Ionicons name="umbrella-outline" size={13} color={colors.warning} />
                <AppText variant="caption" style={styles.backupText}>
                  Backup ready
                </AppText>
              </View>
            ) : null}
          </View>

          {day.backup_plan ? (
            <View style={styles.backupRow}>
              <Ionicons name="umbrella-outline" size={15} color={colors.warning} />
              <AppText variant="bodySm" style={styles.backupPlan}>
                {day.backup_plan}
              </AppText>
            </View>
          ) : null}
        </View>
      </Card>
    );
  };

  const renderMapCard = () => {
    const selectedDay = selectedStop ? result.days[selectedStop.dayIndex] : null;
    const selectedStopData = selectedDay?.stops?.[selectedStop?.stopIndex ?? 0];
    const totalStops = (result.days || []).reduce(
      (count: number, day: any) => count + (day.stops?.length || 0),
      0,
    );

    const regionPick =
      destinationPicks.find(
        pick =>
          pick.label.toLowerCase() === String(result.region || '').toLowerCase() ||
          pick.id === String(result.region || '').toLowerCase(),
      ) ||
      destinationPicks.find(
        pick => pick.label.toLowerCase() === String(result.destination || '').toLowerCase(),
      ) ||
      destinationPicks[0];

    const mapCenter = {
      latitude: regionPick.coords.latitude,
      longitude: regionPick.coords.longitude,
    };

    const resultMapStops: TripMapStop[] = (result.days || []).flatMap((day: any, dayIndex: number) =>
      (day.stops || []).map((stop: any, stopIndex: number) => {
        let latitude = Number(stop.latitude);
        let longitude = Number(stop.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          const ring = (dayIndex * 10 + stopIndex) * 0.37;
          latitude = regionPick.coords.latitude + Math.cos(ring) * 0.035;
          longitude = regionPick.coords.longitude + Math.sin(ring) * 0.045;
        }
        const category = String(stop.category || '');
        const color =
          /food/i.test(category)
            ? colors.clay
            : /beach|outdoor/i.test(category)
              ? colors.teal
              : colors.forest;
        return {
          id: `${dayIndex}-${stopIndex}`,
          latitude,
          longitude,
          title: String(stop.name || 'Stop'),
          area: stop.area,
          category: stop.category,
          color,
          day: dayIndex + 1,
          stopIndex,
        };
      }),
    );

    const openSelectedStopInMaps = () => {
      if (!selectedStopData) return;
      const query = encodeURIComponent(`${selectedStopData.name}, ${result.destination}`);
      const url =
        Platform.OS === 'ios'
          ? `http://maps.apple.com/?q=${query}`
          : `https://www.google.com/maps/search/?api=1&query=${query}`;
      Linking.openURL(url).catch(() => setError('Unable to open maps right now.'));
    };

    return (
      <View
        onLayout={event => {
          mapYRef.current = event.nativeEvent.layout.y + 70;
        }}
      >
        <Card style={styles.mapCard}>
        <View style={styles.mapHeaderRow}>
          <View>
            <AppText variant="eyebrow">Route map</AppText>
            <AppText variant="h2" style={styles.mapTitle}>
              {result.destination}
            </AppText>
          </View>
          <Button
            label={mapExpanded ? 'Hide' : 'View'}
            variant="secondary"
            onPress={() => setMapExpanded(!mapExpanded)}
            style={styles.mapToggle}
          />
        </View>

        <View style={styles.mapModeRow}>
          {(['overview', 'route', 'stops'] as const).map(mode => {
            const active = mapMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                activeOpacity={0.85}
                style={[styles.mapModePill, active && styles.mapModePillActive]}
                onPress={() => setMapMode(mode)}
              >
                <AppText
                  variant="caption"
                  style={[styles.mapModeText, active && styles.mapModeTextActive]}
                >
                  {mode}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.mapPreview}>
          <TripMap
            stops={resultMapStops}
            mode={mapMode}
            center={mapCenter}
            selectedId={selectedStop ? `${selectedStop.dayIndex}-${selectedStop.stopIndex}` : null}
            googleKey={GOOGLE_MAPS_API_KEY || undefined}
            onSelectStop={stop => {
              setSelectedStop({ dayIndex: stop.day - 1, stopIndex: stop.stopIndex });
              setMapExpanded(true);
              setTimeout(() => {
                (scrollRef.current as any)?.scrollTo?.({
                  y: Math.max(0, mapYRef.current - 24),
                  animated: true,
                });
              }, 350);
            }}
            onStatus={setMapStatus}
          />
        </View>

        <View style={styles.mapStatusRow}>
          <View style={[styles.mapStatusDot, mapStatus !== 'error' && styles.mapStatusDotActive]} />
          <AppText variant="caption" style={styles.mapStatusText}>
            {mapStatus === 'google'
              ? 'Google Maps live'
              : mapStatus === 'openstreetmap'
                ? 'OpenStreetMap live · 0 cost'
                : 'Map preview'}
          </AppText>
        </View>

        {mapExpanded ? (
          <View style={styles.mapExpandedPanel}>
            {selectedStop && selectedStopData ? (
              <>
                <View style={styles.mapInfoRow}>
                  <AppText variant="caption" style={styles.mapInfoLabel}>
                    Selected stop
                  </AppText>
                  <AppText variant="label" style={styles.mapInfoValue}>
                    {selectedStopData.name}
                  </AppText>
                </View>
                <View style={styles.mapInfoRow}>
                  <AppText variant="caption" style={styles.mapInfoLabel}>
                    Area
                  </AppText>
                  <AppText variant="label" style={styles.mapInfoValue}>
                    {selectedStopData.area || selectedDay?.theme || 'Local route'}
                  </AppText>
                </View>
                <View style={styles.mapInfoRow}>
                  <AppText variant="caption" style={styles.mapInfoLabel}>
                    Timing
                  </AppText>
                  <AppText variant="label" style={styles.mapInfoValue}>
                    {selectedDay?.date_label || 'Flexible'}
                  </AppText>
                </View>
                <View style={styles.mapActionRow}>
                  <Button
                    label="Open in Maps"
                    icon="navigate-outline"
                    onPress={openSelectedStopInMaps}
                    style={styles.mapActionPrimary}
                  />
                  <Button
                    label="Share"
                    variant="secondary"
                    onPress={handleShareTrip}
                    style={styles.mapActionSecondary}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.mapInfoRow}>
                  <AppText variant="caption" style={styles.mapInfoLabel}>
                    Best loop
                  </AppText>
                  <AppText variant="label" style={styles.mapInfoValue}>
                    Beach + heritage
                  </AppText>
                </View>
                <View style={styles.mapInfoRow}>
                  <AppText variant="caption" style={styles.mapInfoLabel}>
                    Transfer
                  </AppText>
                  <AppText variant="label" style={styles.mapInfoValue}>
                    Fastest by van + tricycle
                  </AppText>
                </View>
                <View style={styles.mapInfoRow}>
                  <AppText variant="caption" style={styles.mapInfoLabel}>
                    Stops
                  </AppText>
                  <AppText variant="label" style={styles.mapInfoValue}>
                    {totalStops} places
                  </AppText>
                </View>
                <View style={styles.routeLegend}>
                  <View style={styles.routeLegendItem}>
                    <View style={[styles.routeLegendDot, { backgroundColor: colors.forest }]} />
                    <AppText variant="caption">Beach</AppText>
                  </View>
                  <View style={styles.routeLegendItem}>
                    <View style={[styles.routeLegendDot, { backgroundColor: colors.clay }]} />
                    <AppText variant="caption">Food</AppText>
                  </View>
                  <View style={styles.routeLegendItem}>
                    <View style={[styles.routeLegendDot, { backgroundColor: colors.teal }]} />
                    <AppText variant="caption">Culture</AppText>
                  </View>
                </View>
              </>
            )}
          </View>
        ) : null}
        </Card>
      </View>
    );
  };

  const renderResult = () => {
    const budgetItems = [
      { label: 'Stay', value: result.budget_summary?.accommodation ?? 0, color: colors.forest },
      { label: 'Food', value: result.budget_summary?.food ?? 0, color: colors.teal },
      { label: 'Transport', value: result.budget_summary?.transport ?? 0, color: colors.clay },
      { label: 'Activities', value: result.budget_summary?.activities ?? 0, color: colors.sage },
    ];
    const budgetTotal = Math.max(
      Number(result.total_budget) || 0,
      budgetItems.reduce((sum, item) => sum + Number(item.value || 0), 0),
    );
    const totalStops = (result.days || []).reduce(
      (count: number, day: any) => count + (day.stops?.length || 0),
      0,
    );

    return (
      <Animated.View
        style={[
          styles.resultWrap,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
            ],
          },
        ]}
      >
        <ImageBackground
          source={{ uri: photoForDestination(result.destination, result.region) }}
          style={styles.resultHero}
          imageStyle={styles.resultHeroImage}
        >
          <LinearGradient
            colors={['rgba(18,30,21,0.12)', 'rgba(18,30,21,0.22)', 'rgba(18,30,21,0.9)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.resultHeroTop}>
            <View style={styles.glassPill}>
              <Ionicons name="sparkles" size={13} color={colors.cream} />
              <AppText variant="eyebrow" style={styles.glassText}>
                AI planned
              </AppText>
            </View>

            <View style={styles.resultActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.glassIcon}
                onPress={handleShareTrip}
              >
                <Ionicons name="share-outline" size={18} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.glassPill, isTripSaved && styles.savedPill]}
                onPress={toggleSaveTrip}
              >
                <Ionicons
                  name={isTripSaved ? 'bookmark' : 'bookmark-outline'}
                  size={15}
                  color={isTripSaved ? colors.forestDeep : colors.white}
                />
                <AppText
                  variant="eyebrow"
                  style={[styles.glassText, isTripSaved && styles.savedText]}
                >
                  {isTripSaved ? 'Saved' : 'Save'}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.resultHeroBottom}>
            <AppText variant="eyebrow" style={styles.resultKicker}>
              Your plan
            </AppText>
            <AppText variant="display" style={styles.resultTitle}>
              {result.destination}
            </AppText>
            <View style={styles.heroMetaRow}>
              <MetaItem light icon="location-outline" label={result.region} />
              <MetaItem light icon="calendar-outline" label={`${result.days?.length ?? 0} days`} />
              <MetaItem light icon="people-outline" label={travelers} />
            </View>
          </View>
        </ImageBackground>

        <Card style={styles.overlapCard}>
          <AppText variant="body">{result.summary}</AppText>
          <View style={styles.overlapDivider} />
          <View style={styles.statGrid}>
            {renderStat('Budget', formatPeso(result.total_budget))}
            {renderStat('Pace', pace)}
            {renderStat('Travelers', travelers)}
            {renderStat('Left', formatPeso(result.remaining_budget), true)}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <SectionHeader
            eyebrow="Where it goes"
            title="Budget snapshot"
            meta={`${formatPeso(result.total_budget)} total`}
          />
          {budgetItems.map(item => (
            <View key={item.label} style={styles.budgetItem}>
              <View style={styles.budgetTop}>
                <AppText variant="label">{item.label}</AppText>
                <AppText variant="h3" style={styles.budgetValue}>
                  {formatPeso(item.value)}
                </AppText>
              </View>
              <ProgressBar
                value={budgetTotal ? (Number(item.value) / budgetTotal) * 100 : 0}
                color={item.color}
              />
            </View>
          ))}
        </Card>

        {(result.reasoning || []).length ? (
          <Card style={styles.sectionCard}>
            <AppText variant="eyebrow">Why this works</AppText>
            <AppText variant="h2" style={styles.reasonTitle}>
              Built for the way you travel.
            </AppText>
            <View style={styles.reasonList}>
              {(result.reasoning || []).map((item: string, idx: number) => (
                <View key={`${item}-${idx}`} style={styles.reasonRowItem}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.teal} />
                  <AppText variant="bodySm" style={styles.reasonText}>
                    {item}
                  </AppText>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <View style={styles.tripActions}>
          <Button
            label="Plan another"
            variant="secondary"
            onPress={() => {
              setResult(null);
              setMapExpanded(false);
              setSelectedStop(null);
              scrollToTop();
            }}
            style={styles.tripAction}
          />
          <Button
            label="Share"
            icon="share-outline"
            onPress={handleShareTrip}
            style={styles.tripAction}
          />
        </View>

        <View style={styles.blockHeader}>
          <View>
            <AppText variant="eyebrow">The route</AppText>
            <AppText variant="h1" style={styles.blockTitle}>
              Day by day
            </AppText>
          </View>
          <AppText variant="caption">
            {result.days?.length ?? 0} days · {totalStops} stops
          </AppText>
        </View>

        {(result.days || []).map((day: any, dayIndex: number) => renderDay(day, dayIndex))}

        {renderMapCard()}
      </Animated.View>
    );
  };

  const renderSaved = () => {
    const plannedValue = savedTrips.reduce(
      (sum, trip) => sum + (Number(trip.total_budget) || 0),
      0,
    );

    return (
      <>
        <View style={styles.screenHeader}>
          <AppText variant="eyebrow">Library</AppText>
          <AppText variant="display" style={styles.screenTitle}>
            Saved plans
          </AppText>
          <AppText variant="body">
            Your keepers, ready for the next time plans change.
          </AppText>
        </View>

        {savedTrips.length ? (
          <View style={styles.savedSummaryRow}>
            <View style={styles.savedSummaryPill}>
              <AppText variant="caption">
                {savedTrips.length === 1 ? '1 plan' : `${savedTrips.length} plans`}
              </AppText>
            </View>
            <View style={styles.savedSummaryPill}>
              <AppText variant="caption">{formatPeso(plannedValue)} planned</AppText>
            </View>
          </View>
        ) : null}

        <Card padded={false} style={styles.savedCard}>
          {savedTrips.length ? (
            savedTrips.map((trip, index) => (
              <TouchableOpacity
                key={`${trip.destination}-${index}`}
                activeOpacity={0.85}
                style={[styles.savedRow, index > 0 && styles.savedRowBorder]}
                onPress={() => openSavedTrip(trip)}
              >
                <Image
                  source={{ uri: smallPhoto(photoForDestination(trip.destination, trip.region)) }}
                  style={styles.savedThumb}
                />
                <View style={styles.savedRowText}>
                  <AppText variant="h3">{trip.destination}</AppText>
                  <AppText variant="caption" style={styles.savedMeta}>
                    {trip.region} · {trip.days?.length ?? 0} days ·{' '}
                    {formatPeso(trip.total_budget)}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </TouchableOpacity>
            ))
          ) : (
            <EmptyState
              icon="bookmark-outline"
              title="No saved trips yet"
              text="Generate a route and save the plan you want to revisit later."
              actionLabel="Plan a trip"
              onAction={() => changeTab('plan')}
            />
          )}
        </Card>
      </>
    );
  };

  const renderInsights = () => (
    <>
      <View style={styles.screenHeader}>
        <AppText variant="eyebrow">Travel intelligence</AppText>
        <AppText variant="display" style={styles.screenTitle}>
          Better trips, by design.
        </AppText>
        <AppText variant="body">
          The details that make a route feel effortless — before you ever leave.
        </AppText>
      </View>

      <ImageBackground
        source={{ uri: photos.sunset }}
        style={styles.insightHero}
        imageStyle={styles.insightHeroImage}
      >
        <LinearGradient
          colors={['rgba(18,30,21,0.08)', 'rgba(18,30,21,0.85)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.insightHeroBottom}>
          <AppText variant="eyebrow" style={styles.insightHeroKicker}>
            The planner's note
          </AppText>
          <AppText variant="h1" style={styles.insightHeroTitle}>
            Good trips are timed, not rushed.
          </AppText>
          <AppText variant="bodySm" style={styles.insightHeroText}>
            We build around light, weather windows, and how long a place actually deserves.
          </AppText>
        </View>
      </ImageBackground>

      <Card style={styles.sectionCard}>
        <View style={styles.insightRow}>
          <IconBadge name="partly-sunny-outline" tone="teal" size={44} />
          <View style={styles.insightTextWrap}>
            <AppText variant="h3">Weather-aware days</AppText>
            <AppText variant="bodySm">
              Outdoor stops move to the clearest windows, with indoor backups already in place.
            </AppText>
          </View>
        </View>
        <View style={[styles.insightRow, styles.insightRowBorder]}>
          <IconBadge name="restaurant-outline" tone="clay" size={44} />
          <View style={styles.insightTextWrap}>
            <AppText variant="h3">Local flavor, not checklists</AppText>
            <AppText variant="bodySm">
              Every route includes neighborhood tables and hidden gems, not just the obvious stops.
            </AppText>
          </View>
        </View>
        <View style={[styles.insightRow, styles.insightRowBorder]}>
          <IconBadge name="git-compare-outline" tone="forest" size={44} />
          <View style={styles.insightTextWrap}>
            <AppText variant="h3">Route logic that flows</AppText>
            <AppText variant="bodySm">
              Stops are grouped by area, pace, and time so you spend less of the day moving.
            </AppText>
          </View>
        </View>
      </Card>

      <Card style={styles.tipCard}>
        <View style={styles.tipHeader}>
          <Ionicons name="bulb-outline" size={18} color={colors.clay} />
          <AppText variant="eyebrow" style={styles.tipKicker}>
            This month
          </AppText>
        </View>
        <AppText variant="h2" style={styles.tipTitle}>
          Go early, stay late.
        </AppText>
        <AppText variant="bodySm">
          Shoulder-season mornings are calmer and cooler. Book the first boat out, then leave the
          afternoon open for a long lunch.
        </AppText>
      </Card>
    </>
  );

  const renderProfile = () => {
    const uniqueRegions = new Set(savedTrips.map(trip => trip.region)).size;
    const plannedValue = savedTrips.reduce(
      (sum, trip) => sum + (Number(trip.total_budget) || 0),
      0,
    );

    return (
      <>
        <View style={styles.screenHeader}>
          <AppText variant="eyebrow">Account</AppText>
          <AppText variant="display" style={styles.screenTitle}>
            Your travel profile
          </AppText>
        </View>

        <View style={styles.profileHero}>
          <View style={styles.profileGlow} />
          <View style={styles.profileHeroTop}>
            <View style={styles.profileAvatar}>
              <AppText style={styles.profileAvatarText}>
                {(authName || 'A').charAt(0).toUpperCase()}
              </AppText>
            </View>
            <View style={styles.profilePill}>
              <AppText variant="eyebrow" style={styles.profilePillText}>
                Explorer
              </AppText>
            </View>
          </View>
          <AppText variant="h1" style={styles.profileName}>
            {authName || 'Aiko Traveler'}
          </AppText>
          <AppText variant="bodySm" style={styles.profileEmail}>
            {authEmail || 'travel@aitinerary.app'}
          </AppText>
        </View>

        <View style={styles.profileStats}>
          {renderStat('Planned', `${savedTrips.length}`, false, true)}
          {renderStat('Regions', `${uniqueRegions}`, false, true)}
          {renderStat('Value', formatPeso(plannedValue), false, true)}
        </View>

        <Card style={styles.sectionCard}>
          <SectionHeader eyebrow="Defaults" title="Preferences" />
          <View style={styles.preferenceRow}>
            <AppText variant="bodySm">Ideal pace</AppText>
            <AppText variant="label" style={styles.preferenceValue}>
              {pace}
            </AppText>
          </View>
          <View style={styles.preferenceRow}>
            <AppText variant="bodySm">Travel mode</AppText>
            <AppText variant="label" style={styles.preferenceValue}>
              {travelers}
            </AppText>
          </View>
          <View style={[styles.preferenceRow, styles.preferenceRowLast]}>
            <AppText variant="bodySm">Home base</AppText>
            <AppText variant="label" style={styles.preferenceValue}>
              {destination}
            </AppText>
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <SectionHeader eyebrow="Library" title="Recent plans" />
          {savedTrips.length ? (
            savedTrips.slice(0, 3).map((trip, index) => (
              <TouchableOpacity
                key={`${trip.destination}-${index}`}
                activeOpacity={0.85}
                style={[styles.libraryRow, index > 0 && styles.libraryRowBorder]}
                onPress={() => openSavedTrip(trip)}
              >
                <View style={styles.libraryDot} />
                <View style={styles.libraryText}>
                  <AppText variant="h3">{trip.destination}</AppText>
                  <AppText variant="caption">
                    {trip.days?.length ?? 0} days · {formatPeso(trip.total_budget)}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </TouchableOpacity>
            ))
          ) : (
            <AppText variant="bodySm" style={styles.libraryEmpty}>
              Your saved plans will live here.
            </AppText>
          )}
        </Card>

        <Button
          label="Sign out"
          variant="secondary"
          icon="log-out-outline"
          onPress={handleSignOut}
        />
      </>
    );
  };

  const renderMain = () => (
    <SafeAreaView style={styles.main}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.appShell}>
          {renderTopBar()}
          {activeTab === 'plan' ? (loading ? renderLoading() : result ? renderResult() : renderPlanHome()) : null}
          {activeTab === 'saved' ? renderSaved() : null}
          {activeTab === 'insights' ? renderInsights() : null}
          {activeTab === 'profile' ? renderProfile() : null}

          {activeTab === 'plan' && result && error ? <InlineError message={error} /> : null}
        </View>
      </ScrollView>

      <BottomNav active={activeTab} onChange={changeTab} />
    </SafeAreaView>
  );

  if (!fontsLoaded || !hydrated) {
    return (
      <View style={styles.fontSplash}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator color={colors.forest} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={showOnboarding && !isAuthenticated ? 'light-content' : isAuthenticated ? 'dark-content' : 'light-content'} />
      {showOnboarding && !isAuthenticated
        ? renderOnboarding()
        : !isAuthenticated
          ? renderAuth()
          : renderMain()}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  main: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  fontSplash: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 10,
    paddingBottom: layout.bottomNavSpace,
  },
  appShell: {
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
    paddingTop: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkLight: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.5,
    color: colors.ink,
  },
  subBrand: {
    fontSize: 8.5,
    letterSpacing: 1.1,
    marginTop: 2,
    color: colors.muted,
  },
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  avatarInitial: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.forest,
  },

  discoverHeader: {
    marginBottom: 20,
  },
  discoverTitle: {
    marginTop: 6,
    marginBottom: 10,
  },
  discoverText: {
    maxWidth: 360,
  },

  railWrap: {
    marginHorizontal: -layout.screenPadding,
    marginBottom: 22,
  },
  railContent: {
    paddingHorizontal: layout.screenPadding,
    gap: 12,
  },
  destCard: {
    width: 148,
    height: 196,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  destCardActive: {
    borderColor: colors.forest,
    ...shadows.soft,
  },
  destPhoto: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 12,
  },
  destPhotoImage: {
    borderRadius: radius.lg - 2,
  },
  destTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  destCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destTag: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destBottom: {
    gap: 2,
  },
  destName: {
    color: colors.white,
  },
  destMood: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
  },

  hero: {
    height: 372,
    borderRadius: radius.xl,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 20,
    marginBottom: 22,
    backgroundColor: colors.forestDeep,
  },
  heroImage: {
    borderRadius: radius.xl,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  heroPillText: {
    color: colors.white,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.sand,
  },
  heroBottom: {
    gap: 8,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 36,
    lineHeight: 42,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    maxWidth: 300,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'flex-start',
    gap: 10,
    backgroundColor: colors.cream,
    borderRadius: radius.pill,
    paddingVertical: 11,
    paddingHorizontal: 18,
    marginTop: 14,
  },
  heroCtaText: {
    color: colors.forestDeep,
    fontSize: 13,
  },

  sectionCard: {
    marginBottom: 18,
  },
  plannerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 22,
    marginBottom: 18,
  },
  plannerHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  plannerHeadText: {
    flex: 1,
  },
  plannerTitle: {
    marginTop: 6,
    marginBottom: 8,
  },
  plannerIntro: {
    maxWidth: 270,
  },
  plannerBadge: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 9,
    marginTop: 2,
  },
  plannerBadgeText: {
    fontSize: 10,
  },
  plannerBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 16,
    marginTop: 20,
  },
  plannerStep: {
    color: colors.clay,
    letterSpacing: 1.1,
  },
  plannerPlaceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 18,
    marginTop: 4,
  },
  plannerPlaceMain: {
    flex: 1,
  },
  plannerHeadlineInput: {
    fontFamily: fonts.serif,
    fontSize: 33,
    lineHeight: 40,
    letterSpacing: -0.5,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineStrong,
    paddingVertical: 3,
    paddingHorizontal: 0,
    marginBottom: 6,
  },
  plannerPlaceSide: {
    width: 96,
  },
  plannerSideInput: {
    fontFamily: fonts.medium,
    fontSize: 14.5,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 6,
  },
  plannerFigureRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    marginTop: 6,
  },
  plannerFigure: {
    flex: 1,
  },
  plannerFigureInput: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineStrong,
    paddingVertical: 2,
    paddingHorizontal: 0,
    marginBottom: 6,
  },
  plannerFigureRule: {
    width: 1,
    height: 44,
    backgroundColor: colors.line,
    marginBottom: 22,
  },
  plannerMonthRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  plannerMonthLabel: {
    marginBottom: 6,
  },
  plannerMonthInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  plannerVibeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  plannerVibe: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  plannerChoiceDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plannerChoiceDotActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  plannerVibeText: {
    color: colors.muted,
  },
  plannerVibeTextActive: {
    color: colors.ink,
    fontFamily: fonts.semibold,
  },
  plannerStyleRow: {
    flexDirection: 'row',
    gap: 22,
    marginTop: 14,
  },
  plannerStyleCol: {
    flex: 1,
  },
  plannerStyleLabel: {
    marginBottom: 4,
  },
  plannerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 5,
  },
  plannerOptionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.lineStrong,
  },
  plannerOptionDotActive: {
    backgroundColor: colors.clay,
  },
  plannerOptionText: {
    color: colors.muted,
    textTransform: 'capitalize',
  },
  plannerOptionTextActive: {
    color: colors.ink,
    fontFamily: fonts.semibold,
  },
  plannerNotesInput: {
    fontFamily: fonts.regular,
    fontSize: 14.5,
    lineHeight: 22,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 8,
    paddingHorizontal: 0,
    minHeight: 64,
    textAlignVertical: 'top',
    marginTop: 4,
    marginBottom: 18,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 15,
    paddingVertical: 13,
    color: colors.ink,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  chatInput: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: 14,
    marginBottom: 4,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  colHalf: {
    flex: 1,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chatHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  chatHeadText: {
    flex: 1,
    gap: 2,
  },
  featuresCard: {
    marginBottom: 18,
    overflow: 'hidden',
  },
  attribution: {
    textAlign: 'center',
    fontSize: 10.5,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 6,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  offlineBannerText: {
    flex: 1,
    color: colors.warning,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 18,
  },
  featureRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  featureText: {
    flex: 1,
    gap: 3,
  },
  featureBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    padding: 12,
    marginTop: 12,
  },
  inlineErrorText: {
    color: colors.danger,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },

  loadingCard: {
    overflow: 'hidden',
    marginBottom: 18,
  },
  loadingImage: {
    height: 176,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingImageStyle: {
    borderTopLeftRadius: radius.lg - 1,
    borderTopRightRadius: radius.lg - 1,
  },
  loadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBody: {
    padding: 22,
  },
  loadingTitle: {
    marginTop: 6,
    marginBottom: 8,
  },
  loadingText: {
    maxWidth: 320,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 18,
  },
  loadingDot: {
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.forest,
  },
  loadingDotSoft: {
    opacity: 0.45,
  },
  loadingDotFaint: {
    opacity: 0.2,
  },

  resultWrap: {
    paddingBottom: 12,
  },
  resultHero: {
    height: 322,
    borderRadius: radius.xl,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: colors.forestDeep,
  },
  resultHeroImage: {
    borderRadius: radius.xl,
  },
  resultHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
  },
  glassText: {
    color: colors.white,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  glassIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedPill: {
    backgroundColor: colors.cream,
    borderColor: colors.cream,
  },
  savedText: {
    color: colors.forestDeep,
  },
  resultHeroBottom: {
    gap: 4,
  },
  resultKicker: {
    color: 'rgba(255,255,255,0.78)',
  },
  resultTitle: {
    color: colors.white,
    marginBottom: 6,
  },
  overlapCard: {
    marginTop: -34,
    marginHorizontal: 12,
    marginBottom: 18,
  },
  overlapDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 16,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statTile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 14,
    gap: 6,
  },
  statTileCompact: {
    flexBasis: '28%',
    padding: 12,
  },
  statTileAccent: {
    backgroundColor: colors.forest,
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 1.1,
    color: colors.muted,
  },
  statLabelAccent: {
    color: 'rgba(255,255,255,0.7)',
  },
  statValue: {
    color: colors.ink,
    textTransform: 'capitalize',
  },
  statValueAccent: {
    color: colors.white,
  },
  budgetItem: {
    marginBottom: 14,
    gap: 7,
  },
  budgetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetValue: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  reasonTitle: {
    marginTop: 6,
    marginBottom: 14,
  },
  reasonList: {
    gap: 8,
  },
  reasonRowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  reasonText: {
    color: colors.inkSoft,
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  tripActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 26,
  },
  tripAction: {
    flex: 1,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
    gap: 12,
  },
  blockTitle: {
    marginTop: 4,
  },
  dayCard: {
    marginBottom: 18,
    overflow: 'hidden',
  },
  dayPhoto: {
    height: 168,
    justifyContent: 'space-between',
    padding: 16,
  },
  dayPhotoImage: {
    borderTopLeftRadius: radius.lg - 1,
    borderTopRightRadius: radius.lg - 1,
  },
  dayPhotoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  dayBadgeText: {
    color: colors.white,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  riskBadge: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  riskBadgeText: {
    color: colors.warning,
    fontSize: 9,
    letterSpacing: 1,
  },
  dayPhotoBottom: {
    gap: 3,
  },
  dayDate: {
    color: colors.white,
  },
  dayTheme: {
    color: 'rgba(255,255,255,0.82)',
  },
  dayBody: {
    padding: 18,
    gap: 14,
  },
  dayRisk: {
    color: colors.inkSoft,
  },
  transportCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  transportLeg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  transportLegBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  transportIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportLegText: {
    flex: 1,
    gap: 1,
  },
  transportMode: {
    textTransform: 'capitalize',
    fontSize: 11.5,
  },
  transportRoute: {
    fontSize: 10.5,
  },
  transportNumbers: {
    alignItems: 'flex-end',
    gap: 1,
  },
  transportMeta: {
    fontSize: 10.5,
  },
  transportFare: {
    fontSize: 10.5,
    color: colors.inkSoft,
  },
  timeline: {
    gap: 0,
  },
  stopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineRail: {
    width: 14,
    alignItems: 'center',
  },
  stopDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.clay,
    borderWidth: 2,
    borderColor: colors.white,
    marginTop: 5,
    shadowColor: colors.clay,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: colors.line,
    marginTop: 4,
  },
  stopBody: {
    flex: 1,
    paddingBottom: 18,
    gap: 3,
  },
  stopTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stopTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stopTime: {
    color: colors.teal,
    fontSize: 11,
  },
  stopCategory: {
    textTransform: 'capitalize',
    fontSize: 10.5,
  },
  stopName: {
    fontSize: 15,
  },
  stopLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stopArea: {
    flex: 1,
  },
  dayFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 14,
  },
  dayCost: {
    marginTop: 3,
  },
  backupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  backupText: {
    color: colors.warning,
    fontSize: 10.5,
  },
  backupRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.sm,
    padding: 12,
  },
  backupPlan: {
    flex: 1,
    color: colors.warning,
    fontSize: 12,
    lineHeight: 18,
  },

  mapCard: {
    marginBottom: 18,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  mapTitle: {
    marginTop: 2,
  },
  mapToggle: {
    minHeight: 40,
    paddingHorizontal: 18,
  },
  mapModeRow: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: 14,
  },
  mapModePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  mapModePillActive: {
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  mapModeText: {
    textTransform: 'capitalize',
    color: colors.muted,
    fontSize: 11.5,
  },
  mapModeTextActive: {
    color: colors.ink,
    fontFamily: fonts.semibold,
  },
  mapPreview: {
    height: 188,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.sageSoft,
    position: 'relative',
    marginBottom: 12,
  },
  mapWash: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#E4EADF',
  },
  mapRoadOne: {
    position: 'absolute',
    left: -20,
    top: 70,
    width: 420,
    height: 10,
    borderRadius: 6,
    backgroundColor: '#F6F4EA',
    transform: [{ rotate: '-12deg' }],
  },
  mapRoadTwo: {
    position: 'absolute',
    left: 40,
    top: 130,
    width: 320,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#F6F4EA',
    transform: [{ rotate: '9deg' }],
  },
  mapRoadThree: {
    position: 'absolute',
    left: 170,
    top: -20,
    width: 6,
    height: 240,
    borderRadius: 4,
    backgroundColor: '#F6F4EA',
    transform: [{ rotate: '18deg' }],
  },
  mapRoute: {
    position: 'absolute',
    left: 58,
    top: 78,
    width: 150,
    height: 3,
    backgroundColor: colors.forest,
    borderRadius: 999,
    transform: [{ rotate: '16deg' }],
  },
  mapRouteOverview: {
    opacity: 0.45,
  },
  mapRouteSecondary: {
    position: 'absolute',
    left: 138,
    top: 104,
    width: 108,
    height: 3,
    backgroundColor: colors.clay,
    borderRadius: 999,
    transform: [{ rotate: '-24deg' }],
  },
  mapPinA: {
    position: 'absolute',
    left: 48,
    top: 68,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.forest,
    borderWidth: 3,
    borderColor: colors.white,
  },
  mapPinB: {
    position: 'absolute',
    left: 158,
    top: 108,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.clay,
    borderWidth: 3,
    borderColor: colors.white,
  },
  mapPinC: {
    position: 'absolute',
    right: 55,
    bottom: 42,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.teal,
    borderWidth: 3,
    borderColor: colors.white,
  },
  mapLabelA: {
    position: 'absolute',
    left: 38,
    top: 40,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 8,
    ...shadows.soft,
  },
  mapLabelB: {
    position: 'absolute',
    right: 36,
    bottom: 26,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 8,
    ...shadows.soft,
  },
  mapLabelText: {
    fontSize: 10,
    color: colors.ink,
  },
  mapStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  mapStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.lineStrong,
  },
  mapStatusDotActive: {
    backgroundColor: colors.teal,
  },
  mapStatusText: {
    fontSize: 11.5,
  },
  mapExpandedPanel: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 14,
    paddingTop: 14,
    gap: 10,
  },
  mapInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  mapInfoLabel: {
    fontSize: 11,
  },
  mapInfoValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 12,
  },
  mapActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  mapActionPrimary: {
    flex: 1,
    minHeight: 46,
  },
  mapActionSecondary: {
    flex: 0.6,
    minHeight: 46,
  },
  routeLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  routeLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  screenHeader: {
    marginBottom: 20,
  },
  screenTitle: {
    marginTop: 6,
    marginBottom: 10,
  },
  savedSummaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  savedSummaryPill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  savedCard: {
    marginBottom: 18,
    overflow: 'hidden',
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  savedRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  savedThumb: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
  },
  savedRowText: {
    flex: 1,
    gap: 3,
  },
  savedMeta: {
    textTransform: 'capitalize',
    fontSize: 11.5,
  },

  insightHero: {
    height: 300,
    borderRadius: radius.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 20,
    marginBottom: 18,
    backgroundColor: colors.forestDeep,
  },
  insightHeroImage: {
    borderRadius: radius.xl,
  },
  insightHeroBottom: {
    gap: 6,
  },
  insightHeroKicker: {
    color: 'rgba(255,255,255,0.75)',
  },
  insightHeroTitle: {
    color: colors.white,
  },
  insightHeroText: {
    color: 'rgba(255,255,255,0.82)',
  },
  insightRow: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 16,
  },
  insightRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  insightTextWrap: {
    flex: 1,
    gap: 3,
  },
  tipCard: {
    marginBottom: 18,
    backgroundColor: colors.surfaceAlt,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tipKicker: {
    color: colors.clay,
    fontSize: 9.5,
  },
  tipTitle: {
    marginBottom: 8,
  },

  profileHero: {
    backgroundColor: colors.forest,
    borderRadius: radius.xl,
    padding: 22,
    marginBottom: 16,
    overflow: 'hidden',
  },
  profileGlow: {
    position: 'absolute',
    right: -40,
    top: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  profileHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  profileAvatar: {
    width: 58,
    height: 58,
    borderRadius: 21,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.forest,
  },
  profilePill: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  profilePillText: {
    color: colors.cream,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  profileName: {
    color: colors.white,
    marginBottom: 4,
  },
  profileEmail: {
    color: 'rgba(255,255,255,0.76)',
  },
  profileStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  preferenceRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  preferenceValue: {
    textTransform: 'capitalize',
  },
  libraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  libraryRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  libraryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.clay,
  },
  libraryText: {
    flex: 1,
    gap: 2,
  },
  libraryEmpty: {
    paddingVertical: 6,
  },

  onboardingScreen: {
    flex: 1,
    backgroundColor: colors.forestDeep,
  },
  onboardingPhoto: {
    flex: 1,
  },
  onboardingSafe: {
    flex: 1,
  },
  onboardingInner: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  onboardingBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  onboardingBrandText: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: colors.white,
  },
  onboardingBottom: {
    paddingBottom: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 22,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.cream,
  },
  onboardingKicker: {
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 8,
  },
  onboardingTitle: {
    color: colors.white,
    fontSize: 42,
    lineHeight: 48,
    marginBottom: 10,
  },
  onboardingText: {
    color: 'rgba(255,255,255,0.82)',
    maxWidth: 320,
    marginBottom: 26,
  },
  onboardingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  onboardingPrimary: {
    flex: 1,
  },
  onboardingSkip: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  onboardingSkipText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
  },

  authScreen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  authScroll: {
    paddingBottom: 36,
  },
  authShell: {
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
  },
  authHero: {
    height: 410,
    justifyContent: 'flex-end',
  },
  authHeroImage: {
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  authHeroContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 58 : 30,
    paddingBottom: 54,
  },
  authBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authKicker: {
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 8,
  },
  authTitle: {
    color: colors.white,
    fontSize: 40,
    lineHeight: 46,
    marginBottom: 10,
  },
  authText: {
    color: 'rgba(255,255,255,0.84)',
    maxWidth: 330,
    marginBottom: 16,
  },
  authFeatureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  authFeaturePill: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  authFeatureText: {
    color: colors.cream,
    fontSize: 11,
  },
  authFormWrap: {
    paddingHorizontal: layout.screenPadding,
    marginTop: -26,
  },
  authCard: {
    marginBottom: 14,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: 18,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  segmentText: {
    color: colors.muted,
  },
  segmentTextActive: {
    color: colors.ink,
  },
  authGuest: {
    marginTop: 6,
  },
  authFootnote: {
    textAlign: 'center',
    paddingHorizontal: 18,
    fontSize: 11,
    lineHeight: 17,
  },
});
