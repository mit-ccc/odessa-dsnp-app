import { useEffect, useState, useContext } from "react";
import {
  View,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Text, useTheme, Button, TextInput } from "react-native-paper";
import Clipboard from "@react-native-community/clipboard";
import { gql } from "graphql-request";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import { GetMembersPkh } from "./trustee";

import { LocalStateContext } from "./../../../state/LocalState";
import {
  BODY_FONT,
  PRIMARY_THEME_COLOR,
  SECONDARY_THEME_COLOR,
} from "../../../common/styles/config";
import SelectDropdown from "react-native-select-dropdown";

export const OwnerActions = ({
  activeCommunity,
  permissions,
  backgroundColor = SECONDARY_THEME_COLOR,
}) => {
  const [HH, setHH] = useState("1");
  const [MM, setMM] = useState("0");
  const [SS, setSS] = useState("0");
  const allPermissions =
    permissions && permissions.length == 1 && permissions[0] == "__all__";

  const [allCommunityPerms, setAllCommunityPerms] = useState([]);

  const { api } = useContext(LocalStateContext);

  const canAddRole = permissions?.includes("community.persona.role.add");
  const canDeleteRole = permissions?.includes("community.persona.role.delete");

  const canGrantPerm = permissions?.includes(
    "community.persona.permission.grant",
  );
  const canRevokePerm = permissions?.includes(
    "community.persona.permission.revoke",
  );

  const canAddFalg = permissions?.includes("community.flag.add");
  const canDeleteFlag = permissions?.includes("community.flag.delete");

  const onSetPerms = async () => {
    const permissions = await getAllCommunityPerms(api, activeCommunity.id);
    setAllCommunityPerms(permissions);
  };

  useEffect(() => {
    onSetPerms();
  }, [activeCommunity]);

  const canForceNextRound = permissions?.includes(
    "community.round.force_next_round",
  );
  const canStopCurrentRound = permissions?.includes(
    "community.round.force_stop_current_round",
  );
  const canListPkhs = permissions?.includes("community.members.pkh.read");

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <View style={styles.actionsSection}>
        {(allPermissions || canForceNextRound || canStopCurrentRound) && (
          <Text style={styles.roleText}>manage rounds</Text>
        )}
        {(allPermissions || canForceNextRound) && (
          <NextRoundManagement
            api={api}
            HH={HH}
            MM={MM}
            SS={SS}
            setHH={setHH}
            setMM={setMM}
            setSS={setSS}
            community={activeCommunity}
          />
        )}
        {(allPermissions || canStopCurrentRound) && (
          <CurrentRoundManagement api={api} community={activeCommunity} />
        )}

        {(allPermissions || canListPkhs) && (
          <View style={{ marginTop: 50 }}>
            <GetMembersPkh api={api} community={activeCommunity} />
          </View>
        )}

        {(allPermissions || canAddRole || canDeleteRole) && (
          <View>
            <View style={{ margin: 15 }}></View>
            <Text style={styles.roleText}>update roles</Text>
            <ManageRoles
              api={api}
              community={activeCommunity}
              permissions={permissions}
              backgroundColor={backgroundColor}
              allPermissions={allPermissions}
            />
          </View>
        )}
        {(allPermissions || canAddFalg || canDeleteFlag) && (
          <View>
            <View style={{ margin: 15 }}></View>
            <Text style={styles.roleText}>update flags</Text>
            <ManageFlags
              api={api}
              community={activeCommunity}
              permissions={permissions}
              backgroundColor={backgroundColor}
              allPermissions={allPermissions}
            />
          </View>
        )}
        {(allPermissions || canGrantPerm || canRevokePerm) && (
          <View>
            <View style={{ margin: 15 }}></View>
            <Text style={styles.roleText}>update permissions</Text>
            <ManagePermissions
              api={api}
              community={activeCommunity}
              backgroundColor={backgroundColor}
              canGrantPerm={canGrantPerm}
              canRevokePerm={canRevokePerm}
              allPermissions={allPermissions}
              allCommunityPerms={allCommunityPerms}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const getAllCommunityPerms = async (api, community_id) => {
  const GET_COMM_PERMS = gql`
    query getAllCommunityPerms($community_id: Int!) {
      getAllCommunityPerms(community_id: $community_id)
    }
  `;
  var res = await api.request(GET_COMM_PERMS, { community_id });
  res = res.getAllCommunityPerms;
  if (res[0] == "__all__") {
    res.shift();
  }
  return res;
};

const postForceNextRound = async (
  api,
  community_id,
  hours,
  minutes,
  seconds,
) => {
  const POST_FORCE_NEXT_ROUND = gql`
    mutation forceNextRound($community_id: Int, $duration: Duration) {
      forceNextRound(community_id: $community_id, duration: $duration) {
        id
      }
    }
  `;
  const res = await api.request(POST_FORCE_NEXT_ROUND, {
    community_id,
    duration: {
      hours: Number(hours),
      minutes: Number(minutes),
      seconds: Number(seconds),
    },
  });
  console.log("forceNextRound(", community_id, "): ", res);
  return res;
};

const postForceCloseCurrentRound = async (api, community_id) => {
  const FORCE_CLOSE_ACTIVE_ROUND = gql`
    mutation forceCloseActiveRound($community_id: Int) {
      forceCloseActiveRound(community_id: $community_id) {
        id
      }
    }
  `;
  const res = await api.request(FORCE_CLOSE_ACTIVE_ROUND, { community_id });
  console.log("forceCloseActiveRound(", community_id, "): ", res);
  return res;
};

const NextRoundManagement = ({
  api,
  HH,
  MM,
  SS,
  setHH,
  setMM,
  setSS,
  community,
}) => {
  return (
    <View>
      <View style={{ flexDirection: "row", alignSelf: "center" }}>
        <TextInput
          label="Hours"
          mode="outlined"
          value={HH}
          textColor="#000"
          style={{ width: "30%" }}
          onChangeText={(text) => setHH(text)}
        />
        <TextInput
          label="Minutes"
          mode="outlined"
          value={MM}
          textColor="#000"
          style={{ width: "30%" }}
          onChangeText={(text) => setMM(text)}
        />
        <TextInput
          label="Seconds"
          mode="outlined"
          value={SS}
          textColor="#000"
          style={{ width: "30%" }}
          onChangeText={(text) => setSS(text)}
        />
      </View>
      <View style={{ alignSelf: "center" }}>
        <Button
          mode="contained"
          style={styles.button}
          onPress={() => postForceNextRound(api, community.id, HH, MM, SS)}
        >
          <Text>force_next_round with close time above</Text>
        </Button>
      </View>
    </View>
  );
};

const CurrentRoundManagement = ({ api, community }) => {
  return (
    <View>
      <View style={{ alignSelf: "center" }}>
        <Button
          mode="contained"
          style={styles.button}
          onPress={() => postForceCloseCurrentRound(api, community.id)}
        >
          <Text>close_active_round</Text>
        </Button>
      </View>
    </View>
  );
};

const registerRoleInCommunity = async (
  api,
  pkh,
  community_id,
  role,
  mode = "remove",
) => {
  const SET_USER_ROLE = gql`
    mutation registerRoleInCommunity(
      $pkh: String!
      $community_id: Int!
      $role: String!
      $mode: String!
    ) {
      registerRoleInCommunity(
        pkh: $pkh
        community_id: $community_id
        role: $role
        mode: $mode
      )
    }
  `;
  const res = await api.request(SET_USER_ROLE, {
    pkh,
    community_id,
    role,
    mode,
  });
  Alert.alert(pkh.slice(0, 10) + ": " + res.registerRoleInCommunity);
};

const registerPermInCommunity = async (
  api,
  pkh,
  community_id,
  perm,
  mode = "revoke",
) => {
  const SET_USER_PERM = gql`
    mutation registerPermInCommunity(
      $pkh: String!
      $community_id: Int!
      $perm: String!
      $mode: String!
    ) {
      registerPermInCommunity(
        pkh: $pkh
        community_id: $community_id
        perm: $perm
        mode: $mode
      )
    }
  `;
  const res = await api.request(SET_USER_PERM, {
    pkh,
    community_id,
    perm,
    mode,
  });
  Alert.alert(
    pkh.slice(0, 10) + ": " + res.registerPermInCommunity + " " + perm,
  );
};

const registeFlagInCommunity = async (
  api,
  community_id,
  flag,
  mode = "add",
) => {
  const SET_COMMUNITY_FLAG = gql`
    mutation registeFlagInCommunity(
      $community_id: Int!
      $flag: String!
      $mode: String!
    ) {
      registeFlagInCommunity(
        community_id: $community_id
        flag: $flag
        mode: $mode
      )
    }
  `;
  const res = await api.request(SET_COMMUNITY_FLAG, {
    community_id,
    flag,
    mode,
  });
  Alert.alert(res.registeFlagInCommunity + " " + flag);
};

const updateRoleQuery = (api, pkh, community, role, mode) => {
  registerRoleInCommunity(api, pkh, community.id, role, mode);
};

const updatePermQuery = (api, pkh, community, perm, mode) => {
  registerPermInCommunity(api, pkh, community.id, perm, mode);
};

const updateFlagsQuery = (api, community, flag, mode) => {
  registeFlagInCommunity(api, community.id, flag, mode);
};

const availableRoles = ["owner", "moderator", "trustee", "facilitator"];

const RolesDropdown = ({ updateRole, setUpdateRole }) => {
  return (
    <View style={{ width: "50%", paddingLeft: 8 }}>
      <SelectDropdown
        data={availableRoles}
        defaultButtonText={"Role"}
        dropdownIconPosition={"right"}
        buttonStyle={styles.dropdown1BtnStyle}
        buttonTextStyle={styles.dropdown1BtnTxtStyle}
        dropdownStyle={styles.dropdown1DropdownStyle}
        rowStyle={styles.dropdown1RowStyle}
        rowTextStyle={styles.dropdown1RowTxtStyle}
        onSelect={(selectedItem, index) => {
          if (selectedItem != updateRole) {
            console.log("onSelect", selectedItem);
            setUpdateRole(selectedItem);
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
      />
    </View>
  );
};

const PermsDropdown = ({ updatePerm, setUpdatePerm, data }) => {
  return (
    <View style={{ width: "120%", paddingLeft: 8 }}>
      <SelectDropdown
        data={data}
        defaultButtonText={"Permission"}
        dropdownIconPosition={"right"}
        buttonStyle={styles.dropdown1BtnStyle}
        buttonTextStyle={styles.dropdown1BtnTxtStyle}
        dropdownStyle={styles.dropdown1DropdownStyle}
        rowStyle={styles.dropdown1RowStyle}
        rowTextStyle={[styles.dropdown1RowTxtStyle, { fontSize: 14 }]}
        search
        onSelect={(selectedItem, index) => {
          if (selectedItem != updatePerm) {
            console.log("onSelect", selectedItem);
            setUpdatePerm(selectedItem);
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
      />
    </View>
  );
};

const ManageRoles = ({
  api,
  community,
  permissions,
  backgroundColor = SECONDARY_THEME_COLOR,
  allPermissions = false,
}) => {
  const [updateRolePkh, setUpdateRolePkh] = useState("");
  const [updateRole, setUpdateRole] = useState("");
  return (
    <View style={{ backgroundColor: backgroundColor, padding: 5 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <TextInput
          label="pkh"
          mode="outlined"
          textColor="#000"
          style={{ width: "100%" }}
          value={updateRolePkh}
          onChangeText={(text) => setUpdateRolePkh(text)}
        />
      </View>
      <View style={{ alignSelf: "center" }}>
        <View style={{ flexDirection: "row", alignSelf: "center" }}>
          <RolesDropdown
            updateRole={updateRole}
            setUpdateRole={setUpdateRole}
          />

          {(allPermissions ||
            permissions?.includes("community.persona.role.add")) && (
            <Button
              mode="contained"
              style={[styles.button, { width: "25%" }]}
              onPress={() =>
                updateRoleQuery(
                  api,
                  updateRolePkh,
                  community,
                  updateRole,
                  "add",
                )
              }
            >
              <Icon name="plus" size={20} color="white" />
            </Button>
          )}
          {(allPermissions ||
            permissions?.includes("community.persona.role.delete")) && (
            <Button
              mode="contained"
              style={[
                styles.button,
                { width: "25%", backgroundColor: "black" },
              ]}
              onPress={() =>
                updateRoleQuery(
                  api,
                  updateRolePkh,
                  community,
                  updateRole,
                  "remove",
                )
              }
            >
              <Icon name="minus" size={20} color="white" />
            </Button>
          )}
        </View>
      </View>
    </View>
  );
};

// FIXME(bcsaldias): should query from backend.
const availableFlags = [
  "enable_bridged_round",
  "enable_create_new_community",
  "enable_content_moderation_moderator_actions",
  "enable_content_moderation_persona_actions",
];

const FlagsDropdown = ({ updateFlag, setUpdateFlag }) => {
  return (
    <View style={{ width: "125%" }}>
      <SelectDropdown
        data={availableFlags}
        defaultButtonText={"Flag"}
        dropdownIconPosition={"right"}
        buttonStyle={styles.dropdown1BtnStyle}
        buttonTextStyle={styles.dropdown1BtnTxtStyle}
        dropdownStyle={styles.dropdown1DropdownStyle}
        rowStyle={styles.dropdown1RowStyle}
        rowTextStyle={[styles.dropdown1RowTxtStyle, { fontSize: 13 }]}
        onSelect={(selectedItem, index) => {
          if (selectedItem != updateFlag) {
            setUpdateFlag(selectedItem);
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
      />
    </View>
  );
};

const ManageFlags = ({
  api,
  community,
  permissions,
  backgroundColor = SECONDARY_THEME_COLOR,
  allPermissions = false,
}) => {
  const [updateFlag, setUpdateFlag] = useState("");
  return (
    <View style={{ backgroundColor: backgroundColor, padding: 5 }}>
      <View style={{ alignSelf: "center" }}>
        <FlagsDropdown updateFlag={updateFlag} setUpdateFlag={setUpdateFlag} />
        <View style={{ flexDirection: "row", alignSelf: "center" }}>
          {(allPermissions || permissions?.includes("community.flag.add")) && (
            <Button
              mode="contained"
              style={[styles.button, { width: "25%" }]}
              onPress={() =>
                updateFlagsQuery(api, community, updateFlag, "add")
              }
            >
              <Icon name="plus" size={20} color="white" />
            </Button>
          )}
          {(allPermissions ||
            permissions?.includes("community.flag.delete")) && (
            <Button
              mode="contained"
              style={[
                styles.button,
                { width: "25%", backgroundColor: "black" },
              ]}
              onPress={() =>
                updateFlagsQuery(api, community, updateFlag, "delete")
              }
            >
              <Icon name="minus" size={20} color="white" />
            </Button>
          )}
        </View>
      </View>
    </View>
  );
};

const ManagePermissions = ({
  api,
  community,
  backgroundColor = SECONDARY_THEME_COLOR,
  allPermissions = false,
  canGrantPerm = false,
  canRevokePerm = false,
  allCommunityPerms = [],
}) => {
  const [updatePermPkh, setUpdatePermPkh] = useState("");
  const [updatePerm, setUpdatePerm] = useState("");
  return (
    <View style={{ backgroundColor: backgroundColor, padding: 5 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <TextInput
          label="pkh"
          mode="outlined"
          textColor="#000"
          style={{ width: "100%" }}
          value={updatePermPkh}
          onChangeText={(text) => setUpdatePermPkh(text)}
        />
      </View>
      <View style={{ alignSelf: "center" }}>
        <PermsDropdown
          updatePerm={updatePerm}
          setUpdatePerm={setUpdatePerm}
          data={allCommunityPerms}
        />

        <View style={{ flexDirection: "row", alignSelf: "center" }}>
          {(allPermissions || canGrantPerm) && (
            <Button
              mode="contained"
              style={[styles.button, { width: "50%" }]}
              onPress={() =>
                updatePermQuery(
                  api,
                  updatePermPkh,
                  community,
                  updatePerm,
                  "grant",
                )
              }
            >
              <Icon name="plus" size={20} color="white" />
            </Button>
          )}
          {(allPermissions || canRevokePerm) && (
            <Button
              mode="contained"
              style={[
                styles.button,
                { width: "50%", backgroundColor: "black" },
              ]}
              onPress={() =>
                updatePermQuery(
                  api,
                  updatePermPkh,
                  community,
                  updatePerm,
                  "revoke",
                )
              }
            >
              <Icon name="minus" size={20} color="white" />
            </Button>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    margin: 4,
    color: "#000",
  },
  button: {
    margin: 8,
    marginLeft: 0,
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
  dropdown1BtnStyle: {
    width: "80%",
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
});
