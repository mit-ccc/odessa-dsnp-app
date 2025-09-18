import { useCallback, useContext, useEffect, useState } from "react";
import { ScrollView, View, RefreshControl } from "react-native";
import { LocalStateContext } from "../../state/LocalState";
import { GoBackButton } from "../globalAction/createCommunity";
import PostReviewCard from "./postReviewCard";
import { gql } from "graphql-request";
import { ActivityIndicator } from "react-native-paper";
import { PRIMARY_THEME_COLOR } from "../../common/styles/config";

export const ModerateContentPage = ({ navigation, route }) => {
  var activeCommunity = route?.params?.community;
  const [refreshing, setRefreshing] = useState(false);
  const { api, persona0Data } = useContext(LocalStateContext);

  const [pendingDisputes, setPendingDisputes] = useState([]);

  const bottomNav = navigation.getParent();
  const sideNav = bottomNav.getParent();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    getCommunityDisputes(api, activeCommunity.id).then((res) => {
      // FIXME(bcsaldias): this filter can happen in the backend.
      // const asReviewer = res.filter(
      //   ({reviews}) => reviews.filter(({reviewer_id}) => persona0Data.id == reviewer_id ).length > 0 );

      const asReviewer = res;
      setPendingDisputes(asReviewer);
      setRefreshing(false);
    });
    setRefreshing(false);
  });

  const cardColor = (dispute, index) => {
    return `hsl(252, 45%, ${100 - (3 + ((index + 1) % 7)) * 10}%)`;
    return "grey";
    const isReviewer =
      dispute.reviews?.filter(
        ({ reviewer_id }) => persona0Data.id == reviewer_id,
      ).length > 0;
    if (isReviewer) {
      return `hsl(252, 45%, ${100 - (3 + ((index + 1) % 7)) * 10}%)`;
    }
    return "grey";
  };

  useEffect(() => {
    onRefresh();
  }, [api, activeCommunity, navigation, route]);

  const goBack = () => {
    navigation.goBack();
  };

  const getCommunityDisputes = async (api, community_id) => {
    const GET_COMM_PDISPUTES = gql`
      query getCommunityDisputes($community_id: Int!) {
        getCommunityDisputes(community_id: $community_id) {
          id
          status
          metadata
          creation_time
          resolved_time
          note_by_disputer
          post {
            id
            text
            creation_time
            audio {
              id
              public_url
              duration
              transcripts {
                start
                end
                text
              }
              plain_transcript
            }
            author {
              id
              name
              image_id
              pkh
              bio
            }
            round {
              id
              creation_time
              start_time
              status
              prompt {
                id
                num_replies
                author {
                  id
                  name
                }
                post {
                  id
                  text
                  creation_time
                  author {
                    id
                    name
                    bio
                    image_id
                  }
                }
              }
            }
          }
          disputer {
            id
            name
            image_id
            pkh
            bio
          }
        }
      }
    `;
    var res = await api.request(GET_COMM_PDISPUTES, { community_id });
    res = res.getCommunityDisputes;
    return res;
  };

  useEffect(() => {
    bottomNav.setOptions({
      tabBarStyle: { display: "none" },
      tabBarVisible: false,
    });
    sideNav.setOptions({
      headerLeft: () => <GoBackButton handleGoBack={goBack} />,
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
  }, [navigation]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {pendingDisputes.map((dispute, index) => (
          <PostReviewCard
            key={index}
            dispute={dispute}
            backgroundColor={cardColor(dispute, index)}
            navigation={navigation}
            activeCommunity={activeCommunity}
          />
        ))}
      </ScrollView>
    </View>
  );
};
