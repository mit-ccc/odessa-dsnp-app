/** Drawer Navigation

The drawer encloses the root navigation, which is a bottom navigation
setup.

*/

import { useContext, useState } from "react";
import { Text, StyleSheet, View } from "react-native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { DrawerContents } from "../features/sideDrawer/AppDrawer";

import { AppBottomNav } from "./RootNavigator";
import { PersonaEditingScreen } from "../features/persona/PersonaEditing";
import {
  LoadingScreen,
  FirstFlowScreen,
} from "../features/newAccount/FirstFlow";
import { LocalStateContext } from "../state/LocalState";

import { Spacing, Typography } from "../common/styles";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import CommunityProfile from "../features/communityAdmin/CommunityProfile";
import { BackHeader } from "../common/BackHeader";
import { Appbar } from "react-native-paper";
import CommunityAvatar from "../common/CommunityAvatar";
import { DebugScreen } from "../features/debug/Debug";

const DrawerNav = createDrawerNavigator();

export const NavContainer = () => {
  const { personaInit } = useContext(LocalStateContext);

  if (personaInit === undefined) {
    return <LoadingScreen />;
  }

  if (!personaInit) {
    return <FirstFlowScreen />;
  }

  return <DrawerNavComponent />;
};

export const HeaderTitle = () => {
  const navigation = useNavigation();
  const { activeCommunity } = useContext(LocalStateContext);

  return (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("CommunityProfile", {
          community: activeCommunity,
        })
      }
    >
      <View style={styles.communityContainer}>
        <CommunityAvatar size="sm" community={activeCommunity} />
        <Text style={styles.header}>{activeCommunity.name}</Text>
      </View>
    </TouchableOpacity>
  );
};

const DrawerNavComponent = () => {
  const { activeCommunity } = useContext(LocalStateContext);
  const navigation = useNavigation();
  const [refresh, setRefresh] = useState(false);

  const refreshDrawer = () => {
    setRefresh(!refresh);
  };

  const backHeader = () => (
    <Appbar.Header theme={{ colors: { surface: "white" } }}>
      <BackHeader onPress={() => navigation.goBack()} />
    </Appbar.Header>
  );

  return (
    <DrawerNav.Navigator
      drawerContent={({ navigation }) => (
        <DrawerContents navigation={navigation} refreshDrawer={refreshDrawer} />
      )}
      screenOptions={{
        headerTitleAlign: "center", // Align the title to the center
        headerTitle: () =>
          activeCommunity ? (
            <HeaderTitle />
          ) : (
            <Text style={styles.header}>ODESSA</Text>
          ),
        headerStyle: {
          elevation: 0, // remove shadow on Android
          shadowOpacity: 0, // remove shadow on iOS
        },
        headerTintColor: "black", // Use your preferred color for the hamburger icon and other items
        // Add other styling as needed
      }}
    >
      <DrawerNav.Screen name="Odessa" component={AppBottomNav} />
      <DrawerNav.Screen
        name="PersonaEditing"
        component={PersonaEditingScreen}
        options={{
          title: "Edit Persona",
          unmountOnBlur: true,
          header: backHeader,
        }}
      />
      <DrawerNav.Screen
        name="Debug"
        component={DebugScreen}
        options={{
          title: "Debug",
          unmountOnBlur: true,
          header: backHeader,
        }}
      />
      <DrawerNav.Screen
        name="CommunityProfile"
        component={CommunityProfile}
        options={{
          header: backHeader,
        }}
      />
    </DrawerNav.Navigator>
  );
};

const styles = StyleSheet.create({
  header: {
    ...Typography.appTitle,
    paddingLeft: Spacing.sm,
    textAlign: "center",
  },
  communityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
});
