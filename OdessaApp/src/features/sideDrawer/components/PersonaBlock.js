import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { BODY_FONT_BOLD } from "../../../common/styles/config";
import ProfilePicture from "../../../common/minorComponents/ProfilePicture";

const PersonaBlock = ({ persona, navigation }) => {
  // the shape of persona looks like:
  //
  // {
  //   id
  //   name
  //   bio
  //   pkh
  //   image_id
  //   communities: {
  //     id
  //     name
  //   }
  // }
  const handleEdit = () => {
    navigation.navigate("PersonaEditing", {
      persona: persona,
    });
  };

  const { communities } = persona;
  const communitiesString = (communities || []).map((c) => c.name).join(", ");

  return (
    <TouchableOpacity onPress={handleEdit}>
      <View style={styles.headerContainer}>
        <View style={styles.profilePictureContainer}>
          <ProfilePicture user={persona} radius={15} borderCol={"black"} />
        </View>
        <Text
          style={styles.simplePersonaName}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {persona.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  simplePersonaName: {
    flex: 1, // Allowing the text to adjust its width within the container
    fontSize: 16,
    fontFamily: BODY_FONT_BOLD,
    marginHorizontal: 10, // Add some margin to prevent text from touching the button
    color: "black",
  },
});

export default PersonaBlock;
