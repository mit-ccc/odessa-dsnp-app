import {
  GET_LATEST_ROUNDS,
  GET_ALL_POSTS_QUERY,
  GET_POST,
  GET_PERSONAS_QUERY,
  GET_PERSONA_PROMPTS,
  GET_IMAGE,
  GET_AUDIO,
  GET_ACTIVE_ROUND,
  GET_ROUND_REPLIES,
  GET_USER_CAN_POST,
  GET_USER_CAN_PLAY_ROUND,
  GET_USER_ROUND_ACTIONS,
  GET_USER_COMMUNITY_PERMISSIONS,
  GET_PERSONA_PERMISSIONS,
  GET_COMMUNITY_MEMBERS,
  GET_PERSONA_COMMUNITY_ROLE,
} from "./queries";
import {
  CREATE_POST_MUTATION,
  CREATE_PROMPT_MUTATION,
  CREATE_BRIDGED_PROMPT_MUTATION,
  UPDATE_PERSONA_MUTATION,
  CREATE_AUDIO_MUTATION,
  CREATE_IMAGE_MUTATION,
  UPDATE_PERSONA_PROFILE_PIC,
  REMOVE_PERSONA_PROFILE_PIC,
  REMOVE_PERSONA_PROMPT,
  ADD_FCM_TOKEN,
  PERSONA_CREATE_COMMUNITY,
  PERSONA_DISPUTE_POST,
  PERSONA_UPDATES_COMMUNITY,
} from "./mutations";

import { useContext } from "react";
import { LocalStateContext } from "../state/LocalState";

// used by wrappers to not need to get all the responses if just getting the
// also used in archive display page, but could possibly replace with getpostbypromptid
export const getPostById = async (api, postId) => {
  console.log("POST");
  const variables = {
    id: postId,
  };
  try {
    const { post } = await api.request(GET_POST, variables);
    console.log(post);
    return post; // This will be undefined if no post with the given ID is found
  } catch (err) {
    console.error(err);
    return null;
  }
};

// for submitting an answer on the daily prompt
export const sendAnswer = async (api, communityId, audioId, inReplyTo) => {
  console.log("sending answerrrrrr");
  const variables = {
    text: "NULL", // FIXME(bcsaldias): ADD transcripts.
    communityId: communityId,
    inReplyTo: inReplyTo,
    audioId: audioId,
    // Add other variables as necessary, such as audioLink if you're submitting audio answers
  };

  try {
    console.log("before request newpost");
    const newPost = await api.request(CREATE_POST_MUTATION, variables);
    console.log("got a result in sendAnswer");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false }; // Handle the error as you see fit
  }
};

// for getting persona for persona screen
export const get_personas_call = async (api, pkh) => {
  try {
    const variables = {
      pkh: pkh,
    };
    const personas = await api.request(GET_PERSONAS_QUERY, variables);
    return personas.personas;
  } catch (err) {
    console.error(err);
    return null; // or throw?
  }
};

// FIXME -- remove below??
// for updating a persona for persona screen
export const updatePersonaCall = async (persona) => {
  const variables = {
    pkh: persona.pkh,
    name: persona.name,
    bio: persona.bio,
  };

  try {
    // FIXME: needs to auth with api and not client.
    const response = await client.request(UPDATE_PERSONA_MUTATION, variables);
    console.log("updatePersonaCall response:", response);
    return response; // Or some specific part of the response if needed
  } catch (err) {
    console.error("updatePersonaCall error:", err);
    return null;
  }
};

export const updateProfilePicture = async (api, persona, image_id) => {
  const variables = {
    pkh: persona.pkh,
    image_id: image_id,
  };
  try {
    const response = await api.request(UPDATE_PERSONA_PROFILE_PIC, variables);
    // console.log("updateProfilePicture response:", response);
    return response; // Or some specific part of the response if needed
  } catch (err) {
    console.error("updateProfilePicture error:", err);
    return null;
  }
};

