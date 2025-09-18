import { createStackNavigator } from "@react-navigation/stack";
import { CommunityPage } from "./CommunityPage";
import { ActionsPage } from "../globalAction/ActionsPage";
import { CreateCommunityPage } from "../globalAction/createCommunity";
import { ModerateContentPage } from "../moderationActions/moderateContent";
import { ReviewPostPage } from "../moderationActions/reviewPost";

const ActionStack = createStackNavigator();

export const ActionStackNavigator = () => (
  <ActionStack.Navigator initialRouteName="CommunityPage">
    <ActionStack.Screen
      name="CommunityPage"
      component={CommunityPage}
      options={{ headerShown: false }}
    />
    <ActionStack.Screen
      name="GlobalActions"
      component={ActionsPage}
      options={{ headerShown: false }}
    />
    <ActionStack.Screen
      name="CreateCommunityPage"
      component={CreateCommunityPage}
      options={{ headerShown: false }}
    />
    <ActionStack.Screen
      name="ModerateContentPage"
      component={ModerateContentPage}
      options={{ headerShown: false }}
    />
    <ActionStack.Screen
      name="ReviewPostPage"
      component={ReviewPostPage}
      options={{ headerShown: false }}
    />
  </ActionStack.Navigator>
);
