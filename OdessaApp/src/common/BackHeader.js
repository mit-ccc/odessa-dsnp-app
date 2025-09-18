import React from "react";
import { Appbar } from "react-native-paper";
import PaperTheme from "./styles/PaperTheme";
import { View } from "react-native";

export const BackHeader = ({ onPress }) => {
  return (
    <View style={styles.header}>
      <Appbar.BackAction
        color={PaperTheme.colors.secondary}
        onPress={onPress}
      />
    </View>
  );
};

const styles = {
  header: {
    backgroundColor: "white",
  },
};
