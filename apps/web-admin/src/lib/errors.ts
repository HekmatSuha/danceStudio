export function getErrorMessage(err: unknown, fallback = "An unexpected error occurred.") {
  if (err instanceof Error) return err.message;
  return fallback;
}
