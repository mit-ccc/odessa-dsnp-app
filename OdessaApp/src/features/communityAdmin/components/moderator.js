import { useEffect, useState, useContext } from "react";
import {
  View,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Text, useTheme, Button, TextInput } from "react-native-paper";
import { gql } from "graphql-request";

import { LocalStateContext } from "./../../../state/LocalState";
import {
  BODY_FONT,
  BODY_FONT_BOLD,
  PRIMARY_THEME_COLOR,
  SECONDARY_THEME_COLOR,
} from "../../../common/styles/config";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";

export const ModeratorActions = ({
  navigation,
  activeCommunity,
  permissions,
  backgroundColor = SECONDARY_THEME_COLOR,
}) => {
  const { api } = useContext(LocalStateContext);
  const allPermissions =
    permissions && permissions.length == 1 && permissions[0] == "__all__";

  const canSeeDisputes = permissions?.includes("community.mod.disputes.review");

  const handleReviewContent = () => {
    navigation.navigate("ModerateContentPage", { community: activeCommunity });
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <View style={styles.actionsSection}>
        {(allPermissions || canSeeDisputes) && (
          <View>
            <View style={{ margin: 15 }}></View>
            <Text style={styles.roleText}>review content</Text>

            <View style={{ alignSelf: "center" }}>
              <Button
                mode="contained"
                style={{ margin: 20 }}
                onPress={handleReviewContent}
              >
                <Text style={styles.text}>Review posts --</Text>
                <Icon
                  name="chevron-right"
                  color={"white"}
                  size={16}
                  style={{}}
                ></Icon>
              </Button>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = {
  roleText: {
    fontSize: 20,
    color: PRIMARY_THEME_COLOR,
    textAlign: "left",
    fontFamily: BODY_FONT,
  },

  header: {
    backgroundColor: PRIMARY_THEME_COLOR,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  text: {
    fontSize: 16,
    fontFamily: BODY_FONT,
    color: "rgba(243,238,245,255)",
    // padding: 10,
  },

  dropdown1BtnStyle: {
    width: "100%",
    height: 50,
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  dropdown1BtnTxtStyle: { color: "#444", textAlign: "left" },
  dropdown1DropdownStyle: { backgroundColor: "#EFEFEF" },
  dropdown1RowStyle: {
    backgroundColor: "#EFEFEF",
    borderBottomColor: "#C5C5C5",
  },
  dropdown1RowTxtStyle: { color: "#444", textAlign: "left" },
  actionsSection: {
    padding: 30,
    paddingBottom: 60,
  },
};
