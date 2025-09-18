{
  /*
TODO:

real time transcript:
    https://www.assemblyai.com/docs/guides/real-time-streaming-transcription
    if we do real time transcript we can post that directly to the backend.

batch transctips:
    for now.

*/
}

import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  ScrollView,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import { BODY_FONT } from "../../common/styles/config";
import { Platform } from "react-native";
import { Player } from "./AudioAssets";

import {
  useAnimatedRef,
  useDerivedValue,
  useSharedValue,
  cancelAnimation,
  scrollTo,
} from "react-native-reanimated";

const CaptionLine = ({ start, end, text, currentTime }) => {
  var color = "grey";
  if (currentTime > start * 1000 && currentTime < end * 1000) {
    color = "white";
  }
  return <Text style={[styles.subtitleLine, { color: color }]}>{text}</Text>;
};

const SubtitlesModal = ({ isVisible, onClose, player }) => {
  const subtitle = player.props.audio.transcripts;
  const currentTime = player.state.currentTime;
  const aref = useAnimatedRef();
  const scroll = useSharedValue(currentTime);
  const pref = useRef(null);

  const handleCloseModal = () => {
    cancelAnimation(scroll);
    onClose();
  };

  const handleClickedLine = (startTime) => {
    player.audioRecorderPlayer.seekToPlayer(startTime * 1000);
  };

  scroll.value = currentTime;
  const screenHeight = Dimensions.get("screen").height * 0.9;
  useDerivedValue(() => {
    scrollTo(aref, 0, -100 + (scroll.value / screenHeight) * 15, true);
  });

  useEffect(() => {
    pref.current?.setState(player.state);
  }, [player.state.currentTime, player.state.status]);

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCloseModal}
    >
      <View style={styles.modalBackground}>
        <TouchableOpacity
          style={
            Platform.OS == "ios" ? styles.closeButtonIOS : styles.closeButton
          }
          onPress={handleCloseModal}
        >
          <Icon name="chevron-left" color="white" size={28}></Icon>
        </TouchableOpacity>

        <ScrollView style={styles.container} ref={aref}>
          {subtitle?.map((line, index) => (
            <TouchableOpacity
              key={"o" + index}
              onPress={() => handleClickedLine(line.start)}
            >
              <View key={index}>
                <CaptionLine
                  start={line.start}
                  end={line.end}
                  text={line.text}
                  currentTime={currentTime}
                />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ marginBottom: 120 }}>
          <Player
            style={"transcripts"}
            ref={pref}
            playerRef={player}
            {...player.props}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 120,
    marginBottom: 80,
    paddingHorizontal: 20,
    // maxHeight: "75%",
  },
  modalBackground: {
    backgroundColor: "rgba(79, 41, 183, .95)",
    flex: 1,
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
    top: 65,
    left: 24,
  },
  subtitleLine: {
    // flex: 1, // Allowing the text to adjust its width within the container
    fontSize: 22,
    fontFamily: BODY_FONT,
    marginHorizontal: 10, // Add some margin to prevent text from touching the button
    color: "white",
  },
});

export default SubtitlesModal;
