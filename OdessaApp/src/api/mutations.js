import { gql } from "graphql-request";

export const UPDATE_PERSONA_MUTATION = gql`
  mutation updatePersona($pkh: String!, $name: String!, $bio: String!) {
    updatePersona(pkh: $pkh, name: $name, bio: $bio) {
      id
      name
      bio
      pkh
      image_id
    }
  }
`;

export const UPDATE_PERSONA_PROFILE_PIC = gql`
  mutation updateProfilePicture($pkh: String!, $image_id: Int!) {
    updateProfilePicture(pkh: $pkh, image_id: $image_id) {
      id
      image_id
    }
  }
`;

export const REMOVE_PERSONA_PROFILE_PIC = gql`
  mutation removeProfilePicture($pkh: String!) {
    removeProfilePicture(pkh: $pkh) {
      id
      image_id
    }
  }
`;

export const REMOVE_PERSONA_PROMPT = gql`
  mutation removePersonaPrompt($pkh: String!, $prompt_id: Int!) {
    removePersonaPrompt(pkh: $pkh, prompt_id: $prompt_id) {
      id
      status
    }
  }
`;

export const CREATE_AUDIO_MUTATION = gql`
  mutation uploadUserAudio($audio_file: Upload!) {
    uploadUserAudio(audio_file: $audio_file) {
      id
      public_url
      duration
      creation_time
    }
  }
`;

export const CREATE_IMAGE_MUTATION = gql`
  mutation uploadUserImage($image_file: Upload!) {
    uploadUserImage(image_file: $image_file) {
      id
      public_url
      description
      creation_time
      w
      h
    }
  }
`;

export const ADD_FCM_TOKEN = gql`
  mutation addFCMToken($token: String!) {
    addFCMToken(token: $token)
  }
`;

// General method to create post
export const CREATE_POST_MUTATION = gql`
  mutation createPost(
    $text: String!
    $audioId: Int!
    $communityId: Int!
    $inReplyTo: Int!
  ) {
    createPost(
      text: $text
      audio_id: $audioId
      community_id: $communityId
      in_reply_to: $inReplyTo
    ) {
      id
      text
      community_id
      in_reply_to
      audio_id
    }
  }
`;

export const CREATE_PROMPT_MUTATION = gql`
  mutation createPrompt($text: String!, $communityId: Int!, $authorId: Int!) {
    createPrompt(
      text: $text
      community_id: $communityId
      author_id: $authorId
    ) {
      id
      post_id
      priority
      status
    }
  }
`;

export const CREATE_BRIDGED_PROMPT_MUTATION = gql`
  mutation createBridgedPrompt(
    $pkh: String!
    $text: String!
    $communityIds: [Int!]
    $authorId: Int!
  ) {
    createBridgedPrompt(
      pkh: $pkh
      text: $text
      community_ids: $communityIds
      author_id: $authorId
    ) {
      id
      post_id
      priority
      status
    }
  }
`;

export const PERSONA_CREATE_COMMUNITY = gql`
  mutation personaCreateCommunity(
    $pkh: String!
    $name: String!
    $description: String!
    $members_desc: String!
    $metadata: String!
  ) {
    personaCreateCommunity(
      pkh: $pkh
      name: $name
      description: $description
      members_desc: $members_desc
      metadata: $metadata
    )
  }
`;

export const PERSONA_UPDATES_COMMUNITY = gql`
  mutation personaUpdatesCommunity(
    $community_id: Int!
    $name: String
    $description: String
    $members_desc: String
    $metadata: String
  ) {
    personaUpdatesCommunity(
      community_id: $community_id
      name: $name
      description: $description
      members_desc: $members_desc
      metadata: $metadata
    ) {
      id
      name
      description
      members_desc
      behaviors {
        encourage
        discourage
        ban
      }
    }
  }
`;

export const PERSONA_DISPUTE_POST = gql`
  mutation personaDisputePost(
    $post_id: Int!
    $comment: String
    $community_id: Int
  ) {
    personaDisputePost(
      post_id: $post_id
      comment: $comment
      community_id: $community_id
    )
  }
`;
