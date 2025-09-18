import React, { useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Clipboard from "@react-native-community/clipboard";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import { LocalStateContext } from "../../../state/LocalState";
import Heading from "../../../common/Heading";

const InstructionsSection = () => {
  const { HDSeed } = useContext(LocalStateContext);
  const seedPhrase = HDSeed.phrase;

  const copyToClipboard = () => {
    Clipboard.setString(seedPhrase);
  };

  const sendEmail = () => {
    console.log("Send email functionality goes here");
    alert("Email not supported yet");
  };

  return (
    <View>
      <Heading size="md">Instructions</Heading>
      <Text style={styles.instructions}>
        Your seed phrase is the key to your identity. Write it down, send an
        email to yourself, or copy it to clipboard.
      </Text>
      <Text style={styles.seedPhrase}>{seedPhrase}</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={copyToClipboard}>
          <Icon name="content-copy" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={sendEmail}>
          <Icon name="email-multiple-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  instructions: {
    color: "black",
    fontSize: 16,
    marginBottom: 20,
  },
  seedPhrase: {
    fontSize: 16,
    marginBottom: 10,
    color: "blue",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 10,
  },
});

export default InstructionsSection;
