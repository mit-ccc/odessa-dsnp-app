// AudioButton.js
import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, Button } from "react-native-paper"; // Import IconButton from react-native-paper

const AudioPlayButton = ({ onPress, radius = 16 }) => {
  const styles = StyleSheet.create({
    audioButtonContainer: {
      width: radius * 2, // Specify a fixed width
      height: radius * 2, // Specify a fixed height
      borderRadius: radius, // Half of the width and height to create a circle
      justifyContent: "center", // Center the button vertically
      alignItems: "center", // Center the button horizontally
      backgroundColor: "#FFFFFF", // White background for the circle
      borderWidth: 0, // Optional: if you want a border around the box
    },
    audioButton: {
      marginLeft: (radius * 3) / 4, // somehow this is what centers it
      marginRight: 0,
      minWidth: 0, // Ensure there is no minimum width
      padding: 0, // Reset any default padding that might exist
      margin: 0, // Reset any default margin that might exist
    },
  });

  return (
    <View style={styles.audioButtonContainer}>
      <Button icon="play" onPress={onPress} style={styles.audioButton} />
    </View>
  );
};

export default AudioPlayButton;
