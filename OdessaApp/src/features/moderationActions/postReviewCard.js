import React, { useEffect, useState } from "react";
import { View, Alert, StyleSheet } from "react-native";
import { Card, Title, Text } from "react-native-paper";
import { CENTER_ROW_PADDING, RADIUS_PFP } from "../landingPage/styles/config";
import { SECONDARY_THEME_COLOR } from "../../common/styles/config";
import ProfilePicture from "../../common/minorComponents/ProfilePicture";
import { format } from "date-fns";

const PostReviewCard = ({
  dispute,
  backgroundColor,
  navigation,
  activeCommunity,
}) => {
  const [timeAgo, setTimeAgo] = useState("");
  const post = dispute.post;
  const formattedDate = format(
    new Date(dispute.creation_time),
    "MMMM dd, yyyy",
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const creationTimeUTC = new Date(dispute.creation_time);
      const distance = Math.max(0, new Date() - creationTimeUTC);

      let timeString = "";
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      if (days > 0) timeString += days + "d ";
      if (days > 0 || hours > 0) timeString += hours + "h ";
      if (days > 0 || hours > 0 || minutes > 0) timeString += minutes + "m ";
      if (minutes <= 0) {
        timeString += seconds + "s";
      }
      setTimeAgo(timeString.trim());
    }, 1000);
    return () => clearInterval(interval);
  }, [dispute]);

  return (
    <Card
      style={[styles.card, { backgroundColor: backgroundColor }]}
      onPress={() =>
        navigation.navigate("ReviewPostPage", {
          dispute: dispute,
          activeCommunity: activeCommunity,
        })
      }
    >
      <Card.Content>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Title style={styles.cardTitle}>{formattedDate}</Title>
          <Title style={styles.cardTitle}>{timeAgo} ago</Title>
        </View>

        <View style={styles.itemsContainer}>
          <View style={[styles.centerRow, { width: "40%" }]}>
            <View style={{ flexDirection: "column" }}>
              <View style={{ flexDirection: "column", marginLeft: 10 }}>
                <Text style={styles.text}>{"author"}</Text>
                <View style={{ flexDirection: "row" }}>
                  <ProfilePicture
                    user={post.author}
                    radius={10}
                    borderCol={SECONDARY_THEME_COLOR}
                  />
                  <Text style={[styles.text, { marginLeft: 10 }]}>
                    {post.author.name}
                  </Text>
                </View>
              </View>

              <View style={{ padding: 4 }}></View>

              <View style={{ flexDirection: "column", marginLeft: 10 }}>
                <Text style={styles.text}>{"reporter"}</Text>
                <View style={{ flexDirection: "row" }}>
                  <ProfilePicture
                    user={dispute.disputer}
                    radius={10}
                    borderCol={SECONDARY_THEME_COLOR}
                  />
                  <Text style={[styles.text, { marginLeft: 10 }]}>
                    {dispute.disputer.name}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={{ width: "60%" }}>
            <Text
              style={styles.promptText}
              numberOfLines={4}
              ellipsizeMode="tail"
            >
              "{post.audio.plain_transcript}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 0,
    marginBottom: 0,
    marginTop: 0,
    borderWidth: 0,
    borderBlockColor: "#8B4513",
    // Add any other general card styles here
  },
  cardTitle: {
    marginTop: 0,
    fontSize: 12,
    fontFamily: "SpaceMono-Regular",
    // Add any other title styles here
  },
  itemsContainer: {
    flexDirection: "row",
    alignItems: "center",
    // Add any other container styles here
  },
  promptText: {
    flexShrink: 1,
    fontSize: 16,
    fontFamily: "SpaceMono-Regular",
    // Add any other text styles here
  },

  centerRow: {
    flexDirection: "row", // Align profile pictures horizontally
    alignItems: "center",
    marginTop: 10, // Space from top row
    position: "relative", // Add this line
  },

  text: {
    color: SECONDARY_THEME_COLOR,
    fontSize: 14,
  },
  date: {
    color: SECONDARY_THEME_COLOR,
    fontFamily: "SpaceMono-Regular",
  },

  // ...
});

export default PostReviewCard;
