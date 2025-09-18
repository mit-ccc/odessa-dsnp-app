import React, { useState, useContext, useRef, useEffect } from "react";
import {
  Modal,
  View,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";
import { Button, Text } from "react-native-paper";
import { LocalStateContext } from "../../state/LocalState";
import CloseButton from "../../common/Button/CloseButton";
import Heading from "../../common/Heading";
import { Colors, Spacing, Typography } from "../../common/styles";
import { useEnabledBridgedRound } from "../../common/Hooks/communityFlags";
import {
  PRIMARY_THEME_COLOR,
  SECONDARY_THEME_COLOR,
} from "../../common/styles/config";
import { CommunityDropdown } from "./CommunitiesDropDown";
import GoBackButton from "../../common/Button/GoBackButton";
import { PromptsContext } from "../../state/PromptsState";

const SharedPromptPolicyPage = ({
  selectedCommunities,
  onNextButtonPress,
  onGoBackButtonPress,
  onCloseButtonPress,
  newPromptText,
}) => {
  const { saveBridgedPrompt } = useContext(PromptsContext);

  const [commsTitle, setCommsTitle] = useState("New Prompt");

  useEffect(() => {
    if (selectedCommunities[0] && selectedCommunities[1]) {
      setCommsTitle(
        selectedCommunities[0].name + " and " + selectedCommunities[1].name,
      );
    }
  }, selectedCommunities);

  const onSaveSuccess = () => {
    onCloseButtonPress();
  };

  const onSaveError = (error) => {
    console.error("Failed to submit prompt", error);
    onCloseButtonPress();
    // Alert.alert("Error", error || "Failed to submit the prompt.");
  };

  const onSubmitBridgedPrompt = () => {
    saveBridgedPrompt(
      newPromptText,
      [selectedCommunities[0].id, selectedCommunities[1].id],
      onSaveSuccess,
      onSaveError,
    );
  };

  return (
    <View style={styles.modalView}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <GoBackButton onPress={onGoBackButtonPress} />
        <CloseButton onPress={onCloseButtonPress} />
      </View>

      <Heading size={"sm"} animate={true} style={{ paddingBottom: 20 }}>
        {commsTitle}
      </Heading>

      <Text style={styles.modalInput}>NEXT SCREEN</Text>

      <Button
        mode="contained-tonal"
        onPress={onSubmitBridgedPrompt}
        disabled={false}
      >
        Post
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
  },
  modalView: {
    // width: "100%", // Use more screen width
    backgroundColor: "white",
    alignItems: "center",
    height: "100%",
    // justifyContent: "space-between",
  },
  postingModalView: {
    width: "100%", // Use more screen width
    margin: Spacing.sm,
    backgroundColor: "white",
    padding: 0,
  },
  modalInput: {
    ...Typography.bodyDark,
    width: "100%", // Take full width of the modal
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    borderWidth: 0,
    textAlignVertical: "top", // Start the text at the top of the input
  },
  communityBubble: {
    paddingVertical: 10, // reduced padding for a slimmer look
    paddingHorizontal: 15, // horizontal padding to give more side space
    marginHorizontal: 15, // space between the bubbles
    borderRadius: 18, // to match the roundness in the image
    backgroundColor: PRIMARY_THEME_COLOR, // light grey background for inactive bubbles
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: SECONDARY_THEME_COLOR,
    fontSize: Typography.md,
  },
});

export default SharedPromptPolicyPage;
