import { Redirect } from "expo-router";

// Default entrypoint: send users to the public tab shell.
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
