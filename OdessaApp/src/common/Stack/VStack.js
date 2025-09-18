import React from "react";
import { View } from "react-native";

import { Spacing } from "../styles";

const VStack = ({ children, style, spacing }) => {
  // optional spacing values
  const spacingValues = {
    sm: Spacing.sm,
    md: Spacing.md,
    lg: Spacing.lg,
    xl: Spacing.xl,
    xxl: Spacing.xxl,
  };
  const spacingValue = spacing ? spacingValues[spacing] : 0;

  const childrenWithSpacing = React.Children.map(children, (child, index) => {
    return (
      <View
        style={{ marginBottom: index < children.length - 1 ? spacingValue : 0 }}
      >
        {child}
      </View>
    );
  });

  return (
    <View style={[{ flexDirection: "column" }, style]}>
      {childrenWithSpacing}
    </View>
  );
};

export default VStack;
