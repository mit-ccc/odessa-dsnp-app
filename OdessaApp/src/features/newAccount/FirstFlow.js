/**
 * First flow the user is presented when the app starts up
 */

import { useRef, useState, useContext, useEffect } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Platform,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import {
  Text,
  TextInput,
  ActivityIndicator,
  Switch,
  Button,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import PagerView from "react-native-pager-view";
import { gql } from "graphql-request";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import { Keyring } from "@polkadot/keyring";
import { blake2AsHex } from "@polkadot/util-crypto";

import Heading from "../../common/Heading";
import InstructionsSection from "../help/components/InstructionsSection";
import { BODY_FONT, PRIMARY_THEME_COLOR } from "../../common/styles/config";
import { Colors, Spacing } from "../../common/styles";
import { LocalStateContext } from "../../state/LocalState";
import VStack from "../../common/Stack/VStack";
import GoBackButton from "../../common/Button/GoBackButton";

import { FrequencyFlow } from "./FrequencyFlow";
import FrequencyIconComponent from "./FrequencyIcon";

// Page constants
const PAGES = {
  WELCOME_PAGE: 0,
  CREATE_ACCOUNT: 1,
  JOIN_COMMUNITIES: 2,
  SAVE_SEED_PHRASE: 3,
  LOGIN_PAGE: 4,
  ACCOUNT_FOUND: 5,
  NO_ACCOUNT_FOUND: 6,
  LOADING_PAGE: 7,
  FREQUENCY_WEBVIEW: 8,
  ODESSA_LOGIN_SIGNUP: 9,
  FREQUENCY_READY: 10,
};

// Polkadot functions (they must be in this module for the view to load properly)
/**
 *  Creates keyring using Polkadot's keyring functionality, which uses Schnorrkel/Ristretto
 *  x25519 ("sr25519") as its key derivation and signing algorithm. The ss58Format is used
 *  to format addresses ––> 90 represents Frequency, the parachain we expect to use for DSNP.
 */
export function createKeyring() {
  const keyring = new Keyring({ type: "sr25519", ss58Format: 90 });
  return keyring;
}

/**
 *
 * Creates a hash of the given public key using Polkadot's Blake2x standard. 265 represents the desired bit length.
 */
export function createHash(publicKey) {
  const hash = blake2AsHex(publicKey, 256);
  return hash;
}

export const LoadingScreen = () => {
  return (
    <View style={styles.loading}>
      <ActivityIndicator
        animating={true}
        size="large"
        color={PRIMARY_THEME_COLOR}
      />
    </View>
  );
};

const CREATE_PERSONA_MUTATION = gql`
  mutation createPersona(
    $pkh: String!
    $name: String!
    $bio: String!
    $msa_id: String
  ) {
    createPersona(pkh: $pkh, name: $name, bio: $bio, msa_id: $msa_id) {
      id
      name
      bio
      pkh
    }
  }
`;

export const JOIN_PUPLIC_COMMUNITY = gql`
  mutation joinPublicCommunity($community_id: Int!) {
    joinPublicCommunity(community_id: $community_id)
  }
`;

const GET_PUBLIC_COMMUNITIES = gql`
  query communities {
    communities(access: "public") {
      id
      name
      description
      members_desc
      behaviors {
        encourage
        discourage
        ban
      }
      flags
      bridge_id
      bridges {
        id
        name
        description
      }
      bridge_ids
    }
  }
`;

const GET_PERSONA_BY_PKH = gql`
  query GetPersonaByPKH($pkh: String!) {
    personas(pkh: $pkh) {
      id
      name
      bio
      communities {
        name
      }
    }
  }
`;

const getFirstFlowAvailableCommunities = async (api) => {
  const response = await api.request(GET_PUBLIC_COMMUNITIES);
  return response.communities;
};

export const JoinCommunityFlow = ({
  pagerRef,
  savePersona,
  activeCommunities,
  allCommunities,
  willJoinCommunity,
  setWillJoinCommunity,
  onNext,
}) => {
  const eligibleCommunities = allCommunities.filter(
    (c) => !activeCommunities.includes(c.id),
  );

  useEffect(() => {
    const temp = {};
    eligibleCommunities.forEach((community) => {
      temp[community.id] = false;
    });
    setWillJoinCommunity(temp);
  }, []);

  const updateJoinDictState = (key, value) => {
    setWillJoinCommunity((prevState) => ({
      ...prevState,
      [key]: value,
    }));
  };

  const setJoin = (communityId) => {
    updateJoinDictState(communityId, !willJoinCommunity[communityId]);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.splash}>
        <View style={[styles.splash, { paddingVertical: 20 }]}>
          <Heading size="md">Join a Community</Heading>
        </View>

        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          {eligibleCommunities.map((community, index) => (
            <View key={index} style={[styles.checkbox]}>
              <View style={{ paddingBottom: 20, paddingHorizontal: 30 }}>
                <Text key={index} variant="bodyLarge" style={styles.cName}>
                  {community.name}
                </Text>
              </View>
              <View>
                <Switch
                  value={willJoinCommunity[community.id]}
                  style={
                    Platform.OS === "android"
                      ? {
                          transform: [{ scaleX: 1.4 }, { scaleY: 1.4 }],
                        }
                      : {}
                  }
                  onValueChange={() => {
                    setJoin(community.id);
                  }}
                />
              </View>
            </View>
          ))}
        </ScrollView>

        {!pagerRef && (
          <TouchableOpacity
            style={styles.buttonWrapper}
            onPress={() => savePersona()}
          >
            <View style={styles.buttonContainer}>
              <Icon name="plus" size={18} color={"white"} />
              <Text style={styles.saveButtonText}>Save</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
      {pagerRef && (
        <Footer
          prevButtonLabel="Prev"
          prevButtonPress={() =>
            pagerRef.current?.setPage(PAGES.CREATE_ACCOUNT)
          }
          nextButtonLabel="Save"
          nextButtonPress={() => onNext && onNext()}
        />
      )}
    </View>
  );
};

export const FirstFlowScreen = ({ route }) => {
  const pagerRef = useRef(null);
  const navigation = useNavigation();
  const { initialPage = 0, msaId } = route?.params || {}; // Default to 0 if no initialPage is provided

  useEffect(() => {
    if (pagerRef.current) {
      pagerRef.current.setPage(initialPage);
    }
  }, [initialPage]);

  const myCommunityIds = [];
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [willJoinCommunity, setWillJoinCommunity] = useState({});
  const [seed, setSeed] = useState("");

  const {
    persona0,
    api,
    triggerPersonaChange,
    setPersonaKeys,
    setApi,
    setHDSeedPhrase,
    setPersona0,
  } = useContext(LocalStateContext);

  const [allCommunities, setAllCommunities] = useState([]);

  useEffect(() => {
    getFirstFlowAvailableCommunities(api).then((resp) => {
      setAllCommunities(resp);
    });
  }, [api]);

  const savePersona = async () => {
    const variables = {
      pkh: persona0.pkh,
      name,
      bio,
      msa_id: msaId,
    };
    if (name.length < 2) {
      alert("Name is too short.");
    }

    await api.request(CREATE_PERSONA_MUTATION, variables);

    allCommunities.forEach((community) => {
      if (willJoinCommunity[community.id]) {
        api.request(JOIN_PUPLIC_COMMUNITY, { community_id: community.id });
      }
    });
    triggerPersonaChange();
  };

  const loadAndSavePersona = (onDone) => {
    /*
        Wrapper to display loading page while saving persona.
        */
    pagerRef.current?.setPage(PAGES.LOADING_PAGE);

    savePersona().then(() => {
      if (onDone) {
        onDone();
      }
    });
  };

  const handleSeedSearch = async (altSeed) => {
    // Perform the GraphQL query to search for the persona by pkh
    try {
      const foundSeed = altSeed || seed; // Use the provided seed or the current state
      // Create a keyring and derive the pkh from the seed phrase
      console.info("seed:", foundSeed);
      if (!foundSeed) {
        throw new Error("Seed phrase is empty.");
      }
      const trimmedSeed = foundSeed.trim();
      const keyring = createKeyring();
      const pair = keyring.createFromUri(`${trimmedSeed}//0`);
      const pkh = createHash(pair.publicKey);
      console.info("pkh:", pkh);
      const personaData = await api.request(GET_PERSONA_BY_PKH, { pkh });
      console.info("personaData:", personaData);

      if (personaData?.personas && personaData.personas.length > 0) {
        setName(personaData.personas[0].name);
        setBio(personaData.personas[0].bio);
      }
      setHDSeedPhrase(trimmedSeed);
      return true;
    } catch (error) {
      console.log("Error searching for persona:", error);
      return false;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <PagerView
        style={styles.pagerView}
        initialPage={initialPage}
        ref={pagerRef}
        scrollEnabled={false}
      >
        {/* page 0 */}
        <View key="welcome_page">
          <View style={styles.splash}>
            <VStack spacing="md">
              <Text
                variant="displaySmall"
                style={{ ...styles.text, padding: Spacing.lg }}
              >
                Welcome to Odessa!
              </Text>
              <Button
                mode="contained"
                icon={(props) => (
                  <FrequencyIconComponent size={128} {...props} />
                )}
                onPress={() =>
                  pagerRef.current?.setPage(PAGES.FREQUENCY_WEBVIEW)
                }
                style={{
                  backgroundColor: Colors.frequencyColor,
                }}
                labelStyle={{
                  color: Colors.defaultText,
                }}
              >
                Sign In with Frequency
              </Button>

              <Button
                mode="contained"
                onPress={() =>
                  pagerRef.current?.setPage(PAGES.ODESSA_LOGIN_SIGNUP)
                }
              >
                Sign In with Odessa
              </Button>
            </VStack>
          </View>
        </View>

        {/* page 1 */}
        <View key="create_account">
          <View style={styles.profile}>
            <PersonaEditingPage {...{ name, setName, bio, setBio }} />
          </View>
          <Footer
            prevButtonLabel="Prev"
            prevButtonPress={() =>
              pagerRef.current?.setPage(PAGES.WELCOME_PAGE)
            }
            nextButtonLabel="Next"
            nextButtonPress={
              name.trim()
                ? () => pagerRef.current?.setPage(PAGES.JOIN_COMMUNITIES)
                : false
            }
          />
        </View>

        {/* page 2 */}
        <View key="join_communities">
          <JoinCommunityFlow
            pagerRef={pagerRef}
            savePersona={savePersona}
            activeCommunities={myCommunityIds}
            allCommunities={allCommunities}
            willJoinCommunity={willJoinCommunity}
            setWillJoinCommunity={setWillJoinCommunity}
            onNext={() => {
              if (msaId) {
                // skip the save seed phrase step since login in via SIWF
                pagerRef.current?.setPage(PAGES.LOADING_PAGE);
                loadAndSavePersona(() => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: "Navigation Container" }],
                  });
                });
              } else {
                pagerRef.current?.setPage(PAGES.SAVE_SEED_PHRASE);
              }
            }}
          />
        </View>

        {/* page 3 */}
        <View key="save_seed_phrase">
          <View style={styles.profile}>
            <InstructionsSection />
          </View>
          <Footer
            prevButtonLabel="Prev"
            prevButtonPress={() =>
              pagerRef.current?.setPage(PAGES.JOIN_COMMUNITIES)
            }
            nextButtonLabel="Next"
            nextButtonPress={() => loadAndSavePersona()}
          />
        </View>

        {/* page 4 */}
        <View key="login_page">
          <View style={styles.profile}>
            <SeedphraseEnteringPage {...{ seed, setSeed }} />
          </View>
          <Footer
            prevButtonLabel="Prev"
            prevButtonPress={() =>
              pagerRef.current?.setPage(PAGES.WELCOME_PAGE)
            }
            nextButtonLabel="Next"
            nextButtonPress={() => {
              const success = handleSeedSearch();
              if (success) {
                pagerRef.current?.setPage(PAGES.ACCOUNT_FOUND);
              } else {
                pagerRef.current?.setPage(PAGES.NO_ACCOUNT_FOUND);
              }
            }}
          />
        </View>

        {/* page 5 */}
        <View key="account_found">
          <View style={styles.profile}>
            <Text variant="displaySmall" style={styles.text}>
              {`We found you ${name}!`}
            </Text>
            <LoadingScreen />
          </View>
        </View>

        {/* page 6 */}
        <View key="no_account_found">
          <View style={styles.profile}>
            <Text variant="displaySmall" style={styles.text}>
              We were unable to find you. Please try again with the correct seed
              phrase.
            </Text>
          </View>
          <Footer
            prevButtonLabel="Create Account"
            prevButtonPress={() =>
              pagerRef.current?.setPage(PAGES.CREATE_ACCOUNT)
            }
            nextButtonLabel="Try Again"
            nextButtonPress={() => pagerRef.current?.setPage(PAGES.LOGIN_PAGE)}
          />
        </View>

        {/* page 7 */}
        <View key="loading_page">
          <View style={styles.profile}>
            <LoadingScreen />
          </View>
        </View>

        {/* page 8 */}
        <View key="frequency_webview">
          <FrequencyFlow
            onClose={() => pagerRef.current?.setPage(PAGES.WELCOME_PAGE)}
          />
        </View>

        {/* page 9 */}
        <View key="odessa_login_signup">
          <View
            styles={{
              padding: 20,
            }}
          >
            <GoBackButton
              onPress={() => pagerRef.current?.setPage(PAGES.WELCOME_PAGE)}
            />
          </View>
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <VStack spacing="md">
              <Text
                variant="displaySmall"
                style={{
                  ...styles.text,
                  textAlign: "center",
                  margin: Spacing.md,
                }}
              >
                Sign up or log in to Odessa
              </Text>
              <Button
                mode="contained"
                onPress={() => pagerRef.current?.setPage(PAGES.CREATE_ACCOUNT)}
              >
                Sign Up for Odessa
              </Button>
              <Button
                mode="outlined"
                onPress={() => pagerRef.current?.setPage(PAGES.LOGIN_PAGE)}
              >
                Log In to Odessa
              </Button>
            </VStack>
          </View>
        </View>

        {/* page 10 */}
        <View key="frequency_login_page">
          <View style={styles.profile}>
            <FrequencyReadyPage
              onReady={() => {
                setSeed(msaId);
                const success = handleSeedSearch(msaId);
                if (success) {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: "Navigation Container" }],
                  });
                } else {
                  pagerRef.current?.setPage(PAGES.NO_ACCOUNT_FOUND);
                }
              }}
            />
          </View>
        </View>
      </PagerView>
    </SafeAreaView>
  );
};

