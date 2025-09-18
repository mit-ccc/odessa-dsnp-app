import { useEffect, useState, useContext } from "react";
import {
  View,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Text, useTheme, Button, TextInput } from "react-native-paper";
import Clipboard from "@react-native-community/clipboard";
import { gql } from "graphql-request";
import { getCommunityMembers } from "../../../api/wrappers";

import { LocalStateContext } from "./../../../state/LocalState";
import {
  BODY_FONT,
  BODY_FONT_BOLD,
  PRIMARY_THEME_COLOR,
  SECONDARY_THEME_COLOR,
} from "../../../common/styles/config";
import SelectDropdown from "react-native-select-dropdown";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import ProfilePicture from "../../../common/minorComponents/ProfilePicture";

const MembersPkhDropdown = ({ printPKh, setPrintPkh, data }) => {
  const renderPersona = (item) => (
    <View>
      <View style={{ flexDirection: "row", padding: 5 }}>
        <View>
          <ProfilePicture user={item} radius={14} borderCol={"black"} />
        </View>
        <View>
          <Text
            style={styles.simplePersonaName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>
        </View>
        <View>
          <Text
            style={styles.simplePersonaName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.id}
          </Text>
        </View>
        <View>
          <Text
            style={styles.simplePersonaName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.bio}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ alignSelf: "center" }}>
      <SelectDropdown
        data={data}
        defaultButtonText={"Select Member"}
        dropdownIconPosition={"right"}
        buttonStyle={styles.dropdown1BtnStyle}
        buttonTextStyle={styles.dropdown1BtnTxtStyle}
        dropdownStyle={styles.dropdown1DropdownStyle}
        rowStyle={styles.dropdown1RowStyle}
        rowTextStyle={styles.dropdown1RowTxtStyle}
        search
        onSelect={(selectedItem, index) => {
          if (selectedItem != printPKh) {
            setPrintPkh(selectedItem.pkh);
          }
        }}
        renderDropdownIcon={(isOpened) => {
          return (
            <Icon
              name={isOpened ? "chevron-up" : "chevron-down"}
              size={20}
              color={"#444"}
            />
          );
        }}
        renderSearchInputLeftIcon={() => {
          return <Icon name={"tag-search"} color={"#444"} size={20} />;
        }}
        renderCustomizedRowChild={(item, index) => {
          if (item === null) {
            return <Text style={{ color: "black" }}>Select Member</Text>;
          }
          return renderPersona(item);
        }}
        renderCustomizedButtonChild={(item, index) => {
          if (printPKh === "") {
            return <Text style={{ color: "black" }}>Select Member</Text>;
          }
          return renderPersona(item);
        }}
      />
    </View>
  );
};

