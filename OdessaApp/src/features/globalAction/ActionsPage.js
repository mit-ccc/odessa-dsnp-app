import React, { useContext, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
} from "react-native";
import {
  BODY_FONT,
  PRIMARY_THEME_COLOR,
  SECONDARY_THEME_COLOR,
} from "../../common/styles/config";
import { LocalStateContext } from "../../state/LocalState";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import { RunStressTest } from "../../tests/runStressTests";

export const Header = ({ onPress }) => {
  // RunStressTest()

  return (
    <View style={styles.header}>
      <View>
        <TouchableOpacity onPress={onPress}>
          <Icon
            name="chevron-left"
            color={PRIMARY_THEME_COLOR}
            size={24}
          ></Icon>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const ActionsPage = ({ navigation, route }) => {
  const bottomNav = navigation.getParent();
  const sideNav = bottomNav.getParent();

  const { activeCommunity } = useContext(LocalStateContext);

  const enabledCreateNewCommunity =
    activeCommunity === undefined ||
    activeCommunity.flags.includes("enable_create_new_community");
  const personaCanCreateCommunity =
    route?.params?.permissions?.includes("community.create");

  const handleGlobalActions = () => {
    navigation.goBack();
  };

  useEffect(() => {
    bottomNav.setOptions({
      tabBarStyle: { display: "none" },
      tabBarVisible: false,
    });
    sideNav.setOptions({
      headerLeft: () => <Header onPress={handleGlobalActions} />,
    });
    return () => {
      bottomNav.setOptions({
        tabBarStyle: undefined,
        tabBarVisible: undefined,
      });
      sideNav.setOptions({
        headerLeft: undefined,
      });
    };
  }, [navigation]);

  const handleCreateCommunity = () => {
    navigation.navigate("CreateCommunityPage", {
      mode: "creating",
      readOnly: false,
    }); //route.params.
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* {enabledCreateNewCommunity && personaCanCreateCommunity && ( */}
        <TouchableOpacity
          style={styles.communityBubble}
          onPress={handleCreateCommunity}
        >
          <Text style={styles.activeText}>Create Community</Text>
        </TouchableOpacity>
        {/* )} */}
      </ScrollView>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    // backgroundColor: "rgba(243,238,245,255)",
    padding: 4,
    flexDirection: "row",
    alignItems: "center",
    // justifyContent: 'space-between'
  },
  text: {
    fontSize: 12,
    fontFamily: BODY_FONT,
    color: PRIMARY_THEME_COLOR,
    padding: 10,
  },
  activeText: {
    fontFamily: BODY_FONT,
    color: "white",
    fontWeight: "500", // semi-bold text for active bubble
  },
  communityBubble: {
    paddingVertical: 10, // reduced padding for a slimmer look
    paddingHorizontal: 15, // horizontal padding to give more side space
    marginHorizontal: 80, // space between the bubbles
    borderRadius: 18, // to match the roundness in the image
    backgroundColor: PRIMARY_THEME_COLOR, // light grey background for inactive bubbles
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.75,
    borderColor: "#4C3FBF",
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
});
