// taken from https://www.waldo.com/blog/add-an-image-picker-react-native-app

import React, { useState, useContext, useEffect } from "react";
import {
  Image,
  View,
  Platform,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import defaultImage from "../../assets/icons/img.jpg"; // Ensure this path is correct
import {
  uploadUserImage,
  updateProfilePicture,
  removeProfilePicture,
} from "../../api/wrappers";
import { LocalStateContext } from "../../state/LocalState";
import { backend } from "../../api/apiClient";
import ProfilePicture from "../../common/minorComponents/ProfilePicture";
import { ActivityIndicator } from "react-native-paper";
import { PRIMARY_THEME_COLOR } from "../../common/styles/config";

export default function UploadImage({ persona }) {
  //   const [image, setImage] = useState('');
  // selected === undefined means that the user hasn't picked an image yet and we should default to persona
  // selected === null means that the user has deleted the image
  // else, selected should be an image that we are uploading and associating with the persona
  const [selected, setSelected] = useState(undefined);
  const [uploading, setUploading] = useState(false);

  const addImage = async () => {
    const options = {
      saveToPhotos: true,
      mediaType: "photo",
      includeBase64: true,
    };
    const resp = await launchImageLibrary(options);
    if (resp.didCancel) {
      return;
    }

    const s = resp.assets[0];
    setUploading(true);
    setSelected(s);
    await getImageUri(s);
  };

  const { api, triggerPersonaChange } = useContext(LocalStateContext);

  const removeImage = async () => {
    await removeProfilePicture(api, persona);
    setSelected(null);
    triggerPersonaChange();
  };

  const removeImageAlert = async () => {
    // alert("Are you sure you want to remove your current picture?")

    Alert.alert(
      "",
      "Are you trying to remove your picture?",
      [{ text: "Remove picture", onPress: removeImage }, { text: "Cancel" }],
      { cancelable: true },
    );
  };

  useEffect(() => {
    if (uploading) {
      console.log("UPLOADING");
    }
  }, [uploading]);

  const getImageUri = async (sel) => {
    try {
      if (sel) {
        if (sel.base64) {
          format = sel.type.split("/")[1];
          console.info("uploading user image of type", format);
          const resp = await uploadUserImage(api, sel.base64, format);
          await updateProfilePicture(
            api,
            persona,
            resp["data"]["uploadUserImage"]["id"],
          );
          triggerPersonaChange();
        }
      }
    } catch (err) {
    } finally {
      setUploading(false);
    }
  };

  return (
    <View>
      <TouchableOpacity
        onPress={removeImageAlert}
        style={[{ alignSelf: "right" }]}
      >
        <Icon name="trash-can-outline" size={20} color="black" />
      </TouchableOpacity>

      <View style={imageUploaderStyles.container}>
        {selected === undefined && (
          <ProfilePicture user={persona} radius={100} size={200} />
        )}
        {selected === null && (
          <ProfilePicture
            user={{ ...persona, image_id: null }}
            radius={100}
            size={200}
          />
        )}
        {selected && (
          <Image
            source={{ uri: selected.uri }}
            style={{ width: 200, height: 200 }}
          />
        )}

        <View style={imageUploaderStyles.uploadBtnContainer}>
          <View style={[{ flexDirection: "column" }]}>
            <TouchableOpacity
              onPress={addImage}
              style={imageUploaderStyles.uploadBtn}
            >
              <Icon name="upload" size={20} marginTop={10} color="black" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {uploading && (
        <View>
          <ActivityIndicator
            animating={true}
            size="small"
            color={PRIMARY_THEME_COLOR}
          />
          <Text>Uploading, don't leave this page.</Text>
        </View>
      )}
    </View>
  );
}
const imageUploaderStyles = StyleSheet.create({
  container: {
    elevation: 2,
    height: 200,
    width: 200,
    backgroundColor: "#efefef",
    position: "relative",
    borderRadius: 999,
    overflow: "hidden",
    // marginBottom: 200
  },
  uploadBtnContainer: {
    opacity: 0.7,
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "lightgrey",
    width: "100%",
    height: "25%",
    // flexDirection: 'row',
    // justifyContent:'space-between',
  },
  uploadBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
});
