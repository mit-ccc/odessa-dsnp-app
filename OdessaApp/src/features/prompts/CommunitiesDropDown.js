import SelectDropdown from "react-native-select-dropdown";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import { Text, View, TouchableOpacity } from "react-native";
import { useState, useContext, useRef } from "react";
import {
  PRIMARY_THEME_COLOR,
  QUATERNARY_THEME_COLOR,
  SECONDARY_THEME_COLOR,
  TERTIARY_THEME_COLOR,
} from "../../common/styles/config";
import { useCommunities } from "../../common/Hooks/useCommunities";
import { LocalStateContext } from "../../state/LocalState";
import { Checkbox } from "react-native-paper";

export const CommunityDropdown = ({
  selectedCommunity,
  setSelectedCommunity,
  enabledCommunities,
}) => {
  const { api, personaChange, activeCommunity, setActiveCommunity } =
    useContext(LocalStateContext);
  const [addBridge, setAddBridge] = useState(false);
  const dropdownRef = useRef({});

  const resetAddBridge = () => {
    setAddBridge(!addBridge);
    setSelectedCommunity(null);
  };

  return (
    <View style={{ flexDirection: "row", marginVertical: 10 }}>
      <TouchableOpacity
        style={{ paddingVertical: 10 }}
        onPress={resetAddBridge}
      >
        <Icon
          name="plus-circle-outline"
          size={30}
          color={TERTIARY_THEME_COLOR}
        />
      </TouchableOpacity>
      <View style={{ width: "90%" }}>
        {addBridge && (
          <SelectDropdown
            data={enabledCommunities?.filter((c) => c.id != activeCommunity.id)}
            ref={dropdownRef}
            search
            defaultButtonText={"Bridge with"}
            dropdownIconPosition={"right"}
            buttonStyle={styles.dropdown1BtnStyle}
            buttonTextStyle={styles.dropdown1BtnTxtStyle}
            showsVerticalScrollIndicator={true}
            onFocus={() => {
              if (selectedCommunity) {
                dropdownRef.current.reset();
                dropdownRef.current.closeDropdown();
                setAddBridge(false);
                setSelectedCommunity(null);
              }
            }}
            onSelect={(selectedItem, index) => {
              if (selectedItem != selectedCommunity) {
                setSelectedCommunity(selectedItem);
              }
            }}
            buttonTextAfterSelection={(item, index) => {
              return (
                <Text style={{ color: "black", textAlign: "center" }}>
                  {item.name}
                </Text>
              );
            }}
            rowTextForSelection={(item, index) => {
              return <Text style={{ color: "black" }}>{item.name}</Text>;
            }}
            renderDropdownIcon={(isOpened) => {
              return (
                <Icon
                  name={
                    isOpened
                      ? "chevron-up"
                      : selectedCommunity
                        ? "playlist-remove"
                        : "chevron-down"
                  } //
                  size={22}
                  color={PRIMARY_THEME_COLOR}
                />
              );
            }}
          />
        )}
      </View>
      {/* <TouchableOpacity style={{ paddingVertical: 10 }}>
        <Icon
          name="minus-circle-outline"
          size={45}
          color={TERTIARY_THEME_COLOR}
        />
      </TouchableOpacity> */}
    </View>
  );
};

const styles = {
  text: {
    margin: 4,
    color: "#000",
  },
  dropdown1BtnStyle: {
    width: "100%",
    paddingVertical: 10, // reduced padding for a slimmer look
    paddingHorizontal: 15, // horizontal padding to give more side space
    borderRadius: 18, // to match the roundness in the image
    backgroundColor: QUATERNARY_THEME_COLOR, // light grey background for inactive bubbles
    alignItems: "center",
    justifyContent: "center",
  },
  dropdown1BtnTxtStyle: { color: TERTIARY_THEME_COLOR, textAlign: "left" },
};
