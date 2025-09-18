import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { PRIMARY_THEME_COLOR } from "../../../common/styles/config";
import { Colors, Spacing, Typography } from "../../../common/styles";

const LoadingQAnswerCard = () => {
  return (
    <View>
      <View style={styles.container}>
        <View styles={styles.container}>
          <View style={styles.circle}>
            <ActivityIndicator
              size="small"
              animating
              color={PRIMARY_THEME_COLOR}
            />
          </View>
        </View>
        <Text style={styles.replyName}>Loading...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
  },
  // very specific styling for aligning the the loading circle with
  // the rest of the response chain
  circle: {
    marginLeft: 6,
    width: 25,
    height: 25,
    borderRadius: 0.5 * 25,
    backgroundColor: Colors.defaultBackgroundColor,
    justifyContent: "center",
    alignItems: "center",
  },
  replyName: {
    ...Typography.bodyDark,
    paddingLeft: Spacing.md,
  },
});

export default LoadingQAnswerCard;
