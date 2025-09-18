// stress tests

/*
author: bcsaldias

Run stress test.

[ ] create community.
[ ] create 10 people.
[ ] create a prompts.
[ ] get 50 audios.
[ ] for each audio: create audio and post
[ ] request activeRound
[ ] fetch paginated responses

*/

var RNFS = require("react-native-fs");
import { gql } from "graphql-request";
import { LocalStateContext } from "../state/LocalState";
import {
  personaCreateCommunity,
  uploadUserAudio,
  sendAnswer,
  getActiveRound,
} from "../api/wrappers";
import { GET_PROMPT_REPLIES_PAGE } from "../api/queries";
import { useContext } from "react";

const CREATE_PERSONA_MUTATION = gql`
  mutation createPersona($pkh: String!, $name: String!, $bio: String!) {
    createPersona(pkh: $pkh, name: $name, bio: $bio) {
      id
      name
      bio
      pkh
    }
  }
`;

export const JOIN_PUPLIC_COMMUNITY = gql`
  mutation joinPublicCommunity($community_id: Int!) {
    joinPublicCommunity(community_id: $community_id)
  }
`;

const requestResponses = async (api, prompt_id, first = 6, cursor = null) => {
  const response = await api.request(GET_PROMPT_REPLIES_PAGE, {
    prompt_id: prompt_id,
    first: first,
    after: cursor === 0 ? null : cursor,
  });
  const nextCursor = parseInt(response.promptReplies.pageInfo.endCursor);
  console.log(
    "requestResponses",
    response.promptReplies.edges.length,
    prompt_id,
    cursor,
    "nextCursor",
    nextCursor,
  );
  return nextCursor;
};

export const RunStressTest = async () => {
  // this line makes it so that tests are not run actually.
  return <></>;

  const { api, activePersona } = useContext(LocalStateContext);

  const createPost = (communityId, audioId, postId) => {
    sendAnswer(api, communityId, audioId, postId)
      .then((response) => {
        if (response.success) {
          console.log("Answer submitted successfully");
        }
      })
      .catch((error) => {
        console.error("Failed to submit answer", error);
      });
  };

  console.log(RNFS.ExternalStorageDirectoryPath);
  console.log(api.url);

  let files = await RNFS.readDir(
    // "/data/data/com.odessaapp/cache/data/user/0/tests/",
    "file:///Users/belensaldias/Library/Developer/CoreSimulator/Devices/79091CBA-C621-4508-931C-DCD78CD4E81A/data/Containers/Data/Application/8FEA65D6-9FAE-4273-89AF-4EF59FFD5DEA/Library/Caches/tests/",
  );
  files.slice(0, 20).forEach((file) => {
    console.log("file.path", file.path.split("/")[16]);
    uploadUserAudio(
      api,
      file.path,
      // "/data/data/com.odessaapp/cache/data/user/0/tests/217_full.mp3",
    ).then(async (resp) => {
      console.log(resp["data"]["uploadUserAudio"]["public_url"]),
        (audioId = resp["data"]["uploadUserAudio"]["id"]);
      await createPost(18, audioId, 1623);
      round = await getActiveRound(api, 18);
      const num_replies = round.prompt.num_replies;
      for (let i = 0; i < Math.trunc(40 / 6) + 1; i++) {
        // num_replies / 6
        await requestResponses(api, round.prompt.id, (cursor = i));
      }
    });
  });

  return <></>;
};
