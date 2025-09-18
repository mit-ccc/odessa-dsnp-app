import React, { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";

import { format } from "date-fns";
import {
  PRIMARY_THEME_COLOR,
  QUATERNARY_THEME_COLOR,
  QUINARY_THEME_COLOR,
  SECONDARY_THEME_COLOR,
} from "../../../common/styles/config";
import {
  TOP_BORDER_PADDING,
  LINE_HORIZONTAL_PADDING,
  SIDE_PADDING,
  RADIUS_PFP,
  TOP_ROW_PADDING,
  CENTER_ROW_PADDING,
  BOTTOM_ROW_PADDING,
  BOTTOM_BORDER_PADDING,
  BOTTOM_ROW_TOP_MARGIN,
} from "../styles/config";
import ProfilePicture from "../../../common/minorComponents/ProfilePicture";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import { LocalStateContext } from "../../../state/LocalState";

const CurrentQCard = ({
  round,
  handlePlayRound,
  userCanPlayRound,
  playingRound,
  title,
  modMode,
}) => {
  const { activeCommunity } = useContext(LocalStateContext);
  const isBridged = activeCommunity && activeCommunity.bridge_id !== null;

  const prompt = round.prompt;
  const question = prompt.post;
  const author = prompt.post.author;

  // Format the date for display
  const formattedDate = question.creation_time
    ? format(new Date(round.start_time), "MMM dd, yyyy")
    : "Loading...";

  // Temporary hardcoded profile pictures

  const profilePics = [
    require("../../../assets/icons/profilePic1.jpeg"),
    require("../../../assets/icons/profilePic2.png"),
    require("../../../assets/icons/profilePic3.jpeg"),
  ];

  const styles = localStyles(activeCommunity, modMode);

  return (
    <View>
      {isBridged && <View style={styles.topRightOverlay} />}
      <View style={styles.card}>
        <View style={styles.topRow}>
          {!title && (
            <View style={{ flexDirection: "column", width: "95%" }}>
              <Text style={styles.date}>
                SHARE YOUR VOICE --- {formattedDate}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  marginTop: 4,
                  marginBottom: -16,
                  alignItems: "center",
                }}
              >
                <Icon name="microphone" size={16} color="white" />
                <Text style={[styles.date, { fontSize: 12, marginLeft: 2 }]}>
                  {prompt.num_replies} voices
                </Text>
              </View>
            </View>
          )}
          {title && title}

          {/* {userCanPlayRound && (
            <View style={[styles.playRoundContainer]}>
              <TouchableOpacity
                style={styles.buttonWrapper}
                onPress={handlePlayRound}
              >
                {!playingRound && (
                  <Icon name="play" size={20} color={PRIMARY_THEME_COLOR} />
                )}
                {playingRound && (
                  <Icon name="pause" size={20} color={PRIMARY_THEME_COLOR} />
                )}
              </TouchableOpacity>
            </View>
          )} */}
        </View>

        <View style={styles.centerRow}>
          {!modMode && (
            <ProfilePicture
              user={author}
              radius={RADIUS_PFP}
              borderCol={SECONDARY_THEME_COLOR}
              backgroundColor={styles.card.backgroundColor}
            />
          )}
          <Text
            style={[
              styles.text,
              { marginLeft: 10, fontSize: modMode ? 12 : 14 },
            ]}
          >
            from:
          </Text>
          <Text
            style={[
              styles.author,
              {
                fontSize: modMode ? 12 : 14,
                fontFamily: modMode ? "SpaceMono" : "SpaceMono-Bold",
              },
            ]}
            numberOfLines={1}
            ellipsizeMode={"tail"}
          >
            {author.name}
          </Text>
          {/* <Text style={styles.text}>  ----  up next:    </Text>
          {profilePics.map((pic, index) => (
            <View
              key={index}
              style={[
                styles.profilePicContainer,
                { right: index * (RADIUS_PFP / 2), zIndex: profilePics.length - index }
              ]}
            >
              <ProfilePicture image={Image.resolveAssetSource(pic).uri} radius={RADIUS_PFP} borderCol={SECONDARY_THEME_COLOR}/>
            </View>
          ))} */}
        </View>

        <View style={[styles.bottomRow]}>
          <View style={styles.verticalLine} />
          <ScrollView
            style={styles.questionTextContainer}
            nestedScrollEnabled={true} // Enable scrolling within a parent ScrollView
          >
            <Text
              style={[
                styles.questionText,
                { fontSize: modMode ? 12 : QUESTION_FONT_SIZE },
              ]}
            >
              "{question.text}"
            </Text>
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const QUESTION_FONT_SIZE = 18;

const localStyles = (activeCommunity, modMode) => {
  const isBridged = activeCommunity && activeCommunity.bridge_id !== null;

  return StyleSheet.create({
    card: {
      backgroundColor: modMode
        ? "#808080"
        : isBridged
          ? QUINARY_THEME_COLOR
          : PRIMARY_THEME_COLOR,
      paddingVertical: TOP_BORDER_PADDING,
      paddingHorizontal: SIDE_PADDING, // Add padding to match the original Card's padding
      borderRadius: 18,
      marginHorizontal: 2,
      // Add other styles like shadow or elevation if needed to mimic the Card appearance
      shadowColor: "#171717",
      shadowOffset: { width: 2, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 5,
    },
    topRightOverlay: {
      position: "absolute",
      marginHorizontal: 2,
      top: -10,
      right: 0,
      width: 40,
      height: 40,
      backgroundColor: QUATERNARY_THEME_COLOR,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingLeft: TOP_ROW_PADDING,
    },
    centerRow: {
      flexDirection: "row", // Align profile pictures horizontally
      alignItems: "center",
      marginTop: 10, // Space from top row
      paddingLeft: CENTER_ROW_PADDING, // Adjust padding as needed
      position: "relative", // Add this line
    },
    bottomRow: {
      marginTop: BOTTOM_ROW_TOP_MARGIN,
      paddingLeft: BOTTOM_ROW_PADDING,
      paddingBottom: BOTTOM_BORDER_PADDING,
      position: "relative", // Needed for absolute positioning of the vertical line
    },
    questionTextContainer: {
      // or use just height for always
      maxHeight: (QUESTION_FONT_SIZE + 4) * 4, // gets you the 3 lines for sizes ~12-24
    },
    verticalLine: {
      position: "absolute",
      top: 0, // Adjust this value to position the line correctly
      bottom: -BOTTOM_BORDER_PADDING + (modMode ? -20 : 0),
      left: LINE_HORIZONTAL_PADDING - 2,
      width: 1.25,
      backgroundColor: SECONDARY_THEME_COLOR,
      zIndex: 0,
    },

    playRoundContainer: {
      width: 2 * RADIUS_PFP, // same as the ProfilePicture
      height: 2 * RADIUS_PFP, // same as the ProfilePicture
      borderRadius: 2 * RADIUS_PFP, // same as the ProfilePicture to make it round
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden", // ensures the images within are clipped to the border radius
      // marginLeft: -RADIUS_PFP / 3, // how much overlap
      // position: 'absolute',
      flex: 1,
      marginTop: 5,
    },

    text: {
      color: SECONDARY_THEME_COLOR,
      fontSize: 14,
    },
    date: {
      color: SECONDARY_THEME_COLOR,
      fontFamily: "SpaceMono-Regular",
    },
    author: {
      fontSize: 14,
      color: SECONDARY_THEME_COLOR,
      fontFamily: "SpaceMono-Bold",
      marginLeft: 10, // Space from profile pictures
      flex: 1,
    },
    questionText: {
      color: SECONDARY_THEME_COLOR,
      fontFamily: "SpaceMono-Regular",
    },
    buttonWrapper: {
      backgroundColor: SECONDARY_THEME_COLOR, // Black background for the button
      width: 2 * RADIUS_PFP, // Width of the circle
      height: 2 * RADIUS_PFP, // Height of the circle
      borderRadius: RADIUS_PFP, // Half of width/height to make it a circle
      justifyContent: "center", // Center the '+' icon vertically
      alignItems: "center", // Center the '+' icon horizontally
    },

    // Include styles for ProfilePicture if needed
  });
};
export default CurrentQCard;
