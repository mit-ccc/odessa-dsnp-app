import { useState, useEffect, useContext } from "react";
import { gql } from "graphql-request";
import { LocalStateContext } from "../../state/LocalState";

const GET_COMMUNITY_QUERY = gql`
  query {
    communities(my: true, bridges: true) {
      id
      name
      description
      members_desc
      behaviors {
        encourage
        discourage
        ban
      }
      flags
      bridge_id
      bridges {
        id
        name
        description
        members_desc
        behaviors {
          encourage
          discourage
          ban
        }
      }
      bridge_ids
    }
  }
`;

export const useCommunities = (refreshCommunities) => {
  const {
    api,
    personaChange,
    activeCommunity,
    setActiveCommunity,
    setEncourageStr,
    setDiscourageStr,
    setBanStr,
  } = useContext(LocalStateContext);

  const [communities, setCommunities] = useState([]);

  useEffect(() => {
    const behaviors = activeCommunity?.behaviors;
    if (behaviors) {
      setEncourageStr(behaviors.encourage);
      setDiscourageStr(behaviors.discourage);
      setBanStr(behaviors.ban);
    }
  }, [activeCommunity]);

  useEffect(() => {
    if (!api) {
      return;
    }
    api.request(GET_COMMUNITY_QUERY).then((result) => {
      const { communities } = result;
      setCommunities(communities);
      if (communities?.length > 0 && activeCommunity === null) {
        setActiveCommunity(communities[0]);
      } else if (communities?.length == 0) {
        setActiveCommunity(undefined);
      } else {
        if (
          activeCommunity !== null &&
          !communities.map((c) => c.id).includes(activeCommunity?.id)
        ) {
          setActiveCommunity(communities[0]);
        }
      }
    });
  }, [api, refreshCommunities, activeCommunity, personaChange]);

  return { communities };
};
