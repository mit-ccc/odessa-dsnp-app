import React, {
  useState,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  AppState,
  TouchableOpacity,
} from "react-native";
import {
  LINE_HORIZONTAL_PADDING,
  RADIUS_PFP,
  BOTTOM_ROW_PADDING,
  BOTTOM_BORDER_PADDING,
  BOTTOM_ROW_TOP_MARGIN,
} from "../styles/config";

import {
  PRIMARY_THEME_COLOR,
  QUATERNARY_THEME_COLOR,
  QUINARY_THEME_COLOR,
  SECONDARY_THEME_COLOR,
} from "../../../common/styles/config";

import { Tooltip } from "react-native-paper";
import ProfilePicture from "../../../common/minorComponents/ProfilePicture";
import { Player } from "../../audio/AudioAssets";
import { backend } from "../../../api/apiClient";
import { BODY_FONT } from "../../../common/styles/config";
import { format } from "date-fns";
import { LocalStateContext } from "../../../state/LocalState";
import { getAudio, personaDisputePost } from "./../../../api/wrappers";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import prompt from "react-native-prompt-android";
import _ from "lodash";
import { GET_POST_PENDING_AUTHOR_DISPUTES } from "../../../api/queries";

const screenWidth = Dimensions.get("screen").width;

const onSelectPost = () => {
  console.log("selecting POST");
};
// if complete is false in future we will gray out and not allow buttons to be pressed
const CurrentQAnswerCard = ({
  navigation,
  route,
  answer,
  handleChainPlayBack,
  activePlayer,
  isLast,
  userCanPlayRound,
  playingByRound,
  handlePlayNext,
  onRegisterPlayer,
  canReport,
  triggerCardChange,
  cardTriggerChange,
  triggerUpdateProcessingChange,
  onRefreshChain,
  setPlayingRound,
  lenseCommunityID,
  setProcessingPost,
  hideButtons,
  hideTranscript,
}) => {
  const { api, personaKeys, activeCommunity } = useContext(LocalStateContext);

  // FIXME(bcsaldias): this can be checked with
  // author.id == persona0Data from LocalStateContext
  // no need to pas pkh.
  const currentPersonaAnswer =
    personaKeys.info.filter(({ pkh }) => answer.author.pkh === pkh).length > 0;

  const shouldShow = userCanPlayRound || currentPersonaAnswer;
  const enabledContentModPersonaActions = activeCommunity?.flags.includes(
    "enable_content_moderation_persona_actions",
  );

  const { author } = answer;

  const styles = localStyles(activeCommunity, author);
  const cardStyle = shouldShow ? styles.activeCard : styles.inactiveCard;

  const [audioData, setAudioData] = useState(null);
  const [localPlayer, setLocalPlayer] = useState(null);

  const [processingStatus, setProcessingStatus] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const [displayLenses, setDisplayLenses] = useState({});

  const [settingIcon, setSettingIcon] = useState("sync");

  useEffect(() => {
    // console.log(localPlayer);
    if (localPlayer) {
      setLocalPlayer(localPlayer);
      onRegisterPlayer(localPlayer);
    }
  }, [localPlayer]);

  if (shouldShow && audioData === null) {
    // FIXME(this is for wave_values / waveform, can be queried in each post)
    // right now we can query like this for testing purposes:
    // getAudio(api, answer.audio.id).then((r) => {
    //   setAudioData(r.audio);
    // })
  }

  const DisplayDate = ({ date, fmat }) => {
    try {
      return format(new Date(date), fmat);
    } catch (err) {
      return "";
    }
  };

  const handlePlayBack = useCallback(() => {
    // console.log('>>>>>> handleClick in CurrentQAnswerCard', answer.audio.id);
    return handleChainPlayBack(answer.audio.id);
  });

  ///// START MODERATION FUNCS ////

  const [encFlags, setEncFlags] = useState({});
  const [encFlagsStr, setEncFlagsStr] = useState("");

  useEffect(() => {
    setEncFlagsStr(handleDisplayAIModFlags());
  }, [encFlags]);

  const handleDisplayAIModFlags = () => {
    if (_.isEmpty(encFlags)) {
      return "";
    }
    var showText = "";
    Object.keys(encFlags).map((key) => {
      showText = showText + key + "\n";
    });
    showText = showText.trim();
    return showText;
  };

  const handlePostSettings = () => {
    var isBeingReviewed =
      processingStatus &&
      (processingStatus["done_with_moderator_review"] === false ||
        processingStatus["done_with_author_review"] === false);

    if (
      !enabledContentModPersonaActions ||
      isBeingReviewed || // if anyone has disputed it.
      !userCanPlayRound ||
      currentPersonaAnswer
    ) {
      var alertText =
        "no actions available for \npost id " +
        answer.id +
        "\naudio file_id " +
        answer.audio.id;
      alert(alertText);
      return;
    }

    prompt(
      "Report post",
      "Enter a reason",
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Flag to moderator!",
          onPress: (comment) => {
            personaDisputePost(api, answer.id, comment, lenseCommunityID)
              .then((resp) => {
                console.log("personaDisputePost resp", resp);
              })
              .finally(() => {
                triggerCardChange();
                // onRefreshChain();
              });
          },
        },
      ],
      {
        //  type: "default",
        cancelable: true,
        //  placeholder: "give an explanation",
      },
    );
  };

  useEffect(() => {
    onRefreshChain();
    triggerCardChange();
  }, [isProcessing, navigation, route]);

  const getPostAuthorDisputes = async () => {
    var res = await api.request(GET_POST_PENDING_AUTHOR_DISPUTES, {
      post_id: answer.id,
    });
    res = res.post.author_pending_disputes;
    return res;
  };

  const handlePostProcessing = async () => {
    if (false && !currentPersonaAnswer) {
      return;
    } else {
      var showText = "";
      Object.keys(processingStatus).map((key) => {
        if (!processingStatus[key]) {
          showText += "\n" + key;
        }
      });
      if (showText.length > 2) {
        showText = "Pending:" + showText;
        showText = showText.trim("\n");
      }

      var lensesShowText = "";
      Object.keys(displayLenses).map((key) => {
        if (displayLenses[key]["action"]) {
          if (key == lenseCommunityID) {
            const reasons = displayLenses[key]["reasons"];
            reasons.forEach((r) => {
              Object.keys(r).map((rk) => {
                if (rk == "report_comment") {
                  lensesShowText += "\n- " + r[rk];
                } else {
                  lensesShowText += "\n- " + rk;
                }
              });
            });
          }
        }
      });
      if (lensesShowText) {
        showText = showText + "\nMod comments:" + lensesShowText;
      }

      setProcessingPost(answer);
      triggerUpdateProcessingChange();
      alert(answer.id + "\n\n" + showText);
    }

    if (processingStatus["done_with_author_review"] === false) {
      var author_pending_disputes = await getPostAuthorDisputes();
      if (author_pending_disputes?.length > 0) {
        navigation.navigate("ReviewPostPage", {
          dispute: author_pending_disputes[0],
          role: "author",
          activeCommunity: activeCommunity,
        });
      }
    }
  };

  useEffect(() => {
    var isProcessingFlag = false; // true for testing purposes
    if (!answer.processing_status) {
      return;
    }
    const processing_status = JSON.parse(answer.processing_status);
    Object.keys(processing_status).map((key) => {
      isProcessingFlag = isProcessingFlag || !processing_status[key];
    });
    setProcessingStatus(processing_status);
    setIsProcessing(isProcessingFlag);

    const display_lenses = JSON.parse(answer.display_lenses);
    setDisplayLenses(display_lenses);
  }, [cardTriggerChange]);

  const [displayInLense, setDisplayInLense] = useState(true);

  const shouldDisplayInLense = () => {
    if (!answer.display_lenses) {
      return;
    }
    const display_lenses = JSON.parse(answer.display_lenses);
    const values = display_lenses[lenseCommunityID];
    if (values === undefined) {
      setSettingIcon("sync");
      return true;
    }
    if (values["action"] == "hide" && !currentPersonaAnswer) {
      setSettingIcon("alert-octagon");
      return false;
    }
    setSettingIcon("sync");
    return true;
  };

  const getLenseFlags = () => {
    if (!answer?.ai_mod_output) {
      return;
    }
    var checks = JSON.parse(answer?.ai_mod_output)?.checks;
    if (checks) {
      checks = checks?.filter((check) => check["cid"] == lenseCommunityID);
      if (checks) {
        checks = checks[0]?.checks?.flags["Encouraged behaviors"];
      }
    }
    // console.log(lenseCommunityID, checks);
    return checks;
  };

  useEffect(() => {
    const display = shouldDisplayInLense();
    setDisplayInLense(display);

    const flags = getLenseFlags();

    setEncFlags(flags);
  }, [lenseCommunityID]);

  ///// END MODERATION FUNCS ////

  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setAppStateVisible(nextAppState);
      console.log("AppState", nextAppState);
    });
    return () => {
      subscription.remove();
    };
  }, [AppState.currentState.current]);

  // // FIXME: maybe this can filtered in the backend.
  // if (isProcessing && !currentPersonaAnswer) {
  //   return <View />;
  // }

  // if (!displayInLense) {
  //   return <View />;
  // }

  return (
    // <TouchableOpacity onPress={complete ? onSelectPost : null} activeOpacity={.9}>
    <View style={[styles.answerBox, cardStyle]}>
      <View style={[{ flexDirection: "row", justifyContent: "space-between" }]}>
        <View style={{ zIndex: 10 }}>
          <View style={styles.profilePictureContainer}>
            <ProfilePicture
              user={author}
              radius={15}
              borderCol={"black"}
              backgroundColor={
                shouldShow
                  ? activeCommunity.bridge_id !== null
                    ? QUINARY_THEME_COLOR
                    : PRIMARY_THEME_COLOR
                  : "#4e4a4e"
              }
            />
          </View>
          <View style={styles.verticalLineContainer}>
            {!isLast && (
              <View
                style={[
                  styles.verticalLine,
                  {
                    bottom: shouldShow
                      ? styles.verticalLine.bottom - 20
                      : styles.verticalLine.bottom + 13,
                  },
                ]}
              ></View>
            )}
          </View>
        </View>
        <View style={[{ width: "85%" }]}>
          <View style={[{ marginLeft: -16, width: "100%" }]}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Tooltip
                title={
                  <DisplayDate
                    date={answer.creation_time}
                    fmat={"h:mm a MMM do, yyyy"}
                  />
                }
                enterTouchDelay={0}
                leaveTouchDelay={0}
              >
                <View style={styles.replyHeader}>
                  <View style={styles.replyBubble}>
                    <View style={styles.replyInnerBubble}>
                      {currentPersonaAnswer && (
                        <Text style={styles.replyName}>your reply</Text>
                      )}
                      {!currentPersonaAnswer && (
                        <Text style={styles.replyName}>
                          {author.name.slice(0, 20)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.replyDate}>
                    <DisplayDate date={answer.creation_time} fmat={"h:mm a"} />
                  </Text>
                </View>
              </Tooltip>

              <View style={{ flexDirection: "row" }}>
                {!hideButtons && (isProcessing || !displayInLense) && (
                  <View style={{ marginRight: 6 }}>
                    <TouchableOpacity onPress={handlePostProcessing}>
                      <Icon
                        name={settingIcon}
                        color="lightgrey"
                        size={22}
                      ></Icon>
                    </TouchableOpacity>
                  </View>
                )}
                {!hideButtons &&
                  !isProcessing &&
                  processingStatus["ai_moderated"] &&
                  encFlagsStr && (
                    <Tooltip
                      theme={{ colors: { onSurface: "transparent" } }}
                      title={
                        <View style={styles.tootlip}>
                          <Text style={{ color: PRIMARY_THEME_COLOR }}>
                            {encFlagsStr}
                          </Text>
                        </View>
                      }
                      enterTouchDelay={0}
                      leaveTouchDelay={500}
                    >
                      <View>
                        <Icon
                          name="white-balance-sunny"
                          color={`hsl(252, 45%, 70%)`}
                          size={22}
                        ></Icon>
                      </View>
                    </Tooltip>
                  )}
                {!hideButtons && (
                  <TouchableOpacity onPress={handlePostSettings}>
                    <Icon name="dots-vertical" color="gray" size={22}></Icon>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View>
            <Text style={styles.txt} />
          </View>

          {shouldShow && !isProcessing && (
            <Player
              key={answer.audio.id}
              audio={answer.audio}
              url={backend + answer.audio.public_url}
              audioId={answer.audio.id}
              handlePlayBack={handlePlayBack}
              activePlayer={activePlayer}
              wave_values={audioData ? audioData.wave_values : null}
              playingByRound={playingByRound}
              ref={(instance) => {
                setLocalPlayer(instance);
              }}
              handlePlayNext={handlePlayNext}
              appStateVisible={appStateVisible}
              setPlayingRound={setPlayingRound}
              hideTranscript={hideTranscript}
            />
          )}
        </View>
      </View>
    </View>
    // </TouchableOpacity>
  );
};

const localStyles = (activeCommunity, author) => {
  const isBridged = activeCommunity && activeCommunity.bridge_id !== null;
  const knownByCurrentPersona = author.known_by_requester;

  return StyleSheet.create({
    inactiveCard: {
      opacity: 1,
    },
    activeCard: {
      opacity: 1,
    },

    profilePictureContainer: {
      zIndex: 1, // Ensure profile picture is on top
      marginLeft: 1,
    },

    verticalLineContainer: {
      marginTop: BOTTOM_ROW_TOP_MARGIN,
      paddingLeft: BOTTOM_ROW_PADDING,
      paddingBottom: BOTTOM_BORDER_PADDING,
      position: "relative", // Needed for absolute positioning of the vertical line
    },
    verticalLine: {
      position: "absolute",
      top: -11, // Adjust this value to position the line correctly
      bottom: -40,
      left: 15.55,
      width: 1.25,
      backgroundColor: PRIMARY_THEME_COLOR,
      zIndex: 0,
    },

    answerBox: {
      marginBottom: 15,
      marginRight: screenWidth * 0.05,
      marginLeft: 2,
      borderRadius: 10,
      // borderWidth: .2,
      // borderColor: 'gray',  // Choose a color that suits your design
    },

    txt: {
      color: "grey",
      fontSize: 10,
      marginVertical: 4,
      marginRight: 10,
      textAlign: "right",
    },

    responseinformation: {
      flexDirection: "column", // Align profile picture and content in a row
      flex: 1, // Take up remaining space
      marginLeft: 40, // Space after profile picture
      marginRight: 20,
      borderStyle: "dotted",
      borderWidth: 1,
      borderColor: "grey",
      overflow: "hidden",
    },

    replyName: {
      fontFamily: "SpaceMono-Regular",
      color: "black",
    },

    replyDate: {
      fontFamily: "SpaceMono-Regular",
      color: "gray",
      fontSize: 10,
    },

    replyHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
    },

    replyBubble: {
      left: -30,
      borderRadius: 10,
      marginRight: 6,
      backgroundColor:
        isBridged && !knownByCurrentPersona
          ? QUATERNARY_THEME_COLOR
          : SECONDARY_THEME_COLOR,
    },

    replyInnerBubble: {
      left: 30,
      borderRadius: 10,
      paddingRight: 10,
      backgroundColor:
        isBridged && !knownByCurrentPersona
          ? QUATERNARY_THEME_COLOR
          : SECONDARY_THEME_COLOR,
    },

    tootlip: {
      flexDirection: "row",
      maxWidth: 250,
      maxHeight: 400,
      backgroundColor: "white",
      borderRadius: 10,
      borderColor: PRIMARY_THEME_COLOR,
      borderWidth: 2,
      padding: 10,
    },
  });
};

export default CurrentQAnswerCard;
