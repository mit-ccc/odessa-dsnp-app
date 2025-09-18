import { createStackNavigator } from "@react-navigation/stack";
import { CurrentQPage } from "../landingPage/CurrentQ";
import { ReviewPostPage } from "../moderationActions/reviewPost";

const CurrentQStack = createStackNavigator();

export const CurrentQStackNavigator = () => (
  <CurrentQStack.Navigator initialRouteName="CurrentQPage">
    <CurrentQStack.Screen
      name="CurrentQPage"
      component={CurrentQPage}
      options={{ headerShown: false }}
    />
    <CurrentQStack.Screen
      name="ReviewPostPage"
      component={ReviewPostPage}
      options={{ headerShown: false }}
    />
  </CurrentQStack.Navigator>
);
