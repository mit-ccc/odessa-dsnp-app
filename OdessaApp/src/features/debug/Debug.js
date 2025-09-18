import { useEffect, useState, useContext } from "react";
import {
  View,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Text, useTheme, Button, TextInput } from "react-native-paper";
import { generateMnemonic } from "ethereum-cryptography/bip39/index.js";
import { wordlist } from "ethereum-cryptography/bip39/wordlists/english.js";
import prompt from "react-native-prompt-android";
import Clipboard from "@react-native-community/clipboard";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import { gql } from "graphql-request";

import { LocalStateContext } from "../../state/LocalState";
import { gqlEndpoint } from "../../api/apiClient";

import { TrusteeActions } from "./../communityAdmin/components/trustee";
import { OwnerActions } from "./../communityAdmin/components/owner";
import { ModeratorActions } from "../communityAdmin/components/moderator";
import {
  BODY_FONT_BOLD,
  PRIMARY_THEME_COLOR,
  SECONDARY_THEME_COLOR,
} from "../../common/styles/config";
import SelectDropdown from "react-native-select-dropdown";

export const DebugScreen = ({ navigation }) => {
  const [allowedToSee, setIsAllowedToSee] = useState(false);
  const [checkedAlready, setCheckedAlready] = useState(false);

  const theme = useTheme();

  const pkeys = personaKeys ? personaKeys.info : [];
  const [backendUp, setBackendUp] = useState("?");
  const [allCommunities, setAllCommunities] = useState([]);

  const testingSeedPhrase1 =
    "mesh pioneer noble decorate space jacket arrive resource true curtain neglect gate brave liquid solar toy rule ten album way target dumb social camera";
  const testingSeedPhrase2 =
    "page cloud seed voice acid glare spoon diamond omit hungry utility provide middle skill enable refuse six lion fortune solve walnut sing muffin subject";

  const {
    HDSeed,
    setHDSeedPhrase,
    debugTime,
    setDebugTime,
    personaKeys,
    persona0,
    api,
    personaInit,
    activeCommunity,
  } = useContext(LocalStateContext);

  const [selectedCommunity, setSelectedCommunity] = useState(activeCommunity);

  if (!allowedToSee && !checkedAlready) {
    checkAccess(api, navigation, setIsAllowedToSee, setCheckedAlready);
    setCheckedAlready(true);
  }

  // useEffect(() => {
  //   // sets the current time every 2s for all eternity
  //   const loop = setInterval(() => {
  //     setDebugTime(Math.floor(Date.now() / 1000));
  //   }, 2000);

  //   return () => clearInterval(loop);
  // }, []);

  // check to see if the backend is up every 10s
  useEffect(() => {
    const loop = setInterval(() => {
      api
        .request("{ ping }")
        .then((resp) => {
          setBackendUp("yes");
        })
        .catch(() => {
          setBackendUp("no");
        });
    }, 10000);

    return () => clearInterval(loop);
  }, [api]);

  useEffect(() => {
    api.request("{ communities(bridges: true) { id name } }").then((resp) => {
      setAllCommunities(resp.communities);
    });
  }, [api]);

  if (!allowedToSee) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Text style={[styles.noResponsesText, { marginTop: 100 }]}>
          Forbidden.
        </Text>
      </ScrollView>
    );
  }

  const copyPkhToClipboard = () => {
    Clipboard.setString(persona0.pkh);
  };

  const CommunityDropdown = ({}) => {
    return (
      <View style={{ width: "100%", paddingLeft: 8 }}>
        <SelectDropdown
          data={allCommunities}
          search
          defaultButtonText={"Community"}
          dropdownIconPosition={"right"}
          buttonStyle={styles.dropdown1BtnStyle}
          buttonTextStyle={styles.dropdown1BtnTxtStyle}
          onSelect={(selectedItem, index) => {
            if (selectedItem != selectedCommunity) {
              setSelectedCommunity(selectedItem);
            }
          }}
          rowTextForSelection={(item, index) => {
            return item.name;
          }}
          renderDropdownIcon={(isOpened) => {
            return (
              <Icon
                name={isOpened ? "chevron-up" : "chevron-down"}
                size={22}
                color={PRIMARY_THEME_COLOR}
              />
            );
          }}
        />
      </View>
    );
  };

  const permissions = ["__all__"];

  return (
    <ScrollView
      stickyHeaderIndices={[3]}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={{ backgroundColor: theme.colors.background, padding: 5 }}>
        <Text variant="displayLarge" style={styles.text}>
          Debug
        </Text>
        {/* <Text variant="bodyLarge" style={styles.text}>time: {debugTime}</Text> */}
        <Text variant="bodyLarge" style={styles.text}>
          backend up: {backendUp}
        </Text>
        <Text variant="bodyLarge" style={styles.text}>
          NODE_ENV: {process.env.NODE_ENV}
        </Text>
        <Text variant="bodyLarge" style={styles.text}>
          gqlEndpoint: {gqlEndpoint}
        </Text>
        <Text variant="bodyLarge" style={styles.text}>
          seed phrase: {HDSeed.phrase}
        </Text>
        <Text variant="bodyLarge" style={styles.text}>
          persona init: {personaInit ? "true" : "false"}
        </Text>
        <Button
          mode="contained"
          style={styles.button}
          onPress={() => setHDSeedPhrase(testingSeedPhrase1)}
        >
          log in as test user 1
        </Button>
        <Button
          mode="contained"
          style={styles.button}
          onPress={() => setHDSeedPhrase(testingSeedPhrase2)}
        >
          log in as test user 2
        </Button>
        <Button
          mode="contained"
          style={styles.button}
          onPress={() => setHDSeedPhrase(generateMnemonic(wordlist, 256))}
        >
          log in as new user
        </Button>
      </View>

      <View style={{ backgroundColor: theme.colors.background, padding: 5 }}>
        <Text variant="headlineMedium" style={styles.text}>
          Persona0
        </Text>
        <TouchableOpacity
          onPress={copyPkhToClipboard}
          style={{ flexDirection: "row" }}
        >
          <Icon name="content-copy" size={24} color="black" />
          <Text variant="bodyLarge" style={styles.text}>
            pkh: {persona0.pkh.slice(0, 16)}...
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          backgroundColor: theme.colors.background,
          padding: 5,
          paddingBottom: 20,
        }}
      >
        <Text variant="headlineMedium" style={styles.text}>
          Select Community
        </Text>
        <CommunityDropdown></CommunityDropdown>
      </View>

      <View
        style={{
          paddingHorizontal: 25,
          backgroundColor: "grey",
          marginBottom: 30,
        }}
      >
        <Text
          variant="headlineMedium"
          style={[
            styles.text,
            {
              paddingVertical: 20,
              fontFamily: BODY_FONT_BOLD,
              color: SECONDARY_THEME_COLOR,
            },
          ]}
        >
          *** {selectedCommunity?.name} ***
        </Text>
      </View>

      {allCommunities.map((community, index) => (
        <View key={"gv" + index}>
          {selectedCommunity && selectedCommunity.id == community.id && (
            <View
              key={"v" + index}
              style={{
                paddingHorizontal: 0,
                backgroundColor: index % 2 == 0 ? "#ded9ed" : "white",
              }}
            >
              {/* <Text variant="headlineMedium"
                        style={[styles.text, {paddingTop: 50, fontFamily: BODY_FONT_BOLD, fontWeight: 'bold'}]}>
                          *** {community.name} ***
                    </Text> */}
              <ModeratorActions
                activeCommunity={community}
                permissions={permissions}
                navigation={navigation}
              />
              <OwnerActions
                activeCommunity={community}
                permissions={permissions}
                backgroundColor={index % 2 == 0 ? "#ded9ed" : "white"}
              />
              <TrusteeActions
                activeCommunity={community}
                permissions={permissions}
                backgroundColor={index % 2 == 0 ? "#ded9ed" : "white"}
              />
              <View style={{ marginBottom: 50 }}></View>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
};

export const checkAccess = (
  api,
  navigation,
  setIsAllowedToSee,
  setCheckedAlready,
) => {
  onCheckPermission = () => {
    prompt(
      "Enter password",
      "Enter your password to access Debug tab",
      [
        {
          text: "Cancel",
          onPress: () => {
            setIsAllowedToSee(false);
            navigation.jumpTo("Daily");
          },
          style: "cancel",
        },
        {
          text: "OK",
          onPress: (password) => {
            api.request("{ debugPassword }").then((resp) => {
              if (password == resp.debugPassword) {
                setIsAllowedToSee(true);
              } else {
                setIsAllowedToSee(false);
                navigation.jumpTo("Daily");
              }
            });
          },
        },
      ],
      {
        type: "secure-text",
        cancelable: false,
      },
    );
  };

  onCheckPermission();
};

const styles = {
  text: {
    margin: 4,
    color: "#000",
  },
  button: {
    margin: 8,
  },
  noResponsesText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "black",
    textAlign: "center",
    marginBottom: 20,
  },
  dropdown1BtnStyle: {
    width: "80%",
    height: 50,
    backgroundColor: SECONDARY_THEME_COLOR,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY_THEME_COLOR,
  },
  dropdown1BtnTxtStyle: { color: PRIMARY_THEME_COLOR, textAlign: "left" },
};
