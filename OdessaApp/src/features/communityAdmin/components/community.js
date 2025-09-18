import { useState, useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";

import { LocalStateContext } from "./../../../state/LocalState";
import {
  BODY_FONT,
  PRIMARY_THEME_COLOR,
  SECONDARY_THEME_COLOR,
} from "../../../common/styles/config";

export const CommunityActions = ({ navigation, permissions }) => {
  const { persona0, activeCommunity } = useContext(LocalStateContext);

  const handleGlobalActions = () => {
    navigation.navigate("GlobalActions", {
      persona: persona0,
      permissions: permissions,
    });
  };

  return (
    <TouchableOpacity onPress={handleGlobalActions}>
      <View style={styles.header}>
        <Text style={styles.text}>global actions</Text>
        <Icon
          name="chevron-right"
          color={"rgba(243,238,245,255)"}
          size={18}
          style={{ marginLeft: -7 }}
        ></Icon>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: PRIMARY_THEME_COLOR,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  text: {
    fontSize: 12,
    fontFamily: BODY_FONT,
    color: "rgba(243,238,245,255)",
    padding: 10,
  },
});
