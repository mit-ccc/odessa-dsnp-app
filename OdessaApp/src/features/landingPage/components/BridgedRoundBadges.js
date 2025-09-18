import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";

import { format } from "date-fns";
import {
  QUATERNARY_THEME_COLOR,
  SECONDARY_THEME_COLOR,
  TERTIARY_THEME_COLOR,
} from "../../../common/styles/config";
import { TOP_BORDER_PADDING, SIDE_PADDING, RADIUS_PFP } from "../styles/config";
import ProfilePicture from "../../../common/minorComponents/ProfilePicture";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import { LocalStateContext } from "../../../state/LocalState";

const BridgedRoundBadge = ({}) => {
  const { activeCommunity } = useContext(LocalStateContext);
  const isBridged = activeCommunity && activeCommunity.bridge_id !== null;

  const styles = localStyles(activeCommunity);

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <Text style={styles.text}>bridged</Text>
      </View>
    </View>
  );
};

const QUESTION_FONT_SIZE = 18;

const localStyles = (activeCommunity) => {
  const isBridged = activeCommunity && activeCommunity.bridge_id !== null;

  return StyleSheet.create({
    wrapper: {
      //   flexDirection: "column",
      alignItems: "flex-end",
    },
    card: {
      backgroundColor: QUATERNARY_THEME_COLOR,
      paddingVertical: 8,
      paddingHorizontal: SIDE_PADDING, // Add padding to match the original Card's padding
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      marginHorizontal: 2,
      //   width: "50%",
    },
    text: {
      color: "black",
      fontFamily: "SpaceMono-Regular",
      fontSize: 14,
      paddingHorizontal: 20,
    },
  });
};
export default BridgedRoundBadge;
