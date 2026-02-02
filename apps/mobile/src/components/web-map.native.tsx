import React, { useMemo, useRef } from "react";
import { StyleSheet, View, Text } from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";

interface Studio {
  uuid: string;
  name: string;
  latitude: number;
  longitude: number;
  city?: string;
}

interface WebMapProps {
  studios?: Studio[];
  counts?: Record<string, number>;
  center?: [number, number];
  userLocation?: [number, number] | null;
  onMapReady?: (map: MapView | null) => void;
  onStudioSelect?: (id: string) => void;
}

export default function WebMap({
  studios = [],
  counts = {},
  center = [43.238949, 76.889709],
  userLocation,
  onMapReady,
  onStudioSelect,
}: WebMapProps) {
  const mapRef = useRef<MapView | null>(null);

  const initialRegion = useMemo(
    () => ({
      latitude: center[0],
      longitude: center[1],
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    }),
    [center],
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={(ref) => {
          mapRef.current = ref;
          if (onMapReady) {
            onMapReady(ref);
          }
        }}
        style={styles.map}
        initialRegion={initialRegion}
        showsCompass={false}
        showsBuildings={false}
        showsPointsOfInterest={false}
      >
        {studios.map((studio) => {
          if (
            typeof studio.latitude !== "number" ||
            typeof studio.longitude !== "number"
          ) {
            return null;
          }
          const count = counts[studio.uuid] ?? 0;
          return (
            <Marker
              key={studio.uuid}
              coordinate={{
                latitude: studio.latitude,
                longitude: studio.longitude,
              }}
              onPress={() => onStudioSelect?.(studio.uuid)}
            >
              <View style={styles.marker}>
                <Text style={styles.markerText}>{count}</Text>
              </View>
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{studio.name}</Text>
                  <Text style={styles.calloutSubtitle}>
                    {studio.city ?? "Almaty"} · {count} classes
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}

        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation[0],
              longitude: userLocation[1],
            }}
            pinColor="#2563eb"
            title="You are here"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e5e7eb",
  },
  map: {
    flex: 1,
  },
  marker: {
    backgroundColor: "#111827",
    borderColor: "#ffffff",
    borderRadius: 15,
    borderWidth: 2,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    width: 30,
  },
  markerText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  callout: {
    maxWidth: 200,
  },
  calloutTitle: {
    fontWeight: "700",
    marginBottom: 2,
  },
  calloutSubtitle: {
    color: "#4b5563",
    fontSize: 12,
  },
});
