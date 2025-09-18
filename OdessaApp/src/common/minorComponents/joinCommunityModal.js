import React, { useContext } from "react";
import { Modal, View, StyleSheet } from "react-native";
import { LocalStateContext } from "../../state/LocalState";
import JoinCommunityScreen from "./../minorComponents/joinCommunity";
import CloseButton from "../Button/CloseButton";

const JoinCommunityModal = ({ modalVisible, setModalVisible, communities }) => {
  const { activeCommunity } = useContext(LocalStateContext);

  return (
    <Modal
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <CloseButton onPress={() => setModalVisible(false)} />
          <JoinCommunityScreen
            communities={communities}
            setModalVisible={setModalVisible}
          />
        </View>
      </View>
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
    width: "100%", // Use more screen width
    height: "95%",
    backgroundColor: "white",
    // margin: 20,
    // borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default JoinCommunityModal;
