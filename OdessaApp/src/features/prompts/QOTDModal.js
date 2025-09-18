import React, { useState, useRef, useContext } from "react";
import { Modal, View, StyleSheet, KeyboardAvoidingView } from "react-native";
import { Colors, Spacing, Typography } from "../../common/styles";
import { useEnabledBridgedRound } from "../../common/Hooks/communityFlags";
import {
  PRIMARY_THEME_COLOR,
  SECONDARY_THEME_COLOR,
} from "../../common/styles/config";
import PagerView from "react-native-pager-view";
import PromptFirstPage from "./InitPage";
import SharedPromptPolicyPage from "./SharedPromptPolicy";
import { LocalStateContext } from "../../state/LocalState";
import { useCommunities } from "../../common/Hooks/useCommunities";
import { PromptsContext } from "../../state/PromptsState";
import { KeyboardAwareScrollView } from "@codler/react-native-keyboard-aware-scroll-view";

const QOTDModal = ({ navigation }) => {
  const { userCanCreatePrompt, modalVisible, setModalVisible } =
    useContext(PromptsContext);

  const [newPromptText, setNewPromptText] = useState("");

  const [activeIndex, setActiveIndex] = useState(0);
  const [canClickNext, setCanClickNext] = useState(true);
  const { activeCommunity } = useContext(LocalStateContext);
  const [selectedCommunity, setSelectedCommunity] = useState({});

  const pagerRef = useRef(null);
  const onPageSelected = (e) => {
    setCanClickNext(false);
    setActiveIndex(e.nativeEvent.position);
  };

  const goBack = () => {
    if (activeIndex == 0) {
      return navigation.goBack();
    }
    return pagerRef.current?.setPage(activeIndex - 1);
  };

  // Frontend Flow Tools
  const onNextButtonPress = () => {
    // if (activeIndex == 6) {
    //   return goToNewCommunity();
    // }
    return goToNextScreen();
  };

  // Frontend Flow Tools
  const goToNextScreen = () => {
    // if (activeIndex == 5) {
    //   // hide buttons
    //   setClickedCreate(true);
    //   postNewCommunity();
    // }
    console.log("activeIndex", activeIndex);
    pagerRef.current?.setPage(activeIndex + 1);
  };

  const onCloseButtonPress = () => {
    setSelectedCommunity(null);
    setNewPromptText("");
    setModalVisible(false);
  };

  return (
    <Modal
      visible={modalVisible}
      onRequestClose={onCloseButtonPress}
      transparent={true}
      animationType="slide"
    >
      <KeyboardAwareScrollView contentContainerStyle={styles.centeredView}>
        <View style={styles.modalView}>
          <PagerView
            initialPage={0}
            onPageSelected={onPageSelected}
            ref={pagerRef}
            scrollEnabled={false}
            style={[{ width: "100%", height: "90%" }]}
          >
            <View key="0">
              <PromptFirstPage
                selfIndex={0}
                newPromptText={newPromptText}
                setNewPromptText={setNewPromptText}
                onNextButtonPress={onNextButtonPress}
                onCloseButtonPress={onCloseButtonPress}
                activeCommunity={activeCommunity}
                selectedCommunity={selectedCommunity}
                setSelectedCommunity={setSelectedCommunity}
              />
            </View>
            <View key="1">
              <SharedPromptPolicyPage
                selfIndex={1}
                newPromptText={newPromptText}
                setNewPromptText={setNewPromptText}
                onNextButtonPress={onNextButtonPress}
                onCloseButtonPress={onCloseButtonPress}
                selectedCommunities={[activeCommunity, selectedCommunity]}
                onGoBackButtonPress={goBack}
              />
            </View>
          </PagerView>
        </View>
      </KeyboardAwareScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
  },
  modalView: {
    width: "90%", // Use more screen width
    margin: Spacing.sm,
    backgroundColor: "white",
    borderRadius: 0,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default QOTDModal;
