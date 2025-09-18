import React, { memo } from "react";
import seedrandom from "seedrandom";

import Sigil from "./Sigil";
import DEFAULT_INDEX from "./Sigil/SigilIndex";
import {
  HEADING_THEME_COLOR,
  PRIMARY_THEME_COLOR,
  QUINARY_THEME_COLOR,
  TERTIARY_THEME_COLOR,
} from "./styles/config";

const CommunityAvatar = ({ size = "sm", community }) => {
  const sigilDimension = {
    xs: 20,
    sm: 40,
    md: 64,
    lg: 125,
  }[size];

  const rng = seedrandom(community.id);
  const sigilOptions = Object.keys(DEFAULT_INDEX);
  const selectedOptions = [];

  const numQuadrants = 4;
  for (let i = 0; i < numQuadrants; i++) {
    const index = Math.floor(rng() * sigilOptions.length);
    selectedOptions.push(sigilOptions.splice(index, 1)[0]);
  }

  const isBridged = community && community.bridge_id !== null;

  return (
    <Sigil
      point={`~${selectedOptions.join("~")}`}
      size={sigilDimension}
      background={isBridged ? TERTIARY_THEME_COLOR : PRIMARY_THEME_COLOR}
    />
  );
};

export default memo(CommunityAvatar);
