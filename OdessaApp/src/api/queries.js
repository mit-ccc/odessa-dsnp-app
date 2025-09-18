import { gql } from "graphql-request";

export const GET_ALL_POSTS_QUERY = gql`
  query {
    posts {
      id
      text
      community_id
      author_id
      in_reply_to
      creation_time
      audio_id
      audio {
        id
        public_url
        duration
      }
      author {
        id
        name
      }
    }
  }
`;

export const GET_PERSONAS_QUERY = gql`
  query personas($pkh: String!) {
    personas(pkh: $pkh) {
      id
      name
      bio
      pkh
      msa_handle
      communities {
        id
        name
      }
      image_id
    }
  }
`;

export const GET_PERSONA_PROMPTS = gql`
  query personas($pkh: String!) {
    personas(pkh: $pkh) {
      prompts {
        id
        post_id
        priority
        status
        num_replies
        author {
          id
          name
        }
        post {
          id
          text
          creation_time
          audio_id
          community_id
        }
      }
    }
  }
`;

export const GET_LATEST_ROUNDS = gql`
  query getLatestRounds($community_id: Int, $how_many: Int, $status: String) {
    rounds(community_id: $community_id, how_many: $how_many, status: $status) {
      id
      prompt_id
      creation_time
      start_time
      completion_time
      end_time
      community_id
      status
      recording_constraint {
        length
        alert_length
      }
      prompt {
        id
        post_id
        priority
        status
        num_replies
        author {
          id
          name
        }
        post {
          id
          text
          creation_time
          audio_id
          community_id
          author {
            id
            name
            bio
            image_id
          }
        }
      }
    }
  }
`;

export const GET_ACTIVE_ROUND = gql`
  query community($id: Int!) {
    community(id: $id) {
      id
      description
      active_round {
        status
        id
        completion_time
        end_time
        start_time
        recording_constraint {
          length
          alert_length
        }
        prompt {
          id
          priority
          status
          num_replies
          post {
            id
            text
            creation_time
            audio_id
            author {
              id
              name
              image_id
              pkh
              bio
            }
          }
        }
      }
    }
  }
`;

export const GET_USER_CAN_POST = gql`
  query personaCanPost($pkh: String!, $round_id: Int!) {
    personaCanPost(pkh: $pkh, round_id: $round_id)
  }
`;

export const GET_USER_CAN_PLAY_ROUND = gql`
  query personaCanPlayRound($pkh: String!, $round_id: Int!) {
    personaCanPlayRound(pkh: $pkh, round_id: $round_id)
  }
`;

export const GET_USER_ROUND_ACTIONS = gql`
  query personaRoundActions($pkh: String!, $round_id: Int!) {
    personaRoundActions(pkh: $pkh, round_id: $round_id) {
      can_post_to
      can_play_round
    }
  }
`;

export const GET_USER_COMMUNITY_PERMISSIONS = gql`
  query personaCommunityPermissions($pkh: String!, $community_id: Int!) {
    personaCommunityPermissions(pkh: $pkh, community_id: $community_id) {
      roles
      groups
      permissions
    }
  }
`;

export const GET_PERSONA_PERMISSIONS = gql`
  query personaPermissions($pkh: String!) {
    personaPermissions(pkh: $pkh) {
      roles
      groups
      permissions
    }
  }
`;

export const GET_PERSONA_COMMUNITY_ROLE = gql`
  query personaRoleInCommunity($pkh: String!, $community_id: Int!) {
    personaRoleInCommunity(pkh: $pkh, community_id: $community_id)
  }
`;

// FIXME(bcsaldias): I'm not sure we need this, given GET_LATEST_ROUNDS.
// I'd recommend we do pagination for a better experience.
export const GET_ROUND_REPLIES = gql`
  query round($id: Int!) {
    round(id: $id) {
      status
      id
      completion_time
      end_time
      start_time
      recording_constraint {
        length
        alert_length
      }
      prompt {
        id
        priority
        status
        num_replies
        post {
          id
          text
          creation_time
          audio_id
          author {
            id
            name
            image_id
            pkh
            bio
          }
        }
      }
    }
  }
`;

export const GET_POST_PENDING_AUTHOR_DISPUTES = gql`
  query post($post_id: Int!) {
    post(id: $post_id) {
      author_pending_disputes {
        id
        status
        metadata
        creation_time
        resolved_time
        note_by_disputer
        post {
          id
          text
          creation_time
          audio {
            id
            public_url
            duration
            transcripts {
              start
              end
              text
            }
            plain_transcript
          }
          author {
            id
            name
            image_id
            pkh
            bio
          }
          round {
            id
            creation_time
            start_time
            status
            prompt {
              id
              num_replies
              author {
                id
                name
              }
              post {
                id
                text
                creation_time
                author {
                  id
                  name
                  bio
                  image_id
                }
              }
            }
          }
        }
        disputer {
          id
          name
          image_id
          pkh
          bio
        }
        reviews {
          id
          status
          creation_time
          metadata
          reviewer_id
          action
          note_by_reviewer
        }
      }
    }
  }
`;

export const GET_PROMPT_REPLIES_PAGE = gql`
  query promptReplies($prompt_id: Int!, $first: Int, $after: Int) {
    promptReplies(prompt_id: $prompt_id, first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          creation_time
          text
          processing_status
          display_lenses
          ai_mod_output
          audio {
            id
            public_url
            duration
            transcripts {
              start
              end
              text
            }
            plain_transcript
          }
          author {
            id
            name
            image_id
            pkh
            bio
            known_by_requester
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

export const GET_PROMPT_REPLY = gql`
  query post($post_id: Int!) {
    post(id: $post_id) {
      id
      creation_time
      text
      processing_status
      display_lenses
      ai_mod_output
      audio {
        id
        public_url
        duration
        transcripts {
          start
          end
          text
        }
        plain_transcript
      }
      author {
        id
        name
        image_id
        pkh
        bio
      }
    }
  }
`;

export const GET_AUDIO = gql`
  query audio($id: Int!) {
    audio(id: $id) {
      id
      duration
      creation_time
      public_url
      wave_values
      transcripts {
        start
        end
        text
      }
      plain_transcript
    }
  }
`;

export const GET_IMAGE = gql`
  query image($id: Int!, $w: Int, $h: Int) {
    image(id: $id, w: $w, h: $h) {
      id
      public_url
      w
      h
    }
  }
`;

export const GET_POST = gql`
  query post($id: Int!) {
    post(id: $id) {
      id
      text
      audio_id
      is_prompt
      prompt {
        id
        status
      }
      author {
        id
        name
        image_id
        bio
      }
    }
  }
`;

export const GET_COMMUNITY_MEMBERS = gql`
  query community($id: Int!) {
    community(id: $id) {
      id
      description
      members {
        id
        name
        bio
        image_id
        pkh
      }
    }
  }
`;
