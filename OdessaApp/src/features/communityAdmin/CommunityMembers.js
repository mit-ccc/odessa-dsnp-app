import React, { useState, useEffect, useContext } from "react";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";

import { LocalStateContext } from "../../state/LocalState";
import { getCommunityMembers } from "../../api/wrappers";
import { BODY_FONT, PRIMARY_THEME_COLOR } from "../../common/styles/config";
import ProfilePicture from "../../common/minorComponents/ProfilePicture";

const CommunityMembers = () => {
  const [communityMembers, setCommunityMembers] = useState([]);
  const { api, activePersona, activeCommunity, triggerPersonaChange } =
    useContext(LocalStateContext);
  const [isLoading, setIsLoading] = useState(false);
  const community = activeCommunity;

  const fetchCommunityMembers = async () => {
    if (!community) {
      setCommunityMembers([]);
      alert("Persona " + activePersona?.name + " must join a community first.");
      return;
    }
    if (community) {
      setIsLoading(true);
      const members = await getCommunityMembers(api, community.id);
      setCommunityMembers(members);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityMembers();
  }, [activeCommunity]);

  const renderPersona = (item) => (
    <View style={styles.headerContainer} key={`member-${item.id}`}>
      <View
        style={{
          flexDirection: "row",
          paddingVertical: 8,
        }}
      >
        <View>
          <ProfilePicture user={item} radius={14} borderCol={"black"} />
        </View>
        <View>
          <Text
            style={styles.simplePersonaName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator
          size="large"
          style={{ transform: [{ scaleX: 1 }, { scaleY: 1 }] }}
          color={PRIMARY_THEME_COLOR}
        />
      ) : (
        <>{communityMembers.map((member) => renderPersona(member))}</>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
  },
  simplePersonaName: {
    flex: 1, // Allowing the text to adjust its width within the container
    fontSize: 14,
    fontFamily: BODY_FONT,
    marginHorizontal: 10, // Add some margin to prevent text from touching the button
    color: "black",
  },
});

export default CommunityMembers;