export const removeProfilePicture = async (api, persona) => {
  const variables = {
    pkh: persona.pkh,
  };
  try {
    const response = await api.request(REMOVE_PERSONA_PROFILE_PIC, variables);
    console.log("removeProfilePicture response:", response);
    return response; // Or some specific part of the response if needed
  } catch (err) {
    console.error("removeProfilePicture error:", err);
    return null;
  }
};

export const addFCMToken = async (api, token) => {
  try {
    const response = await api.request(ADD_FCM_TOKEN, { token });
    return response;
  } catch (err) {
    console.error("addFCMToken error:", err);
    return null;
  }
};

// for submitting a prompt in the profile page
export async function sendPrompt(api, text, communityId, authorId) {
  try {
    const variables = { text, communityId, authorId };
    const data = await api.rawRequest(CREATE_PROMPT_MUTATION, variables);
    console.log(data.headers);
    return { success: true, data };
  } catch (error) {
    console.error(error);
    return { success: false, error };
  }
}

export const removePrompt = async (api, prompt_id, persona) => {
  const variables = {
    pkh: persona.pkh,
    prompt_id: prompt_id,
  };

  try {
    const response = await api.request(REMOVE_PERSONA_PROMPT, variables);
    console.log("removePrompt response:", response);
    return response; // Or some specific part of the response if needed
  } catch (err) {
    console.error("removePrompt error:", err);
    return null;
  }
};

// for displaying on the profile page
export const getUnusedPromptsForUser = async (api, persona, community_id) => {
  const variables = {
    pkh: persona.pkh,
  };
  try {
    // FIXME: this filtering should go in the backend.
    const personaData = await api.request(GET_PERSONA_PROMPTS, variables);
    const personas = personaData?.personas;
    var promptData = undefined;
    if (personas.lenght > 0 && personas[0]) {
      promptData = personas[0].prompts;
    } else {
      return [];
    }
    const unusedPrompts = promptData?.filter(
      (prompt) => prompt.status === "eligible",
    );
    const unusedCommunityPrompts = unusedPrompts?.filter(
      (prompt) => prompt.post.community_id === community_id,
    );
    return unusedCommunityPrompts;
  } catch (err) {
    console.error("getUnusedPromptsForUser error:", err);
    return null;
  }
};

export async function uploadUserAudio(api, audio_path) {
  console.log("working with file", audio_path);

  var RNFS = require("react-native-fs");
  let audio_file = await RNFS.readFile(audio_path, "base64");
  const audio_format = audio_path.split(".").pop();
  audio_file = "data:audio/" + audio_format + ";base64," + audio_file;

  try {
    const variables = { audio_file };
    const data = await api.request(CREATE_AUDIO_MUTATION, variables);
    return { success: true, data };
  } catch (error) {
    console.error(error.message.slice(0, 200));
    return { success: false, error };
  }
}

export async function uploadUserImage(api, image_file, image_format) {
  image_file = "data:image/" + image_format + ";base64," + image_file;
  try {
    const variables = { image_file };
    const data = await api.request(CREATE_IMAGE_MUTATION, variables);
    return { success: true, data };
  } catch (error) {
    console.error(error);
    return { success: false, error };
  }
}

export async function getImage(api, id, w, h) {
  const variables = {
    id: id,
    w: w,
    h: h,
  };
  const data = await api.request(GET_IMAGE, variables);
  return data;
}

export async function getAudio(api, audio_id) {
  const variables = {
    id: audio_id,
  };
  const data = await api.request(GET_AUDIO, variables);
  return data;
}

// Updated version of getArchivedRounds to include post data
export const getArchivedRounds = async (api, communityId, how_many) => {
  try {
    const { rounds } = await api.request(GET_LATEST_ROUNDS, {
      community_id: communityId,
      how_many,
      status: "archived",
    });
    const prompts = rounds; //.map((r) => r.prompt);
    return prompts;
  } catch (err) {
    console.error("getArchivedRounds error:", err);
    return null;
  }
};

