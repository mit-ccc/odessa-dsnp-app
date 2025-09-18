import React, { useContext, useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { CommunitySetBehaviorsPage } from "../globalAction/createCommunity";
import { useEnabledCommunityBehaviors } from "../../common/Hooks/communityFlags";
import CommunityMembers from "./CommunityMembers";
import VStack from "../../common/Stack/VStack";
import { Button } from "react-native-paper";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";

import { Spacing } from "../../common/styles";
import Heading from "../../common/Heading";
import CommunityAvatar from "../../common/CommunityAvatar";
import { Typography } from "../../common/styles";
import { usePermissions } from "../../common/Hooks/usePermissions";
import { personaUpdatesCommunity } from "../../api/wrappers";
import { LocalStateContext } from "../../state/LocalState";
import { useFocusEffect } from "@react-navigation/native";

const CommunityProfile = ({ route }) => {
  const {
    params: { community },
  } = route;

  const { api, activeCommunity } = useContext(LocalStateContext);
  const { personaPermissions } = usePermissions();
  const canEditCoC = personaPermissions?.includes("community.edit");

  const [displayCommunity, setDisplayCommunity] = useState(
    community ? community : activeCommunity,
  );
  const [newDescription, setNewDescription] = useState(
    displayCommunity.description,
  );
  const [newMetadata, setNewMetadata] = useState("{}");
  const [editPolicy, setEditPolicy] = useState(false);

  const enabledShowCommunityInfo =
    useEnabledCommunityBehaviors(displayCommunity);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setEditPolicy(false);
        setNewDescription(displayCommunity.description);
      };
    }, []),
  );

  useEffect(() => {
    setDisplayCommunity(community ? community : activeCommunity);
  }, [community, activeCommunity]);

  useEffect(() => {
    setNewDescription(displayCommunity.description);
  }, [displayCommunity]);

  const editCodeOfConduct = ({}) => {
    if (editPolicy) {
      Alert.alert(
        "Update Code of Conduct",
        "New posts will be analized using this updated Code of Conduct",
        [
          { text: "Cancel", onPress: onCancelCoC },
          { text: "Review", onPress: () => null },
          { text: "Submit", onPress: onSubmitCoC },
        ],
        { cancelable: true },
      );
    } else {
      setEditPolicy(!editPolicy);
    }
  };

  const onCancelCoC = () => {
    setEditPolicy(!editPolicy);
    setNewDescription(displayCommunity.description);
  };

  const onSubmitCoC = async () => {
    const response = await personaUpdatesCommunity({
      api: api,
      community_id: displayCommunity.id,
      description: newDescription,
      metadata: newMetadata,
      // name: null,
      // members_desc: null,
    });
    const updatedCommunity = response.personaUpdatesCommunity;
    if (!updatedCommunity) {
      alert("Error saving new policy");
      return false;
    }
    activeCommunity["description"] = newDescription;
    activeCommunity.behaviors["encourage"] =
      updatedCommunity?.behaviors?.encourage;
    activeCommunity.behaviors["ban"] = updatedCommunity?.behaviors?.ban;
    setDisplayCommunity(activeCommunity);
    setEditPolicy(!editPolicy);
    return true;
  };

  return (
    <ScrollView style={styles.container}>
      <VStack spacing="sm">
        <View style={styles.header}>
          <View style={styles.bufferSection} />
          <CommunityAvatar size="md" community={displayCommunity} />
          <Heading size="lg" noUnderline center>
            {displayCommunity.name}
          </Heading>
          <Text style={styles.description}>Purpose ~</Text>
          <TextInput
            editable={editPolicy}
            style={[
              styles.description,
              {
                backgroundColor: editPolicy ? "white" : "transparent",
                width: editPolicy ? "100%" : styles.description.width,
                borderRadius: 10,
                padding: 10,
              },
            ]}
            value={newDescription}
            multiline={true}
            onChangeText={(text) => setNewDescription(text)}
          />
          <Text>{}</Text>
          <Text style={styles.description}>
            Members ~ {displayCommunity.members_desc}
          </Text>
        </View>

        {enabledShowCommunityInfo && (
          <>
            <View style={styles.sectionTitle}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Heading size="md">Code of Conduct</Heading>
                {canEditCoC && (
                  <Button mode="elevated" onPress={editCodeOfConduct}>
                    {!editPolicy && (
                      <Icon name="circle-edit-outline" size={20} />
                    )}
                    {editPolicy && (
                      <Icon name="content-save-outline" size={20} />
                    )}
                  </Button>
                )}
              </View>

              <Text
                style={[
                  styles.description,
                  { width: "100%", textAlign: "left", marginBottom: 12 },
                ]}
              >
                The behaviors defined below directly inform the content
                moderation and ranking algorithms that help revise your
                community's experience.
              </Text>
            </View>
            <CommunitySetBehaviorsPage
              mode={editPolicy ? "editing" : "viewing"}
              readOnly={!editPolicy}
              community={displayCommunity}
              name={displayCommunity.name}
              setMetadata={setNewMetadata}
              setCanClickNext={() => true}
              fullBleed
            />
          </>
        )}
        <View style={styles.sectionTitle}>
          <Heading size="md">Members</Heading>
        </View>
        <CommunityMembers community={displayCommunity} />
        <View style={styles.bufferSection} />
      </VStack>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    width: "100%",
  },
  header: {
    flexDirection: "column",
    alignItems: "center",
  },
  description: {
    ...Typography.bodyDark,
    width: "80%",
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    paddingTop: Spacing.lg,
  },
  bufferSection: {
    marginBottom: Spacing.lg,
  },
});

export default CommunityProfile;
