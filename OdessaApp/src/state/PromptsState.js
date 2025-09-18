import React, { useContext } from "react";
import { LocalStateContext } from "./LocalState";

import { createContext } from "react";
import { usePrompts } from "../common/Hooks/usePrompts";

export const PromptsContext = createContext();

export const PromptsProvider = ({ children }) => {
  const { api, activeCommunity, persona0, persona0Data } =
    useContext(LocalStateContext);

  const prompts = usePrompts(api, activeCommunity, persona0, persona0Data);

  return (
    <PromptsContext.Provider value={prompts}>
      {children}
    </PromptsContext.Provider>
  );
};
