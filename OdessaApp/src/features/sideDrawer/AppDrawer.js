import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/FontAwesome";
import PersonaBlock from "./components/PersonaBlock";
import { LocalStateContext } from "../../state/LocalState";
import { get_personas_call } from "../../api/wrappers";
import HelpModal from "./components/HelpModal";
import { Colors, Spacing, Typography } from "../../common/styles";
import JoinCommunityModal from "../../common/minorComponents/joinCommunityModal";
import { useCommunities } from "../../common/Hooks/useCommunities";
import Heading from "../../common/Heading";
import VStack from "../../common/Stack/VStack";
import CommunityAvatar from "../../common/CommunityAvatar";
import { useAdmin } from "../../common/Hooks/useAdmin";

export const DrawerContents = ({ navigation, refreshDrawer }) => {
  const {
    api,
    personaKeys,
    personaChange,
    triggerPersonaChange,
    activeCommunity,
    setActiveCommunity,
    setPersonasData,
    setEncourageStr,
    setDiscourageStr,
    setBanStr,
  } = useContext(LocalStateContext);

  const [activePersona, setActivePersona] = useState([]);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [joinCommunityVisible, setJoinCommunityVisible] = useState(false);
  const { communities } = useCommunities(personaChange);
  const [isAdmin] = useAdmin(activeCommunity);
  const [visibleCommunities, setVisibleCommunities] = useState([]);

  useEffect(() => {
    setVisibleCommunities(communities);
    refreshDrawer();
  }, [personaChange, activeCommunity, communities]);

  useEffect(() => {
    if (!personaKeys) {
      setPersonasData([]);
      return;
    }

    // fixme: we currently only support a single persona. Otherwise
    // we'd loop through all of the persona keys here.
    get_personas_call(api, personaKeys.info[0].pkh).then((result) => {
      setPersonasData(result);
      if (result && result.length > 0) {
        setActivePersona(result[0]);
      } else {
        setActivePersona(null);
      }
    });
  }, [personaKeys, personaChange]);

  const onSelectCommunity = (community) => {
    setActiveCommunity(community);
    refreshDrawer();
  };

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    triggerPersonaChange();
    refreshDrawer();
    setRefreshing(false);
  });

  const windowHeight = Dimensions.get("window").height;
  const [viewHeight, setViewHeight] = useState(
    windowHeight - (windowHeight < 700 ? 360 : 420),
  );
  // const [viewHeight, setViewHeight] = useState(windowHeight < 700 ? 320 : 420);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.drawerSection}>
        <Text style={styles.header}>ODESSA</Text>
      </View>
      {/* User Info Section */}
      <View
        style={[styles.header, styles.drawerSection, styles.topBorderedSection]}
      >
        {activePersona && (
          <PersonaBlock persona={activePersona} navigation={navigation} />
        )}
      </View>

      <View
        style={[
          styles.drawerSection,
          styles.topBorderedSection,
          styles.communitySection,
          {
            maxHeight: viewHeight,
          },
        ]}
      >
        <VStack spacing="lg">
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.communityTitle}>Communities</Text>
          </TouchableOpacity>
          <VStack spacing="lg">
            <ScrollView
              contentInsetAdjustmentBehavior="automatic"
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              {visibleCommunities.map((community, index) => (
                <View key={index}>
                  <TouchableOpacity
                    hitSlop={15}
                    style={{ zIndex: 1 }}
                    onPress={() => onSelectCommunity(community)}
                  >
                    <View style={styles.buttonLabelContainer}>
                      <View style={styles.communityAvatarContainer}>
                        <CommunityAvatar size="md" community={community} />
                      </View>
                      <View style={styles.communityNameContainer}>
                        <Heading
                          noUnderline={activeCommunity?.id !== community.id}
                          size="md"
                          animate
                        >
                          {community.name}
                        </Heading>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={{ height: 60 }}></View>
            </ScrollView>
          </VStack>
        </VStack>
      </View>
      <View style={{ flex: 1 }} />
      <View style={[styles.topBorderedSection, styles.drawerSection]}>
        {isAdmin && (
          <View style={styles.drawerButtonSpacing}>
            <DrawerButton
              iconName="database"
              label="Debug (Admin Only)"
              onPress={() => navigation.navigate("Debug")}
            />
          </View>
        )}
        <View style={styles.drawerButtonSpacing}>
          <DrawerButton
            iconName="plus-square-o"
            label="Add a Community"
            onPress={() => setJoinCommunityVisible(true)}
          />
        </View>
        <DrawerButton
          iconName="question-circle-o"
          label="Help"
          onPress={() => setHelpModalVisible(true)}
        />
      </View>
      <HelpModal
        modalVisible={helpModalVisible}
        setModalVisible={setHelpModalVisible}
      />
      <JoinCommunityModal
        modalVisible={joinCommunityVisible}
        setModalVisible={setJoinCommunityVisible}
        communities={communities}
      />
    </SafeAreaView>
  );
};

const DrawerButton = ({ iconName, label, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <View style={styles.buttonLabelContainer}>
      <Icon name={iconName} size={20} color={Colors.defaultText} />
      <Text style={styles.drawerButtonText}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  communitySection: {
    paddingBottom: Spacing.xl,
  },
  communityDescription: {
    ...Typography.bodyDark,
  },
  communityTitle: {
    ...Typography.body,
    fontSize: Typography.md,
    color: Colors.darkGray,
    paddingTop: Spacing.sm,
  },
  communityAvatarContainer: {
    flex: 1,
  },
  communityNameContainer: {
    flex: 3,
    paddingLeft: Spacing.lg,
  },
  drawerSection: {
    padding: 15,
    paddingHorizontal: 20,
    flexDirection: "column",
  },
  header: {
    ...Typography.appTitle,
    textAlign: "center",
  },
  topBorderedSection: {
    borderTopWidth: 1,
    borderColor: Colors.borderColor,
  },
  buttonLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  drawerButtonText: {
    ...Typography.bodyDark,
    marginLeft: 10,
  },
  drawerButtonSpacing: {
    paddingBottom: 10,
  },
});
