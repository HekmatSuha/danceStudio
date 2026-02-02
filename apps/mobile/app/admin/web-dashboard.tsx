import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useLocalSearchParams } from "expo-router";

export default function AdminWebDashboardScreen() {
  const params = useLocalSearchParams<{ url?: string }>();

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
