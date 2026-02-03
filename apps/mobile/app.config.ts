import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Tance",
  slug: "dance-crm",
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: { backgroundColor: "#000000" },
      },
    ],
    [
      "react-native-maps",
      {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    ],
  ],
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey:
          process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
          config.android?.config?.googleMaps?.apiKey,
      },
    },
  },
  ios: {
    ...config.ios,
    bundleIdentifier: "com.hekmatsuha.dancecrm",
    config: {
      ...config.ios?.config,
      googleMapsApiKey:
        process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
        config.ios?.config?.googleMapsApiKey,
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "We use your location to show nearby studios and improve map results.",
      NSPhotoLibraryUsageDescription:
        "We access your photo library so you can upload a profile image.",
    },
  },
  extra: {
    ...config.extra,
    router: config.extra?.router ?? {},
    eas: {
      projectId: "016d04b9-6d02-48c5-9308-c24d85432618",
    },
  },
});
