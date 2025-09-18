import { useState, useContext } from "react";
import { View, ScrollView } from "react-native";
import { Text, StyleSheet } from "react-native";

import { LocalStateContext } from "./../../../state/LocalState";
import {
  BODY_FONT,
  PRIMARY_THEME_COLOR,
  SECONDARY_THEME_COLOR,
} from "../../../common/styles/config";
import QRCode from "react-native-qrcode-svg";

export const PersonaActions = ({ permissions }) => {
  const { persona0, activeCommunity } = useContext(LocalStateContext);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      {permissions?.includes("persona.view_pkh_qr") && (
        <DisplayPkHQRCode pkh={persona0.pkh} />
      )}
    </ScrollView>
  );
};

const DisplayPkHQRCode = ({ pkh }) => {
  return (
    <View
      style={[
        styles.actionsSection,
        { backgroundColor: SECONDARY_THEME_COLOR },
      ]}
    >
      <View>
        <Text style={styles.roleText}>persona pkh code</Text>
        <QRCode value={pkh} size={200} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  roleText: {
    fontSize: 20,
    color: PRIMARY_THEME_COLOR,
    textAlign: "left",
    fontFamily: BODY_FONT,
    alignSelf: "center",
    marginBottom: 10,
  },
  actionsSection: {
    padding: 30,
    alignSelf: "center",
    paddingBottom: 60,
  },
});
