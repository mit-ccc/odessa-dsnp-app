import * as React from "react";

import {
  Text,
  View,
  ScrollView,
  TextInput,
  Button,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";

export const RefreshButton = ({ RefreshCallback }) => {
  // Destructure the RefreshCallback from props
  return (
    <TouchableOpacity onPress={RefreshCallback} style={styles.refreshButton}>
      <Text style={styles.refreshButtonText}>Refresh</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  refreshButton: {
    backgroundColor: "#F0FFF0", // Example background color
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: "center", // Align items vertically in the center
  },
  refreshButtonText: {
    color: "#808080", //
  },
});
