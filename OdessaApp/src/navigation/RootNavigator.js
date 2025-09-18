/** Root Navigation

Bottom tab navigation, main nav for the app.

*/

import React, { useContext } from "react";
import { CurrentQStackNavigator } from "../features/landingPage/CurrentQStack";
import { ArchiveStackNavigator } from "../features/archive/ArchiveStack";
import { ActionStackNavigator } from "../features/communityAdmin/ActionStack";
import { PRIMARY_THEME_COLOR } from "../common/styles/config";

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import PromptsScreen from "../features/prompts/PromptsScreen";
import { Text } from "react-native-paper";
import { View } from "react-native";
import { Typography } from "../common/styles";
import QOTDModal from "../features/prompts/QOTDModal";
import { LocalStateContext } from "../state/LocalState";
import { PromptsContext } from "../state/PromptsState";

const Tab = createBottomTabNavigator();

export function AppBottomNav() {
  const { setModalVisible } = useContext(PromptsContext);
  const icons = {
    Daily: "circle-multiple",
    Archive: "archive",
    Create: "plus-circle",
    Actions: "view-grid-plus",
    Prompts: "chat",
  };

  const showIcon = (route, focused, color, size) => {
    var iconName = focused ? icons[route.name] : icons[route.name] + "-outline";
    return <Icon name={iconName} color={color} size={size} />;
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarActiveTintColor: PRIMARY_THEME_COLOR,
          tabBarInactiveTintColor: "#9e999f",
          unmountOnBlur: false,
          tabBarStyle: [
            {
              display: "flex",
              backgroundColor: "rgba(243,238,245,255)",
            },
          ],
          tabBarItemStyle: {
            paddingVertical: 0,
          },
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) =>
            showIcon(route, focused, color, size),
          tabBarLabel: ({ focused, color }) => {
            if (route.name === "Create") return null; // Remove label for 'Create'
            return (
              <Text style={{ color, fontSize: Typography.xxs }}>
                {route.name}
              </Text>
            );
          },
        })}
      >
        <Tab.Screen name="Daily" component={CurrentQStackNavigator} />
        <Tab.Screen name="Archive" component={ArchiveStackNavigator} />
        <Tab.Screen
          name="Create"
          component={PromptsScreen} // Placeholder screen -- the modal is the real action
          listeners={{
            tabPress: (e) => {
              // Prevent the default action (navigation)
              e.preventDefault();
              setModalVisible(true);
            },
          }}
          options={{
            tabBarIcon: () => (
              <View>
                <Icon
                  name="plus-circle-outline"
                  size={45}
                  color={PRIMARY_THEME_COLOR}
                />
              </View>
            ),
          }}
        />
        <Tab.Screen name="Actions" component={ActionStackNavigator} />
        <Tab.Screen name="Prompts" component={PromptsScreen} />
      </Tab.Navigator>
      <QOTDModal />
    </>
  );
}
