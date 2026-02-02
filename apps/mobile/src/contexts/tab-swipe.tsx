import React, { createContext, useContext } from "react";

type TabSwipeContextValue = {
  swipeEnabled: boolean;
  setSwipeEnabled: (value: boolean) => void;
};

const TabSwipeContext = createContext<TabSwipeContextValue | null>(null);

export function TabSwipeProvider({
  value,
  children,
}: {
  value: TabSwipeContextValue;
  children: React.ReactNode;
}) {
  return <TabSwipeContext.Provider value={value}>{children}</TabSwipeContext.Provider>;
}

export function useTabSwipe() {
  return useContext(TabSwipeContext);
}
