import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import {
  PRIMARY_THEME_COLOR,
  SECONDARY_THEME_COLOR,
} from "../../../common/styles/config";
import { staticEndpoint } from "../../../api/apiClient";

const FAQSection = () => {
  const [expandedFaqId, setExpandedFaqId] = useState(null);
  const [questionText, setQuestionText] = useState("");
  const [staticFAQs, setStaticFAQs] = useState(null);

  const handleFaqPress = (id) => {
    setExpandedFaqId(expandedFaqId === id ? null : id);
  };

  const handleQuestionChange = (text) => {
    setQuestionText(text);
  };

  const handleSubmitQuestion = () => {
    if (questionText.trim()) {
      // Alert.alert("We will work on getting you the answer to this");
      Alert.alert("Submission not supported yet.");
      setQuestionText("");
    }
  };

  useEffect(() => {
    fetch(staticEndpoint + "/faq.json")
      .then((response) => response.json())
      .then((responseData) => {
        setStaticFAQs(responseData);
      });
  }, []);

  return (
    <View style={styles.faqSectionContainer}>
      {!staticFAQs && (
        <ActivityIndicator
          size="large"
          style={{ transform: [{ scaleX: 1 }, { scaleY: 1 }] }}
          color={PRIMARY_THEME_COLOR}
        />
      )}

      {staticFAQs &&
        staticFAQs.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.faqItem}
            onPress={() => handleFaqPress(index)}
          >
            <Text style={styles.faqQuestion}>{item.question}</Text>
            {expandedFaqId === index && (
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            )}
            <Icon
              name={expandedFaqId === index ? "chevron-up" : "chevron-down"}
              size={14}
              style={styles.chevron}
              color="gray"
            />
          </TouchableOpacity>
        ))}

      {/* <View style={styles.questionSubmission}>
        <TextInput 
          placeholder="Type your question here" 
          placeholderTextColor='gray'
          style={styles.input} 
          value={questionText}
          onChangeText={handleQuestionChange}
        />
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmitQuestion}
        >
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </View> */}
    </View>
  );
};

const styles = StyleSheet.create({
  faqSectionContainer: {
    paddingTop: 15,
    paddingBottom: 20,
  },
  faqItem: {
    marginBottom: 10,
  },
  faqQuestion: {
    color: "gray",
    fontWeight: "bold",
  },
  faqAnswer: {
    paddingLeft: 10,
    color: "gray",
  },
  questionSubmission: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "gray",
    padding: 10,
    color: "gray",
  },
  submitButton: {
    backgroundColor: PRIMARY_THEME_COLOR,
    padding: 10,
    marginLeft: 10,
  },
  submitButtonText: {
    color: SECONDARY_THEME_COLOR,
    fontWeight: "bold",
  },
  chevron: {
    position: "absolute",
    right: 10,
    top: 10,
  },
});

export default FAQSection;
