import React, { useContext, useState } from "react";
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import { useKeepAwake } from "@sayem314/react-native-keep-awake";
import { sendAnswer } from "../../../api/wrappers";
import { LocalStateContext } from "../../../state/LocalState";
import { Recorder } from "../../audio/AudioAssets";

const AnswerSubmissionModal = ({
  isVisible,
  onClose,
  round,
  onSubmissionComplete,
  setRecorderStatus,
  recorderStatus,
}) => {
  useKeepAwake();
  const [audioId, setAudioId] = useState("");

  const activeQuestion = round.prompt;

  const {
    api, // client scoped to this user
    activeCommunity,
  } = useContext(LocalStateContext);

  const handleSetPostAudioId = (audio_id) => {
    setAudioId(audio_id);
  };

  const handleSetRecordedHasStarted = (status) => {
    setRecorderStatus(status);
  };

  const handleAnswerSubmission = () => {
    sendAnswer(api, activeCommunity.id, audioId, activeQuestion.post.id)
      .then((response) => {
        if (response.success) {
          console.log("Answer submitted successfully");
          onSubmissionComplete?.(true); // Callback for successful submission
          onClose();
        } else {
          onSubmissionComplete?.(false); // Callback for failed submission
        }
      })
      .catch((error) => {
        console.error("Failed to submit answer", error);
        onSubmissionComplete?.(false); // Callback for failed submission
      })
      .finally(() => {
        onClose(); // Close the modal after handling the response
      });
  };

  const handleCloseModal = () => {
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        {recorderStatus !== "stopped" && (
          <TouchableOpacity
            style={
              Platform.OS === "ios" ? styles.closeButtonIOS : styles.closeButton
            }
            onPress={handleCloseModal}
          >
            <Icon name="chevron-left" color="white" size={28}></Icon>
          </TouchableOpacity>
        )}
        <Text style={styles.question}>"{activeQuestion.post.text}"</Text>
        <View>
          <Recorder
            api={api}
            setRecorderStatus={handleSetRecordedHasStarted}
            setPostAudioId={handleSetPostAudioId}
            createPost={handleAnswerSubmission}
            recordingConstraint={round.recording_constraint}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.88)", // Semi-transparent background
  },
  question: {
    marginBottom: 50,
    fontSize: 18, // Adjust font size as needed
    color: "white", // Dark text color for better readability
    textAlign: "center", // Center align the question text
    width: "80%", // Ensure it spans the width of the modal container
  },
  closeButton: {
    position: "absolute",
    top: 20,
    left: 20,
  },
  closeButtonIOS: {
    alignSelf: "top",
    alignItems: "left",
    top: -Dimensions.get("window").height * 0.2,
    left: 20,
  },
});

export default AnswerSubmissionModal;
