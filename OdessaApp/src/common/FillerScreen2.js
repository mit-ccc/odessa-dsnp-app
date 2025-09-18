import { Text, View, ScrollView } from "react-native";

export const FillerScreen2 = () => {
  const styles = {
    margin: 12,
    fontSize: 24,
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <Text style={styles}>This is version: -1</Text>
    </ScrollView>
  );
};
