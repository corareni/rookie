import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False during server render and before hydration, true once React owns the page. */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
