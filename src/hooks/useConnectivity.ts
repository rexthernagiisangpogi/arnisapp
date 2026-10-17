import { useEffect, useState } from "react";

const netInfo: typeof import("@react-native-community/netinfo").default | null =
  (() => {
    try {
      return require("@react-native-community/netinfo").default;
    } catch {
      return null;
    }
  })();

export function useConnectivity() {
  const [isOffline, setIsOffline] = useState(false);
  useEffect(() => {
    if (!netInfo) return;
    return netInfo.addEventListener((state) => {
      setIsOffline(
        state.isConnected === false || state.isInternetReachable === false,
      );
    });
  }, []);
  return { isOffline };
}
