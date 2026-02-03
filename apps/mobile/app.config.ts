import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Tance",
  slug: "dance-crm",
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
  extra: {
    ...config.extra,
    router: config.extra?.router ?? {},
    eas: {
      projectId: "016d04b9-6d02-48c5-9308-c24d85432618",
    },
  },
});
