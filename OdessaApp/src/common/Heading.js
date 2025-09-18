import React, {
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Typography } from "./styles";
import { LocalStateContext } from "../state/LocalState";
import { HEADING_THEME_COLOR, QUATERNARY_THEME_COLOR } from "./styles/config";

const Heading = ({ size, children, noUnderline, animate, center, style }) => {
  const [textHeight, setTextHeight] = useState(0);
  const { activeCommunity } = useContext(LocalStateContext);

  const handleTextLayout = useCallback((event) => {
    setTextHeight(event.nativeEvent.layout.height);
  }, []);
  const sizeMap = {
    lg: Typography.lgHeading,
    md: Typography.mdHeading,
    sm: Typography.smHeading,
  };

  const fontSize = sizeMap[size] || sizeMap.sm;
  const underlineHeight = size === "sm" ? 4 : 8;
  const titleStyleCenter = center ? { textAlign: "center" } : {};

  const animation = useRef(new Animated.Value(0)).current;
  useLayoutEffect(() => {
    if (animate) {
      animation.setValue(0);
      Animated.timing(animation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start();
    } else {
      animation.setValue(1);
    }
  }, [children, noUnderline, animate]); // restart animation when things change

  const underlineWidth = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const styles = localStyles(activeCommunity);

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.container}>
        <Text
          style={[titleStyleCenter, { ...styles.title, fontSize }]}
          onLayout={handleTextLayout}
        >
          {children}
        </Text>
        {!noUnderline && (
          <Animated.View
            style={{
              ...styles.titleUnderline,
              height: underlineHeight,
              width: underlineWidth,
            }}
          />
        )}
      </View>
    </View>
  );
};

const localStyles = (activeCommunity) => {
  const isBridged = activeCommunity && activeCommunity.bridge_id !== null;

  return StyleSheet.create({
    wrapper: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    container: {
      alignItems: "center",
    },
    title: {
      ...Typography.appTitle,
      position: "relative",
      zIndex: 1,
      paddingBottom: 4,
    },
    titleUnderline: {
      position: "absolute",
      bottom: 8,
      left: 0,
      right: 0,
      backgroundColor: isBridged ? QUATERNARY_THEME_COLOR : HEADING_THEME_COLOR,
      zIndex: 0,
    },
  });
};

export default Heading;
