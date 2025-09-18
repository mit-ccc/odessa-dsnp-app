import React, { useEffect, useState, useCallback, useContext } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  Text,
  StyleSheet,
} from "react-native";

import { getArchivedRounds } from "../../../api/wrappers";
import ArchiveCard from "./ArchiveCard";
import {
  MAX_NUMBER_PROMPTS_ARCHIVE_PAGE,
  PRIMARY_THEME_COLOR,
  LINE_HORIZONTAL_PADDING,
} from "../../../common/styles/config";
import { LocalStateContext } from "../../../state/LocalState";

export const ArchivePage = ({ navigation }) => {
  const { api, activeCommunity } = useContext(LocalStateContext);

  // definition of states
  const [rounds, setRounds] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // function that gets previous prompts
  // Function in Archive.js
  async function fetchAndSetPrompts() {
    console.info("fetching rounds");
    if (activeCommunity) {
      const roundsData = await getArchivedRounds(
        api,
        activeCommunity.id,
        MAX_NUMBER_PROMPTS_ARCHIVE_PAGE,
      );
      setRounds(roundsData || []);
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAndSetPrompts().finally(() => {
      setRefreshing(false);
    });
  });

  // get the previous prompts on startup
  useEffect(() => {
    if (activeCommunity === null) {
      return;
    }

    onRefresh();
  }, [activeCommunity]);

  // determining dynamic coloration based on number of prompts
  const topLightness = 80; // for the most recent prompt
  const bottomLightness = 30; // for the oldest prompt
  const LightnessStep =
    (topLightness - bottomLightness) / (rounds.length - 1 || 1); // div by 0 prevention

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {rounds.map((round, index) => (
          <ArchiveCard
            key={round.prompt.id}
            round={round}
            lightness={topLightness - index * LightnessStep}
            navigation={navigation}
          />
        ))}

        {rounds.length == 0 && (
          <ScrollView
            style={styles.feedContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View style={styles.noResponsesContainer}>
              <Text style={styles.noResponsesText}>
                Wait until a round is archived.
              </Text>
            </View>
          </ScrollView>
        )}
      </ScrollView>
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
    // backgroundColor: '#fff', // Or any other color that fits the theme
  },
  noResponsesText: {
    fontSize: 20,
    fontWeight: "bold",
    color: PRIMARY_THEME_COLOR,
    textAlign: "center",
    marginBottom: 20,
    padding: 20,
  },
});
