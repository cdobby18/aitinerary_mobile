import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { TripMapProps, TripMapStatus, TripMapStop } from './mapTypes';

const GOOGLE_SCRIPT_ID = 'aitinerary-google-maps';

const pinStyles = `
.trip-map-pin {
  background: transparent;
  border: 0;
}
.trip-map-pin span {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 2px solid #FFFFFF;
  color: #FFFFFF;
  font-family: Inter, system-ui, -apple-system, sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  box-shadow: 0 4px 10px rgba(18, 30, 21, 0.28);
}
.trip-map-pin.is-selected span {
  width: 32px;
  height: 32px;
  margin: -3px;
  border-width: 3px;
  font-size: 12px;
}
.leaflet-container {
  font-family: Inter, system-ui, -apple-system, sans-serif;
  background: #E8EDE2;
}
.leaflet-control-attribution {
  font-size: 9px;
  background: rgba(255, 255, 255, 0.82) !important;
  color: #526054 !important;
}
.leaflet-control-zoom {
  border: 0 !important;
  box-shadow: 0 2px 8px rgba(18, 30, 21, 0.16) !important;
}
.leaflet-control-zoom a {
  color: #2E4A33 !important;
}
`;

let pinStylesInjected = false;

const ensurePinStyles = () => {
  if (pinStylesInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.setAttribute('data-aitinerary', 'trip-map');
  style.textContent = pinStyles;
  document.head.appendChild(style);
  pinStylesInjected = true;
};

let googlePromise: Promise<void> | null = null;

const loadGoogleMaps = (key: string) =>
  new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('No window'));
    if ((window as any).google?.maps) return resolve();

    const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Google Maps failed')));
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps failed'));
    document.head.appendChild(script);
  });

const pinIcon = (stop: TripMapStop, index: number, selected: boolean) =>
  L.divIcon({
    className: `trip-map-pin${selected ? ' is-selected' : ''}`,
    html: `<span style="background:${selected ? '#C86F45' : stop.color}">${index + 1}</span>`,
    iconSize: selected ? [32, 32] : [26, 26],
    iconAnchor: selected ? [16, 16] : [13, 13],
  });

