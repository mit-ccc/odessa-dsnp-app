import React, { useContext, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { IconButton } from "react-native-paper";
import { gql } from "graphql-request";
import { LocalStateContext } from "../../state/LocalState";

const GET_SIWF_URI = gql`
  query GetSiwaUri {
    siwfURI
  }
`;

export const FrequencyFlow = ({ onClose }) => {
  const { api } = useContext(LocalStateContext);
  const [uri, setUri] = useState("");
  const [key, setKey] = useState(0);

  useEffect(() => {
    const getUrl = async () => api.request(GET_SIWF_URI);
    getUrl().then((data) => {
      setUri(data.siwfURI);
    });
    // Refresh the component when it is opened again
    setKey((prevKey) => prevKey + 1);
  }, [api]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}>
        <IconButton
          icon="close"
          size={24}
          onPress={onClose}
          accessibilityLabel="Close Frequency Login"
        />
      </View>
      <WebView key={key} source={{ uri }} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 1,
  },
});
