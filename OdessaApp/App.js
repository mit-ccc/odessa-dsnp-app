import React from "react";
import { Linking, StatusBar, useColorScheme } from "react-native";
import "react-native-gesture-handler";
import "react-native-get-random-values";
import "fast-text-encoding";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

import { NavContainer } from "./src/navigation/NavContainer";
import { LocalStateRoot } from "./src/state/LocalState";
import { PersonaRoot } from "./src/features/persona/PersonaRoot";

import { PaperTheme } from "./src/common/styles/PaperTheme";
import { PromptsProvider } from "./src/state/PromptsState";
import { FrequencyAuthorization } from "./src/features/newAccount/FrequencyAuthorization";
import { FirstFlowScreen } from "./src/features/newAccount/FirstFlow";

// Linking constants
const config = {
  screens: {
    FrequencyAuthorization: "login", // routes odessa://login to FrequencyAuthorization component
  },
};

const linking = {
  prefixes: ["odessa://"],
  config,
};

const Stack = createStackNavigator();

const App = () => {
  const isDarkMode = useColorScheme() === "dark";

  const backgroundStyle = {
    backgroundColor: isDarkMode ? "#444" : "#F3F3F3",
  };

  return (
    <LocalStateRoot>
      <PersonaRoot />
      <PromptsProvider>
        <PaperProvider theme={PaperTheme}>
          <SafeAreaProvider>
            <StatusBar
              barStyle="dark-content"
              backgroundColor={backgroundStyle.backgroundColor}
            />
            <NavigationContainer linking={linking}>
              <Stack.Navigator>
                <Stack.Screen
                  name="Navigation Container"
                  component={NavContainer}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="FirstFlowScreen"
                  component={FirstFlowScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="FrequencyAuthorization" // Needs to be in Stack.Navigator in order to open with deep link
                  component={FrequencyAuthorization}
                  options={{ headerShown: false }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaProvider>
        </PaperProvider>
      </PromptsProvider>
    </LocalStateRoot>
  );
};

export default App;