export const GetMembersPkh = ({
  api,
  community,
  backgroundColor = SECONDARY_THEME_COLOR,
}) => {
  const [printPKh, setPrintPkh] = useState("");
  const [communityMembers, setCommunityMembers] = useState([]);
  // console.log('communityMembers', community, communityMembers);
  const fetchCommunityMembers = async () => {
    if (community) {
      setPrintPkh("");
      const members = await getCommunityMembers(api, community.id);
      setCommunityMembers(members);
    }
  };
  useEffect(() => {
    fetchCommunityMembers();
  }, [community]);

  const copyPkhToClipboard = (printPKh) => {
    Clipboard.setString(printPKh);
  };

  return (
    <View style={{ backgroundColor: backgroundColor }}>
      <MembersPkhDropdown
        printPKh={printPKh}
        setPrintPkh={setPrintPkh}
        data={communityMembers}
      />

      {printPKh && (
        <View style={{ backgroundColor: backgroundColor, padding: 5 }}>
          <TouchableOpacity
            onPress={() => copyPkhToClipboard(printPKh)}
            style={{ flexDirection: "row" }}
          >
            <Icon name="content-copy" size={24} color="black" />
            <Text variant="bodyLarge" style={styles.text}>
              pkh: {printPKh?.slice(0, 20)}...
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export const TrusteeActions = ({
  activeCommunity,
  permissions,
  backgroundColor = SECONDARY_THEME_COLOR,
}) => {
  const { api } = useContext(LocalStateContext);
  const allPermissions =
    permissions && permissions.length == 1 && permissions[0] == "__all__";

  const canListPkhs = permissions?.includes("community.members.pkh.read");

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <View style={styles.actionsSection}>
        {(allPermissions || canListPkhs) && (
          <View>
            <GetMembersPkh api={api} community={activeCommunity} />
          </View>
        )}
        {(allPermissions ||
          permissions?.includes("community.persona.add") ||
          permissions?.includes("community.persona.delete")) && (
          <View>
            <View style={{ margin: 15 }}></View>
            <Text style={styles.roleText}>manage membership</Text>
            <ManageCommunityList
              api={api}
              activeCommunity={activeCommunity}
              backgroundColor={backgroundColor}
              permissions={permissions}
              allPermissions={allPermissions}
            />
          </View>
        )}

        {/* <View style={{margin: 15}}></View> */}
        {/* <Text style={styles.roleText}>cross community actions</Text> */}
      </View>
    </ScrollView>
  );
};

const registerPersonaInCommunity = async (
  api,
  pkh,
  community_id,
  mode = "register",
) => {
  const SET_USER_MEMBERSHIP = gql`
    mutation registerPkhToCommunity(
      $pkh: String!
      $community_id: Int!
      $mode: String!
    ) {
      registerPkhToCommunity(
        pkh: $pkh
        community_id: $community_id
        mode: $mode
      )
    }
  `;
  const res = await api.request(SET_USER_MEMBERSHIP, {
    pkh,
    community_id,
    mode,
  });
  Alert.alert(pkh.slice(0, 10) + "... has been " + res.registerPkhToCommunity);
};

const updateMembership = (api, pkh, community, mode) => {
  registerPersonaInCommunity(api, pkh, community.id, mode);
};

const ManageCommunityList = ({
  api,
  activeCommunity,
  permissions,
  backgroundColor = SECONDARY_THEME_COLOR,
  allPermissions = false,
}) => {
  const [updateMembershipPkh, setUpdateMembershipPkh] = useState("");
  return (
    <View style={{ backgroundColor: backgroundColor, padding: 5 }}>
      <TextInput
        label="pkh"
        mode="outlined"
        textColor="#000"
        value={updateMembershipPkh}
        onChangeText={(text) => setUpdateMembershipPkh(text)}
      />
      <View style={{ alignSelf: "center" }}>
        <View style={{ flexDirection: "row", alignSelf: "center" }}>
          {(allPermissions ||
            permissions?.includes("community.persona.add")) && (
            <Button
              mode="contained"
              style={[styles.button, { width: "45%" }]}
              onPress={() =>
                updateMembership(
                  api,
                  updateMembershipPkh,
                  activeCommunity,
                  "register",
                )
              }
            >
              Add member
            </Button>
          )}
          {(allPermissions ||
            permissions?.includes("community.persona.delete")) && (
            <Button
              mode="contained"
              style={[styles.button, { width: "45%" }]}
              onPress={() =>
                updateMembership(
                  api,
                  updateMembershipPkh,
                  activeCommunity,
                  "unregister",
                )
              }
            >
              Remove member
            </Button>
          )}
        </View>
      </View>
    </View>
  );
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
  roleText: {
    fontSize: 20,
    color: PRIMARY_THEME_COLOR,
    textAlign: "left",
    fontFamily: BODY_FONT,
  },
  simplePersonaContainer: {
    paddingBottom: 20,
  },
  simplePersonaName: {
    flex: 1, // Allowing the text to adjust its width within the container
    fontSize: 16,
    fontFamily: BODY_FONT_BOLD,
    marginHorizontal: 10, // Add some margin to prevent text from touching the button
    color: "black",
  },
  dropdown1BtnStyle: {
    width: "100%",
    height: 50,
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  dropdown1BtnTxtStyle: { color: "#444", textAlign: "left" },
  dropdown1DropdownStyle: { backgroundColor: "#EFEFEF" },
  dropdown1RowStyle: {
    backgroundColor: "#EFEFEF",
    borderBottomColor: "#C5C5C5",
  },
  dropdown1RowTxtStyle: { color: "#444", textAlign: "left" },
  actionsSection: {
    padding: 30,
    paddingBottom: 60,
  },
};
