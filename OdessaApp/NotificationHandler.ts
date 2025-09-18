// NotificationHandler.ts
import notifee, { AndroidImportance } from "@notifee/react-native";
import messaging from "@react-native-firebase/messaging";
import { addFCMToken } from "./src/api/wrappers";

export const NotificationHandler = {
  handleToken: async (api: Object, token: String) => {
    return await addFCMToken(api, token);
  },

  handleGetUserToken: async (api: Object) => {
    try {
      const token = await messaging().getToken();
      NotificationHandler.handleToken(api, token);
    } catch (error) {
      console.info("ERROR: Unable to get FCM token:", error);
    }
  },

  requestUserPermission: async () => {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log("Authorization status:", authStatus);
      // TODO: ALLOW NOTIFICATIONS
    }
  },

  handleForegroundNotification: () => {
    return messaging().onMessage(async (remoteMessage) => {
      // Display a notification using Notifee
      await notifee.displayNotification({
        title: remoteMessage.notification.title,
        body: remoteMessage.notification.body,
        android: {
          channelId: "default",
        },
      });
    });
  },

  setupForegroundNotificationListener: () => {
    // Create a channel for Android
    notifee.createChannel({
      id: "default",
      name: "Default Channel",
      importance: AndroidImportance.HIGH,
    });

    // Set up the onMessage listener
    const unsubscribe = NotificationHandler.handleForegroundNotification();

    // Return the unsubscribe function to be called when the listener should be detached
    return unsubscribe;
  },

  handleInitialNotification: async () => {
    const initialNotification = await messaging().getInitialNotification();
    // Handle the initial notification...

    // This API can be used to fetch which notification & press action has
    // caused the application to open. The call returns a null value when the
    // application wasn't launched by a notification.

    // Once the initial notification has been consumed by this API, it is
    // removed and will no longer be available. It will also be removed if
    // the user relaunches the application.

    // FIXME: may not need this.
  },

  // subscribeToTopic: async () => {
  //     const topic = NOTIFICATIONS_ALIAS+'allUsers';
  //     const token = await messaging().getToken();
  //     console.log('Subscribing', token, 'to', topic);
  //     await messaging().subscribeToTopic(topic);
  // },
};
