import PagerView from "react-native-pager-view";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { BODY_FONT, PRIMARY_THEME_COLOR } from "../../common/styles/config";
import { TextInput } from "react-native-paper";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import { personaCreateCommunity } from "../../api/wrappers";
import { LocalStateContext } from "../../state/LocalState";
import { Spacing } from "../../common/styles";
import { HeaderTitle } from "../../navigation/NavContainer";

export const CreateCommunityPage = ({ navigation }) => {
  const { api, persona0 } = useContext(LocalStateContext);
  const activePersona = persona0;

  // Community Data
  const [name, setName] = useState("");
  const [mission, setMission] = useState("");
  const [membersDesc, setMembersDesc] = useState("");
  const [metadata, setMetadata] = useState({});
  const [newCommId, setNewCommId] = useState(undefined);

  // Frontend Flow Tools
  const pagerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [nextButtonText, setNextButtonText] = useState("NEXT");
  const [clickedCreate, setClickedCreate] = useState(false);
  const sideNav = navigation.getParent().getParent();

  const [canClickNext, setCanClickNext] = useState(true);

  // Frontend Flow Tools
  const onPageSelected = (e) => {
    setCanClickNext(false);
    setActiveIndex(e.nativeEvent.position);
  };

  // Frontend Flow Tools
  const goBack = () => {
    if (activeIndex == 0) {
      return navigation.goBack();
    }
    return pagerRef.current?.setPage(activeIndex - 1);
  };

  // Frontend Flow Tools
  const onNextButtonPress = () => {
    if (activeIndex == 6) {
      return goToNewCommunity();
    }
    return goToNextScreen();
  };

  // Frontend Flow Tools
  const goToNextScreen = () => {
    if (activeIndex == 5) {
      // hide buttons
      setClickedCreate(true);
      postNewCommunity();
    }
    pagerRef.current?.setPage(activeIndex + 1);
  };

  const postNewCommunity = async () => {
    const response = await personaCreateCommunity(
      api,
      activePersona.pkh,
      name,
      mission,
      membersDesc,
      metadata,
    );
    const newCommunityId = response.personaCreateCommunity;
    console.log("newCommunityId", newCommunityId);
    setNewCommId(newCommunityId);
  };

  // Frontend Flow Tools
  const goToNewCommunity = () => {
    pagerRef.current?.setPage(0);
    navigation.goBack();
    navigation.goBack();
    navigation.navigate("Daily");
    // this assumes sucess!!
    // setActiveCommunity({name: name, id: newCommId, description: mission});
    sideNav.setOptions({
      headerLeft: undefined,
      headerTitle: () => <HeaderTitle />,
    });
  };

  // Frontend Flow Tools
  const getPageRef = (index) => {
    // FIXME(bcsaldias): this is the hack-iest hack in Odessa. I'm sorry.
    // This function is sensitive to most changes.
    const pagerView = pagerRef.current.pagerView;
    const childrenRef = pagerView._children[index]._children[0];
    const instanceHandler = childrenRef._internalFiberInstanceHandleDEV;
    return instanceHandler.memoizedProps.children;
  };

  // Frontend Flow Tools
  useEffect(() => {
    // const props = getPageRef(activeIndex).props;
    // FIXME(bcsaldias): the above hack breaks the app in prod.
    setNextButtonText("NEXT");

    if (activeIndex > 5 || clickedCreate) {
      sideNav.setOptions({
        headerLeft: null,
      });
    } else {
      sideNav.setOptions({
        headerLeft: () => (
          <GoBackButton handleGoBack={() => goBack(activeIndex)} />
        ),
        headerTitle: () => <View></View>,
      });
    }
  }, [activeIndex, clickedCreate]);

  return (
    <View style={{ flex: 1 }}>
      <PagerView
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={onPageSelected}
        ref={pagerRef}
        scrollEnabled={false}
      >
        <View key="0">
          <CommunitySetUpPage
            {...{
              name,
              setName,
              mission,
              setMission,
              membersDesc,
              setMembersDesc,
              activeIndex,
              setCanClickNext,
            }}
            nextButtonText={"NEXT"}
            selfIndex={0}
          />
        </View>
        <View key="1">
          <CommunityInformationPage
            {...{ name, mission, activeIndex, setCanClickNext }}
            title={"Shaping " + name}
            info={`Next, specify the desired behaviors for your community.

Provide detailed information to enhance the effectiveness of our A.I. models.`}
            nextButtonText={"NEXT > SET BEHAVIORS"}
            selfIndex={1}
            pageKey={"introBehaviors"}
          />
        </View>
        <View key="2">
          <CommunitySetBehaviorsPage
            {...{ name, metadata, setMetadata, activeIndex, setCanClickNext }}
            title={"Shaping " + name}
            info={"Encourage | Ban"}
            nextButtonText={"NEXT"}
            selfIndex={2}
            pageKey={"setBehaviors"}
            mode={"creating"}
            readOnly={false}
          />
        </View>
        <View key="3">
          <CommunityInformationPage
            {...{ name, activeIndex, setCanClickNext }}
            title={"Shaping " + name}
            info={
              "Thank you for being thoughtful in shaping " +
              name +
              `.

Next, review the recommended speech guidelines that Odessa can monitor and flag based on your behavior preferences.
`
            }
            nextButtonText={"NEXT > REVIEW A.I."}
            selfIndex={3}
            pageKey={"preRecNorms"}
          />
        </View>
        <View key="4">
          <CommunityInformationPage
            {...{ name, activeIndex, setCanClickNext }}
            title={"Shaping " + name}
            info={"TODO | REVIEW A.I. mapped norms"}
            nextButtonText={"NEXT"}
            selfIndex={4}
            pageKey={"setRecNorms"}
          />
        </View>
        <View key="5">
          <CommunityInformationPage
            {...{ name, activeIndex, setCanClickNext, clickedCreate }}
            title={"Shaping " + name}
            info={"Are you ready to activate " + name + "?"}
            nextButtonText={"YES!"}
            selfIndex={5}
            pageKey={"setActivate"}
          />
        </View>
        <View key="6">
          <CommunityInformationPage
            {...{ name, activeIndex, setCanClickNext, sideNav }}
            title={""}
            info={"You have successfully created and shaped a new community!"}
            nextButtonText={"GO TO > " + name}
            selfIndex={6}
            pageKey={"goToCommunity"}
          />
        </View>
      </PagerView>

      <View style={{ backgroundColor: "white", paddingBottom: 20 }}>
        <TouchableOpacity
          disabled={!canClickNext}
          style={[
            styles.communityBubble,
            {
              margin: 20,
              backgroundColor: canClickNext ? PRIMARY_THEME_COLOR : "grey",
            },
          ]}
          onPress={onNextButtonPress}
        >
          <Text style={styles.buttonText}>{nextButtonText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const CommunitySetBehaviorsPage = ({
  readOnly,
  mode,
  name,
  title,
  info,
  metadata,
  setMetadata,
  selfIndex,
  activeIndex,
  setCanClickNext,
  community,
  fullBleed,
  pageKey = undefined,
}) => {
  const behaviors = community?.behaviors;

  if ((mode === "creating" || mode === "editing") && readOnly !== false) {
    console.log("ERROR mode, readOnly:", mode, readOnly);
  }
  if (mode === "viewing" && readOnly !== true) {
    console.log("ERROR mode, readOnly:", mode, readOnly);
  }

  // Functions to get the correct state for each type of behavior
  const getGlobalEncourageBehaviors = () => {
    const { encourageStr, setEncourageStr } = useContext(LocalStateContext);
    return [encourageStr, setEncourageStr];
  };

  const getLocalEncourageBehaviors = () => {
    const [encourageStr, setEncourageStr] = useState(
      behaviors ? behaviors.encourage : "",
    );
    return [encourageStr, setEncourageStr];
  };

  // const getGlobalDiscourageBehaviors = () => {
  //   const { discourageStr, setDiscourageStr } = useContext(LocalStateContext);
  //   return [discourageStr, setDiscourageStr];
  // };

  // const getLocalDiscourageBehaviors = () => {
  //   const [discourageStr, setDiscourageStr] = useState(
  //     behaviors ? behaviors.discourage : "",
  //   );
  //   return [discourageStr, setDiscourageStr];
  // };

  const getStateBanBehaviors = () => {
    const { banStr, setBanStr } = useContext(LocalStateContext);
    return [banStr, setBanStr];
  };

  const getLocalBanBehaviors = () => {
    const [banStr, setBanStr] = useState(behaviors ? behaviors.ban : "");
    return [banStr, setBanStr];
  };

  // Create behavior variables

  var [encourageStr, setEncourageStr] =
    mode === "creating" || behaviors
      ? getLocalEncourageBehaviors()
      : getGlobalEncourageBehaviors();
  // var [discourageStr, setDiscourageStr] =
  //   mode === "creating" || behaviors
  //     ? getLocalDiscourageBehaviors()
  //     : getGlobalDiscourageBehaviors();
  var [banStr, setBanStr] =
    mode === "creating" || behaviors
      ? getLocalBanBehaviors()
      : getStateBanBehaviors();

  useEffect(() => {
    if (community) {
      setEncourageStr(behaviors.encourage);
      setBanStr(behaviors.ban);
      if (setMetadata) {
        setMetadata(
          JSON.stringify({
            encourage: encourageStr,
            ban: banStr,
          }),
        );
      }
    }
  }, [mode, community]);

  useEffect(() => {
    if (readOnly) {
      return;
    }
    if (pageKey != "setActivate" && activeIndex == selfIndex) {
      setCanClickNext(false);
    }
  }, [activeIndex]);

  const encouragePlaceholder = `1. Be kind.
2. Share personal experiences.
<ADD YOUR OWN>`;

  const discouragePlaceholder = `1. Self-promotion.`;

  const banPlaceholder = `1. F*ck. Sh*t.
<ADD YOUR OWN>`;

  const startsWithDigit = (str) => {
    const regex = /^\d/;
    return regex.test(str);
  };

  const checkListFormat = (str, setStr) => {
    setStr(str);
    const lines = str.split("\n");
    var formated = "";
    for (let i = 0; i < lines.length; i++) {
      const cline = lines[i].trim();
      if (startsWithDigit(cline)) {
        if (i == lines.length - 1) {
          formated = formated + lines[i];
        } else {
          formated = formated + lines[i] + "\n";
        }
      } else {
        if (i == lines.length - 1) {
          if (cline.length > 5) {
            formated = formated + (i + 1) + ". " + lines[i];
          } else {
            formated = formated + lines[i];
          }
        } else {
          if (cline.length > 20) {
            formated = formated + (i + 1) + ". " + cline + "\n";
          } else {
            formated = formated + cline + "\n";
          }
        }
      }
    }
    setStr(formated);
  };

  useEffect(() => {
    if (readOnly) {
      return;
    }
    const checkFields = () => {
      if (
        encourageStr?.length > 4 &&
        // discourageStr?.length > 4 &&
        banStr?.length > 4
      ) {
        setCanClickNext(true);
      } else {
        setCanClickNext(false);
      }
    };
    if (activeIndex == selfIndex) {
      checkFields();
      setMetadata(
        JSON.stringify({
          encourage: encourageStr,
          // discourage: discourageStr,
          ban: banStr,
        }),
      );
    }
  }, [encourageStr, banStr, activeIndex]); //discourageStr

  const behaviorWrapperStyle = fullBleed
    ? {
        ...styles.behaviorWrapper,
        marginHorizontal: 0,
        marginVertical: Spacing.sm,
      }
    : styles.behaviorWrapper;

  // console.log(name, mode, readOnly);
  //style={{backgroundColor: 'black'}}
  return (
    <ScrollView>
      {title && (
        <View style={[styles.titleBubble, { marginBottom: 14 }]}>
          <Text style={styles.activeText}>{title}</Text>
        </View>
      )}

      <View style={behaviorWrapperStyle}>
        <Text style={[styles.fieldText, { marginTop: 10 }]}>Encourage</Text>
        <TextInput
          placeholder={
            mode === "creating" ? encouragePlaceholder : encourageStr
          }
          style={{ margin: 10, marginTop: 0 }}
          multiline
          numberOfLines={6}
          minHeight={Platform.OS === "ios" ? 20 * 6 : null}
          maxHeight={Platform.OS === "ios" ? 20 * 6 : null}
          backgroundColor={mode === "editing" ? "lightgray" : "white"}
          underlineColor={
            mode === "creating" ? PRIMARY_THEME_COLOR : "transparent"
          }
          value={encourageStr}
          onChangeText={(text) => checkListFormat(text, setEncourageStr)}
          editable={!readOnly}
        />
      </View>

      {/* <View style={behaviorWrapperStyle}>
        <Text style={[styles.fieldText, { marginTop: 10 }]}>Discourage</Text>
        <TextInput
          placeholder={
            mode === "creating" ? discouragePlaceholder : discourageStr
          }
          style={{ margin: 10, marginTop: 0 }}
          multiline
          numberOfLines={4}
          minHeight={Platform.OS === "ios" ? 20 * 4 : null}
          maxHeight={Platform.OS === "ios" ? 20 * 4 : null}
          backgroundColor={mode === "editing" ? "lightgray" : "white"}
          underlineColor="transparent"
          value={discourageStr}
          onChangeText={(text) => checkListFormat(text, setDiscourageStr)}
          editable={!readOnly}
        />
      </View> */}
      <View style={behaviorWrapperStyle}>
        <Text style={[styles.fieldText, { marginTop: 10 }]}>Ban</Text>
        <TextInput
          placeholder={mode === "creating" ? banPlaceholder : banStr}
          style={{ margin: 10, marginTop: 0 }}
          multiline
          numberOfLines={6}
          minHeight={Platform.OS === "ios" ? 20 * 6 : null}
          maxHeight={Platform.OS === "ios" ? 20 * 6 : null}
          backgroundColor={mode === "editing" ? "lightgray" : "white"}
          underlineColor={
            mode === "creating" ? PRIMARY_THEME_COLOR : "transparent"
          }
          value={banStr}
          onChangeText={(text) => checkListFormat(text, setBanStr)}
          editable={!readOnly}
        />
      </View>
    </ScrollView>
  );
};

const CommunityInformationPage = ({
  name,
  mission,
  title,
  info,
  selfIndex,
  activeIndex,
  setCanClickNext,
  clickedCreate,
  sideNav,
  pageKey = undefined,
}) => {
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    if (activeIndex != selfIndex) {
      return;
    }

    if (pageKey != "setActivate") {
      setCanClickNext(true);
      setShowSpinner(false);
    }

    if (pageKey == "setActivate") {
      if (clickedCreate) {
        setCanClickNext(false);
      }
      setShowSpinner(true);
      const interval = setInterval(() => {
        setShowSpinner(false);
        setCanClickNext(true);
        clearInterval(interval);
      }, 3000);
    }
  }, [activeIndex]);

  return (
    <ScrollView>
      <View style={[styles.titleBubble, { marginBottom: 100 }]}>
        <Text style={styles.activeText}>{title}</Text>
      </View>
      <View style={[styles.bodyBubble]}>
        <Text style={styles.activeText}>{info}</Text>
      </View>
      {showSpinner && (
        <View style={{ paddingTop: 300 }}>
          <ActivityIndicator
            size="large"
            style={{ transform: [{ scaleX: 1 }, { scaleY: 1 }] }}
            color={PRIMARY_THEME_COLOR}
          />
        </View>
      )}
    </ScrollView>
  );
};

const CommunitySetUpPage = ({
  name,
  setName,
  mission,
  setMission,
  membersDesc,
  setMembersDesc,
  selfIndex,
  activeIndex,
  setCanClickNext,
}) => {
  useEffect(() => {
    const checkFields = () => {
      if (name?.length > 5 && mission?.length > 20) {
        setCanClickNext(true);
      } else {
        setCanClickNext(false);
      }
    };

    if (activeIndex == selfIndex) {
      checkFields();
    }
  }, [activeIndex, name, mission]);

  // useEffect(() => {
  //   if(activeIndex == selfIndex){
  //     console.log('ACTIVE selfIndex', selfIndex);
  //   }
  // }, [activeIndex]);

  return (
    <ScrollView
      contentContainerStyle={{
        justifyContent: "center",
        alignSelf: "stretch",
      }}
    >
      <View style={[styles.titleBubble, { marginBottom: 60 }]}>
        <Text style={styles.activeText}>Shaping your new community!</Text>
      </View>

      <View style={styles.labelWrapper}>
        <Text style={styles.fieldText}>Name</Text>
      </View>
      <TextInput
        value={name}
        onChangeText={(text) => setName(text)}
        placeholder="Name your community"
        style={{ marginHorizontal: 20 }}
        backgroundColor="white"
        underlineColor={PRIMARY_THEME_COLOR}
      />
      <View style={[{ marginBottom: 30 }]} />

      <View style={styles.labelWrapper}>
        <Text style={styles.fieldText}>Purpose</Text>
      </View>
      <TextInput
        value={mission}
        onChangeText={(text) => setMission(text)}
        multiline
        numberOfLines={8}
        minHeight={Platform.OS === "ios" ? 20 * 8 : null}
        maxHeight={Platform.OS === "ios" ? 20 * 8 : null}
        placeholder="What is the specific purpose of your community?"
        style={{ marginHorizontal: 20 }}
        backgroundColor="white"
        underlineColor={PRIMARY_THEME_COLOR}
      />
      <View style={[{ marginBottom: 30 }]} />

      <View style={styles.labelWrapper}>
        <Text style={styles.fieldText}>Members</Text>
      </View>
      <TextInput
        value={membersDesc}
        onChangeText={(text) => setMembersDesc(text)}
        multiline
        numberOfLines={8}
        minHeight={Platform.OS === "ios" ? 20 * 8 : null}
        maxHeight={Platform.OS === "ios" ? 20 * 8 : null}
        placeholder="Who is this community for? Who do you expect will join this community? Any specific demographic characteristics?"
        style={{ marginHorizontal: 20 }}
        backgroundColor="white"
        underlineColor={PRIMARY_THEME_COLOR}
      />
    </ScrollView>
  );
};

export const GoBackButton = ({ handleGoBack }) => {
  return (
    <View style={styles.header}>
      <View>
        <TouchableOpacity onPress={handleGoBack}>
          <Icon
            name="chevron-left"
            color={PRIMARY_THEME_COLOR}
            size={24}
          ></Icon>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pagerView: {
    flex: 1,
    backgroundColor: "white",
  },
  text: {
    margin: 8,
    color: "#000",
  },
  activeText: {
    fontFamily: BODY_FONT,
    color: "black",
    fontWeight: "300", // semi-bold text for active bubble
  },
  buttonText: {
    fontFamily: BODY_FONT,
    color: "white",
    fontWeight: "300", // semi-bold text for active bubble
  },
  fieldText: {
    marginHorizontal: 20,
    fontFamily: BODY_FONT,
    color: "black",
    // fontWeight: "600", // semi-bold text for active bubble
    fontSize: 16,
  },
  titleBubble: {
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyBubble: {
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "left",
  },
  labelWrapper: {
    paddingHorizontal: 4,
    alignItems: "left",
  },
  communityBubble: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginHorizontal: 80,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#4C3FBF",
  },
  header: {
    padding: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  behaviorWrapper: {
    // borderWidth: 1,
    borderColor: PRIMARY_THEME_COLOR,
    backgroundColor: "white",
    marginHorizontal: 30,
    margin: 14,
    borderRadius: 20,
  },
});
