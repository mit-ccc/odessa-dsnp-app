import React, { useEffect, useState, useContext, useCallback } from "react";
import { View, Text, StyleSheet, Platform, AppState } from "react-native";
import { ActivityIndicator, Button, Switch } from "react-native-paper";
import { LocalStateContext } from "../../state/LocalState";
import CurrentQCard from "../landingPage/components/CurrentQCard";
import {
  PRIMARY_THEME_COLOR,
  SECONDARY_THEME_COLOR,
  TERTIARY_THEME_COLOR,
} from "../../common/styles/config";
import { gql } from "graphql-request";
import { GoBackButton } from "../globalAction/createCommunity";
import prompt from "react-native-prompt-android";
import CurrentQAnswerCard from "../landingPage/components/CurrentQAnswerCard";
import { Player } from "../audio/Player";
import { backend } from "../../api/apiClient";
import { tr } from "date-fns/locale";
import {
  ANSWER_BOTTOM_PADDING,
  CENTER_ROW_PADDING,
} from "../landingPage/styles/config";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import PolicyModal from "../landingPage/components/PolicyModal";
import ProfilePicture from "../../common/minorComponents/ProfilePicture";

export const ReviewPostPage = ({ route, navigation }) => {
  const { dispute, role, activeCommunity } = route.params;
  const [reviews, setReviews] = useState(dispute.reviews);
  const route0 = navigation.getState()?.routes[0].name;

  const { api, persona0Data } = useContext(LocalStateContext);

  const [ownReview, setOwnReview] = useState([]);
  const [isReviewer, setIsReviewer] = useState(false);

  const bottomNav = navigation.getParent();
  const sideNav = bottomNav.getParent();

  const setValues = () => {
    const ownR = reviews?.filter(
      ({ reviewer_id }) => persona0Data.id == reviewer_id,
    );
    setOwnReview(ownR);
    setIsReviewer(ownR?.length > 0);
  };

  const getDisputeReviews = async () => {
    const GET_DISPUTE_REVIEWS = gql`
      query dispute($id: Int!) {
        dispute(id: $id) {
          reviews {
            id
            status
            creation_time
            metadata
            reviewer_id
            action
            note_by_reviewer
            reviewer {
              id
              name
              image_id
              pkh
              bio
            }
          }
        }
      }
    `;
    var res = await api.request(GET_DISPUTE_REVIEWS, { id: dispute.id });
    const reviews = res.dispute.reviews;
    setReviews(reviews);
  };

  useEffect(() => {
    if (!reviews) {
      getDisputeReviews();
    }
  }, [dispute]);

  useEffect(() => {
    setValues();
  }, [reviews]);

  useEffect(() => {
    if (route0 == "CurrentQPage") {
      bottomNav.setOptions({
        tabBarStyle: { display: "none" },
        tabBarVisible: false,
      });
      sideNav.setOptions({
        headerLeft: () => <GoBackButton handleGoBack={navigation.goBack} />,
      });
      return () => {
        bottomNav.setOptions({
          tabBarStyle: undefined,
          tabBarVisible: undefined,
        });
        sideNav.setOptions({
          headerLeft: undefined,
        });
      };
    }
  }, [navigation]);

  const goBack = () => {
    if (route0 == "CommunityPage") {
      navigation.navigate("ModerateContentPage", {
        community: activeCommunity,
      });
    } else if (route0 == "CurrentQPage") {
      navigation.navigate("CurrentQPage", {});
    } else {
      navigation.goBack();
    }
  };

  const getBackgroundColor = (index) => {
    const topLightness = 80;
    const bottomLightness = 30;
    const LightnessStep = (topLightness - bottomLightness) / (5 - 1 || 1);

    const lightness = topLightness - index * LightnessStep;
    return `hsl(252, 45%, ${lightness}%)`;
  };

  const handlePlayBack = useCallback((audio_id) => {
    return new Promise((resolve, reject) => {
      resolve("done");
    });
  });

  const [displayReason, setDisplayReason] = useState("");
  const [lenseCommunity, setLenseCommunity] = useState(activeCommunity);
  const [lenseValue, setLenseValue] = useState(activeCommunity.id);
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const openCommunityPolicy = () => {
    setPolicyModalVisible(true);
  };

  const [authorReviews, setAuthorReviews] = useState([]);
  const [modReviews, setModReviews] = useState([]);

  useEffect(() => {
    if (dispute.metadata) {
      const dispute_metadata = JSON.parse(dispute.metadata);
      setLenseValue(dispute_metadata.cid);
      // console.log("dispute_metadata", dispute_metadata.ctype);
    }

    if (dispute.note_by_disputer) {
      var reason = "";
      const note_by_disputer = JSON.parse(dispute.note_by_disputer);
      Object.keys(note_by_disputer).map((key) => {
        if (key == "report_comment") {
          reason = reason + note_by_disputer[key] + "\n";
        } else {
          reason = reason + key + "\n";
        }
      });
      setDisplayReason(reason.trim("\n").trim());
    }

    if (reviews) {
      setAuthorReviews(
        reviews.filter(
          (review) => review.reviewer_id == dispute.post.author.id,
        ),
      );
      setModReviews(
        reviews.filter(
          (review) => review.reviewer_id != dispute.post.author.id,
        ),
      );
    }
  }, [navigation, dispute, reviews]);

  useEffect(() => {
    if (activeCommunity?.bridges.length == 2) {
      var lenseCommunities = {};
      lenseCommunities[activeCommunity.id] = activeCommunity;
      lenseCommunities[activeCommunity.bridges[0].id] =
        activeCommunity.bridges[0];
      lenseCommunities[activeCommunity.bridges[1].id] =
        activeCommunity.bridges[1];
      setLenseCommunity(lenseCommunities[lenseValue]);
    }
  }, [lenseValue]);

  // console.log("dispute", Object.keys(dispute), dispute.metadata);

  return (
    <View style={{ flex: 1, backgroundColor: SECONDARY_THEME_COLOR }}>
      <ScrollView>
        <View style={styles.splash}>
          <CurrentQCard
            round={dispute.post.round}
            title={<View></View>}
            modMode={true}
          />

          <View
            style={{
              paddingTop: 12,
              paddingHorizontal: CENTER_ROW_PADDING,
            }}
          >
            <CurrentQAnswerCard
              key={dispute.post.audio.id}
              navigation={navigation}
              route={route}
              answer={dispute.post}
              round={dispute.post.round}
              complete={true}
              handleChainPlayBack={handlePlayBack}
              activePlayer={dispute.post.audio.id}
              isLast={true}
              userCanPlayRound={true}
              playingByRound={true}
              handlePlayNext={handlePlayBack}
              onRegisterPlayer={() => {}}
              triggerCardChange={() => {}}
              cardTriggerChange={() => {}}
              triggerUpdateProcessingChange={() => {}}
              onRefreshChain={() => {}}
              setPlayingRound={handlePlayBack}
              lenseCommunityID={0}
              setProcessingPost={() => {}}
              hideButtons={true}
              hideTranscript={true}
            />
            <View style={{ paddingBottom: 12 }}>
              <Text style={styles.mainText}>
                {dispute.post.audio.plain_transcript}
              </Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: getBackgroundColor(-1),
              paddingHorizontal: CENTER_ROW_PADDING,
              paddingVertical: 12,
            }}
          >
            <TouchableOpacity onPress={openCommunityPolicy}>
              <View style={{ flexDirection: "row" }}>
                <Text
                  style={[
                    styles.mainText,
                    {
                      color:
                        lenseCommunity.id == activeCommunity.id
                          ? "black"
                          : TERTIARY_THEME_COLOR,
                      fontFamily:
                        lenseCommunity.id == activeCommunity.id
                          ? "SpaceMono-Regular"
                          : "SpaceMono-Bold",
                    },
                  ]}
                >
                  {lenseCommunity.name}
                </Text>
                <Text style={[styles.mainText, { marginRight: 10 }]}>
                  {" policy"}
                </Text>
                <Icon name="eye" size={24} color={TERTIARY_THEME_COLOR} />
              </View>
            </TouchableOpacity>

            <PolicyModal
              community={lenseCommunity}
              modalVisible={policyModalVisible}
              setModalVisible={setPolicyModalVisible}
            />
          </View>

          <View
            style={{
              backgroundColor: getBackgroundColor(-0.5),
              paddingHorizontal: CENTER_ROW_PADDING,
              paddingVertical: 12,
            }}
          >
            <View style={{ flexDirection: "row" }}>
              <Text style={styles.mainText}>Explanation by </Text>
              <Text style={styles.mainText}>{dispute.disputer.name + " "}</Text>
              <ProfilePicture user={dispute.disputer} radius={10} />
            </View>
            <Text style={styles.mainText}>{displayReason}</Text>
          </View>

          {!reviews && (
            <View style={{ padding: 30 }}>
              <ActivityIndicator size="small" color={PRIMARY_THEME_COLOR} />
            </View>
          )}

          {authorReviews.length > 0 && (
            <View
              style={{
                backgroundColor: getBackgroundColor(0),
                paddingHorizontal: CENTER_ROW_PADDING,
                paddingVertical: 12,
              }}
            >
              <Text style={styles.mainText}>Author reviews</Text>
              {authorReviews.map((review, index) => (
                <View>
                  <Text style={styles.mainText}>
                    Wants to {review.action} {" | "}
                    {review.note_by_reviewer ? review.note_by_reviewer : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {modReviews.length > 0 && (
            <View
              style={{
                backgroundColor: getBackgroundColor(0.5),
                paddingHorizontal: CENTER_ROW_PADDING,
                paddingVertical: 12,
              }}
            >
              <Text style={styles.mainText}>Mod reviews</Text>
              {modReviews.map((review, index) => (
                <View>
                  <View
                    style={{
                      flexDirection: "row",
                      paddingVertical: 2,
                      alignItems: "center",
                      // justifyContent: "space-between",
                    }}
                  >
                    <View style={{ width: "10%" }}>
                      <Text style={[styles.mainText, { flexShrink: 1 }]}>
                        {review.id + "| "}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: "30%",
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <ProfilePicture user={review.reviewer} radius={8} />
                      <Text style={[styles.mainText, { flexShrink: 1 }]}>
                        {" " + review.reviewer.name.slice(0, 10)}
                      </Text>
                    </View>
                    <View style={{ width: "25%" }}>
                      <Text style={[styles.mainText, { flexShrink: 1 }]}>
                        | {review.action ? review.action : review.status}
                      </Text>
                    </View>
                  </View>
                  {review.note_by_reviewer && (
                    <View
                      style={{
                        width: "100%",
                        marginLeft: 30,
                        paddingRight: 30,
                      }}
                    >
                      <Text style={[styles.mainText, { flexShrink: 1 }]}>
                        {"> "} {review.note_by_reviewer}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      {isReviewer && (
        <ActionsFooter review={ownReview[0]} goBack={goBack} role={role} />
      )}
    </View>
  );
};

const ActionsFooter = ({ review, role, goBack }) => {
  const { api } = useContext(LocalStateContext);
  const isAuthor = role == "author";

  const [modActions, setModActions] = useState({});

  const updateJoinDictState = (key, value) => {
    setModActions((prevState) => ({
      ...prevState,
      [key]: value,
    }));
  };

  const setAction = (action, value = undefined) => {
    if (value) {
      updateJoinDictState(action, value);
    } else {
      updateJoinDictState(action, !modActions[action]);
    }
  };

  useEffect(() => {
    setAction("with note", true);
    setAction("note to author", true);
    setAction("allow new reply", true);
  }, [review]);

  const handleSubmitReview = async (mode) => {
    const UPDATE_MOD_REVIEW = gql`
      mutation updateModReview($review_id: Int!, $metadata: String!) {
        updateModReview(review_id: $review_id, metadata: $metadata)
      }
    `;

    const review_id = review.id;
    const metadata = JSON.stringify({
      action: mode,
      sub_actions: modActions,
    });
    await api.request(UPDATE_MOD_REVIEW, { review_id, metadata });
    goBack();
  };

  const handleRelease = async () => {
    if (modActions["with note"]) {
      prompt(
        "Keep post",
        "Add note for moderators",
        [
          {
            text: "Cancel",
            onPress: () => {},
            style: "cancel",
          },
          {
            text: "Release!",
            onPress: (reason) => {
              // local update because the request sends modActions.
              modActions["with note"] = reason;
              handleSubmitReview("release")
                .then((resp) => {
                  console.log("updateModReview resp", resp);
                })
                .finally(() => {});
            },
          },
        ],
        {
          cancelable: true,
        },
      );
    } else {
      return await handleSubmitReview("release");
    }
  };

  const handleRemove = async () => {
    if (modActions["note to author"]) {
      prompt(
        "Remove post",
        "Add explanation",
        // "Explain why this post doens't violate community behaviors.",
        [
          {
            text: "Cancel",
            onPress: () => {},
            style: "cancel",
          },
          {
            text: "Remove!",
            onPress: (reason) => {
              // local update because the request sends modActions.
              modActions["note to author"] = reason;
              handleSubmitReview("remove")
                .then((resp) => {
                  console.log("updateModReview resp", resp);
                })
                .finally(() => {});
            },
          },
        ],
        {
          cancelable: true,
        },
      );
    } else {
      return await handleSubmitReview("remove");
    }
  };

  const switchStyle =
    Platform.OS === "android"
      ? { transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }] }
      : {
          transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }],
          backgroundColor: "gray",
          borderRadius: 17,
        };

  const switchViewStyle = { marginTop: -5 };

  return (
    <View
      style={{
        justifyContent: "flex-end",
        backgroundColor: PRIMARY_THEME_COLOR,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-evenly" }}>
        <View style={styles.actCont}>
          <Button
            mode="contained"
            style={styles.button}
            onPress={handleRelease}
          >
            <Text>release</Text>
          </Button>
          {/* <View style={[styles.checkbox]}>
              <View>
                <Text style={styles.cName}>
                    with flag
                </Text>
              </View>
              <View style={switchViewStyle}>
                <Switch
                  value={modActions['with flag']}
                  style={switchStyle}
                  onValueChange={() => { setAction('with flag') }}
                />
              </View>
            </View> */}

          <View style={[styles.checkbox]}>
            <View style={{ paddingHorizontal: 0 }}>
              <Text style={styles.cName}>with note</Text>
            </View>
            <View style={switchViewStyle}>
              <Switch
                value={modActions["with note"]}
                style={switchStyle}
                onValueChange={() => {
                  setAction("with note");
                }}
              />
            </View>
          </View>
        </View>

        <View style={styles.actCont}>
          <Button mode="contained" style={styles.button} onPress={handleRemove}>
            <Text>remove</Text>
          </Button>
          {/* {!isAuthor && (
            <View style={[styles.checkbox]}>
              <View style={{ paddingHorizontal: 0 }}>
                <Text style={styles.cName}>allow new reply</Text>
              </View>
              <View style={switchViewStyle}>
                <Switch
                  // TODO(bcsaldias): backend doesn't accept this intel yet.
                  value={modActions["allow new reply"]}
                  style={switchStyle}
                  onValueChange={() => { setAction('allow new reply') }}
                />
              </View>
            </View>
          )} */}

          {!isAuthor && (
            <View style={[styles.checkbox]}>
              <View style={{ paddingHorizontal: 0 }}>
                <Text style={styles.cName}>note to author</Text>
              </View>
              <View style={switchViewStyle}>
                <Switch
                  value={modActions["note to author"]}
                  style={switchStyle}
                  onValueChange={() => {
                    setAction("note to author");
                  }}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    flexShrink: 1,
    fontSize: 20,
    fontFamily: "SpaceMono-Regular",
    color: "black",
  },

  mainText: {
    color: "black",
    flexShrink: 1,
    fontSize: 14,
    fontFamily: "SpaceMono-Regular",
  },

  splash: {
    flex: 1,
  },

  actCont: {
    backgroundColor: `hsl(252, 45%, 60%)`,
    padding: 16,
    borderRadius: 16,
    margin: 20,
    width: "44%",
  },

  button: {
    borderColor: "white",
    borderWidth: 1,
    borderRadius: 12,
  },

  checkbox: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 14,
    alignSelf: "stretch",
  },

  cName: {
    color: "white",
    textAlign: "right",
    fontSize: 12,
  },
});
