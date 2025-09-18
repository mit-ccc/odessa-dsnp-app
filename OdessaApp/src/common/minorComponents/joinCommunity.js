import React, { useState, useContext, useEffect } from "react";
import { View } from "react-native";
import {
  JoinCommunityFlow,
  JOIN_PUPLIC_COMMUNITY,
} from "../../features/newAccount/FirstFlow";
import { LocalStateContext } from "../../state/LocalState";
import { gql } from "graphql-request";

const JoinCommunityScreen = ({ communities, setModalVisible }) => {
  const myCommunityIds = communities.map((c) => c.id);
  const [allCommunities, setAllCommunities] = useState([]);
  const [willJoinCommunity, setWillJoinCommunity] = useState({});

  const { persona0, api, triggerPersonaChange } = useContext(LocalStateContext);

  useEffect(() => {
    getPersonaAvailableCommunities(api, persona0.pkh).then((resp) => {
      setAllCommunities(resp);
    });
  }, [api]);

  const savePersona = async () => {
    allCommunities.forEach((community) => {
      if (willJoinCommunity[community.id]) {
        api.request(JOIN_PUPLIC_COMMUNITY, { community_id: community.id });
      }
    });
    triggerPersonaChange();
    setModalVisible(false);
  };

  return (
    <View style={{ marginTop: -50 }}>
      <JoinCommunityFlow
        savePersona={savePersona}
        activeCommunities={myCommunityIds}
        allCommunities={allCommunities}
        willJoinCommunity={willJoinCommunity}
        setWillJoinCommunity={setWillJoinCommunity}
      />
    </View>
  );
};

const GET_PERSONA_AVAILABLE_COMMUNITIES = gql`
  query personas($pkh: String!) {
    personas(pkh: $pkh) {
      available_communities {
        id
        name
        description
      }
    }
  }
`;

const getPersonaAvailableCommunities = async (api, pkh) => {
  const response = await api.request(GET_PERSONA_AVAILABLE_COMMUNITIES, {
    pkh,
  });
  return response.personas[0].available_communities;
};

export default JoinCommunityScreen;
