import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function AdminWebDashboardScreen() {
  const params = useLocalSearchParams<{ url?: string }>();
  const [title, setTitle] = useState("Web Dashboard");

  const url = useMemo(() => {
    const raw = params.url ? String(params.url) : "";
    if (!raw) return "";
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params.url]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color="#0f172a" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.spacer} />
      </View>

      {!url ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Missing dashboard link.</Text>
        </View>
      ) : (
        <WebView
          source={{ uri: url }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          onLoadProgress={(event) => {
            if (event.nativeEvent.title) {
              setTitle(event.nativeEvent.title);
            }
          }}
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#0f172a" />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    height: 52,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backText: {
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 12,
  },
  title: {
    flex: 1,
    textAlign: "center",
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 12,
    paddingHorizontal: 8,
  },
  spacer: {
    width: 52,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
  },
});
