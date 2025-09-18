import React, { useCallback, useContext, useEffect } from "react";
import { View, Text, StyleSheet, Alert, RefreshControl } from "react-native";
import { ActivityIndicator, Banner } from "react-native-paper";
import { ScrollView } from "react-native-gesture-handler";
import { Spacing, Typography } from "../../common/styles";
import { UpcomingPromptCard } from "../../common/Prompt/UpcomingPromptCard";
import { PromptsContext } from "../../state/PromptsState";
import { PRIMARY_THEME_COLOR } from "../../common/styles/config";

const PromptsScreen = () => {
  const {
    userPrompts,
    deletePrompt,
    setTriggerRefresh,
    triggerRefresh,
    setModalVisible,
  } = useContext(PromptsContext);

  const topLightness = 60; // for the most recent prompt
  const bottomLightness = 30; // for the oldest prompt
  const lightnessStep =
    (topLightness - bottomLightness) / (userPrompts?.length - 1 || 1); // div by 0 prevention

  const handleRemovePromptPressed = (prompt) => {
    Alert.alert(
      "",
      "Do you want to remove: " + '"' + prompt.post.text + '"' + "?",
      [
        { text: "Keep" },
        {
          text: "Remove",
          onPress: () => {
            // optimistically remove it from the list
            prompt.removePrompt = true;
            deletePrompt(prompt.id, null, (error) => {
              prompt.removePrompt = false;
              console.error("Failed to remove prompt", error);
              Alert.alert("Error", error || "Failed to remove the prompt.");
            });
          },
        },
      ],
      { cancelable: true },
    );
  };

  const onRefresh = useCallback(() => {
    setTriggerRefresh(true);
  }, []);

  useEffect(() => {
    if (!triggerRefresh) {
      setTriggerRefresh(true);
    }
  }, [triggerRefresh]);

  return (
    <>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={triggerRefresh} onRefresh={onRefresh} />
        }
      >
        {userPrompts === undefined && (
          <View style={styles.container}>
            <ActivityIndicator animating={true} color={PRIMARY_THEME_COLOR} />
          </View>
        )}
        {userPrompts?.length === 0 && (
          <Banner
            visible
            actions={[
              {
                label: "Add Prompt",
                onPress: () => setModalVisible(true),
              },
            ]}
          >
            <Text style={styles.noPromptText}>
              You have no upcoming prompts. Create a new prompt to get started.
            </Text>
          </Banner>
        )}
        {userPrompts
          ?.filter((item) => !item.removePrompt)
          .map((item, index) => (
            <UpcomingPromptCard
              key={index}
              prompt={item}
              lightness={topLightness - index * lightnessStep}
              onDelete={() => handleRemovePromptPressed(item)}
            />
          ))}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: Spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  noPromptText: {
    ...Typography.bodyDark,
    fontSize: Typography.lg,
  },
});

export default PromptsScreen;
