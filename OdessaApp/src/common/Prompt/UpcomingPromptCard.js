import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, IconButton } from "react-native-paper";
import { format } from "date-fns";
import { BasePromptCard } from "./BasePromptCard";
import { Colors, Spacing, Typography } from "../styles";

export const UpcomingPromptCard = ({ prompt, lightness, onDelete }) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <BasePromptCard
      title={`SCHEDULED -- Created on ${format(
        new Date(prompt.post.creation_time),
        "MM dd, yyyy",
      )}`}
      lightness={lightness}
      color="secondary"
      onPress={() => {
        setExpanded(!expanded);
      }}
    >
      <View style={styles.container}>
        <View style={styles.audioplaybuttoncontainer}>
          <IconButton
            icon="close-circle-outline"
            iconColor={Colors.white}
            size={25}
            style={styles.closeButton}
            onPress={onDelete}
          />
        </View>

        <Text
          style={styles.promptText}
          numberOfLines={expanded ? null : 2}
          ellipsizeMode="tail"
        >
          "{prompt.post.text}"
        </Text>
      </View>
    </BasePromptCard>
  );
};

const styles = StyleSheet.create({
  closeButton: {
    margin: 0,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  promptText: {
    ...Typography.bodyLight,
    fontSize: Typography.xl,
    flexShrink: 1,
  },
  audioplaybuttoncontainer: {
    marginRight: Spacing.md,
  },
});
