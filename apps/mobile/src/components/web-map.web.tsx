import "leaflet/dist/leaflet.css";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

type WebStudio = {
  uuid: string;
  name: string;
  latitude: number;
  longitude: number;
  city?: string;
};

type WebMapProps = {
  studios: WebStudio[];
  counts: Record<string, number>;
  center: [number, number];
  userLocation?: [number, number] | null;
  onMapReady?: (map: any) => void;
  onStudioSelect?: (studioId: string) => void;
};

export default function WebMap({
  studios,
  counts,
  center,
  userLocation,
  onMapReady,
  onStudioSelect,
}: WebMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const markersRef = useRef<any | null>(null);
  const leafletRef = useRef<any | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    if (typeof window === "undefined") return;

    let canceled = false;
    const initMap = async () => {
      const mod = await import("leaflet");
      if (canceled || !isMounted.current) return;
      const L = mod.default ?? mod;
      leafletRef.current = L;

      // Check if map is already initialized to be safe
      if (mapRef.current) return;

      const map = L.map(container, {
        center,
        zoom: 12,
        zoomControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      mapRef.current = map;
      if (onMapReady && isMounted.current) {
         onMapReady(map);
      }
      if (isMounted.current) {
        setMapReady(true);
      }
    };

    initMap();

    return () => {
      canceled = true;
      isMounted.current = false;
      setMapReady(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      leafletRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Handle center updates separately
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    
    // Only flyTo/setView if distance is significant or just update
    // Use setView for immediate update or flyTo for smooth transition
    // Check if the map is still valid (has container)
    if (map._container) {
       map.setView(center, map.getZoom());
    }
  }, [center, mapReady]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!map || !L || !mapReady) return;

    const layer = L.layerGroup();
    studios.forEach((studio) => {
      if (
        typeof studio.latitude !== "number" ||
        typeof studio.longitude !== "number"
      )
        return;

      const count = counts[studio.uuid] || 0;
      const marker = L.circleMarker([studio.latitude, studio.longitude], {
        radius: 12,
        color: "#111827",
        fillColor: "#111827",
        fillOpacity: 1,
        weight: 1,
      });

      marker.bindPopup(
        `<strong>${studio.name}</strong><br/>${studio.city || "Almaty"} · ${count} classes`
      );
      marker.on("click", () => {
        if (onStudioSelect) {
          onStudioSelect(studio.uuid);
        }
      });

      marker.addTo(layer);
    });

    if (
      userLocation &&
      typeof userLocation[0] === "number" &&
      typeof userLocation[1] === "number"
    ) {
      const userMarker = L.circleMarker(userLocation, {
        radius: 10,
        color: "#2563eb",
        fillColor: "#3b82f6",
        fillOpacity: 1,
        weight: 2,
      });
      userMarker.bindPopup("You are here");
      userMarker.addTo(layer);
    }

    layer.addTo(map);
    markersRef.current = layer;

    return () => {
      try {
        if (mapRef.current && mapRef.current === map) {
           map.removeLayer(layer);
        }
      } catch (e) {
        // Map might be destroyed already
      }
    };
  }, [studios, counts, userLocation, mapReady]);

  return <View ref={containerRef as any} style={styles.map} />;
}

const styles = StyleSheet.create({
  map: {
    height: "100%",
    width: "100%",
  },
});
