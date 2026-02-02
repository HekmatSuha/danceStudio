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
  const studioMarkersRef = useRef<Map<string, any>>(new Map());
  const userMarkerRef = useRef<any | null>(null);
  const leafletRef = useRef<any | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const isMounted = useRef(false);

  // Keep callback fresh without triggering effects
  const onStudioSelectRef = useRef(onStudioSelect);
  useEffect(() => {
    onStudioSelectRef.current = onStudioSelect;
  }, [onStudioSelect]);

  useEffect(() => {
    isMounted.current = true;
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    if (typeof window === "undefined") return;

    let canceled = false;
    const initMap = async () => {
      if (typeof document !== "undefined") {
        const existing = document.querySelector('link[data-leaflet-css="true"]');
        if (!existing) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          link.setAttribute("data-leaflet-css", "true");
          document.head.appendChild(link);
        }
      }

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
      // Clear refs
      studioMarkersRef.current.clear();
      userMarkerRef.current = null;
      markersRef.current = null;
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

  // Handle studios and counts updates (Optimized)
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!map || !L || !mapReady) return;

    // Ensure layer group exists
    if (!markersRef.current) {
      markersRef.current = L.layerGroup().addTo(map);
    }
    const layer = markersRef.current;
    const studioMarkers = studioMarkersRef.current;

    const activeIds = new Set<string>();

    studios.forEach((studio) => {
      if (
        typeof studio.latitude !== "number" ||
        typeof studio.longitude !== "number"
      )
        return;

      activeIds.add(studio.uuid);
      const count = counts[studio.uuid] || 0;
      const popupContent = `<strong>${studio.name}</strong><br/>${studio.city || "Almaty"} · ${count} classes`;

      let marker = studioMarkers.get(studio.uuid);

      if (marker) {
        // Update existing marker
        const currentLatLng = marker.getLatLng();
        if (currentLatLng.lat !== studio.latitude || currentLatLng.lng !== studio.longitude) {
           marker.setLatLng([studio.latitude, studio.longitude]);
        }

        // Update popup content
        if (marker.getPopup()) {
             marker.setPopupContent(popupContent);
        } else {
             marker.bindPopup(popupContent);
        }
      } else {
        // Create new marker
        marker = L.circleMarker([studio.latitude, studio.longitude], {
          radius: 12,
          color: "#111827",
          fillColor: "#111827",
          fillOpacity: 1,
          weight: 1,
        });

        marker.bindPopup(popupContent);
        marker.on("click", () => {
          if (onStudioSelectRef.current) {
            onStudioSelectRef.current(studio.uuid);
          }
        });

        marker.addTo(layer);
        studioMarkers.set(studio.uuid, marker);
      }
    });

    // Remove old markers
    for (const [uuid, marker] of studioMarkers.entries()) {
      if (!activeIds.has(uuid)) {
        layer.removeLayer(marker);
        studioMarkers.delete(uuid);
      }
    }
  }, [studios, counts, mapReady]);

  // Handle user location updates
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!map || !L || !mapReady) return;

    if (!markersRef.current) {
      markersRef.current = L.layerGroup().addTo(map);
    }
    const layer = markersRef.current;

    if (
      userLocation &&
      typeof userLocation[0] === "number" &&
      typeof userLocation[1] === "number"
    ) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(userLocation);
      } else {
        const userMarker = L.circleMarker(userLocation, {
          radius: 10,
          color: "#2563eb",
          fillColor: "#3b82f6",
          fillOpacity: 1,
          weight: 2,
        });
        userMarker.bindPopup("You are here");
        userMarker.addTo(layer);
        userMarkerRef.current = userMarker;
      }
    } else {
      if (userMarkerRef.current) {
        layer.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
    }
  }, [userLocation, mapReady]);

  return <View ref={containerRef as any} style={styles.map} />;
}

const styles = StyleSheet.create({
  map: {
    height: "100%",
    width: "100%",
  },
});
