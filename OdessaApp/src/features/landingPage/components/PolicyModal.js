import React, { useContext } from "react";
import { Modal, View, StyleSheet, Text } from "react-native";
import { LocalStateContext } from "../../../state/LocalState";
import CloseButton from "../../../common/Button/CloseButton";
import { CommunitySetBehaviorsPage } from "../../globalAction/createCommunity";
import { useEnabledCommunityBehaviors } from "../../../common/Hooks/communityFlags";
import { ScrollView } from "react-native-gesture-handler";
import VStack from "../../../common/Stack/VStack";
import CommunityAvatar from "../../../common/CommunityAvatar";
import Heading from "../../../common/Heading";
import { Spacing, Typography } from "../../../common/styles";

const PolicyModal = ({ community, modalVisible, setModalVisible }) => {
  return (
    <Modal
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={{ alignSelf: "flex-end", marginRight: 10 }}>
            <CloseButton onPress={() => setModalVisible(false)} />
          </View>
          <ScrollView style={styles.container}>
            <VStack spacing="sm">
              <View style={styles.header}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <CommunityAvatar size="sm" community={community} />
                  <Heading size="sm" noUnderline center>
                    {community?.name}
                  </Heading>
                </View>
                <Text style={styles.description}>
                  Purpose ~ {community?.description}
                </Text>
                <Text>{}</Text>
                <Text style={styles.description}>
                  Members ~ {community?.members_desc}
                </Text>
              </View>
              <View style={styles.sectionTitle}>
                <Heading size="sm">Code of Conduct</Heading>
              </View>
              <CommunitySetBehaviorsPage
                mode={"viewing"}
                readOnly={true}
                community={community}
                name={community?.name}
                fullBleed
              />
            </VStack>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    width: "100%",
  },
  header: {
    flexDirection: "column",
    alignItems: "center",
  },
  description: {
    ...Typography.bodyDark,
    width: "80%",
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    paddingTop: Spacing.lg,
  },
  bufferSection: {
    marginBottom: Spacing.lg,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
  },
  modalView: {
    width: "100%", // Use more screen width
    height: "85%",
    backgroundColor: "rgba(242, 242, 242, 1)",
    paddingVertical: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderRadius: 18,
  },
});

export default PolicyModal;
