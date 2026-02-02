import React, { useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

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
  onMapReady?: (map: any) => void;
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
  const webViewRef = useRef<WebView>(null);

  const htmlContent = useMemo(() => {
    const studioMarkers = studios
      .filter(
        (s) =>
          typeof s.latitude === "number" && typeof s.longitude === "number",
      )
      .map((s) => {
        const count = counts[s.uuid] || 1;
        const safeName = (s.name || "").replace(/'/g, "&#39;");
        const safeCity = (s.city || "Almaty").replace(/'/g, "&#39;");
        return `
          L.marker([${s.latitude}, ${s.longitude}], {
            icon: L.divIcon({
              className: 'custom-pin',
              html: '<div style="background-color:#111827;color:#fff;width:30px;height:30px;border-radius:15px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;font-weight:700;font-size:12px;">${count}</div>',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            })
          }).addTo(map)
            .bindPopup('<strong>${safeName}</strong><br/>${safeCity} - ${count} classes')
            .on('click', () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STUDIO_SELECT', id: '${s.uuid}' }));
            });
        `;
      })
      .join("");

    const userMarker =
      userLocation && typeof userLocation[0] === "number" && typeof userLocation[1] === "number"
        ? `
          L.circleMarker([${userLocation[0]}, ${userLocation[1]}], {
            radius: 8,
            color: "#2563eb",
            fillColor: "#3b82f6",
            fillOpacity: 1,
            weight: 2
          }).addTo(map).bindPopup("You are here");
        `
        : "";

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            html, body { height: 100%; margin: 0; padding: 0; background-color: #e5e7eb; }
            #map { height: 100%; width: 100%; background-color: #e5e7eb; }
            .leaflet-control-attribution { display: none !important; }
            .leaflet-bar { border: none !important; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map', {
              zoomControl: false,
              attributionControl: false
            }).setView([${center[0]}, ${center[1]}], 13);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19
            }).addTo(map);

            ${studioMarkers}
            ${userMarker}

            function handleMessage(event) {
              try {
                var data = JSON.parse(event.data);
                if (data.type === 'ZOOM_IN') map.zoomIn();
                if (data.type === 'ZOOM_OUT') map.zoomOut();
                if (data.type === 'CENTER') map.setView([${center[0]}, ${center[1]}], map.getZoom());
              } catch (e) {}
            }

            window.addEventListener('message', handleMessage);
            document.addEventListener('message', handleMessage);
          </script>
        </body>
      </html>
    `;
  }, [studios, counts, center, userLocation]);

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "STUDIO_SELECT" && onStudioSelect) {
        onStudioSelect(data.id);
      }
    } catch (e) {
      console.warn("Map message error", e);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={(ref) => {
          (webViewRef as any).current = ref;
          if (onMapReady) onMapReady(ref);
        }}
        originWhitelist={["*"]}
        source={{ html: htmlContent, baseUrl: "" }}
        style={styles.map}
        onMessage={onMessage}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
      />
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
});
