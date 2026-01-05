import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "dance-crm",
  slug: "dance-crm",
  extra: {},
});