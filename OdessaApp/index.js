import { AppRegistry } from "react-native";
import App from "./App";
import { name as appName } from "./app.json";
import messaging from "@react-native-firebase/messaging";
import notifee, { EventType } from "@notifee/react-native";

// Handle background messages for FCM
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  // Display a notification using Notifee
  await notifee.displayNotification({
    title: remoteMessage.notification.title,
    body: remoteMessage.notification.body,
    android: {
      channelId: "default",
    },
  });
});

// Handle background events for Notifee
notifee.onBackgroundEvent(async ({ type, detail }) => {
  switch (type) {
    case EventType.DISMISSED:
      console.log("User dismissed notification", detail.notification);
      break;
    case EventType.PRESS:
      console.log("User pressed notification", detail.notification);
      break;
    // Add more cases as needed
  }
});

AppRegistry.registerComponent(appName, () => App);
