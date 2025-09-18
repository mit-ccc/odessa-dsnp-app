import React, { useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import FAQSection from "./components/FAQSection";
import InstructionsSection from "./components/InstructionsSection"; // Import the new component
import Heading from "../../common/Heading";
import { Spacing } from "../../common/styles";

const HelpScreen = () => {
  const [isFaqVisible, setIsFaqVisible] = useState(false);

  const toggleFaqVisibility = () => {
    setIsFaqVisible(!isFaqVisible);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Heading size="lg" noUnderline>
          Are You Confused?
        </Heading>
        <Text style={{ color: "gray", marginBottom: 15 }}>We are too.</Text>
      </View>

      <InstructionsSection />

      <TouchableOpacity style={styles.faqHeader} onPress={toggleFaqVisibility}>
        <Heading size="md">FAQs</Heading>
        <Icon
          name={isFaqVisible ? "chevron-up" : "chevron-down"}
          size={20}
          style={styles.chevronHeader}
        />
      </TouchableOpacity>

      {isFaqVisible && <FAQSection />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.sm,
  },
  header: {
    marginVertical: Spacing.md,
    alignItems: "center",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.md,
  },
  chevronHeader: {
    marginLeft: 10,
    color: "black",
  },
});

export default HelpScreen;
