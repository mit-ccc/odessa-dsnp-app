import { useState, useEffect } from "react";
import { DEBUG_TAB } from "@env";

export const useAdmin = (activeCommunity) => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(activeCommunity?.id === -1 || DEBUG_TAB === "true");
  }, [activeCommunity]);

  return [isAdmin, setIsAdmin];
};
