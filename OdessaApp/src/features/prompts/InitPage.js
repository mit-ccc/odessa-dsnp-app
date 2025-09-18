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
  TERTIARY_THEME_COLOR,
} from "../../common/styles/config";
import { CommunityDropdown } from "./CommunitiesDropDown";
import { useCommunities } from "../../common/Hooks/useCommunities";
import { PromptsContext } from "../../state/PromptsState";

const PromptFirstPage = ({
  onNextButtonPress,
  onCloseButtonPress,
  activeCommunity,
  selectedCommunity,
  setSelectedCommunity,
  newPromptText,
  setNewPromptText,
}) => {
  const enableBridgedRound = useEnabledBridgedRound(activeCommunity);
  const [enabledCommunities, setEnabledCommunities] = useState([]);
  const { communities } = useCommunities();

  useEffect(() => {
    setEnabledCommunities(
      communities?.filter(
        (c) =>
          c.id != activeCommunity.id &&
          useEnabledBridgedRound(c) &&
          c.bridge_id === null,
      ),
    );
  }, [communities]);

  const { userCanCreatePrompt, savePrompt, setModalVisible } =
    useContext(PromptsContext);

  const onSaveSuccess = () => {
    onCloseButtonPress();
  };

  const onSaveError = (error) => {
    onCloseButtonPress();
    console.error("Failed to submit prompt", error);
    // Alert.alert("Error", error || "Failed to submit the prompt.");
  };

  function isEmpty(obj) {
    return obj === null || obj === undefined || Object.keys(obj).length === 0;
  }

  return (
    <View style={styles.modalView}>
      <CloseButton onPress={onCloseButtonPress} />
      {!enableBridgedRound && (
        <Heading
          size={"sm"}
          animate={!newPromptText}
          style={{ paddingBottom: 20 }}
        >
          Ask {activeCommunity?.name}
        </Heading>
      )}
      {enableBridgedRound && (
        <Heading
          size={"sm"}
          animate={!newPromptText}
          style={{ paddingBottom: 20 }}
        >
          Ask away
        </Heading>
      )}
      {userCanCreatePrompt ? (
        <TextInput
          placeholder="What have you all been up to this weekend?"
          value={newPromptText}
          onChangeText={setNewPromptText}
          style={[
            styles.modalInput,
            {
              paddingBottom: 20,
              borderColor: selectedCommunity ? TERTIARY_THEME_COLOR : "white",
              borderWidth: 2,
              borderRadius: 6,
            },
          ]}
          autoFocus
          multiline
          numberOfLines={4}
          minHeight={Platform.OS === "ios" ? 26 * 4 : null}
          maxHeight={Platform.OS === "ios" ? 26 * 4 : null}
          scrollEnabled
        />
      ) : (
        <Text style={styles.modalInput}>
          You may have reached the limit of prompts you can send.
        </Text>
      )}

      {enableBridgedRound && (
        <View
          style={[
            styles.postingModalView,
            { paddingBottom: 20, alignItems: "center" },
          ]}
        >
          <Text style={[styles.modalInput, { textAlign: "left" }]}>
            Posting to
          </Text>
          <View style={styles.communityBubble}>
            <Text style={styles.text}>{activeCommunity?.name}</Text>
          </View>
          {enabledCommunities?.length > 0 && (
            <CommunityDropdown
              selectedCommunity={selectedCommunity}
              setSelectedCommunity={setSelectedCommunity}
              enabledCommunities={enabledCommunities}
            />
          )}
        </View>
      )}

      {((enableBridgedRound && isEmpty(selectedCommunity)) ||
        !enableBridgedRound) && (
        <Button
          mode="contained"
          onPress={() => {
            setModalVisible(false);
            savePrompt(newPromptText, onSaveSuccess, onSaveError);
          }}
          disabled={newPromptText.trim().length < 5}
        >
          Add to Question Pool
        </Button>
      )}

      {enableBridgedRound && !isEmpty(selectedCommunity) && (
        <Button
          mode="contained-tonal"
          onPress={onNextButtonPress}
          disabled={newPromptText.trim().length < 5}
        >
          Next
        </Button>
      )}
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
    justifyContent: "space-between",
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

export default PromptFirstPage;
