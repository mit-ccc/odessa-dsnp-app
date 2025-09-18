import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";

const CloseButton = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      hitSlop={onPress ? 20 : undefined}
    >
      <Icon name="close" size={24} color="#333" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignSelf: "flex-end", // Align the close button to the right
    marginBottom: 10,
  },
});

export default CloseButton;