const PersonaEditingPage = ({ name, setName, bio, setBio }) => {
  const styles = {
    view: {
      marginLeft: Spacing.sm,
      marginRight: Spacing.sm,
    },
    text: {
      margin: Spacing.sm,
      color: Colors.defaultText,
    },
  };

  return (
    <ScrollView style={styles.view}>
      <Text variant="displaySmall" style={styles.text}>
        Profile Setup
      </Text>
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
    </ScrollView>
  );
};

const SeedphraseEnteringPage = ({ seed, setSeed }) => {
  const styles = {
    view: {
      marginLeft: Spacing.sm,
      marginRight: Spacing.sm,
    },
    text: {
      margin: Spacing.sm,
      color: Colors.defaultText,
    },
  };

  return (
    <ScrollView style={styles.view}>
      <Text variant="displaySmall" style={styles.text}>
        Please Enter Your Seed Phrase
      </Text>
      <TextInput
        label="Seed Phrase"
        mode="outlined"
        value={seed}
        onChangeText={setSeed}
        textColor={Colors.defaultText}
      />
    </ScrollView>
  );
};

const FrequencyReadyPage = ({ onReady }) => {
  return (
    <View style={styles.profile}>
      <VStack spacing="lg">
        <Text
          variant="displaySmall"
          style={{ ...styles.text, textAlign: "center" }}
        >
          You are Frequency Enabled!
        </Text>
        <Button mode="contained" onPress={onReady}>
          Continue to Odessa
        </Button>
      </VStack>
    </View>
  );
};

