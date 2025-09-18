import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";

const GoBackButton = ({ onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{ zIndex: 1 }}
    >
      <Icon name="chevron-left" size={28} color="#333" />
    </TouchableOpacity>
  );
};

export default GoBackButton;
