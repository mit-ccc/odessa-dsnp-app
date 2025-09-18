import React, { useEffect, useCallback, useState, useContext } from "react";
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
  RefreshControl,
} from "react-native";
import { FAB } from "react-native-paper";
import {
  getRoundAnswers,
  getActiveRound,
  userCanPost,
  userCanPlayRound,
} from "../../api/wrappers";
import CurrentQCard from "./components/CurrentQCard";
import BridgedRoundBadge from "./components/BridgedRoundBadges";
import ResponseChain from "./components/ResponseChain";
import AnswerSubmissionModal from "./components/AnswerSubmissionModal";
import TimeRemaining from "./components/TimeRemaining";
import { LocalStateContext } from "../../state/LocalState";
import DropDownPicker from "react-native-dropdown-picker";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import {
  PRIMARY_THEME_COLOR,
  LINE_HORIZONTAL_PADDING,
  SECONDARY_THEME_COLOR,
  QUINARY_THEME_COLOR,
  TERTIARY_THEME_COLOR,
  QUATERNARY_THEME_COLOR,
} from "../../common/styles/config";
import { Colors } from "../../common/styles";
import { TouchableOpacity } from "react-native-gesture-handler";
import PolicyModal from "./components/PolicyModal";

export const CurrentQPage = ({ route, navigation, navigation: navigate }) => {
  // states, user information, which community they are in, their response, the question, and others' responses

  const {
    persona0, // only 1 persona right now for us to deal with, use persona0.pkh for the pkh
    api,
    activeCommunity,
  } = useContext(LocalStateContext);
  const [activeRound, setActiveRound] = useState(null);
  const [currentPromptID, setCurrentPromptID] = useState(
    route?.params?.round?.prompt?.id,
  );
  const [isModalVisible, setModalVisible] = useState(false);
  const [promptComplete, setPromptComplete] = useState(false); // if we passed in a prompt, it is complete
  const [refreshing, setRefreshing] = useState(false);
  const [recorderStatus, setRecorderStatus] = useState(false);
  const [communityHasRound, setCommunityHasRound] = useState(false);
  const [userCanRespond, setUserCanRespond] = useState(true);
  const [userCanPlayThisRound, setUserCanPlayThisRound] = useState(true);
  const [playingRound, setPlayingRound] = useState(false);
  const [players, setPlayers] = useState([]);
  const [userHasCommunities, setUserHasCommunities] = useState(null);
  const [communities, setCommunities] = useState(null);

  const [playingByRound, setPlayingByRound] = useState(null);
  const [playingByRoundStatus, setPlayingByRoundStatus] = useState("finished");

  const showGoBack = currentPromptID !== undefined;

  // EVENT HANDLER & Local Function: refresh callback, gets question & answer information
  const refreshFeed = async () => {
    setUserHasCommunities(
      communities?.length > 0 || activeCommunity || currentPromptID,
    );

    if (currentPromptID !== undefined || activeCommunity !== undefined) {
      let round;

      try {
        if (currentPromptID === undefined) {
          round = await getActiveRound(api, activeCommunity.id);
        } else if (route?.params?.round?.status !== "accept_answers") {
          round = route.params.round;
        }
        if (round && !round.prompt.replies) {
          round = await getRoundAnswers(api, round.id);
        }

        if (round) {
          userCanPost(api, persona0.pkh, round.id).then((resp) => {
            setUserCanRespond(resp.personaCanPost);
          });
          userCanPlayRound(api, persona0.pkh, round.id).then((resp) => {
            setUserCanPlayThisRound(resp.personaCanPlayRound);
          });
        }

        setActiveRound(round);
        setPromptComplete(round?.status != "accept_answers");
        setCommunityHasRound(round !== null);
      } catch (error) {
        console.error("Failed to refresh feed", error);
      }
    }
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

  // HOOK: refresh feed if user or community changes (as that's what its dependent on)
  useEffect(() => {
    onRefresh();
  }, [persona0, api, activeCommunity]);

  const onCloseModal = async () => {
    console.log("recorderStatus", recorderStatus);

    if (recorderStatus == "recording" || recorderStatus == "paused") {
      Alert.alert(
        "",
        "If you go back, you will lose the currently recording audio.",
        [
          { text: "Go back", onPress: () => setModalVisible(false) },
          { text: "Stay" },
        ],
        { cancelable: true },
      );
    } else {
      setModalVisible(false);
    }
  };

  const handleSetRecorderStatus = (status) => {
    setRecorderStatus(status);
  };

  useEffect(() => {
    // console.log('PLAY', playingByRoundStatus, playingByRound);
    if (playingByRoundStatus != "finished") {
      return;
    }

    if (playingByRound == null) {
      return;
    }

    if (playingByRound == 0 && players[0].state.status == "stopped") {
      players[0].onPress();
      return;
    }

    const prev_player_finished = players[playingByRound - 1]?.state.finished;
    const this_player_stopped =
      players[playingByRound]?.state.status == "stopped";
    if (playingByRound > 0 && prev_player_finished && this_player_stopped) {
      const interval = setInterval(() => {
        if (players[playingByRound].state.status == "stopped") {
          players[playingByRound].onPress();
          clearInterval(interval);
        }
      }, 250);
      return;
    }
  }, [playingByRound]);

  const handlePlayRound = async () => {
    if (playingByRound == null) {
      setPlayingRound(true);
      playNext(0);
    } else {
      let player = players[playingByRound];
      setPlayingRound(player.state.status != "playing" ? true : false);
      player.onPress();
    }
  };

  const playNext = (index) => {
    if (index === players.length) {
      setPlayingByRound(null);
      setPlayingRound(false);
    } else if (index == 0 || index == playingByRound + 1) {
      setPlayingByRound(index);
    }
  };

  const handlePlayNext = async (value) => {
    if (value == "playing") {
      setPlayingRound(false);
    } else if (value == "paused" || value == "stopped") {
      setPlayingRound(true);
    } else if (value == "finished") {
      setPlayingByRoundStatus("finished");
      playNext(playingByRound + 1);
    }
  };

  const [activePlayer, setActivePayer] = useState(null);
  useEffect(() => {
    players.forEach((player, index) => {
      if (activePlayer == player.props.audio.id) {
        setPlayingByRound(index);
        setPlayingRound(player.state.status == "playing");
      }
    });
  }, [activePlayer]);

  const [lenseOpen, setLenseOpen] = useState(false);
  const [lenseValue, setLenseValue] = useState(null);
  const [lenseItems, setLenseItems] = useState([]);
  const [policyColor, setPolicycolor] = useState(null);
  const [lenseCommunity, setLenseCommunity] = useState(null);

  useEffect(() => {
    const policyColors = () => {
      if (lenseValue == activeCommunity?.id) {
        return TERTIARY_THEME_COLOR;
      }
      return "#bfc7d5";
    };

    if (activeCommunity?.bridges.length == 2) {
      var lenseCommunities = {};
      lenseCommunities[activeCommunity.id] = activeCommunity;
      lenseCommunities[activeCommunity.bridges[0].id] =
        activeCommunity.bridges[0];
      lenseCommunities[activeCommunity.bridges[1].id] =
        activeCommunity.bridges[1];
      setLenseCommunity(lenseCommunities[lenseValue]);
    }
    setPolicycolor(policyColors());
  }, [lenseValue]);

  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const onPolicyDetails = () => {
    setPolicyModalVisible(true);
    console.log(lenseValue);
  };

  useEffect(() => {
    if (activeCommunity?.bridges.length == 2) {
      setLenseItems([
        {
          label: activeCommunity.bridges[0].name,
          value: activeCommunity.bridges[0].id,
          icon: () => <Icon name="eye-settings" size={18} color="#bfc7d5" />,
        },
        {
          label: activeCommunity.name,
          value: activeCommunity.id,
          icon: () => (
            <Icon
              name="eye-settings"
              size={18}
              color={QUATERNARY_THEME_COLOR}
            />
          ),
        },
        {
          label: activeCommunity.bridges[1].name,
          value: activeCommunity.bridges[1].id,
          icon: () => <Icon name="eye-settings" size={18} color="#bfc7d5" />,
        },
      ]);
      setLenseCommunity(activeCommunity);
      setLenseValue(activeCommunity.id);
    }
  }, [activeCommunity]);

  const data = [activeRound];
  // CurrentQPage component render method
  return (
    <View style={styles.container}>
      <FlatList
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        data={data}
        renderItem={({ item }) => (
          <View>
            {userHasCommunities && item?.prompt && (
              <View style={styles.container}>
                {activeCommunity && activeCommunity.bridge_id !== null && (
                  <View
                    style={{
                      zIndex: 20,
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      style={{
                        zIndex: 20,
                        paddingLeft: 2,
                        width: 250,
                      }}
                    >
                      <DropDownPicker
                        open={lenseOpen}
                        value={lenseValue}
                        items={lenseItems}
                        setOpen={setLenseOpen}
                        setValue={setLenseValue}
                        setItems={setLenseItems}
                        placeholder={"Apply a policy."}
                        theme="DARK"
                        textStyle={{
                          fontSize: 12,
                        }}
                        style={{
                          backgroundColor: QUINARY_THEME_COLOR,
                          borderWidth: 0,
                          height: 12,
                          borderRadius: 16,
                          borderBottomLeftRadius: 0,
                        }}
                      />
                      <PolicyModal
                        community={lenseCommunity}
                        modalVisible={policyModalVisible}
                        setModalVisible={setPolicyModalVisible}
                      />
                    </View>
                    <View
                      style={{
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <TouchableOpacity onPress={onPolicyDetails}>
                        <Icon
                          name="check-decagram"
                          size={24}
                          color={policyColor}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={{ justifyContent: "flex-end" }}>
                      <BridgedRoundBadge />
                    </View>
                  </View>
                )}
                <CurrentQCard
                  round={item}
                  handlePlayRound={handlePlayRound}
                  userCanPlayRound={userCanPlayThisRound}
                  playingRound={playingRound}
                />
                {item?.prompt.num_replies > 0 && (
                  <ResponseChain
                    navigation={navigation}
                    route={route}
                    prompt={item.prompt}
                    promptComplete={promptComplete}
                    round={item}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    userCanPlayRound={userCanPlayThisRound}
                    playingByRound={playingByRound}
                    handlePlayNext={handlePlayNext}
                    setQPlayers={setPlayers}
                    activePlayer={activePlayer}
                    setActivePayer={setActivePayer}
                    setPlayingRound={setPlayingRound}
                    lenseCommunityID={lenseValue}
                  />
                )}

                {item?.prompt.num_replies === 0 && (
                  <View>
                    {item.status === "accept_answers" && (
                      <NoResponse text={"Be the first to respond!!"} />
                    )}
                    {(item.status === "completed" ||
                      item.status === "archived") && (
                      <NoResponse
                        text={"No available responses for this prompt. Shame!"}
                      />
                    )}
                  </View>
                )}
              </View>
            )}

            {userHasCommunities && !communityHasRound && (
              <NoResponse
                text={`Stay tuned for the next prompt in ${activeCommunity?.name}!!`}
              />
            )}

            {!userHasCommunities && (
              <NoResponse text="Join a community to start!" />
            )}
          </View>
        )}
      />
      {userHasCommunities &&
        activeRound?.prompt &&
        !promptComplete &&
        userCanRespond && (
          <View>
            <FAB
              style={styles.fab}
              color={Colors.white}
              icon="microphone"
              onPress={() => setModalVisible(true)}
            />
            <AnswerSubmissionModal
              isVisible={isModalVisible}
              onClose={onCloseModal}
              round={activeRound}
              onSubmissionComplete={onRefresh}
              setRecorderStatus={handleSetRecorderStatus}
              recorderStatus={recorderStatus}
            />
            <TimeRemaining
              onTimeExpire={onRefresh}
              promptComplete={promptComplete}
              round={activeRound}
            />
          </View>
        )}
    </View>
  );
};

const NoResponse = ({ text }) => {
  return (
    <View style={styles.noResponsesContainer}>
      <Text style={styles.noResponsesText}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: PRIMARY_THEME_COLOR,
    borderRadius: 50,
  },
  container: {
    flex: 1,
    backgroundColor: SECONDARY_THEME_COLOR,
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