export default function TripMap({
  stops,
  mode,
  center,
  selectedId,
  googleKey,
  onSelectStop,
  onStatus,
}: TripMapProps) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const googleMapRef = useRef<any>(null);
  const googleLayersRef = useRef<any[]>([]);
  const [engine, setEngine] = useState<'pending' | 'google' | 'osm'>(
    googleKey ? 'pending' : 'osm',
  );
  const selectRef = useRef(onSelectStop);
  const statusRef = useRef(onStatus);

  selectRef.current = onSelectStop;
  statusRef.current = onStatus;

  const report = (status: TripMapStatus) => statusRef.current?.(status);

  // Pick a rendering engine once a key is available.
  useEffect(() => {
    let active = true;
    if (!googleKey) {
      setEngine('osm');
      return;
    }

    setEngine('pending');
    googlePromise = googlePromise ?? loadGoogleMaps(googleKey);

    googlePromise
      .then(() => {
        if (active) setEngine('google');
      })
      .catch(() => {
        if (active) setEngine('osm');
      });

    return () => {
      active = false;
    };
  }, [googleKey]);

  // OpenStreetMap / Leaflet
  useEffect(() => {
    if (engine !== 'osm' || !holderRef.current) return;

    ensurePinStyles();

    if (!mapRef.current) {
      mapRef.current = L.map(holderRef.current, {
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: false,
      });
      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
      mapRef.current.attributionControl.setPrefix(false);
    }

    const map = mapRef.current;
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    layerRef.current?.remove();
    const group = L.layerGroup().addTo(map);
    layerRef.current = group;

    const points = stops.map(
      stop => [stop.latitude, stop.longitude] as [number, number],
    );

    if (mode === 'route' && points.length > 1) {
      L.polyline(points, {
        color: '#2E4A33',
        weight: 3,
        opacity: 0.85,
        dashArray: '7 6',
        lineCap: 'round',
      }).addTo(group);
    }

    stops.forEach((stop, index) => {
      const selected = stop.id === selectedId;
      const marker = L.marker([stop.latitude, stop.longitude], {
        icon: pinIcon(stop, index, selected),
        keyboard: true,
        title: stop.title,
        zIndexOffset: selected ? 500 : 0,
      }).addTo(group);

      marker.bindTooltip(`${index + 1}. ${stop.title}`, {
        direction: 'top',
        offset: [0, -14],
        opacity: 0.95,
      });
      marker.on('click', () => selectRef.current?.(stop));
    });

    const bounds = L.latLngBounds(points);
    if (points.length === 0) {
      map.setView([center.latitude, center.longitude], 11);
    } else if (points.length === 1) {
      map.setView(points[0], 13, { animate: false });
    } else {
      map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: mode === 'overview' ? 11 : 14,
        animate: false,
      });
    }

    report('openstreetmap');

    return () => {
      // Leaflet is reused across updates; cleanup happens on unmount.
    };
  }, [engine, stops, mode, selectedId, center.latitude, center.longitude]);

  // Google Maps
  useEffect(() => {
    if (engine !== 'google' || !holderRef.current) return;
    const google = (window as any).google;
    if (!google?.maps) return;

    if (!googleMapRef.current) {
      googleMapRef.current = new google.maps.Map(holderRef.current, {
        center: { lat: center.latitude, lng: center.longitude },
        zoom: 11,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
    }

    const map = googleMapRef.current;
    googleLayersRef.current.forEach(layer => layer.setMap?.(null));
    googleLayersRef.current = [];

    const path = stops.map(stop => ({ lat: stop.latitude, lng: stop.longitude }));

    if (mode === 'route' && path.length > 1) {
      googleLayersRef.current.push(
        new google.maps.Polyline({
          path,
          map,
          strokeColor: '#2E4A33',
          strokeOpacity: 0.9,
          strokeWeight: 3,
        }),
      );
    }

    stops.forEach((stop, index) => {
      const selected = stop.id === selectedId;
      const marker = new google.maps.Marker({
        map,
        position: { lat: stop.latitude, lng: stop.longitude },
        title: stop.title,
        zIndex: selected ? 500 : index,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: selected ? 15 : 12,
          fillColor: selected ? '#C86F45' : stop.color,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
        label: {
          text: String(index + 1),
          color: '#FFFFFF',
          fontSize: selected ? '12px' : '10px',
          fontWeight: '700',
        },
      });
      marker.addListener('click', () => selectRef.current?.(stop));
      googleLayersRef.current.push(marker);
    });

    if (path.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      path.forEach(point => bounds.extend(point));
      map.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 });
      if (path.length === 1) map.setZoom(13);
    }

    report('google');
  }, [engine, stops, mode, selectedId, center.latitude, center.longitude]);

  // Pan to a selected pin without resetting the whole viewport.
  useEffect(() => {
    if (!selectedId) return;
    const selected = stops.find(stop => stop.id === selectedId);
    if (!selected) return;

    if (engine === 'osm' && mapRef.current) {
      mapRef.current.panTo([selected.latitude, selected.longitude], { animate: true });
    }
    if (engine === 'google' && googleMapRef.current) {
      googleMapRef.current.panTo({ lat: selected.latitude, lng: selected.longitude });
    }
  }, [selectedId, engine, stops]);

  useEffect(() => {
    return () => {
      if (engine === 'osm' && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (engine === 'google') {
        googleLayersRef.current.forEach(layer => layer.setMap?.(null));
        googleLayersRef.current = [];
        googleMapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  return (
    <div
      ref={holderRef}
      style={{ width: '100%', height: '100%', position: 'relative', zIndex: 0 }}
      aria-label="Trip route map"
      role="img"
    />
  );
}