export const getActiveRound = async (api, community_id) => {
  const response = await api.request(GET_ACTIVE_ROUND, { id: community_id });
  const activeRound = response.community.active_round;
  return activeRound;
};

export const getRoundAnswers = async (api, round_id) => {
  const response = await api.request(GET_ROUND_REPLIES, { id: round_id });
  const round = response.round;
  return round;
};

export const userCanPost = async (api, pkh, round_id) => {
  const response = await api.request(GET_USER_CAN_POST, {
    pkh: pkh,
    round_id: round_id,
  });
  return response;
};

export const userCanPlayRound = async (api, pkh, round_id) => {
  const response = await api.request(GET_USER_CAN_PLAY_ROUND, {
    pkh: pkh,
    round_id: round_id,
  });
  return response;
};

export const getUserRoundActions = async (api, pkh, round_id) => {
  const response = await api.request(GET_USER_ROUND_ACTIONS, {
    pkh: pkh,
    round_id: round_id,
  });
  return response;
};

export const getUserCommunityPermissions = async (api, pkh, community_id) => {
  const response = await api.request(GET_USER_COMMUNITY_PERMISSIONS, {
    pkh: pkh,
    community_id: community_id,
  });
  return response.personaCommunityPermissions;
};

export const getPersonaPermissions = async (api, pkh) => {
  const response = await api.request(GET_PERSONA_PERMISSIONS, { pkh: pkh });
  return response.personaPermissions;
};

export const getPersonaCommunityRole = async (api, pkh, community_id) => {
  const response = await api.request(GET_PERSONA_COMMUNITY_ROLE, {
    pkh,
    community_id,
  });
  return response.personaRoleInCommunity;
};

// used in wrappers
export const getAnswersToPost = async (api, postId) => {
  try {
    const { posts } = await api.request(GET_ALL_POSTS_QUERY);
    const answers = posts.filter((p) => p.in_reply_to === postId); // FIXME(bcsaldias) : this filter should be handled in the backend.
    return answers.map((answer) => ({
      // FIXME: we shouldn't change these params/attrs names.
      userId: answer.author_id,
      text_answer: answer.text,
      audio_id: answer.audio_id,
      date: answer.creation_time,
      audio: answer.audio,
      author: answer.author,
    }));
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const getCommunityMembers = async (api, community_id) => {
  const info = await api.request(GET_COMMUNITY_MEMBERS, { id: community_id });
  return info.community.members;
};

export const personaCreateCommunity = async (
  api,
  pkh,
  name,
  description,
  members_desc,
  metadata,
) => {
  const variables = {
    pkh,
    name,
    description,
    members_desc,
    metadata,
  };
  const data = await api.request(PERSONA_CREATE_COMMUNITY, variables);
  return data;
};

export const personaUpdatesCommunity = async ({
  api,
  community_id,
  name,
  description,
  members_desc,
  metadata,
}) => {
  const variables = {
    community_id,
    name,
    description,
    members_desc,
    metadata,
  };
  const data = await api.request(PERSONA_UPDATES_COMMUNITY, variables);
  return data;
};

export const personaDisputePost = async (
  api,
  post_id,
  comment,
  community_id,
) => {
  const data = await api.request(PERSONA_DISPUTE_POST, {
    post_id,
    comment,
    community_id,
  });
  return data;
};

// for submitting a bridged prompt
export async function sendBridgedPrompt(api, text, communityIds, persona) {
  console.log("sendBridgedPrompt", text, communityIds, persona.id);

  // try {
  const variables = {
    text: text,
    pkh: persona.pkh,
    communityIds: communityIds,
    authorId: persona.id,
  };
  try {
    const data = await api.rawRequest(
      CREATE_BRIDGED_PROMPT_MUTATION,
      variables,
    );
    console.log(data.headers);
    return { success: true, data };
  } catch (error) {
    console.error(error);
    return { success: false, error };
  }
}
