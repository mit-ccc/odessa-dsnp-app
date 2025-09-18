// theme.js
import { DefaultTheme } from "react-native-paper";
import { PRIMARY_THEME_COLOR, SECONDARY_THEME_COLOR } from "../styles/config";

export const PaperTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: PRIMARY_THEME_COLOR, // or any shade of purple you prefer
    surface: PRIMARY_THEME_COLOR,
    onSurface: SECONDARY_THEME_COLOR, // text color on surface
    text: SECONDARY_THEME_COLOR,
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      ...DefaultTheme.fonts.regular,
      fontFamily: "SpaceMono-Regular", // Replace with the actual font name
    },
  },
};

export default PaperTheme;
