export type TripMapStop = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  area?: string;
  category?: string;
  color: string;
  day: number;
  stopIndex: number;
};

export type TripMapMode = 'overview' | 'route' | 'stops';

export type TripMapStatus = 'openstreetmap' | 'google' | 'error';

export type TripMapProps = {
  stops: TripMapStop[];
  mode: TripMapMode;
  center: { latitude: number; longitude: number };
  selectedId?: string | null;
  googleKey?: string;
  onSelectStop?: (stop: TripMapStop) => void;
  onStatus?: (status: TripMapStatus) => void;
};
