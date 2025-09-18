// port to react native from https://github.com/urbit/sigil-js

import { SvgXml } from "react-native-svg";
import DEFAULT_INDEX from "./SigilIndex";

// Splits a string into equal-sized substrings and returns an array of these substrings.
const chunkStr = (str, size) => {
  const regex = new RegExp(`.{1,${size}}`, "g");
  const result = str.match(regex);

  if (result === null) {
    return [""];
  }

  return result;
};

const deSig = (patp) => patp.replace("~", "");

export default function Sigil({
  point,
  background = "#000",
  foreground = "#FFF",
  size = 128,
  space = "default",
}) {
  let symbolsIndex = DEFAULT_INDEX;

  // Get phonemes as array from patp input and split into array
  let phonemes = chunkStr(deSig(point).replace(/[\^~-]/g, ""), 3);

  // Point name must be valid in several ways. 1) must be a valid @p data type. 2) Must be a planet, star or galaxy.

  // Symbols are stored in the index js files as svg strings indexed by phoneme. They need to be retrieved from the index with a little bit of string processing to fill in the templated parts of the SVG, ie color.

  const innerSVG = phonemes.reduce((acc, phoneme, index) => {
    const SVGSubstring = symbolsIndex[phoneme];

    // Symbols don't know where they should be on the canvas out of the index.

    const scale = size / 256;
    const symbolTransformation =
      index === 0
        ? `scale(${scale}) translate(0,0) `
        : index === 1
          ? `scale(${scale}) translate(128,0)`
          : index === 2
            ? `scale(${scale}) translate(0,128)`
            : `scale(${scale}) translate(128,128)`;

    // Path stroke-widths should never be less than 1px wide
    const strokeWidth = size < 64 ? (256 / size).toString() : "4";

    // Symbols also don't know what color they should be. Variables in symbols are denoted with an '@'.
    // @GF = foreground color, @BG = background color, @TR = transformation applied to each symbol and @SW = stroke-width

    let newSVGSubstring = SVGSubstring.replaceAll("@FG", foreground)
      .replaceAll("@BG", background)
      .replaceAll("@TR", symbolTransformation)
      .replaceAll("@SW", strokeWidth);

    acc = acc + newSVGSubstring;
    return acc;
  }, "");

  const groupTransformation = (function f() {
    if (space === "none") {
      return phonemes.length === 1
        ? `scale(2)`
        : phonemes.length === 2
          ? ``
          : ``;
    } else if (space === "large") {
      return phonemes.length === 1
        ? `translate(${size * 0.5 - size * 0.125},${
            size * 0.5 - size * 0.125
          }) scale(0.50)`
        : phonemes.length === 2
          ? `translate(${size * 0.5 - size * 0.25},${
              size * 0.5 - size * 0.125
            }) scale(0.50)`
          : `translate(${size * 0.5 - size * 0.25},${
              size * 0.5 - size * 0.25
            }) scale(0.50)`;
    } else {
      return phonemes.length === 1
        ? `translate(${size * 0.5 - size * 0.1875},${
            size * 0.5 - size * 0.1875
          }) scale(0.75)`
        : phonemes.length === 2
          ? `translate(${size * 0.5 - size * 0.375},${
              size * 0.5 - size * 0.1875
            }) scale(0.75)`
          : `translate(${size * 0.5 - size * 0.375},${
              size * 0.5 - size * 0.375
            }) scale(0.75)`;
    }
  })();

  const svgString = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <g transform="${groupTransformation}">
      ${innerSVG}
    </g>
  </svg>`;

  return <SvgXml xml={svgString} width={`${size}`} height={`${size}`} />;
}
