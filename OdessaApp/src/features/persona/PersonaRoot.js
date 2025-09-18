import { useEffect, useContext } from "react";
import { gql } from "graphql-request";

import { LocalStateContext } from "../../state/LocalState";
import { NotificationHandler } from "./../../../NotificationHandler";

const GET_PERSONA_QUERY = gql`
  query getPersona($pkh: String!) {
    personas(pkh: $pkh) {
      id
    }
  }
`;

// Checks to see if the hdkey has a corresponding persona entry in the backend.
export const PersonaRoot = () => {
  const {
    persona0,
    api,
    personaChange,
    personaInit,
    setPersonaInit,
    activeCommunity,
  } = useContext(LocalStateContext);

  useEffect(() => {
    // fixme: for now we say that an hdkey is initialized iff persona0
    // has an entry in the backend. This is ok for now but in the
    // future we'll want to store per-hd data in the backend.  See
    // https://www.notion.so/mit-ccc/Development-Kanban-40b6c400eac74f6689150a055c58a693?p=a40bd21a54604cb4aef5ef7aa1e15303&pm=s

    if (persona0 && api) {
      const variables = {
        pkh: persona0.pkh,
      };
      api.request(GET_PERSONA_QUERY, variables).then((result) => {
        const isKnown = (result["personas"] || []).length > 0;
        setPersonaInit(isKnown);
      });
    }
  }, [persona0, api, personaChange]);

  useEffect(() => {
    if (api && activeCommunity) {
      NotificationHandler.handleGetUserToken(api);
      NotificationHandler.requestUserPermission();
      NotificationHandler.handleInitialNotification();
      const unsubscribeForegroundListener =
        NotificationHandler.setupForegroundNotificationListener();

      return () => {
        // Clean up the listener when the component unmounts
        unsubscribeForegroundListener();
      };
    }
  }, [persona0, api, activeCommunity, personaChange]);

  return null;
};
