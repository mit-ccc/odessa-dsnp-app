import React, { useCallback, useContext, useEffect, useState } from "react";
import { Text, View, StyleSheet, RefreshControl, FlatList } from "react-native";
import { CENTER_ROW_PADDING, ANSWER_BOTTOM_PADDING } from "../styles/config";
import { PRIMARY_THEME_COLOR } from "../../../common/styles/config";
import { gql } from "graphql-request";
import { LocalStateContext, useTrigger } from "../../../state/LocalState";
import {
  GET_PROMPT_REPLIES_PAGE,
  GET_PROMPT_REPLY,
} from "../../../api/queries";
import CurrentQAnswerCard from "./CurrentQAnswerCard";
import LoadingQAnswerCard from "./LoadingQAnswerCard";
import { Spacing } from "../../../common/styles";

const ResponseChain = ({
  navigation,
  route,
  prompt,
  promptComplete,
  round,
  refreshing,
  onRefresh,
  userCanPlayRound,
  playingByRound,
  handlePlayNext,
  setQPlayers,
  activePlayer,
  setActivePayer,
  setPlayingRound,
  lenseCommunityID,
}) => {
  const { api, activeCommunity } = useContext(LocalStateContext);

  const [cursor, setCursor] = useState(null);
  const [replies, setReplies] = useState([]);
  const [hasFetchedAllReplies, setHasFetchedAllReplies] = useState(false);
  const [fetchTracker, setFetchTracker] = useState(0);

  const updateFetchCount = () => {
    setFetchTracker(fetchTracker + 1);
    return Boolean(fetchTracker % 2);
  };

  // Fetch replies using cursor-based pagination
  const fetchReplies = async () => {
    const shouldFetch = updateFetchCount();

    if (shouldFetch && hasFetchedAllReplies) {
      return;
    } else if (shouldFetch) {
      setHasFetchedAllReplies(false);
    }
    // Fetch the next page of data
    const response = await api.request(GET_PROMPT_REPLIES_PAGE, {
      prompt_id: prompt.id,
      first: 6,
      after: cursor,
    });
    const fetchedReplies = response.promptReplies.edges.map(
      (edge) => edge.node,
    );

    // append the data to the existing data checking to see if the id already exists
    const uniqueReplies = fetchedReplies.filter(
      (fetchedReply) => !replies.some((reply) => reply.id === fetchedReply.id),
    );
    setReplies([...replies, ...uniqueReplies]);
    const hasNextPage = response.promptReplies.pageInfo.hasNextPage;
    if (hasNextPage) {
      setCursor(parseInt(response.promptReplies.pageInfo.endCursor));
    } else {
      setHasFetchedAllReplies(true);
      if (hasFetchedAllReplies && Boolean(fetchTracker % 4)) {
        updateProcessingReplies((all = true));
      }
    }
  };

  const shouldRevisePost = (post) => {
    var isProcessingFlag = false;
    const processing_status = JSON.parse(post.processing_status);
    Object.keys(processing_status).map((key) => {
      isProcessingFlag = isProcessingFlag || !processing_status[key];
    });
    return isProcessingFlag;
  };

  const updateProcessingReplies = async (all = false) => {
    console.log("calling updateProcessingReplies", all);
    if (!all && processingPost.id) {
      if (shouldRevisePost(processingPost)) {
        const newAnswer = await api.request(GET_PROMPT_REPLY, {
          post_id: processingPost.id,
        });
        updateAnswer(newAnswer.post);
      }
      triggerCardChange();
      return;
    }
    await Promise.all(
      replies.map(async (answer, index) => {
        if (shouldRevisePost(answer)) {
          const newAnswer = await api.request(GET_PROMPT_REPLY, {
            post_id: answer.id,
          });
          updateAnswer(newAnswer.post);
        }
      }),
    );
    triggerCardChange();
  };

  const updateAnswer = (post) => {
    const updatedReplies = replies.map((item) =>
      item.id === post.id ? post : item,
    );
    setReplies(updatedReplies);
  };

  // Fetch the initial data when the component mounts
  useEffect(() => {
    if (refreshing || fetchTracker == 0) {
      fetchReplies();
    }
  }, [hasFetchedAllReplies, refreshing]);

  useEffect(() => {
    if (prevUpdateProcessingChange === updateProcessingChange) {
      return;
    }
    setPrevUpdateProcessingChange(updateProcessingChange);
    updateProcessingReplies();
  }, updateProcessingChange);

  // fetch replies when the scroll hits the bottom of the screen
  const handleScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const buffer = 250;
    const isBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - buffer;

    if (isBottom) {
      fetchReplies();
    }
  };

  const [players, setPlayers] = useState([]);

  const handleChainPlayBack = useCallback((audio_id) => {
    // console.log('>>>>>> handleClick in ResponseChain', audio_id);
    setActivePayer(audio_id);
    return new Promise((resolve, reject) => {
      resolve("done");
    });
  });

  const onRegisterPlayer = useCallback((player) => {
    const currentPlayers = players.map((p) => p.url);
    const alreadyRegistered = currentPlayers?.includes(player.url);
    if (alreadyRegistered) {
      return;
    }

    setPlayers((players) =>
      [...players, player].sort(function (a, b) {
        return a.url - b.url;
      }),
    );
  });

  useEffect(() => {
    if (replies.length === players.length) {
      console.log("All players registered!", players.length);
      setQPlayers(players);
    }
  }, [players]);

  ///// START MODERATION FUNCS ////
  const [myDisputes, setMyDisputes] = useState([]);
  const [cardTriggerChange, triggerCardChange] = useTrigger();
  const [updateProcessingChange, triggerUpdateProcessingChange] = useTrigger();
  const [prevUpdateProcessingChange, setPrevUpdateProcessingChange] =
    useTrigger();
  const [processingPost, setProcessingPost] = useState({});

  const thisOnRefresh = async () => {
    await onRefresh();
    triggerCardChange();
    setHasFetchedAllReplies(false);
  };

  ///// EDN MODERATION FUNCS ////

  const renderItem = ({ item, index }) => (
    <CurrentQAnswerCard
      key={index}
      navigation={navigation}
      route={route}
      answer={item}
      round={round}
      complete={promptComplete}
      handleChainPlayBack={handleChainPlayBack}
      activePlayer={activePlayer}
      isLast={hasFetchedAllReplies && replies.length === index + 1}
      userCanPlayRound={userCanPlayRound}
      playingByRound={playingByRound === index}
      handlePlayNext={handlePlayNext}
      onRegisterPlayer={onRegisterPlayer}
      triggerCardChange={triggerCardChange}
      cardTriggerChange={cardTriggerChange}
      triggerUpdateProcessingChange={triggerUpdateProcessingChange}
      onRefreshChain={thisOnRefresh}
      setPlayingRound={setPlayingRound}
      lenseCommunityID={lenseCommunityID}
      setProcessingPost={setProcessingPost}
    />
  );

  return (
    <FlatList
      style={styles.feedContainer}
      data={replies}
      renderItem={renderItem}
      keyExtractor={(item, index) => index.toString()}
      onMomentumScrollEnd={handleScroll}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={thisOnRefresh} />
      }
      ListHeaderComponent={
        <View style={styles.verticalLineContainer}>
          <View style={styles.verticalLine}></View>
        </View>
      }
      refreshing={refreshing}
      ListFooterComponent={
        <>
          {!hasFetchedAllReplies && (
            <View style={styles.loadingContainer}>
              <LoadingQAnswerCard />
            </View>
          )}
          {!userCanPlayRound && promptComplete && hasFetchedAllReplies && (
            <View>
              <Text style={styles.cannotPlayText} numberOfLines={4}>
                {/* FIXME: This should in theory come from the backend. */}
                Sad :(
                {"\n\n"}
                You can't play this round because you didn't submit enough
                answers.
              </Text>
            </View>
          )}
        </>
      }
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    marginBottom: Spacing.xl,
  },
  verticalLineContainer: {
    marginTop: Spacing.xl,
    position: "relative", // Needed for absolute positioning of the vertical line
  },
  verticalLine: {
    position: "absolute",
    top: -Spacing.xl,
    bottom: -0,
    left: 17.65,
    width: 1.25,
    backgroundColor: PRIMARY_THEME_COLOR,
    zIndex: 0,
  },
  feedContainer: {
    flex: 1,
    paddingBottom: ANSWER_BOTTOM_PADDING,
    paddingLeft: CENTER_ROW_PADDING,
  },
  cannotPlayText: {
    fontSize: 18,
    color: PRIMARY_THEME_COLOR,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 20,
    marginRight: 20,
  },
});

export default ResponseChain;
