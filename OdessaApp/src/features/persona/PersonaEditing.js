/* Persona Editing stub. */

import { useState, useContext } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { TextInput, Button, Chip, List, Text } from "react-native-paper";
import { LocalStateContext } from "../../state/LocalState";
import { UPDATE_PERSONA_MUTATION } from "./../../api/mutations";
import Clipboard from "@react-native-community/clipboard";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";

import UploadImage from "./UploadImage";

import { LoadingScreen } from "../newAccount/FirstFlow";
import VStack from "../../common/Stack/VStack";
import { Colors, Spacing } from "../../common/styles";

export const PersonaEditingScreen = ({ route, navigation }) => {
  const {
    params: { persona },
  } = route;
  const styles = {
    view: {
      marginLeft: Spacing.sm,
      marginRight: Spacing.sm,
      marginBottom: 50,
    },
    text: {
      margin: Spacing.sm,
      color: Colors.defaultText,
    },
    container: {
      paddingTop: Spacing.lg,
      alignItems: "center",
      justifyContent: "center",
    },
    chip: {
      marginTop: Spacing.sm,
      alignSelf: "center",
    },
    idText: {
      color: Colors.defaultText,
    },
  };

  const { api, triggerPersonaChange, setHDSeedPhrase, getNewSeedPhrase } =
    useContext(LocalStateContext);
  const [name, setName] = useState(persona.name);
  const [bio, setBio] = useState(persona.bio);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const onPress = async () => {
    const variables = {
      pkh: persona.pkh,
      name: name,
      bio: bio,
    };

    api.request(UPDATE_PERSONA_MUTATION, variables).then((r) => {
      // since the person might have changed, we trigger the
      // personaChange event to force a re-query in other
      // components such as the AppDrawer.
      console.log("persona", r);
      triggerPersonaChange();
      navigation.goBack();
    });
  };

  const copyPkhToClipboard = () => {
    Clipboard.setString(persona.pkh);
  };

  const logOut = async () => {
    setIsLoading(true); // Set loading to true before logout process starts
    try {
      setHDSeedPhrase(getNewSeedPhrase());
      // Add any additional logout logic here
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isLoading) {
    return console.log("Loading..."), (<LoadingScreen />);
  }

  return (
    <ScrollView style={styles.view}>
      <VStack spacing="md">
        <View style={styles.container}>
          <VStack spacing="sm">
            <UploadImage persona={persona} />
            {persona.msa_handle && (
              <>
                <Chip icon="check-circle" style={styles.chip}>
                  Frequency Enabled
                </Chip>
                <Text
                  style={{
                    ...styles.text,
                    textAlign: "center",
                    color: Colors.darkGray,
                  }}
                >
                  @{persona.msa_handle}
                </Text>
              </>
            )}
          </VStack>
        </View>

        <TextInput
          label="Name"
          mode="outlined"
          value={name}
          onChangeText={(text) => setName(text)}
          textColor={Colors.defaultText}
        />
        <TextInput
          label="Bio"
          mode="outlined"
          value={bio}
          onChangeText={(text) => setBio(text)}
          multiline
          textColor={Colors.defaultText}
        />
        <List.Accordion
          title="Advanced"
          titleStyle={{ color: Colors.defaultText }}
          left={(props) => <List.Icon {...props} icon="cog" />}
          expanded={expanded}
          onPress={() => setExpanded(!expanded)}
        >
          <List.Item
            title={`id: ${persona.id}`}
            titleStyle={styles.idText}
            right={() => null} // needed to keep the right alignment
          />
          <List.Item
            title={`pkh: ${persona?.pkh}...`}
            titleStyle={styles.idText}
            right={() => (
              <TouchableOpacity onPress={copyPkhToClipboard}>
                <Icon name="content-copy" size={16} color="gray" />
              </TouchableOpacity>
            )}
          />
        </List.Accordion>

        {(persona.name != name || persona.bio != bio) && (
          <Button icon="content-save" mode="contained" onPress={onPress}>
            Save Name & Bio
          </Button>
        )}
        <Button mode="contained" onPress={logOut}>
          Log Out
        </Button>
      </VStack>
    </ScrollView>
  );
};
