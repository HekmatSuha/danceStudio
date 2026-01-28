"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function SWRProvider({ children }: Props) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 15000,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        keepPreviousData: true,
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
