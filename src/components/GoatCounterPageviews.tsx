"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface GoatCounterWindow extends Window {
  goatcounter?: {
    count?: (options: { path: string }) => void;
  };
}

/** Counts client-side route changes for GoatCounter. count.js only tracks
 *  the initial page load, so navigations via next/link need a manual count. */
export function GoatCounterPageviews() {
  const pathname = usePathname();
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    (window as GoatCounterWindow).goatcounter?.count?.({ path: pathname });
  }, [pathname]);

  return null;
}
