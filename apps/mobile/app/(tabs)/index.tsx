import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
  Alert,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";
import WebMap from "../../src/components/web-map";
import { listStudios, type Studio } from "../../src/services/studios";
import { listSlots, type Slot } from "../../src/services/slots";

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const MAP_FALLBACK =
  "https://images.unsplash.com/photo-1526779259212-939e64788e3c?auto=format&fit=crop&w=1400&q=80";

const CATEGORY_CHIPS = [
  { id: "chip-1", label: "All" },
  { id: "chip-2", label: "My places" },
  { id: "chip-3", label: "Zapys Pay" },
  { id: "chip-4", label: "Discounts" },
];

const QUICK_FILTERS = [
  { id: "filter-1", label: "Hair services", icon: "cut-outline" },
  { id: "filter-2", label: "For Men", icon: "male-outline" },
  { id: "filter-3", label: "Nail services", icon: "hand-left-outline" },
];

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1609602961949-eddbb90383cc?auto=format&fit=crop&w=900&q=80",
];

export default function ExploreScreen() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const mapRef = useRef<any>(null);
  const [mapComponents, setMapComponents] = useState<{
    MapView: React.ComponentType<any>;
    Marker: React.ComponentType<any>;
  } | null>(null);
  const isWeb = Platform.OS === "web";
  const allowNativeMaps = !isWeb && Constants.appOwnership !== "expo";

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [studiosData, slotsData] = await Promise.all([
          listStudios(),
          listSlots({ available_only: true }),
        ]);
        if (!mounted) return;
        setStudios(studiosData);
        setSlots(slotsData);
      } catch (err) {
        console.warn("Failed to load explore data", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    if (allowNativeMaps) {
      import("react-native-maps")
        .then((maps) => {
          if (!mounted) return;
          setMapComponents({
            MapView: maps.default,
            Marker: maps.Marker,
          });
        })
        .catch(() => {
          if (!mounted) return;
          setMapComponents(null);
        });
    } else {
      setMapComponents(null);
    }
    return () => {
      mounted = false;
    };
  }, []);

  const studioCounts = useMemo(() => {
    return slots.reduce<Record<string, number>>((acc, slot) => {
      if (slot.studio) {
        acc[slot.studio] = (acc[slot.studio] || 0) + 1;
      }
      return acc;
    }, {});
  }, [slots]);

  const mapStudios = useMemo(() => {
    return studios
      .map((studio) => {
        const lat = typeof studio.latitude === "number"
          ? studio.latitude
          : studio.latitude != null
            ? Number(studio.latitude)
            : null;
        const lon = typeof studio.longitude === "number"
          ? studio.longitude
          : studio.longitude != null
            ? Number(studio.longitude)
            : null;
        return {
          ...studio,
          latitude: Number.isFinite(lat) ? lat : null,
          longitude: Number.isFinite(lon) ? lon : null,
        };
      })
      .filter(
        (studio) =>
          typeof studio.latitude === "number" &&
          typeof studio.longitude === "number"
      ) as (Studio & { latitude: number; longitude: number })[];
  }, [studios]);

  const initialRegion = useMemo<Region>(() => {
    if (mapStudios.length === 0) {
      return {
        latitude: 43.238949,
        longitude: 76.889709,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      };
    }

    const lats = mapStudios.map((studio) => studio.latitude);
    const lons = mapStudios.map((studio) => studio.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const latDelta = Math.max(0.05, (maxLat - minLat) * 1.6);
    const lonDelta = Math.max(0.05, (maxLon - minLon) * 1.6);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lonDelta,
    };
  }, [mapStudios]);

  const handleZoom = (direction: "in" | "out") => {
    const map = mapRef.current;
    if (!map) return;
    if (isWeb) {
      const delta = direction === "in" ? 1 : -1;
      if (!map._loaded || !map._mapPane || !map._container) return;
      try {
        map.setZoom(map.getZoom() + delta);
      } catch (err) {
        console.warn("Map zoom failed", err);
      }
      return;
    }
    map.getMapBoundaries().then((bounds: any) => {
      const centerLat = (bounds.northEast.latitude + bounds.southWest.latitude) / 2;
      const centerLon = (bounds.northEast.longitude + bounds.southWest.longitude) / 2;
      const latDelta = Math.abs(bounds.northEast.latitude - bounds.southWest.latitude);
      const lonDelta = Math.abs(bounds.northEast.longitude - bounds.southWest.longitude);
      const factor = direction === "in" ? 0.7 : 1.4;
      map.animateToRegion(
        {
          latitude: centerLat,
          longitude: centerLon,
          latitudeDelta: Math.max(0.01, latDelta * factor),
          longitudeDelta: Math.max(0.01, lonDelta * factor),
        },
        200
      );
    });
  };

  const handleCenter = () => {
    const map = mapRef.current;
    if (!map) return;
    if (isWeb) {
      if (!map._loaded || !map._mapPane || !map._container) return;
      try {
        map.setView([initialRegion.latitude, initialRegion.longitude], map.getZoom());
      } catch (err) {
        console.warn("Map center failed", err);
      }
      return;
    }
    map.animateToRegion(initialRegion, 250);
  };

  const notify = (title: string, message: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const handleLocate = () => {
    if (!isWeb) {
      handleCenter();
      return;
    }

    if (typeof window !== "undefined") {
      const isLocalhost = window.location.hostname === "localhost";
      if (window.location.protocol !== "https:" && !isLocalhost) {
        notify(
          "Location blocked",
          "Your browser requires HTTPS to access location. Open the web app via https or localhost."
        );
        return;
      }
    }

    if (!navigator.geolocation) {
      notify("Location unavailable", "Geolocation is not supported on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        if (mapRef.current) {
          const map = mapRef.current;
          if (!map._loaded || !map._mapPane || !map._container) return;
          try {
            const points = [
              coords,
              ...mapStudios.map(
                (studio) => [studio.latitude, studio.longitude] as [number, number]
              ),
            ];
            if (points.length > 1 && typeof map.fitBounds === "function") {
              map.fitBounds(points, { padding: [40, 40] });
            } else {
              map.setView(coords, Math.max(12, map.getZoom()));
            }
          } catch (err) {
            console.warn("Map locate failed", err);
          }
        }
      },
      (err) => {
        console.warn("Failed to get current location", err);
        notify("Location error", err?.message || "Unable to get current location.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const formatPrice = (value?: string | number | null) => {
    if (value == null) return "₸";
    const numeric = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(numeric)) return `${value} ₸`;
    return `${numeric.toLocaleString("ru-RU")} ₸`;
  };

  const filteredSlots = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return slots;
    return slots.filter((slot) => {
      const studioName = slot.studio_details?.name || "";
      const studioAddress = slot.studio_details?.address || "";
      const styleName = slot.dance_style_details?.name || "";
      const description = slot.description || "";
      const trainerFirst = slot.trainer_details?.trainer_details?.first_name || "";
      const trainerLast = slot.trainer_details?.trainer_details?.last_name || "";
      const trainerName = `${trainerFirst} ${trainerLast}`.trim();
      return (
        slot.title.toLowerCase().includes(needle) ||
        studioName.toLowerCase().includes(needle) ||
        studioAddress.toLowerCase().includes(needle) ||
        styleName.toLowerCase().includes(needle) ||
        description.toLowerCase().includes(needle) ||
        trainerFirst.toLowerCase().includes(needle) ||
        trainerLast.toLowerCase().includes(needle) ||
        trainerName.toLowerCase().includes(needle)
      );
    });
  }, [slots, query]);

  const filteredStudios = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return studios;
    const matchedStudioIds = new Set<string>();
    filteredSlots.forEach((slot) => {
      if (slot.studio) matchedStudioIds.add(slot.studio);
    });
    return studios.filter((studio) => {
      const name = studio.name?.toLowerCase() || "";
      const city = studio.city?.toLowerCase() || "";
      const address = studio.address?.toLowerCase() || "";
      return (
        name.includes(needle) ||
        city.includes(needle) ||
        address.includes(needle) ||
        matchedStudioIds.has(studio.uuid)
      );
    });
  }, [studios, filteredSlots, query]);

  const recommended = useMemo(() => filteredSlots.slice(0, 8), [filteredSlots]);

  const handleStudioPress = (studioId: string) => {
    if (!studioId) return;
    const q = query.trim();
    const suffix = q ? `?q=${encodeURIComponent(q)}` : "";
    router.push(`/studio/${studioId}${suffix}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={() => Keyboard.dismiss()}
        >
        <View style={styles.topBar}>
          <Pressable style={styles.locationPill}>
            <Ionicons name="location-outline" size={16} color="#111827" />
            <Text style={styles.locationText}>Almaty</Text>
            <Ionicons name="chevron-down" size={14} color="#6b7280" />
          </Pressable>
          <View style={styles.topActions}>
            <Pressable style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={18} color="#111827" />
            </Pressable>
            <Pressable style={styles.iconBtn}>
              <Ionicons name="heart-outline" size={18} color="#111827" />
            </Pressable>
          </View>
        </View>

        <View style={styles.mapCard}>
          {loading ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator color="#111827" />
            </View>
          ) : isWeb ? (
            <WebMap
              studios={mapStudios}
              counts={studioCounts}
              center={[initialRegion.latitude, initialRegion.longitude]}
              userLocation={userLocation}
              onMapReady={(mapInstance: any) => {
                mapRef.current = mapInstance;
              }}
              onStudioSelect={handleStudioPress}
            />
          ) : (
            mapComponents?.MapView && mapComponents?.Marker ? (
              <mapComponents.MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                initialRegion={initialRegion}
                showsCompass={false}
                showsPointsOfInterest={false}
                showsUserLocation
              >
                {mapStudios.map((studio) => (
                  <mapComponents.Marker
                    key={studio.uuid}
                    coordinate={{ latitude: studio.latitude, longitude: studio.longitude }}
                    onPress={() => handleStudioPress(studio.uuid)}
                  >
                    <View style={styles.pin}>
                      <Text style={styles.pinText}>{studioCounts[studio.uuid] || 1}</Text>
                    </View>
                  </mapComponents.Marker>
                ))}
              </mapComponents.MapView>
            ) : (
              <View style={styles.mapFallback}>
                <Image source={{ uri: MAP_FALLBACK }} style={styles.mapFallbackImage} contentFit="cover" />
                <View style={styles.mapFallbackOverlay} />
                <View style={styles.mapFallbackLabel}>
                  <Text style={styles.mapFallbackText}>Map requires a dev build</Text>
                </View>
              </View>
            )
          )}
          <View style={styles.mapControls}>
            <Pressable style={styles.mapControlBtn} onPress={() => handleZoom("in")}>
              <Ionicons name="add" size={18} color="#111827" />
            </Pressable>
            <Pressable style={styles.mapControlBtn} onPress={() => handleZoom("out")}>
              <Ionicons name="remove" size={18} color="#111827" />
            </Pressable>
            <Pressable style={styles.mapControlBtn} onPress={handleLocate}>
              <Ionicons name="locate-outline" size={18} color="#111827" />
            </Pressable>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInput}>
            <Ionicons name="search" size={18} color="#9ca3af" />
            <TextInput
              placeholder="Style, studio, or instructor"
              placeholderTextColor="#9ca3af"
              style={styles.searchText}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>
          <Pressable style={styles.filterBtn}>
            <Ionicons name="options-outline" size={18} color="#111827" />
          </Pressable>
        </View>

        {false ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {CATEGORY_CHIPS.map((chip, index) => (
                <Pressable
                  key={chip.id}
                  style={[styles.chip, index === 0 && styles.chipActive]}
                >
                  <Text style={[styles.chipText, index === 0 && styles.chipTextActive]}>
                    {chip.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.quickRow}>
              {QUICK_FILTERS.map((filter) => (
                <Pressable key={filter.id} style={styles.quickChip}>
                  <Ionicons name={filter.icon as keyof typeof Ionicons.glyphMap} size={16} color="#111827" />
                  <Text style={styles.quickText}>{filter.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Studios</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardRow}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#111827" />
            </View>
          ) : filteredStudios.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No studios found.</Text>
            </View>
          ) : (
            filteredStudios.map((studio, index) => {
              const imageUrl = FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
              const city = studio.city || "Almaty";
              const count = studioCounts[studio.uuid] || 0;
              return (
                <Pressable
                  key={studio.uuid}
                  style={styles.studioCard}
                  onPress={() => handleStudioPress(studio.uuid)}
                >
                  <Image source={{ uri: imageUrl }} style={styles.cardImage} contentFit="cover" />
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{studio.name}</Text>
                    <Text style={styles.cardSubtitle}>{city}</Text>
                    <Text style={styles.cardMeta}>{count} classes</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended</Text>
          <Pressable style={styles.sectionAction}>
            <Text style={styles.sectionActionText}>Recommended</Text>
            <Ionicons name="swap-vertical" size={14} color="#ef4444" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardRow}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#111827" />
            </View>
          ) : (
            recommended.map((slot, index) => {
              const imageUrl = slot.image_url || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
              const studioName = slot.studio_details?.name || "Studio";
              const studioCity = slot.studio_details?.city || "Almaty";
              const styleName = slot.dance_style_details?.name || "Style";
              const priceLabel = formatPrice(slot.price);
              const subtitle = [
                studioCity,
                priceLabel,
              ].join(" · ");
              return (
                <Pressable
                  key={slot.uuid}
                  style={styles.card}
                  onPress={() => router.push(`/class-details/${slot.uuid}`)}
                >
                  <Image source={{ uri: imageUrl }} style={styles.cardImage} contentFit="cover" />
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>{styleName}</Text>
                  </View>
                  <Pressable style={styles.cardHeart}>
                    <Ionicons name="heart-outline" size={16} color="#111827" />
                  </Pressable>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{studioName}</Text>
                    <Text style={styles.cardSubtitle}>{slot.title}</Text>
                    <Text style={styles.cardMeta}>{subtitle}</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  page: {
    paddingBottom: 32,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  locationText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  topActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  mapCard: {
    marginTop: 12,
    marginHorizontal: 16,
    height: 240,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#e5e7eb",
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  mapFallback: {
    ...StyleSheet.absoluteFillObject,
  },
  mapFallbackImage: {
    width: "100%",
    height: "100%",
  },
  mapFallbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  mapFallbackLabel: {
    position: "absolute",
    bottom: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.85)",
  },
  mapFallbackText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  pinText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  mapControls: {
    position: "absolute",
    right: 12,
    top: 12,
    gap: 8,
  },
  mapControlBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  searchRow: {
    marginTop: 16,
    marginHorizontal: 16,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  searchText: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  chipRow: {
    marginTop: 14,
    paddingHorizontal: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "white",
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  chipText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "white",
  },
  quickRow: {
    marginTop: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 10,
  },
  quickChip: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  quickText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  sectionHeader: {
    marginTop: 22,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionActionText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
  },
  cardRow: {
    marginTop: 12,
    paddingHorizontal: 12,
  },
  emptyCard: {
    width: 220,
    marginRight: 12,
    backgroundColor: "white",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    height: 180,
  },
  emptyCardText: {
    color: "#64748b",
    fontSize: 12,
  },
  loadingRow: {
    width: 220,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  studioCard: {
    width: 220,
    marginRight: 12,
    backgroundColor: "white",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  card: {
    width: 220,
    marginRight: 12,
    backgroundColor: "white",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardImage: {
    width: "100%",
    height: 140,
  },
  cardBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#111827",
  },
  cardHeart: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
  },
  cardMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#9ca3af",
  },
});