const Footer = ({
  prevButtonLabel = false,
  prevButtonPress = false,
  nextButtonLabel = false,
  nextButtonPress = false,
}) => {
  // if prevButtonPress or nextButtonPress are falsy then we show a
  // disabled button
  const showPrevButton = Boolean(prevButtonLabel);
  const showNextButton = Boolean(nextButtonLabel);

  return (
    <View
      style={{
        ...styles.footer,
        justifyContent: prevButtonLabel ? "space-between" : "flex-end",
      }}
    >
      {showPrevButton && (
        <Pressable disabled={!prevButtonPress} onPress={prevButtonPress}>
          <Text
            style={
              prevButtonPress ? styles.buttonText : styles.disabledButtonText
            }
          >
            {prevButtonLabel}
          </Text>
        </Pressable>
      )}

      <Pressable disabled={!nextButtonPress} onPress={nextButtonPress}>
        <Text
          style={
            nextButtonPress ? styles.buttonText : styles.disabledButtonText
          }
        >
          {nextButtonLabel}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // width: "90%",
  },
  checkbox: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 30,
  },
  profile: {
    flex: 1,
    margin: 20,
  },
  text: {
    color: Colors.defaultText,
  },
  pagerView: {
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    height: 50,
    backgroundColor: PRIMARY_THEME_COLOR,
    opacity: 0.6,
    alignItems: "center",
    paddingHorizontal: 30,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  disabledButtonText: {
    color: "#aaa",
    fontWeight: "regular",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center", // Align items vertically in the container
    paddingBottom: 3,
  },
  saveButtonText: {
    marginLeft: 10, // Add some space between the icon and the text
    fontSize: 18, // Set font size
    fontFamily: BODY_FONT, // Set the font family
    color: "white", // Set the text color
    // Vertical alignment is handled by alignItems in the container
  },
  buttonWrapper: {
    backgroundColor: PRIMARY_THEME_COLOR, // Black background for the button
    width: 200, // Width of the circle
    height: 30, // Height of the circle
    borderRadius: 30 / 2, // Half of width/height to make it a circle
    justifyContent: "center", // Center the '+' icon vertically
    alignItems: "center", // Center the '+' icon horizontally
    marginBottom: 50,
  },
  scrollViewContent: {
    justifyContent: "center",
    // padding: 20,
    paddingHorizontal: 0,
  },
  cName: {
    color: "black",
    fontFamily: BODY_FONT,
    textAlign: "right",
  },
});
