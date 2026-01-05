import { Redirect } from "expo-router";

// Default entrypoint: send users to the auth flow instead of the tab shell.
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
