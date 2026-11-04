import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { colors } from './theme';
import type { TripMapProps } from './mapTypes';

export default function TripMap({
  stops,
  mode,
  center,
  selectedId,
  onSelectStop,
}: TripMapProps) {
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (!mapRef.current || stops.length === 0) return;

    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        stops.map(stop => ({ latitude: stop.latitude, longitude: stop.longitude })),
        {
          edgePadding: { top: 44, right: 44, bottom: 44, left: 44 },
          animated: true,
        },
      );
    }, 250);

    return () => clearTimeout(timer);
  }, [stops, mode]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={{
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      }}
      showsCompass
      showsTraffic={mode === 'route'}
      toolbarEnabled={false}
    >
      {mode === 'route' && stops.length > 1 ? (
        <Polyline
          coordinates={stops.map(stop => ({ latitude: stop.latitude, longitude: stop.longitude }))}
          strokeColor={colors.forest}
          strokeWidth={3}
          lineDashPattern={[6, 5]}
        />
      ) : null}

      {stops.map(stop => {
        const selected = selectedId === stop.id;
        return (
          <Marker
            key={stop.id}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
            title={stop.title}
            description={stop.area}
            pinColor={selected ? colors.clay : stop.color}
            onPress={() => onSelectStop?.(stop)}
          />
        );
      })}
    </MapView>
  );
}
