import React, { useEffect, useCallback, useState, useContext } from "react";
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import {
  getUserCommunityPermissions,
  getPersonaPermissions,
} from "../../api/wrappers";
import { LocalStateContext } from "../../state/LocalState";
import {
  PRIMARY_THEME_COLOR,
  LINE_HORIZONTAL_PADDING,
  BODY_FONT,
} from "../../common/styles/config";
import { ModeratorActions } from "./components/moderator";
import { TrusteeActions } from "./components/trustee";
import { OwnerActions } from "./components/owner";
import { PersonaActions } from "./components/persona";
import { CommunityActions } from "./components/community";

export const CommunityPage = ({ navigation }) => {
  // states, user information, which community they are in, their response, the question, and others' responses

  const {
    persona0, // only 1 persona right now for us to deal with, use persona0.pkh for the pkh
    api,
    activeCommunity,
  } = useContext(LocalStateContext);
  const [refreshing, setRefreshing] = useState(false);
  const [userHasCommunities, setUserHasCommunities] = useState(null);
  const [communities, setCommunities] = useState(null);
  const [personaRoles, setPersonaRoles] = useState([]);
  const [personaPermissions, setPersonaPermissions] = useState([]);

  const enabledContentModModActions = activeCommunity?.flags.includes(
    "enable_content_moderation_moderator_actions",
  );

  // EVENT HANDLER & Local Function: refresh callback, gets question & answer information
  const refreshFeed = async () => {
    setUserHasCommunities(communities?.length > 0 || activeCommunity);

    const setPermissions = async () => {
      if (activeCommunity) {
        return await getUserCommunityPermissions(
          api,
          persona0.pkh,
          activeCommunity.id,
        );
      } else {
        return await getPersonaPermissions(api, persona0.pkh);
      }
    };

    const { roles, groups, permissions } = await setPermissions();

    setPersonaRoles(roles);
    setPersonaPermissions(permissions);
  };

  const onRefresh = useCallback(() => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    refreshFeed().finally(() => {
      setRefreshing(false);
    });
  });

  useEffect(() => {
    onRefresh();
  }, [persona0, api, activeCommunity]);

  // CurrentQPage component render method
  return (
    <View style={styles.container}>
      <CommunityActions
        navigation={navigation}
        permissions={personaPermissions}
      />

      {userHasCommunities && (
        <ScrollView
          style={styles.feedContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.noResponsesContainer}>
            <Text style={styles.noResponsesText}>Your actions</Text>
          </View>

          <View>
            {personaRoles.length > 0 && (
              <View style={styles.actionsContainer}>
                <PersonaActions
                  activeCommunity={activeCommunity}
                  permissions={personaPermissions}
                />
                {enabledContentModModActions && (
                  <ModeratorActions
                    navigation={navigation}
                    activeCommunity={activeCommunity}
                    permissions={personaPermissions}
                  />
                )}
                <OwnerActions
                  activeCommunity={activeCommunity}
                  permissions={personaPermissions}
                />
                <TrusteeActions
                  activeCommunity={activeCommunity}
                  permissions={personaPermissions}
                />
              </View>
            )}
            {personaRoles.length == 0 && (
              <Text style={styles.roleText}>No role for your persona.</Text>
            )}
          </View>
        </ScrollView>
      )}

      {/* {!userHasCommunities &&
      <ScrollView
      style={styles.feedContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View style={styles.noResponsesContainer}>
            <Text style={styles.noResponsesText}>
              Join a community to get these features!
            </Text>
        </View>
      </ScrollView>
    } */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  noResponsesContainer: {
    flex: 1,
    paddingTop: 30,
    justifyContent: "center",
    alignItems: "center",
    padding: LINE_HORIZONTAL_PADDING,
    backgroundColor: "#fff", // Or any other color that fits the theme
  },
  actionsContainer: {
    // flex: 1,
    // margin: 20,
    justifyContent: "center",
    padding: LINE_HORIZONTAL_PADDING,
    backgroundColor: "#fff", // Or any other color that fits the theme
  },
  noResponsesText: {
    fontSize: 20,
    fontWeight: "bold",
    color: PRIMARY_THEME_COLOR,
    textAlign: "center",
    marginBottom: 20,
    padding: 20,
  },
  roleText: {
    fontSize: 20,
    color: PRIMARY_THEME_COLOR,
    textAlign: "left",
    fontFamily: BODY_FONT,
  },
});
