import React, { useEffect, useState, useContext } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Button, Card, Title, Paragraph } from "react-native-paper";
import { getPostById, getAnswersToPost } from "../../../api/wrappers";
import { LocalStateContext } from "../../../state/LocalState";

export const PromptDetails = ({ route }) => {
  const { promptPostId } = route.params;
  const [promptDetails, setPromptDetails] = useState(null);
  const [answers, setAnswers] = useState([]);
  const {
    api, // client scoped to this user
  } = useContext(LocalStateContext);

  useEffect(() => {
    // Fetching prompt details
    getPostById(api, promptPostId).then(setPromptDetails);

    // Fetching answers to the prompt
    getAnswersToPost(api, promptPostId).then(setAnswers);
  }, [promptPostId]);

  console.log("WHAT");
  return (
    <View style={{ flex: 1, padding: 10 }}>
      {promptDetails ? (
        <>
          <Title style={{ color: "black" }}>{promptDetails.text}</Title>
          <Text>{promptDetails.creation_time}</Text>
          {/* Display other details here */}
          <ScrollView>
            {answers.map((answer, index) => (
              <View
                key={index}
                style={{
                  padding: 10,
                  marginVertical: 5,
                  backgroundColor: "#e0e0e0",
                }}
              >
                <Text>User: {answer.userId}</Text>
                <Text>Text Answer: {answer.text_answer}</Text>
                <View style={styles.audioContainer}>
                  <Text>Audio Answer: {answer.audio_id} </Text>
                  <Button
                    mode="contained"
                    onPress={() => {
                      /* Implement play functionality */
                    }}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.buttonLabel}
                  >
                    Play
                  </Button>
                </View>
                <Text>Date: {answer.date}</Text>
              </View>
            ))}
          </ScrollView>
        </>
      ) : (
        <Text>Loading...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  audioContainer: {
    flexDirection: "row", // To position elements horizontally
    alignItems: "center", // Align items vertically in the center
  },
  playButton: {
    marginRight: 0, // Optional: for some horizontal spacing between text and button
    // You might need to adjust the style of the button, or use a different component for it
  },
  buttonContent: {
    height: 40, // Adjust the height as per your requirement
    width: 80, // Adjust the width as per your requirement
  },

  buttonLabel: {
    fontSize: 14, // Adjust the font size as per your requirement
  },
});
