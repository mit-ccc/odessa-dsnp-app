// ProfilePicture.js
import React, { useState, useEffect, useContext } from "react";
import { View, Image, StyleSheet, Text } from "react-native";
import { Avatar, Tooltip } from "react-native-paper";

import { LocalStateContext } from "../../state/LocalState";
import { getImage } from "../../api/wrappers";
import { backend } from "../../api/apiClient";
import { LightenDarkenColor } from "lighten-darken-color";
import { PRIMARY_THEME_COLOR, SECONDARY_THEME_COLOR } from "../styles/config";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";

const ProfilePicture = ({
  image,
  radius,
  borderCol,
  user,
  size = 30,
  backgroundColor = PRIMARY_THEME_COLOR,
}) => {
  const { api } = useContext(LocalStateContext);

  const [profileUri, setProfileUri] = useState(null);
  const [initials, setInitials] = useState("");

  useEffect(() => {
    // We use an image or initials in this order:
    // 1. If we're supplied an image uri we use it.
    // 2. user has image_id
    // 3. use initials

    if (image) {
      setProfileUri(image);
    } else if (user === null) {
      setProfileUri(null);
    } else if (user.image_id) {
      getImage(api, user.image_id, size, size).then((response) => {
        setProfileUri(backend + "/" + response.image.public_url);
      });
    } else {
      setProfileUri(null);
    }

    // calculate initials -- if there is no name then we default to
    // ?. If there is only a first name we use just the first
    // char. Otherwise, we use the first char from the first and last
    // words.
    if (user?.name) {
      const parts = user.name.split(" ").filter(Boolean);
      if (parts.length === 0) {
        setInitials("?");
      } else if (parts.length === 1) {
        setInitials(parts[0][0]);
      } else {
        setInitials(parts[0][0] + parts[parts.length - 1][0]);
      }
    } else {
      setInitials("?");
    }
  }, [image, user]);

  let lightness = 100;
  if (user?.name) {
    lightness = Math.min(2 ** Math.abs(user.name.hashCode() % 6) + 30, 75);
  }

  const styles = StyleSheet.create({
    profilePic: {
      backgroundColor: LightenDarkenColor(backgroundColor, lightness), // `hsl(252, 45%, ${lightness}%)`,
      width: 2 * radius,
      height: 2 * radius,
      borderRadius: radius,
      borderWidth: Math.max(1, radius / 15), // Ensure the border width is at least 1
      borderColor: borderCol || PRIMARY_THEME_COLOR, // Provide a default border color if none is given
    },

    tootlip: {
      flexDirection: "row",
      maxWidth: 250,
      maxHeight: 400,
      backgroundColor: "white",
      borderRadius: 10,
      borderColor: PRIMARY_THEME_COLOR,
      borderWidth: 2,
      padding: 10,
    },
  });

  const PPicHandler = ({ coreComponent }) => {
    // return <View>{coreComponent}</View>;

    return (
      <View>
        <Tooltip
          theme={{ colors: { onSurface: "transparent" } }}
          title={
            <View style={styles.tootlip}>
              {user.bio?.trim().length >= 1 && (
                <View style={{ flexDirection: "row" }}>
                  <Icon
                    name="account-outline"
                    size={16}
                    color={PRIMARY_THEME_COLOR}
                  />
                  <Text style={{ color: PRIMARY_THEME_COLOR }}> : </Text>
                  <View style={{ flexDirection: "column", maxWidth: "100%" }}>
                    <Text
                      style={{ color: PRIMARY_THEME_COLOR, maxWidth: "100%" }}
                    >
                      {user.name}
                    </Text>
                    <Text
                      style={{ color: PRIMARY_THEME_COLOR, maxWidth: "100%" }}
                    >
                      {user.bio}
                    </Text>
                  </View>
                </View>
              )}
              {(!user.bio || user.bio?.trim().length < 1) && (
                <View style={{ flexDirection: "row" }}>
                  <Icon
                    name="account-outline"
                    size={16}
                    color={PRIMARY_THEME_COLOR}
                  />
                  <Text style={{ color: PRIMARY_THEME_COLOR }}> : </Text>
                  <Text style={{ color: PRIMARY_THEME_COLOR, maxWidth: "90%" }}>
                    {user.name}
                  </Text>
                </View>
              )}
            </View>
          }
          enterTouchDelay={0}
          leaveTouchDelay={500}
        >
          {coreComponent}
        </Tooltip>
      </View>
    );
  };

  if (profileUri) {
    return (
      <PPicHandler
        coreComponent={
          <Image source={{ uri: profileUri }} style={styles.profilePic} />
        }
      />
    );
  } else {
    return (
      <PPicHandler
        coreComponent={
          <Avatar.Text
            size={radius * 1.66}
            label={initials}
            style={styles.profilePic}
            color="white"
          />
        }
      />
    );
  }
};

export default ProfilePicture;

String.prototype.hashCode = function () {
  var hash = 0,
    i,
    chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr = this.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};
