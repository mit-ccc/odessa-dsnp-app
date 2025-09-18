import { createStackNavigator } from "@react-navigation/stack";
import { ArchivePage } from "./components/Archive";
import { CurrentQPage } from "../landingPage/CurrentQ";
import { useNavigation } from "@react-navigation/native";
import { BackHeader } from "../../common/BackHeader";

const ArchiveStack = createStackNavigator();

export const ArchiveStackNavigator = () => {
  const navigation = useNavigation();
  const backHeader = () => (
    <BackHeader onPress={() => navigation.navigate("ArchivePage")} />
  );

  return (
    <ArchiveStack.Navigator initialRouteName="ArchivePage">
      <ArchiveStack.Screen
        name="ArchivePage"
        component={ArchivePage}
        options={{ headerShown: false }}
      />
      <ArchiveStack.Screen
        name="PromptDetails"
        component={CurrentQPage}
        options={{ header: backHeader }}
      />
    </ArchiveStack.Navigator>
  );
};
