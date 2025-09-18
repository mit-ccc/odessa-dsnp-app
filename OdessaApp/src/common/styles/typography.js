import * as Colors from "./colors";

export const titleFontFamily = "NotoSerif-Regular";
export const bodyFont = "SpaceMono-Regular";

// font sizes
export const smHeading = 16;
export const mdHeading = 24;
export const lgHeading = 36;

export const xxs = 10;
export const xs = 12;
export const sm = 14;
export const md = 16;
export const lg = 18;
export const xl = 20;

export const appTitle = {
  fontSize: 18,
  color: Colors.defaultText,
  fontFamily: titleFontFamily,
};

export const body = {
  fontFamily: bodyFont,
  fontSize: sm,
};

export const bodyDark = {
  ...body,
  color: Colors.darkText,
};

export const bodyLight = {
  ...body,
  color: Colors.lightText,
};
