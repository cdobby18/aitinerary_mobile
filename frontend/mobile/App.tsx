import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
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
  AppText,
  BottomNav,
  Button,
  Card,
  Chip,
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

type TabKey = 'home' | 'trips' | 'explore' | 'profile';

// Hardcoded feeds — later these come from backend endpoints
// (see ToDo_Table.md: destination search/suggest, notifications, curated collections).
type AppNotification = { id: string; icon: string; title: string; text: string; time: string };

const appNotifications: AppNotification[] = [
  {
    id: 'weather',
    icon: 'rainy-outline',
    title: 'Rain window Wednesday',
    text: 'Your afternoon stops move indoors — backup plan is already in the day card.',
    time: '2h ago',
  },
  {
    id: 'season',
    icon: 'sunny-outline',
    title: 'Best month to visit Cebu',
    text: 'March to May gives you the calmest seas for island hopping.',
    time: '1d ago',
  },
  {
    id: 'welcome',
    icon: 'sparkles-outline',
    title: 'Welcome to AITinerary',
    text: 'Start with a destination, and we will shape the route around your budget and pace.',
    time: '3d ago',
  },
];

const exploreCategories = [
  { id: 'all', label: 'All', icon: 'grid-outline' as const },
  { id: 'beaches', label: 'Beaches & Islands', icon: 'water-outline' as const },
  { id: 'nature', label: 'Nature & Adventure', icon: 'leaf-outline' as const },
  { id: 'food', label: 'Food & Culture', icon: 'restaurant-outline' as const },
  { id: 'city', label: 'City Breaks', icon: 'business-outline' as const },
  { id: 'family', label: 'Family-Friendly', icon: 'happy-outline' as const },
];

// Lightweight curation: which categories fit each destination pick.
const destinationCategoryMap: Record<string, string[]> = {
  cebu: ['beaches', 'nature', 'family'],
  manila: ['food', 'city'],
  palawan: ['beaches', 'nature'],
  bohol: ['beaches', 'nature', 'family'],
  tokyo: ['food', 'city'],
  singapore: ['food', 'city', 'family'],
};

const curatedCollections = [
  {
    id: 'slow-coast',
    title: 'Slow coastal escapes',
    text: 'Quiet coves and unhurried days.',
    photo: photos.palawan,
    picks: ['palawan', 'bohol'],
  },
  {
    id: 'food-city',
    title: 'Eat your way through the city',
    text: 'Hawker stalls, markets, late tables.',
    photo: photos.food,
    picks: ['manila', 'singapore', 'tokyo'],
  },
];

const suggestedPrompts = [
  'Plan a 3-day trip within my budget.',
  'Make tomorrow less tiring.',
  'Find indoor alternatives if it rains.',
  'Explain how to get to this destination.',
  'Replace this activity with something family-friendly.',
];

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

const CURRENCY_PREFIX: Record<string, string> = {
  PHP: '₱',
  JPY: '¥',
  SGD: 'S$',
  USD: '$',
};

const formatCost = (value: unknown, currency?: string | null) => {
  const prefix = (currency && CURRENCY_PREFIX[currency]) || '₱';
  return `${prefix}${formatNumber(value)}`;
};

const REGION_CURRENCY: Record<string, string> = {
  manila: 'PHP',
  cebu: 'PHP',
  palawan: 'PHP',
  tokyo: 'JPY',
  singapore: 'SGD',
  'metro manila': 'PHP',
  japan: 'JPY',
  tokyo_prefecture: 'JPY',
};

