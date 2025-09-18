export const useEnabledCommunityBehaviors = (activeCommunity) => {
  const enabledShowCommunityInfo = activeCommunity?.flags.includes(
    "enable_display_community_behaviors",
  );

  return enabledShowCommunityInfo;
};

export const useEnabledBridgedRound = (activeCommunity) => {
  // console.log('activeCommunity?.flags', activeCommunity.name, activeCommunity?.flags)
  const enabledFlag =
    activeCommunity?.flags.includes("enable_bridged_round") &&
    activeCommunity &&
    activeCommunity.bridge_id === null;
  return enabledFlag;
};
