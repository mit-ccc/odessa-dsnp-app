import React from "react";
import { View, Alert, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { format } from "date-fns";
import AudioPlayButton from "../../../common/minorComponents/AudioPlayButton";
import { BasePromptCard } from "../../../common/Prompt/BasePromptCard";

const ArchiveCard = ({ round, lightness, navigation }) => {
  const { prompt } = round;
  const formattedDate = round
    ? format(new Date(round.creation_time), "MM dd, yyyy")
    : "Loading...";
  const repliesCount = prompt ? prompt.num_replies : 0;
  const formattedTime = round
    ? format(new Date(round.creation_time), "HH:mm")
    : "Loading...";

  const title =
    repliesCount > 0
      ? `${formattedDate} —— ${repliesCount} voice replies, ${formattedTime}`
      : `${formattedDate} —— no replies, ${formattedTime}`;

  return (
    <BasePromptCard
      title={title}
      lightness={lightness}
      onPress={() => navigation.navigate("PromptDetails", { round: round })}
    >
      <View style={styles.audioContainer}>
        <View style={styles.audioplaybuttoncontainer}>
          <AudioPlayButton />
        </View>
        <Text style={styles.promptText} numberOfLines={2} ellipsizeMode="tail">
          "{prompt.post ? prompt.post.text : "Loading..."}"
        </Text>
      </View>
    </BasePromptCard>
  );
};

const styles = StyleSheet.create({
  // ...
  audioButtonContainer: {
    width: 32, // Specify a fixed width
    height: 32, // Specify a fixed height
    borderRadius: 16, // Half of the width and height to create a circle
    justifyContent: "center", // Center the button vertically
    alignItems: "center", // Center the button horizontally
    backgroundColor: "#FFFFFF", // White background for the circle
    marginRight: 8,
  },
  audioButton: {
    marginLeft: 12, // somehow this is what centers it
    marginRight: 0,
    minWidth: 0, // Ensure there is no minimum width
    padding: 0, // Reset any default padding that might exist
    margin: 0, // Reset any default margin that might exist
  },
  audioContainer: {
    flexDirection: "row",
    alignItems: "center",
    // Add any other container styles here
  },
  promptText: {
    flexShrink: 1,
    fontSize: 20,
    fontFamily: "SpaceMono-Regular",
    // Add any other text styles here
  },
  audioplaybuttoncontainer: {
    marginRight: 10,
  },
  // ...
});

export default ArchiveCard;