const regionCurrency = (region?: string | null) => {
  if (!region) return null;
  return REGION_CURRENCY[String(region).toLowerCase()] || null;
};

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
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; text: string; proposal?: any }[]
  >([]);
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  // Focused flows — each hides the bottom tab bar while active.
  const [planOpen, setPlanOpen] = useState(false);
  const [planStep, setPlanStep] = useState(0);
  const [viewingTrip, setViewingTrip] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [exploreQuery, setExploreQuery] = useState('');
  const [exploreCategory, setExploreCategory] = useState('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(appNotifications.length);
  const [homeSearch, setHomeSearch] = useState('');
  const [homeNotice, setHomeNotice] = useState<string | null>(null);
  const [backendDestinations, setBackendDestinations] = useState<any[] | null>(null);
  const [serverNotifications, setServerNotifications] = useState<any[] | null>(null);
  const [serverUnread, setServerUnread] = useState<number | null>(null);
  const [lastProposal, setLastProposal] = useState<Record<string, unknown> | null>(null);

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

  // Curated featured feed for Home + Explore — backend is the source of
  // truth for what the planner can actually build; falls back to the
  // bundled picks offline.
  useEffect(() => {
    let active = true;
    const fetchFeatured = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/destinations/featured`);
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        const list = data?.destinations;
        if (Array.isArray(list) && list.length) setBackendDestinations(list);
      } catch {
        // Offline: keep the bundled picks.
      }
    };
    if (Platform.OS !== 'web' || isOnline !== false) fetchFeatured();
    return () => {
      active = false;
    };
  }, [isOnline]);

  // Signed-in users get their notifications from the server; guests use the
  // bundled list. Refetched when the panel opens so nothing goes stale.
  useEffect(() => {
    if (!authToken) {
      setServerNotifications(null);
      setServerUnread(null);
      return;
    }
    let active = true;
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        if (Array.isArray(data?.notifications)) {
          setServerNotifications(data.notifications);
          setServerUnread(Number(data.unread ?? 0));
        }
      } catch {
        // Offline: fall back to the bundled list without clearing it.
      }
    };
    fetchNotifications();
    return () => {
      active = false;
    };
  }, [authToken, notificationsOpen]);

  useEffect(() => {
    let active = true;

    setLiveWeather(null);
    setForecastWeather(null);

    // Weather now flows through the backend so the AI layer and risk logic
    // see the same data. The backend labels live vs seasonal honestly.
    const fetchWeather = async () => {
      try {
        const query = month ? `?month=${encodeURIComponent(month)}` : '';
        const response = await fetch(`${API_BASE_URL}/weather/${region}${query}`);
        if (!response.ok) return;

        const data = await response.json();
        if (!active) return;
        if (!data?.live || !data?.current) return;

        const label = String(data.current.label || 'clear');
        setLiveWeather({
          temp: Math.round(data.current.temp),
          label,
          icon: label.includes('rain') || label.includes('storm') || label.includes('shower')
            ? 'rainy-outline'
            : label.includes('cloud') || label.includes('fog')
              ? 'cloud-outline'
              : label.includes('partly')
                ? 'partly-sunny-outline'
                : 'sunny-outline',
        });
        setForecastWeather({
          temp: Math.round(data.current.avg_temp ?? data.current.temp),
          rainChance: Number(data.current.rain_chance || 0),
        });
      } catch {
        // Keep the local fallback when the weather service is unavailable.
      }
    };

    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || isOnline !== false) {
      fetchWeather();
    }
    return () => {
      active = false;
    };
  }, [region, month, isOnline]);

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
    setPlanOpen(false);
    setAssistantOpen(false);
    setViewingTrip(false);
    scrollToTop();
  };

  // Focused-flow helpers. Plan Trip, the itinerary view, and the AI assistant
  // hide the bottom tab bar per the mobile design spec (§4).
  const openPlanFlow = (presetDestination?: string) => {
    if (presetDestination) {
      const pick = destinationPicks.find(
        item => item.label.toLowerCase() === presetDestination.trim().toLowerCase(),
      );
      setDestination(pick ? pick.label : presetDestination.trim());
      if (pick) setRegion(pick.id);
    }
    setPlanStep(0);
    setPlanOpen(true);
    setViewingTrip(false);
    setAssistantOpen(false);
    scrollToTop();
  };

  const openAssistant = (tripContext?: string) => {
    if (tripContext && !chatPrompt) setChatPrompt(tripContext);
    setAssistantOpen(true);
    setPlanOpen(false);
    setViewingTrip(false);
    scrollToTop();
  };

  const closeFlows = () => {
    setPlanOpen(false);
    setAssistantOpen(false);
    setViewingTrip(false);
    changeTab('home');
  };

  const openTrip = (trip: any) => {
    setResult(trip);
    setSelectedDayIndex(0);
    setMapExpanded(false);
    setSelectedStop(null);
    setPlanOpen(false);
    setAssistantOpen(false);
    setViewingTrip(true);
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
    setActiveTab('home');
    setPlanOpen(false);
    setAssistantOpen(false);
    setViewingTrip(false);
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
      setSelectedDayIndex(0);
      setMapExpanded(false);
      setSelectedStop(null);
      // Jump into the focused itinerary view with honest progress feedback.
      setPlanOpen(false);
      setViewingTrip(true);
      scrollToTop();
    } catch (err) {
      const message =
        err instanceof TypeError && /fetch|network/i.test(err.message)
          ? "Can't reach the planner service. Check the backend is running and try again."
          : err instanceof Error
            ? err.message
            : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const sendPrompt = async (raw: string) => {
    if (!raw.trim()) return;

    const userMessage = raw.trim();
    setChatMessages(current => [...current, { role: 'user', text: userMessage }]);
    setChatPrompt('');
    setChatLoading(true);
    setError(null);

    // Trip context so follow-ups like "make it 5 days" keep working.
    const context: Record<string, unknown> = {
      region: result?.region || region,
      days: result?.days?.length ? result.days.length : Number(days) || undefined,
      budget: (result?.total_budget ?? Number(budget)) || undefined,
      travelers,
      month: month,
    };
    if (lastProposal) context.pending_proposal = lastProposal;

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, context }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || 'Unable to answer right now.');

      const replyText = data.reply || 'Done.';
      if (data.proposal && data.itinerary && !data.applied) {
        // The assistant proposes — the user reviews and decides (design §10).
        setChatMessages(current => [
          ...current,
          { role: 'assistant', text: replyText, proposal: { ...data.proposal, itinerary: data.itinerary } },
        ]);
        setLastProposal({ itinerary: data.itinerary, region: data.proposal.region, destination: data.proposal.destination });
      } else {
        setChatMessages(current => [...current, { role: 'assistant', text: replyText }]);
        if (data.applied || !data.proposal) setLastProposal(null);
        if (data?.itinerary) {
          openTrip(data.itinerary);
        }
      }
    } catch (err) {
      const message =
        err instanceof TypeError && /fetch|network/i.test(err.message)
          ? "Can't reach the assistant right now. Check the backend is running and try again."
          : err instanceof Error
            ? err.message
            : 'Unknown error';
      setError(message);
      setChatMessages(current => [...current, { role: 'assistant', text: message }]);
    } finally {
      setChatLoading(false);
    }
  };

  const applyProposal = (proposal: any) => {
    if (!proposal?.itinerary) return;
    setLastProposal(null);
    setChatMessages(current => [
      ...current,
      { role: 'assistant', text: `Applied — showing your ${proposal.days || proposal.itinerary?.days?.length || ''} day plan now.` },
    ]);
    openTrip(proposal.itinerary);
  };

  const discardProposal = () => {
    setLastProposal(null);
    setChatMessages(current => [
      ...current,
      { role: 'assistant', text: 'Discarded — your current plan stays exactly as it was.' },
    ]);
  };

  const handleChatPlan = async () => {
    await sendPrompt(chatPrompt);
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
      `Budget: ${formatCost(result.total_budget, regionCurrency(result?.region))} • ${result.days?.length ?? 0} days`,
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
    openTrip(trip);
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

  // Featured feed comes from the backend (source of truth for what the
  // planner can build), joined with the local picks for photos and icons.
  const destinationCatalog = useMemo(() => {
    if (!backendDestinations?.length) return destinationPicks;
    const byId = new Map(backendDestinations.map((card: any) => [card.id, card]));
    const joined = destinationPicks.filter(pick => byId.has(pick.id));
    const extras = backendDestinations
      .filter((card: any) => !destinationPicks.some(pick => pick.id === card.id))
      .map((card: any) => ({
        id: card.id,
        label: card.name,
        mood: card.mood ?? '',
        blurb: card.tagline ?? '',
        photo: photoForDestination(card.id, card.id),
        icon: 'compass-outline' as const,
        coords: { latitude: 0, longitude: 0 },
      }));
    return [...joined, ...extras] as unknown as typeof destinationPicks;
  }, [backendDestinations]);

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
                  <Ionicons name="compass" size={20} color={colors.cream} />
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
                <Ionicons name="compass" size={20} color={colors.cream} />
              </View>
              <AppText style={styles.onboardingBrandText}>AITinerary</AppText>
            </View>

            <View>
              <AppText variant="eyebrow" style={styles.authKicker}>
                Your next escape
              </AppText>
              <AppText variant="display" style={styles.authTitle}>
                Where your next trip begins.
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

  const startSearch = async (value: string) => {
    const term = value.trim();
    if (!term) return;

    setRecentSearches(current => [term, ...current.filter(item => item !== term)].slice(0, 4));
    setExploreQuery(term);

    // Ask the backend first — it is the source of truth for what the
    // planner can build. Falls back to the local curated list offline.
    try {
      const response = await fetch(
        `${API_BASE_URL}/destinations/search?q=${encodeURIComponent(term)}`,
      );
      const data = await response.json();
      if (response.status === 404) {
        setHomeNotice(`${term} is not in the beta yet — try Cebu, Palawan, Bohol, Manila, Tokyo, or Singapore.`);
        return;
      }
      const first = data?.destinations?.[0];
      if (first) {
        setRegion(first.id);
        setDestination(first.name);
      }
    } catch {
      const pick = destinationPicks.find(item => item.label.toLowerCase() === term.toLowerCase());
      if (pick) {
        setRegion(pick.id);
        setDestination(pick.label);
      } else {
        const regionMatch = destinationPicks.find(item => term.toLowerCase().includes(item.id));
        if (regionMatch) setRegion(regionMatch.id);
        setDestination(term);
      }
    }

    openPlanFlow();
  };

  const openDestination = (pick: (typeof destinationPicks)[number]) => {
    setRegion(pick.id);
    setDestination(pick.label);
    setRecentSearches(current =>
      [pick.label, ...current.filter(item => item !== pick.label)].slice(0, 4),
    );
    setExploreQuery(pick.label);
    openPlanFlow();
  };

  const displayNotifications = authToken ? serverNotifications ?? appNotifications : appNotifications;
  const displayUnread = authToken ? (serverUnread ?? 0) : unreadCount;

  const markNotificationsRead = async () => {
    if (authToken) {
      setServerUnread(0);
      setServerNotifications(current =>
        current ? current.map((item: any) => ({ ...item, read: true })) : current,
      );
      try {
        await fetch(`${API_BASE_URL}/notifications/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {
        // Local state already cleared; retry next time the panel opens.
      }
    } else {
      setUnreadCount(0);
    }
  };

  const notificationIconFor = (kind: string) => {
    if (kind === 'welcome') return 'sparkles-outline';
    if (kind === 'weather') return 'rainy-outline';
    if (kind === 'trip') return 'trail-sign-outline';
    return 'notifications-outline';
  };

  const notificationTime = (createdAt?: string | null) => {
    if (!createdAt) return '';
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return '';
    const diff = Date.now() - date.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderNotificationsPanel = () => (
    <Card style={styles.notifPanel}>
      <View style={styles.notifHead}>
        <AppText variant="h3">Notifications</AppText>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setNotificationsOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close notifications"
          style={styles.notifClose}
        >
          <Ionicons name="close" size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>
      {displayNotifications.map((item: any, index: number) => {
        const isRead = authToken
          ? Boolean(item.read)
          : index >= unreadCount;
        return (
          <View
            key={`${item.id}`}
            style={[styles.notifRow, index > 0 && styles.notifRowBorder, isRead && styles.notifRowRead]}
          >
            <IconBadge
              name={authToken ? notificationIconFor(item.kind) : item.icon}
              tone="teal"
              size={38}
            />
            <View style={styles.notifBody}>
              <AppText variant="label">{item.title}</AppText>
              <AppText variant="caption">{authToken ? item.body : item.text}</AppText>
            </View>
            <AppText variant="caption" style={styles.notifTime}>
              {authToken ? notificationTime(item.created_at) : item.time}
            </AppText>
          </View>
        );
      })}
    </Card>
  );

  const renderHomeHeader = () => (
    <View style={styles.homeHeader}>
      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <Ionicons name="compass" size={19} color={colors.white} />
        </View>
        <View>
          <AppText style={styles.brand}>AITinerary</AppText>
          <AppText variant="eyebrow" style={styles.subBrand}>
            Six destinations, planned properly
          </AppText>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.notifButton}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        onPress={() => {
          const opening = !notificationsOpen;
          setNotificationsOpen(opening);
          if (opening) markNotificationsRead();
        }}
      >
        <Ionicons name="notifications-outline" size={21} color={colors.ink} />
        {displayUnread ? <View style={styles.notifDot} /> : null}
      </TouchableOpacity>
    </View>
  );

  const renderHomeHero = () => (
    <ImageBackground
      source={{ uri: photos.sunset }}
      style={styles.homeHero}
      imageStyle={styles.homeHeroImage}
    >
      <LinearGradient
        colors={['rgba(18,60,58,0.2)', 'rgba(18,60,58,0.3)', 'rgba(18,60,58,0.92)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.homeHeroBody}>
        <AppText variant="hero" style={styles.homeHeroTitle}>
          Where to next?
        </AppText>
        <AppText variant="bodySm" style={styles.homeHeroText}>
          Pick a destination, set a budget, and get a day-by-day plan you can actually follow.
        </AppText>

        <View style={styles.homeSearchWrap}>
          <Ionicons name="search" size={18} color={colors.secondary} style={styles.homeSearchIcon} />
          <TextInput
            style={styles.homeSearchInput}
            value={homeSearch}
            onChangeText={setHomeSearch}
            placeholder="Where do you want to go?"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            accessibilityLabel="Destination search"
            onSubmitEditing={() => {
              startSearch(homeSearch);
              setHomeSearch('');
            }}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.homeSearchSubmit}
            accessibilityRole="button"
            accessibilityLabel="Search destination"
            onPress={() => {
              startSearch(homeSearch);
              setHomeSearch('');
            }}
          >
            <Ionicons name="arrow-forward" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>

        {recentSearches.length ? (
          <View style={styles.recentRow}>
            {recentSearches.map(term => (
              <TouchableOpacity
                key={term}
                activeOpacity={0.8}
                style={styles.recentPill}
                onPress={() => startSearch(term)}
              >
                <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.85)" />
                <AppText variant="caption" style={styles.recentPillText}>
                  {term}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    </ImageBackground>
  );

  const renderQuickActions = () => {
    const tiles: Array<{
      key: string;
      label: string;
      icon: React.ComponentProps<typeof Ionicons>['name'];
      bg: string;
      fg: string;
      onPress: () => void;
    }> = [
      {
        key: 'plan',
        label: 'Plan Trip',
        icon: 'add-circle-outline',
        bg: colors.tealSoft,
        fg: colors.forest,
        onPress: () => openPlanFlow(),
      },
      {
        key: 'explore',
        label: 'Explore',
        icon: 'compass-outline',
        bg: colors.claySoft,
        fg: colors.clay,
        onPress: () => changeTab('explore'),
      },
      {
        key: 'map',
        label: 'Map',
        icon: 'map-outline',
        bg: colors.sageSoft,
        fg: colors.sage,
        onPress: () => {
          setHomeNotice(null);
          const trip = result || savedTrips[0];
          if (!trip) {
            setHomeNotice('No trip yet — generate an itinerary and its route map will appear here.');
            return;
          }
          openTrip(trip);
          setMapExpanded(true);
        },
      },
      {
        key: 'assistant',
        label: 'AI Assistant',
        icon: 'sparkles-outline',
        bg: colors.sand,
        fg: colors.warning,
        onPress: () => {
          setHomeNotice(null);
          openAssistant();
        },
      },
    ];

    return (
      <View style={styles.quickGrid}>
        {tiles.map(tile => (
          <TouchableOpacity
            key={tile.key}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={tile.label}
            style={styles.quickTile}
            onPress={() => {
              setHomeNotice(null);
              tile.onPress();
            }}
          >
            <View style={[styles.quickTileIcon, { backgroundColor: tile.bg }]}>
              <Ionicons name={tile.icon} size={21} color={tile.fg} />
            </View>
            <AppText variant="label" style={styles.quickTileLabel}>
              {tile.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderUpcomingTrip = () => {
    const upcoming = savedTrips[0];

    return (
      <View style={styles.homeSection}>
        <View style={styles.homeSectionHead}>
          <AppText variant="eyebrow" style={styles.homeSectionEyebrow}>
            Upcoming trip
          </AppText>
          {savedTrips.length ? (
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="View all trips"
              onPress={() => changeTab('trips')}
            >
              <AppText variant="label" style={styles.viewAllText}>
                View All
              </AppText>
            </TouchableOpacity>
          ) : null}
        </View>

        {upcoming ? (
          <TouchableOpacity
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Open upcoming itinerary"
            style={styles.upcomingCard}
            onPress={() => openTrip(upcoming)}
          >
            <ImageBackground
              source={{ uri: smallPhoto(photoForDestination(upcoming.destination, upcoming.region)) }}
              style={styles.upcomingPhoto}
              imageStyle={styles.upcomingPhotoImage}
            >
              <LinearGradient
                colors={['rgba(18,60,58,0.06)', 'rgba(18,60,58,0.78)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.statusChip}>
                <AppText variant="eyebrow" style={styles.statusChipText}>
                  Upcoming
                </AppText>
              </View>
              <View style={styles.upcomingBody}>
                <AppText variant="h2" style={styles.upcomingTitle}>
                  {upcoming.destination}
                </AppText>
                <AppText variant="caption" style={styles.upcomingMeta}>
                  {upcoming.month ? `${upcoming.month} · ` : ''}
                  {upcoming.days?.length ?? 0} days · {upcoming.region}
                </AppText>
                <View style={styles.upcomingMetaRow}>
                  <MetaItem
                    light
                    icon="cash-outline"
                    label={formatCost(upcoming.total_budget, regionCurrency(upcoming?.region))}
                  />
                  <MetaItem light icon="navigate-outline" label="Open itinerary" />
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        ) : (
          <Card style={styles.upcomingEmpty}>
            <EmptyState
              icon="briefcase-outline"
              title="No trips planned yet"
              text="Tell us where you want to go and we will shape the route around you."
              actionLabel="Plan your first trip"
              onAction={() => openPlanFlow()}
            />
          </Card>
        )}
      </View>
    );
  };

  const renderDestinationCarousel = () => (
    <View style={styles.homeSection}>
      <View style={styles.homeSectionHead}>
        <AppText variant="eyebrow" style={styles.homeSectionEyebrow}>
          Explore destinations
        </AppText>
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open explore tab"
          onPress={() => changeTab('explore')}
        >
          <AppText variant="label" style={styles.viewAllText}>
            See all
          </AppText>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.destCarousel}
      >
        {destinationPicks.map(pick => (
          <TouchableOpacity
            key={pick.id}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={`Plan a trip to ${pick.label}`}
            style={styles.destSlide}
            onPress={() => openDestination(pick)}
          >
            <ImageBackground
              source={{ uri: smallPhoto(pick.photo) }}
              style={styles.destSlidePhoto}
              imageStyle={styles.destSlidePhotoImage}
            >
              <LinearGradient
                colors={['rgba(18,60,58,0.04)', 'rgba(18,60,58,0.82)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.destSlideBody}>
                <AppText variant="h3" style={styles.destSlideName}>
                  {pick.label}
                </AppText>
                <AppText variant="caption" style={styles.destSlideMood}>
                  {pick.mood}
                </AppText>
                <AppText variant="caption" style={styles.destSlideBlurb} numberOfLines={2}>
                  {pick.blurb}
                </AppText>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderAssistantPromo = () => (
    <View style={[styles.homeSection, styles.homeSectionLast]}>
      <View style={styles.promoCard}>
        <View style={styles.promoHead}>
          <View style={styles.promoIcon}>
            <Ionicons name="sparkles" size={18} color={colors.forest} />
          </View>
          <View>
            <AppText variant="h3" style={styles.promoTitle}>
              Stuck on the details?
            </AppText>
            <AppText variant="caption" style={styles.promoText}>
              The assistant knows the routes, fees, and best months.
            </AppText>
          </View>
        </View>
        <Button
          label="Open the assistant"
          icon="chatbubble-ellipses-outline"
          variant="secondary"
          onPress={() => openAssistant()}
          style={styles.promoButton}
        />
      </View>
      <AppText variant="caption" style={styles.attribution}>
        Weather and forecast by Open-Meteo
      </AppText>
    </View>
  );

  const renderHome = () => (
    <>
      {renderHomeHeader()}
      {homeNotice ? (
        <View style={styles.noticeBanner}>
          <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
          <AppText variant="caption" style={styles.noticeText}>
            {homeNotice}
          </AppText>
        </View>
      ) : null}
      {!isOnline ? (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
          <AppText variant="caption" style={styles.offlineBannerText}>
            You are offline. Saved trips and cached weather are still available.
          </AppText>
        </View>
      ) : null}
      {notificationsOpen ? renderNotificationsPanel() : null}
      {renderHomeHero()}
      {renderQuickActions()}
      {renderUpcomingTrip()}
      {renderDestinationCarousel()}
      {renderAssistantPromo()}
    </>
  );

  // ---------- Explore ----------

  const exploreVisiblePicks = destinationCatalog.filter(pick => {
    if (exploreCategory !== 'all' && !(destinationCategoryMap[pick.id] || []).includes(exploreCategory)) {
      return false;
    }
    const query = exploreQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      pick.label.toLowerCase().includes(query) ||
      pick.mood.toLowerCase().includes(query) ||
      pick.blurb.toLowerCase().includes(query)
    );
  });

  const renderExploreSearch = () => (
    <View style={styles.exploreSearchWrap}>
      <Ionicons name="search" size={18} color={colors.secondary} style={styles.homeSearchIcon} />
      <TextInput
        style={styles.exploreSearchInput}
        value={exploreQuery}
        onChangeText={setExploreQuery}
        placeholder="Search destinations"
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        accessibilityLabel="Explore destination search"
      />
    </View>
  );

  const renderExploreChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsRow}
    >
      {exploreCategories.map(category => (
        <Chip
          key={category.id}
          label={category.label}
          icon={category.icon}
          active={exploreCategory === category.id}
          onPress={() => setExploreCategory(category.id)}
        />
      ))}
    </ScrollView>
  );

  const renderCollections = () => (
    <View style={styles.exploreSection}>
      <AppText variant="eyebrow" style={styles.homeSectionEyebrow}>
        Curated collections
      </AppText>
      {curatedCollections.map(collection => (
        <Card key={collection.id} style={styles.collectionCard}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.collectionRow}
            accessibilityRole="button"
            accessibilityLabel={`Open collection ${collection.title}`}
            onPress={() => openDestination(destinationPicks.find(pick => pick.id === collection.picks[0])!)}
          >
            <Image
              source={{ uri: smallPhoto(collection.photo) }}
              style={styles.collectionThumb}
            />
            <View style={styles.collectionBody}>
              <AppText variant="h3">{collection.title}</AppText>
              <AppText variant="caption">{collection.text}</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </TouchableOpacity>
        </Card>
      ))}
    </View>
  );

  const renderExplore = () => (
    <>
      <View style={styles.screenHeader}>
        <AppText variant="eyebrow">Explore</AppText>
        <AppText variant="display" style={styles.screenTitle}>
          Where to next?
        </AppText>
        <AppText variant="body">
          Browse destinations, then plan the route that fits your pace and budget.
        </AppText>
      </View>

      {renderExploreSearch()}
      {renderExploreChips()}

      {exploreVisiblePicks.length ? (
        <View style={styles.destGrid}>
          {exploreVisiblePicks.map(pick => (
            <TouchableOpacity
              key={pick.id}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={`Plan a trip to ${pick.label}`}
              style={styles.destGridCard}
              onPress={() => openDestination(pick)}
            >
              <ImageBackground
                source={{ uri: smallPhoto(pick.photo) }}
                style={styles.destGridPhoto}
                imageStyle={styles.destGridPhotoImage}
              >
                <LinearGradient
                  colors={['rgba(18,60,58,0.04)', 'rgba(18,60,58,0.82)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.destGridBody}>
                  <AppText variant="h3" style={styles.destGridName}>
                    {pick.label}
                  </AppText>
                  <AppText variant="caption" style={styles.destGridMood}>
                    {pick.mood}
                  </AppText>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Card style={styles.exploreNoResults}>
          <EmptyState
            icon="search-outline"
            title="No matches"
            text="That destination is not in the beta yet. Try another name or clear the filter."
            actionLabel="Clear search"
            onAction={() => {
              setExploreQuery('');
              setExploreCategory('all');
            }}
          />
        </Card>
      )}

      {!exploreQuery ? renderCollections() : null}
    </>
  );

  // ---------- My Trips ----------

  const renderTrips = () => {
    const monthIndex = (name?: string | null) => {
      const months = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december',
      ];
      if (!name) return -1;
      return months.indexOf(String(name).trim().toLowerCase());
    };
    const currentMonthIdx = new Date().getMonth();
    const tripsUpcoming = savedTrips.filter(trip => {
      const idx = monthIndex(trip.month);
      return idx < 0 ? true : idx >= currentMonthIdx;
    });
    const tripsPast = savedTrips.filter(
      trip => monthIndex(trip.month) >= 0 && monthIndex(trip.month) < currentMonthIdx,
    );

    const tripCard = (trip: any, index: number, status: 'Upcoming' | 'Past') => (
      <TouchableOpacity
        key={`${trip.destination}-${index}`}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Open ${trip.destination} itinerary`}
        style={[styles.tripsRow, index > 0 && styles.tripsRowBorder]}
        onPress={() => openSavedTrip(trip)}
      >
        <Image
          source={{ uri: smallPhoto(photoForDestination(trip.destination, trip.region)) }}
          style={styles.tripsThumb}
        />
        <View style={styles.tripsRowText}>
          <View style={styles.tripsNameRow}>
            <AppText variant="h3">{trip.destination}</AppText>
            <View
              style={[
                styles.statusChip,
                status === 'Upcoming' ? styles.statusChipTeal : styles.statusChipNeutral,
              ]}
            >
              <AppText
                variant="caption"
                style={status === 'Upcoming' ? styles.statusChipTealText : styles.statusChipNeutralText}
              >
                {status}
              </AppText>
            </View>
          </View>
          <AppText variant="caption" style={styles.tripsMeta} numberOfLines={2}>
            {trip.month ? `${trip.month} · ` : ''}
            {trip.days?.length ?? 0} days · {trip.region} ·{' '}
            {formatCost(trip.total_budget, regionCurrency(trip?.region))}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </TouchableOpacity>
    );

    return (
      <>
        <View style={styles.screenHeader}>
          <AppText variant="eyebrow">My Trips</AppText>
          <AppText variant="display" style={styles.screenTitle}>
            Your trips
          </AppText>
          <AppText variant="body">Trips you've saved, and the ones you're still shaping.</AppText>
        </View>

        <View style={styles.tripsSection}>
          <AppText variant="label" style={styles.tripsSectionLabel}>
            Upcoming
          </AppText>
          {tripsUpcoming.length ? (
            <Card padded={false} style={styles.tripsCard}>
              {tripsUpcoming.map((trip, index) => tripCard(trip, index, 'Upcoming'))}
            </Card>
          ) : (
            <Card style={styles.tripsEmptyCard}>
              <EmptyState
                icon="briefcase-outline"
                title="No upcoming trips"
                text="Plan your next escape and it will live here."
                actionLabel="Plan your first trip"
                onAction={() => openPlanFlow()}
              />
            </Card>
          )}
        </View>

        <View style={styles.tripsSection}>
          <AppText variant="label" style={styles.tripsSectionLabel}>
            Past
          </AppText>
          {tripsPast.length ? (
            <Card padded={false} style={styles.tripsCard}>
              {tripsPast.map((trip, index) => tripCard(trip, index, 'Past'))}
            </Card>
          ) : (
            <Card style={styles.tripsEmptyCard}>
              <EmptyState
                icon="time-outline"
                title="Nothing here yet"
                text="Trips from earlier months will show up here."
              />
            </Card>
          )}
        </View>
      </>
    );
  };

  // ---------- Plan Trip: guided 5-step flow ----------

  const renderPlanFlow = () => {
    const totalSteps = 5;
    const dayCount = Number(days) || 0;
    const budgetValue = Number(budget) || 0;

    const canContinue =
      planStep === 0
        ? destination.trim().length > 0
        : planStep === 1
          ? dayCount > 0 && month.trim().length > 0
          : planStep === 2
            ? budgetValue > 0
            : true;

    const goNext = () => {
      if (!canContinue) return;
      setPlanStep(step => Math.min(step + 1, totalSteps - 1));
      scrollToTop();
    };

    const goBackStep = () => {
      if (planStep === 0) {
        closeFlows();
        return;
      }
      setPlanStep(step => step - 1);
      scrollToTop();
    };

    const startGeneration = () => {
      setPlanOpen(false);
      setViewingTrip(true);
      handleGenerate();
    };

    return (
      <>
        <View style={styles.wizardTop}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.wizardBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={goBackStep}
          >
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </TouchableOpacity>
          <View style={styles.wizardProgressWrap}>
            <ProgressBar value={((planStep + 1) / totalSteps) * 100} color={colors.forest} />
            <AppText variant="caption" style={styles.wizardProgressText}>
              Step {planStep + 1} of {totalSteps}
            </AppText>
          </View>
        </View>

        {planStep === 0 ? (
          <>
            <View style={styles.wizardIntro}>
              <AppText variant="eyebrow">Step 1 — Destination</AppText>
              <AppText variant="h1" style={styles.wizardTitle}>
                Where are you headed?
              </AppText>
            </View>
            <Card style={styles.wizardCard}>
              <Field label="Destination">
                <TextInput
                  style={styles.input}
                  value={destination}
                  onChangeText={setDestination}
                  placeholder="Cebu"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="words"
                />
              </Field>
              <Field label="Region key" hint="Auto-filled when you pick a suggestion below.">
                <TextInput
                  style={styles.input}
                  value={region}
                  onChangeText={setRegion}
                  placeholder="cebu"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                />
              </Field>
              <AppText variant="label" style={styles.wizardGroupLabel}>
                Supported regions
              </AppText>
              <View style={styles.suggestionWrap}>
                {destinationPicks.map(pick => {
                  const active = region === pick.id;
                  return (
                    <Chip
                      key={pick.id}
                      label={pick.label}
                      active={active}
                      icon={pick.icon}
                      onPress={() => {
                        setRegion(pick.id);
                        setDestination(pick.label);
                      }}
                    />
                  );
                })}
              </View>
              {recentSearches.length ? (
                <>
                  <AppText variant="label" style={styles.wizardGroupLabel}>
                    Recently viewed
                  </AppText>
                  <View style={styles.suggestionWrap}>
                    {recentSearches.map(term => (
                      <Chip key={term} label={term} onPress={() => startSearch(term)} />
                    ))}
                  </View>
                </>
              ) : null}
            </Card>
          </>
        ) : null}

        {planStep === 1 ? (
          <>
            <View style={styles.wizardIntro}>
              <AppText variant="eyebrow">Step 2 — Dates &amp; travelers</AppText>
              <AppText variant="h1" style={styles.wizardTitle}>
                When, and with who?
              </AppText>
            </View>
            <Card style={styles.wizardCard}>
              <View style={styles.wizardFigureRow}>
                <View style={styles.wizardFigure}>
                  <Field label="Trip length (days)">
                    <TextInput
                      style={styles.input}
                      value={days}
                      onChangeText={setDays}
                      keyboardType="numeric"
                      placeholder="4"
                      placeholderTextColor={colors.muted}
                    />
                  </Field>
                </View>
                <View style={styles.wizardFigure}>
                  <Field label="Travel month" hint="Used for seasonal weather and risk logic.">
                    <TextInput
                      style={styles.input}
                      value={month}
                      onChangeText={setMonth}
                      placeholder="June"
                      placeholderTextColor={colors.muted}
                    />
                  </Field>
                </View>
              </View>
              <AppText variant="label" style={styles.wizardGroupLabel}>
                Travelers
              </AppText>
              <View style={styles.wizardOptionsRow}>
                {travelerOptions.map(option => {
                  const active = travelers === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      activeOpacity={0.8}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={[styles.wizardOption, active && styles.wizardOptionActive]}
                      onPress={() => setTravelers(option)}
                    >
                      <View style={[styles.wizardOptionDot, active && styles.wizardOptionDotActive]} />
                      <AppText
                        variant="bodySm"
                        style={[styles.wizardOptionText, active && styles.wizardOptionTextActive]}
                      >
                        {option}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {dayCount > 30 || dayCount <= 0 ? (
                <InlineError message="Enter a trip length between 1 and 30 days." />
              ) : null}
            </Card>
          </>
        ) : null}

        {planStep === 2 ? (
          <>
            <View style={styles.wizardIntro}>
              <AppText variant="eyebrow">Step 3 — Preferences</AppText>
              <AppText variant="h1" style={styles.wizardTitle}>
                Shape the route.
              </AppText>
            </View>
            <Card style={styles.wizardCard}>
              <Field label={`Budget (${region ? REGION_CURRENCY[region] ?? '₱ estimates' : 'local estimates'})`}>
                <TextInput
                  style={styles.input}
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="numeric"
                  placeholder="20000"
                  placeholderTextColor={colors.muted}
                />
              </Field>
              <AppText variant="label" style={styles.wizardGroupLabel}>
                Pace
              </AppText>
              <View style={styles.wizardPaceRow}>
                {paceOptions.map(option => {
                  const active = pace === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      activeOpacity={0.8}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={[styles.wizardPace, active && styles.wizardPaceActive]}
                      onPress={() => setPace(option)}
                    >
                      <AppText
                        variant="label"
                        style={[styles.wizardPaceText, active && styles.wizardPaceTextActive]}
                      >
                        {option}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <AppText variant="label" style={styles.wizardGroupLabel}>
                Interests
              </AppText>
              <View style={styles.suggestionWrap}>
                {vibes.map(option => {
                  const active = interests.includes(option.toLowerCase());
                  return (
                    <TouchableOpacity
                      key={option}
                      activeOpacity={0.8}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: active }}
                      style={[styles.wizardInterest, active && styles.wizardInterestActive]}
                      onPress={() => {
                        setHomeNotice(null);
                        toggleVibe(option);
                      }}
                    >
                      <View style={[styles.wizardOptionDot, active && styles.wizardOptionDotActive]}>
                        {active ? <Ionicons name="checkmark" size={10} color={colors.white} /> : null}
                      </View>
                      <AppText
                        variant="bodySm"
                        style={[styles.wizardOptionText, active && styles.wizardOptionTextActive]}
                      >
                        {option}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Field label="Notes" style={styles.wizardNotesField}>
                <TextInput
                  style={[styles.input, styles.wizardNotesInput]}
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Anything the planner should know?"
                  placeholderTextColor={colors.muted}
                />
              </Field>
              {budgetValue <= 0 ? <InlineError message="Enter a budget to continue." /> : null}
            </Card>
          </>
        ) : null}

        {planStep === 3 ? (
          <>
            <View style={styles.wizardIntro}>
              <AppText variant="eyebrow">Step 4 — Review</AppText>
              <AppText variant="h1" style={styles.wizardTitle}>
                Look good to you?
              </AppText>
            </View>
            <Card style={styles.wizardCard}>
              <View style={styles.summaryBlock}>
                <View style={styles.summaryRow}>
                  <AppText variant="caption" style={styles.summaryLabel}>
                    Destination
                  </AppText>
                  <AppText variant="label">{destination || 'Not set'}</AppText>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Edit destination"
                    onPress={() => setPlanStep(0)}
                    style={styles.summaryEdit}
                  >
                    <AppText variant="caption" style={styles.summaryEditSmall}>
                      Edit
                    </AppText>
                  </TouchableOpacity>
                </View>
                <View style={styles.summaryRow}>
                  <AppText variant="caption" style={styles.summaryLabel}>
                    Dates
                  </AppText>
                  <AppText variant="label">
                    {month} · {dayCount || '—'} days
                  </AppText>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Edit dates"
                    onPress={() => setPlanStep(1)}
                    style={styles.summaryEdit}
                  >
                    <AppText variant="caption" style={styles.summaryEditSmall}>
                      Edit
                    </AppText>
                  </TouchableOpacity>
                </View>
                <View style={styles.summaryRow}>
                  <AppText variant="caption" style={styles.summaryLabel}>
                    Travelers
                  </AppText>
                  <AppText variant="label">{travelers}</AppText>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Edit travelers"
                    onPress={() => setPlanStep(1)}
                    style={styles.summaryEdit}
                  >
                    <AppText variant="caption" style={styles.summaryEditSmall}>
                      Edit
                    </AppText>
                  </TouchableOpacity>
                </View>
                <View style={styles.summaryRow}>
                  <AppText variant="caption" style={styles.summaryLabel}>
                    Pace
                  </AppText>
                  <AppText variant="label">{pace}</AppText>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Edit pace"
                    onPress={() => setPlanStep(2)}
                    style={styles.summaryEdit}
                  >
                    <AppText variant="caption" style={styles.summaryEditSmall}>
                      Edit
                    </AppText>
                  </TouchableOpacity>
                </View>
                <View style={[styles.summaryRow, styles.summaryRowLast]}>
                  <AppText variant="caption" style={styles.summaryLabel}>
                    Budget
                  </AppText>
                  <AppText variant="label">{formatPeso(budgetValue)}</AppText>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Edit budget"
                    onPress={() => setPlanStep(2)}
                    style={styles.summaryEdit}
                  >
                    <AppText variant="caption" style={styles.summaryEditSmall}>
                      Edit
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
              {interests.length ? (
                <View style={styles.suggestionWrap}>
                  {interests.map(item => (
                    <Chip key={item} label={item} />
                  ))}
                </View>
              ) : null}
              <AppText variant="caption" style={styles.wizardHint}>
                Estimated costs only — nothing here is a confirmed booking price.
              </AppText>
            </Card>
          </>
        ) : null}

        {planStep === 4 ? (
          <>
            <View style={styles.wizardIntro}>
              <AppText variant="eyebrow">Step 5 — Generate</AppText>
              <AppText variant="h1" style={styles.wizardTitle}>
                Ready when you are.
              </AppText>
            </View>
            <Card style={styles.wizardCard}>
              <View style={styles.generateSummary}>
                <IconBadge name="sparkles-outline" tone="teal" size={46} />
                <View style={styles.generateSummaryText}>
                  <AppText variant="h3">
                    {destination || 'Your trip'} · {dayCount || '—'} days
                  </AppText>
                  <AppText variant="caption">
                    We build the route day by day with weather-aware risk, backup plans, and curated
                    stop details.
                  </AppText>
                </View>
              </View>
              <AppText variant="caption" style={styles.wizardHint}>
                Generation uses curated stop data. Estimated costs are not confirmed booking prices.
              </AppText>
              <Button
                label="Generate Itinerary"
                icon="sparkles"
                loading={loading}
                onPress={startGeneration}
                style={styles.wizardGenerateButton}
              />
              {error ? <InlineError message={error} /> : null}
            </Card>
          </>
        ) : null}

        {planStep < 4 ? (
          <View style={styles.wizardFooter}>
            <Button
              label={planStep === 0 ? 'Cancel' : 'Back'}
              variant="secondary"
              onPress={goBackStep}
              style={styles.wizardFooterButton}
            />
            <Button
              label="Next"
              icon="arrow-forward"
              disabled={!canContinue}
              onPress={goNext}
              style={styles.wizardFooterButton}
            />
          </View>
        ) : null}
      </>
    );
  };

  // ---------- AI Travel Assistant ----------

  const renderAssistant = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.assistantScreen}
    >
      <View style={styles.assistantHeader}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.wizardBack}
          accessibilityRole="button"
          accessibilityLabel="Close assistant"
          onPress={closeFlows}
        >
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </TouchableOpacity>
        <IconBadge name="sparkles-outline" tone="teal" size={38} />
        <View>
          <AppText variant="h3">AI Travel Assistant</AppText>
          <AppText variant="caption">Trip advice, budgets, and plan tweaks</AppText>
        </View>
      </View>

      <ScrollView style={styles.assistantLog} contentContainerStyle={styles.assistantLogContent}>
        {chatMessages.length === 0 ? (
          <>
            <View style={styles.assistantIntro}>
              <AppText variant="h2">Need help planning?</AppText>
              <AppText variant="bodySm" style={styles.assistantIntroText}>
                Ask me anything about your trip — routes, budgets, weather backups, or swapping a
                day. I will show proposed changes before applying anything.
              </AppText>
            </View>
            <View style={styles.promptChipsWrap}>
              {suggestedPrompts.map(prompt => (
                <Chip
                  key={prompt}
                  label={prompt}
                  style={styles.promptChip}
                  onPress={() => {
                    if (!chatLoading) sendPrompt(prompt);
                  }}
                />
              ))}
            </View>
          </>
        ) : (
          chatMessages.map((message, index) => (
            <View
              key={`${message.role}-${index}`}
              style={[
                styles.assistantBubbleRow,
                message.role === 'user' ? styles.assistantBubbleRowUser : null,
              ]}
            >
              <View
                style={[
                  styles.chatBubble,
                  message.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant,
                ]}
              >
                <AppText
                  variant="bodySm"
                  style={
                    message.role === 'user' ? styles.chatBubbleUserText : styles.chatBubbleAssistantText
                  }
                >
                  {message.text}
                </AppText>
              </View>
              {message.proposal ? (
                <View style={styles.proposalCard}>
                  <AppText variant="caption" style={styles.proposalCardEyebrow}>
                    {message.proposal.replaces_previous ? 'Proposed change' : 'Proposed itinerary'}
                  </AppText>
                  <View style={styles.proposalCardRow}>
                    <AppText variant="h3">
                      {message.proposal.destination}
                    </AppText>
                    <AppText variant="caption">
                      {message.proposal.days} days · {message.proposal.stops_count} stops ·{' '}
                      {message.proposal.pace}
                    </AppText>
                  </View>
                  <View style={styles.proposalCardRow}>
                    <AppText variant="caption">
                      Est. total {formatCost(message.proposal.budget_total, regionCurrency(message.proposal.region))} ·{' '}
                      {message.proposal.travelers} profile
                    </AppText>
                  </View>
                  <View style={styles.proposalActions}>
                    <Button
                      label="Apply"
                      icon="checkmark"
                      onPress={() => applyProposal(message.proposal)}
                      style={styles.proposalButton}
                    />
                    <Button
                      label="Discard"
                      variant="secondary"
                      onPress={discardProposal}
                      style={styles.proposalButton}
                    />
                  </View>
                  <AppText variant="caption" style={styles.proposalNote}>
                    Costs are estimates, not confirmed booking prices.
                  </AppText>
                </View>
              ) : null}
            </View>
          ))
        )}

        {chatLoading ? (
          <View style={[styles.assistantBubbleRow, styles.assistantBubbleRowAssistant]}>
            <View style={[styles.chatBubble, styles.chatBubbleAssistant, styles.typingBubble]}>
              <ActivityIndicator size="small" color={colors.forest} />
              <AppText variant="caption" style={styles.typingText}>
                Thinking…
              </AppText>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.assistantComposer}>
        <TextInput
          style={[styles.input, styles.assistantInput]}
          value={chatPrompt}
          onChangeText={setChatPrompt}
          placeholder="Ask me anything about your trip"
          placeholderTextColor={colors.muted}
          multiline
          blurOnSubmit={false}
          onSubmitEditing={handleChatPlan}
        />
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.assistantSend, !chatPrompt.trim() && styles.assistantSendDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={chatLoading || !chatPrompt.trim()}
          onPress={handleChatPlan}
        >
          <Ionicons name="arrow-up" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
      {error ? <InlineError message={error} /> : null}
    </KeyboardAvoidingView>
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
    const dayCurrency = stops.find((s: any) => s?.currency)?.currency;
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
                          {formatCost(leg.fare, dayCurrency)}
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
                    {stop.hours ? (
                      <AppText variant="caption" style={styles.stopHours}>
                        {stop.hours}
                      </AppText>
                    ) : null}
                    {stop.notes ? (
                      <AppText variant="bodySm" style={styles.stopDescription} numberOfLines={3}>
                        {stop.notes}
                      </AppText>
                    ) : null}
                    {stop.insider_tip ? (
                      <View style={styles.tipRow}>
                        <Ionicons name="bulb-outline" size={13} color={colors.teal} />
                        <AppText variant="caption" style={styles.tipText} numberOfLines={3}>
                          {stop.insider_tip}
                        </AppText>
                      </View>
                    ) : null}
                    {stop.cost ? (
                      <AppText variant="caption" style={styles.stopCost}>
                        ≈ {formatCost(stop.cost, stop.currency)}
                      </AppText>
                    ) : null}
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
                  ? formatCost(day.total_cost ?? day.estimated_cost, dayCurrency)
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

  const renderItinerary = () => {
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
            {renderStat('Budget', formatCost(result.total_budget, regionCurrency(result?.region)))}
            {renderStat('Pace', pace)}
            {renderStat('Travelers', travelers)}
            {renderStat('Left', formatCost(result.remaining_budget, regionCurrency(result?.region)), true)}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <SectionHeader
            eyebrow="Where it goes"
            title="Budget snapshot"
            meta={`${formatCost(result.total_budget, regionCurrency(result?.region))} total`}
          />
          {budgetItems.map(item => (
            <View key={item.label} style={styles.budgetItem}>
              <View style={styles.budgetTop}>
                <AppText variant="label">{item.label}</AppText>
                <AppText variant="h3" style={styles.budgetValue}>
                  {formatCost(item.value, regionCurrency(result?.region))}
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

        <View style={styles.sectionBlock}>
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayChipsRow}
          >
            {(result.days || []).map((_day: any, dayIndex: number) => {
              const active = dayIndex === selectedDayIndex;
              return (
                <TouchableOpacity
                  key={`day-${dayIndex}`}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Show day ${dayIndex + 1}`}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                  onPress={() => setSelectedDayIndex(dayIndex)}
                >
                  <AppText
                    variant="label"
                    style={[styles.dayChipText, active && styles.dayChipTextActive]}
                  >
                    Day {dayIndex + 1}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {result.days?.[selectedDayIndex] ? renderDay(result.days[selectedDayIndex], selectedDayIndex) : null}

        {renderMapCard()}
      </Animated.View>
    );
  };

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
                    {trip.days?.length ?? 0} days · {formatCost(trip.total_budget, regionCurrency(trip?.region))}
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

  const flowsActive = assistantOpen || planOpen;

  // Focused itinerary view failed to produce a trip (backend down, validation
  // error, etc.) — show a real error state instead of rendering without data.
  const renderTripUnavailable = () => (
    <Card style={styles.unavailableCard}>
      <EmptyState
        icon="cloud-offline-outline"
        title="Itinerary unavailable"
        text={
          error ||
          'The planner could not build this itinerary right now. Check your connection and try again.'
        }
        actionLabel="Back to planner"
        onAction={() => {
          setError(null);
          setViewingTrip(false);
          setPlanStep(4);
          setPlanOpen(true);
          scrollToTop();
        }}
      />
      <Button
        label="Back to home"
        variant="secondary"
        onPress={() => closeFlows()}
        style={styles.unavailableSecondary}
      />
    </Card>
  );

  const renderMain = () => (
    <SafeAreaView style={styles.main}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.appShell}>
          {assistantOpen ? (
            renderAssistant()
          ) : planOpen ? (
            renderPlanFlow()
          ) : viewingTrip ? (
            loading ? renderLoading() : result ? renderItinerary() : renderTripUnavailable()
          ) : activeTab === 'home' ? (
            renderHome()
          ) : activeTab === 'trips' ? (
            renderTrips()
          ) : activeTab === 'explore' ? (
            renderExplore()
          ) : (
            renderProfile()
          )}

          {viewingTrip && !loading && result && error ? <InlineError message={error} /> : null}
        </View>
      </ScrollView>

      {/* Plan flow and the assistant stay focused, but the itinerary result
          keeps the tab bar so the user can go anywhere else from there. */}
      {assistantOpen || planOpen ? null : <BottomNav active={activeTab} onChange={changeTab} />}
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
    fontFamily: fonts.bold,
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
    fontFamily: fonts.bold,
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
  chatLog: {
    gap: 8,
    marginBottom: 12,
  },
  chatBubble: {
    maxWidth: '86%',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: colors.forest,
  },
  chatBubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
  },
  chatBubbleUserText: {
    color: colors.white,
  },
  chatBubbleAssistantText: {
    color: colors.ink,
  },
  proposalCard: {
    alignSelf: 'flex-start',
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginTop: 10,
    gap: 6,
  },
  proposalCardEyebrow: {
    color: colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 10,
  },
  proposalCardRow: {
    gap: 2,
  },
  proposalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  proposalButton: {
    flex: 1,
  },
  proposalNote: {
    color: colors.muted,
    fontStyle: 'italic',
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
  stopHours: {
    color: colors.muted,
    marginTop: 2,
  },
  stopDescription: {
    color: colors.ink,
    marginTop: 4,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    color: colors.teal,
  },
  stopCost: {
    marginTop: 4,
    color: colors.muted,
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
  // ---- Home ----
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingTop: 4,
  },
  notifButton: {
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
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.clay,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  notifPanel: {
    marginBottom: 16,
  },
  notifHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  notifClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  notifRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  notifRowRead: {
    opacity: 0.72,
  },
  notifBody: {
    flex: 1,
  },
  notifTime: {
    marginLeft: 4,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    color: colors.warning,
  },
  homeHero: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: 18,
  },
  homeHeroImage: {
    borderRadius: radius.xl,
  },
  homeHeroBody: {
    padding: 22,
  },
  homeHeroTitle: {
    color: colors.white,
    marginBottom: 6,
  },
  homeHeroText: {
    color: 'rgba(255,255,255,0.86)',
    marginBottom: 16,
  },
  homeSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    minHeight: 50,
    gap: 8,
    ...shadows.lifted,
  },
  homeSearchIcon: {
    marginLeft: 2,
  },
  homeSearchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 12,
  },
  homeSearchSubmit: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  recentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  recentPillText: {
    color: 'rgba(255,255,255,0.92)',
  },
  homeSection: {
    marginBottom: 24,
  },
  homeSectionLast: {
    marginBottom: 8,
  },
  homeSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  homeSectionEyebrow: {
    color: colors.forest,
  },
  viewAllText: {
    color: colors.forest,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  quickTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
    minHeight: 96,
    justifyContent: 'center',
    ...shadows.soft,
  },
  quickTileIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTileLabel: {
    fontSize: 11,
    color: colors.ink,
  },
  upcomingCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.lifted,
  },
  upcomingPhoto: {
    height: 190,
    justifyContent: 'flex-end',
  },
  upcomingPhotoImage: {
    borderRadius: radius.lg,
  },
  statusChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  statusChipText: {
    fontSize: 10,
    letterSpacing: 1.4,
  },
  upcomingBody: {
    padding: 18,
    paddingTop: 44,
  },
  upcomingTitle: {
    color: colors.white,
    marginBottom: 3,
  },
  upcomingMeta: {
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 10,
  },
  upcomingMetaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  upcomingEmpty: {
    paddingVertical: 14,
  },
  destCarousel: {
    gap: 12,
    paddingRight: 8,
  },
  destSlide: {
    width: 168,
  },
  destSlidePhoto: {
    height: 210,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    ...shadows.soft,
  },
  destSlidePhotoImage: {
    borderRadius: radius.lg,
  },
  destSlideBody: {
    padding: 14,
  },
  destSlideName: {
    color: colors.white,
    marginBottom: 2,
  },
  destSlideMood: {
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  destSlideBlurb: {
    color: 'rgba(255,255,255,0.66)',
  },
  promoCard: {
    backgroundColor: colors.tealSoft,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 14,
  },
  promoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  promoIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTitle: {
    marginBottom: 1,
  },
  promoText: {
    color: colors.secondary,
  },
  promoButton: {
    minHeight: 48,
  },

  // ---- Explore ----
  exploreSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    minHeight: 50,
    gap: 8,
    marginBottom: 12,
  },
  exploreSearchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    paddingRight: 10,
    marginBottom: 16,
  },
  destGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  destGridCard: {
    width: '47%',
    flexGrow: 1,
    maxWidth: 230,
  },
  destGridPhoto: {
    height: 190,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    ...shadows.soft,
  },
  destGridPhotoImage: {
    borderRadius: radius.lg,
  },
  destGridBody: {
    padding: 14,
  },
  destGridName: {
    color: colors.white,
    marginBottom: 2,
  },
  destGridMood: {
    color: 'rgba(255,255,255,0.8)',
  },
  exploreSection: {
    marginTop: 24,
  },
  exploreNoResults: {
    paddingVertical: 10,
  },
  collectionCard: {
    marginBottom: 12,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  collectionThumb: {
    width: 62,
    height: 62,
    borderRadius: radius.md,
  },
  collectionBody: {
    flex: 1,
  },

  // ---- My Trips ----
  tripsSection: {
    marginBottom: 20,
  },
  tripsSectionLabel: {
    marginBottom: 10,
    fontSize: 13,
  },
  tripsCard: {
    overflow: 'hidden',
  },
  tripsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  tripsRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tripsThumb: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
  },
  tripsRowText: {
    flex: 1,
  },
  tripsNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  tripsMeta: {
    flexShrink: 1,
  },
  tripsEmptyCard: {
    paddingVertical: 10,
  },
  statusChipTeal: {
    backgroundColor: colors.tealSoft,
  },
  statusChipTealText: {
    color: colors.forest,
    fontSize: 10,
    letterSpacing: 1,
  },
  statusChipNeutral: {
    backgroundColor: colors.surfaceMuted,
  },
  statusChipNeutralText: {
    color: colors.secondary,
    fontSize: 10,
    letterSpacing: 1,
  },

  // ---- Plan Trip wizard ----
  wizardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    paddingTop: 4,
  },
  wizardBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  wizardProgressWrap: {
    flex: 1,
    gap: 5,
  },
  wizardProgressText: {
    fontSize: 10.5,
  },
  wizardIntro: {
    marginBottom: 14,
  },
  wizardTitle: {
    marginTop: 4,
  },
  wizardCard: {
    marginBottom: 16,
  },
  wizardGroupLabel: {
    marginTop: 6,
    marginBottom: 10,
  },
  suggestionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  wizardFigureRow: {
    flexDirection: 'row',
    gap: 12,
  },
  wizardFigure: {
    flex: 1,
  },
  wizardOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  wizardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  wizardOptionActive: {
    borderColor: colors.forest,
    backgroundColor: colors.tealSoft,
  },
  wizardOptionDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardOptionDotActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  wizardOptionText: {
    color: colors.inkSoft,
  },
  wizardOptionTextActive: {
    color: colors.forestDeep,
    fontFamily: fonts.semibold,
  },
  wizardPaceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  wizardPace: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  wizardPaceActive: {
    borderColor: colors.forest,
    backgroundColor: colors.tealSoft,
  },
  wizardPaceText: {
    color: colors.secondary,
    textTransform: 'capitalize',
  },
  wizardPaceTextActive: {
    color: colors.forest,
  },
  wizardInterest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  wizardInterestActive: {
    borderColor: colors.forest,
    backgroundColor: colors.tealSoft,
  },
  wizardNotesField: {
    marginTop: 4,
  },
  wizardNotesInput: {
    minHeight: 74,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  wizardHint: {
    marginBottom: 14,
  },
  summaryBlock: {
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    width: 86,
  },
  summaryEdit: {
    marginLeft: 'auto',
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.tealSoft,
  },
  summaryEditSmall: {
    color: colors.forest,
    fontSize: 11.5,
  },
  generateSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  generateSummaryText: {
    flex: 1,
  },
  wizardGenerateButton: {
    marginTop: 4,
  },
  wizardFooter: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  wizardFooterButton: {
    flex: 1,
  },

  // ---- Itinerary day selector ----
  sectionBlock: {
    marginTop: 26,
  },
  dayChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
    paddingBottom: 4,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  dayChipActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  dayChipText: {
    color: colors.secondary,
  },
  dayChipTextActive: {
    color: colors.white,
  },

  unavailableSecondary: {
    marginTop: 10,
  },
  unavailableCard: {
    paddingVertical: 10,
  },

  // ---- AI Assistant ----
  assistantScreen: {
    flex: 1,
    minHeight: 520,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingTop: 4,
  },
  assistantLog: {
    flexGrow: 0,
  },
  assistantLogContent: {
    paddingBottom: 14,
  },
  assistantIntro: {
    marginBottom: 14,
  },
  assistantIntroText: {
    marginTop: 4,
  },
  promptChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  promptChip: {
    marginBottom: 2,
  },
  assistantBubbleRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  assistantBubbleRowUser: {
    justifyContent: 'flex-end',
  },
  assistantBubbleRowAssistant: {
    justifyContent: 'flex-start',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    color: colors.secondary,
  },
  assistantComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  assistantInput: {
    flex: 1,
    marginBottom: 0,
    minHeight: 48,
    textAlignVertical: 'center',
  },
  assistantSend: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  assistantSendDisabled: {
    opacity: 0.45,
  },

});
