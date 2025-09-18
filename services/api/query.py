import requests
import os
import logging
import functools

import json
from ariadne import QueryType, MutationType

import api.resolvers as resolvers
import api.content_mod.resolvers as mod_resolvers
import api.bridged_round.resolvers as b_round_resolvers
from api.version import VERSION
from api.time import time

import random


query = QueryType()
mutation = MutationType()

logger = logging.getLogger("api.query")


def wrap(root, qtype):
    """Helper function that annotates the GQL query name in the context so
    that we can time and log other useful output.

    """

    def add_context(f, _, info, **kwargs):
        logger.debug("gql query: %s", qtype)
        prefix = "query"
        if root is mutation:
            prefix = "mutation"
        info.context["gql-query"] = f"{prefix}.{qtype}"
        return f(_, info, **kwargs)

    def wrap(f):
        return root.field(qtype)(functools.partial(add_context, f))

    return wrap


@wrap(query, "ping")
def resolve_hello(_, info):
    logger.info("auth0: %s", info.context["auth0"])
    # fixme: we should be doing something more semantic like below. This will require an app update.
    # return { "up": True,
    #          "version": VERSION }
    return "pong (api version: %s)" % VERSION


@wrap(query, "communities")
def resolve_communities(
    _, info, start=None, limit=None, my=False, access=None, bridges=False
):
    communities = resolvers.Communities(info.context, start, limit, my, access, bridges)
    return communities.all()


@wrap(query, "personas")
def resolve_personas(_, info, start=None, limit=None, pkh=None):
    personas = resolvers.Personas(info.context, start, limit, pkh)
    return personas.all()


@wrap(query, "posts")
def resolve_posts(_, info, start=None, limit=None):
    posts = resolvers.Posts(info.context, start, limit)
    return posts.all()


@wrap(query, "prompts")
def resolve_prompts(_, info, start=None, limit=None):
    prompts = resolvers.Prompts(info.context, start, limit)
    return prompts.all()


@wrap(query, "rounds")
def resolve_rounds(
    _, info, how_many=None, status=None, prompt_id=None, community_id=None
):
    rounds = resolvers.Rounds(info.context, how_many, status, prompt_id, community_id)
    return rounds.all()


@wrap(query, "siwfURI")
def resolve_siwf_uri(_, info):
    return resolvers.SIWFAccounts.get_uri(info.context)


@wrap(query, "siwfMsaId")
def resolve_siwf_msa_id(_, info, control_key):
    return resolvers.SIWFAccounts.get_msa_id(info.context, control_key)


## mutations ##

@wrap(mutation, "siwfLogin")
def resolve_siwf_login(_, info, auth_code):
    return resolvers.SIWFAccounts.login(info.context, auth_code)


# creates a persona
@wrap(mutation, "createPersona")
def resolve_create_persona(_, info, name, bio, pkh, msa_id=None):
    logger.info("Calling createPersona %s %s", name, pkh)

    # Call the create_persona function to create the persona
    persona = resolvers.personas.create_persona(info.context, name, bio, pkh)

    if persona and msa_id:
        resolvers.SIWFAccounts.insert_frequency_metadata(info.context, persona.id, msa_id)

    return persona


@wrap(mutation, "updateProfilePicture")
def resolver_update_profile_pic(_, info, pkh, image_id):
    logger.info("Calling updateProfilePicture %s %s", pkh, image_id)
    persona = resolvers.Personas.update_profile_pic(info.context, pkh, image_id)
    return persona


@wrap(mutation, "removeProfilePicture")
def resolver_remove_profile_pic(_, info, pkh):
    logger.info("Calling removeProfilePicture %s", pkh)
    persona = resolvers.Personas.remove_profile_pic(info.context, pkh)
    return persona


@wrap(mutation, "removePersonaPrompt")
def resolver_remove_persona_prompt(_, info, pkh, prompt_id):
    logger.info("Calling removePersonaPrompt %s", pkh)
    prompt = resolvers.Personas.remove_persona_prompt(info.context, pkh, prompt_id)
    return prompt


# updates persona info
@wrap(mutation, "updatePersona")
def resolve_update_persona(_, info, pkh, name, bio):
    # Assuming you have an active SQLAlchemy session available in 'info.context'
    logger.info("Calling updatePersona %s %s", pkh, name)

    # fixme: here we should check that the request to update the user
    # is signed by the pubkey that the pkh refers to

    # Call the update_user_data function to update the user's data
    updated_persona = resolvers.personas.update_persona(info.context, pkh, name, bio)
    return updated_persona


@wrap(mutation, "createPost")
def resolve_create_post(
    _,
    info,
    text,
    audio_id,
    community_id,
    foraConv_id=None,
    in_reply_to=None,
):
    author_id = get_author_id_from_context(info.context)
    logger.info("Creating a new post")

    new_post = resolvers.posts.create_post(
        context=info.context,
        text=text,
        community_id=community_id,
        author_id=author_id,
        foraConv_id=foraConv_id,
        in_reply_to=in_reply_to,
        audio_id=audio_id,
    )

    return new_post


@wrap(mutation, "createPrompt")
def resolve_create_prompt(
    _,
    info,
    text,
    community_id,
    author_id,
    foraConv_id=None,
    in_reply_to=None,
):
    logger.info("Creating a new prompt with associated post")

    # creates random number for ordering priorities
    priority = random.randint(1, 1000)
    # Call a function to create a new prompt with an associated post
    # You'll need to define and implement this function in your api.resolvers.prompts module
    result = resolvers.prompts.create_prompt_with_post(
        info.context,
        text,
        community_id,
        author_id,
        foraConv_id,
        in_reply_to,
        priority,
    )

    new_prompt = {
        "id": result["prompt_id"],
        "status": "eligible",
        "priority": priority,  # going to need to change this when I change priority in prompts.py
        "post_id": result["post_id"],
        # "text": text,
        # "audio_id": audio_id,
        # "community_id": community_id,
        # "author_id": author_id,
        # "foraConv_id": foraConv_id,
        # "in_reply_to": in_reply_to,
    }

    # Return the IDs of the newly created prompt and post (optional)
    return new_prompt


@wrap(mutation, "createRound")
def resolve_create_round(_, info, start_time=None, completion_time=None, end_time=None):
    logger.info("Creating a new round")

    # Get the ID of the prompt with the lowest priority
    lowest_priority_prompt = resolvers.prompts.get_lowest_priority_prompt(info.context)

    if lowest_priority_prompt:
        # Create a new round with the selected prompt
        new_round_id = resolvers.rounds.Rounds.create(
            info.context,
            lowest_priority_prompt.id,
            start_time,
            completion_time,
            end_time,
        )

        new_round = {
            "id": new_round_id,
            "prompt_id": lowest_priority_prompt.id,
            "creation_time": time.utcnow(),  # might need to change this # FIXME NEED TO READ FROM THE CREATED ROUND, not manual
            "start_time": start_time,
            "end_time": end_time,
        }

        # Return the ID of the newly created round (optional)
        return new_round
    else:
        raise ValueError("No prompts available to create a round")


@wrap(mutation, "forceNextRound")
def resolve_force_next_round(_, info, community_id, duration=None):
    logger.info(f"Calling forceNextRound for community.id {community_id}")
    logger.info(f"next_round duration {duration}")
    community = resolvers.Communities.get(info.context, community_id)
    response = community.move_to_next_round(
        force=True, printfn=logger.info, duration=duration
    )
    new_round = response.get("round")
    return new_round


@wrap(mutation, "forceCloseActiveRound")
def resolve_force_close_round(_, info, community_id):
    logger.info(f"Calling forceCloseActiveRound for community.id {community_id}")
    community = resolvers.Communities.get(info.context, community_id)
    new_round = community.close_active_round(force=True, printfn=logger.info)
    return new_round


@wrap(mutation, "registerPkhToCommunity")
def resolve_register_pkh_to_community(_, info, pkh, community_id, mode):
    logger.info(f"Calling registerPkhToCommunity for community.id {community_id}")
    community = resolvers.Communities.get(info.context, community_id)
    persona = resolvers.Personas.get(info.context, pkh=pkh)
    response = community.handle_registration(persona, mode)
    return response


@wrap(mutation, "registerRoleInCommunity")
def resolve_register_role_in_community(_, info, pkh, community_id, role, mode):
    logger.info(f"Calling registerRoleInCommunity for community.id {community_id}")
    community = resolvers.Communities.get(info.context, community_id)
    persona = resolvers.Personas.get(info.context, pkh=pkh)
    response = community.handle_role(persona, role, mode)
    return response


@wrap(mutation, "registerPermInCommunity")
def resolve_register_perm_in_community(_, info, pkh, community_id, perm, mode):
    logger.info(f"Calling registerPermInCommunity for community.id {community_id}")
    community = resolvers.Communities.get(info.context, community_id)
    persona = resolvers.Personas.get(info.context, pkh=pkh)
    response = community.handle_permission(persona, perm, mode)
    return response


@wrap(mutation, "registeFlagInCommunity")
def resolve_register_flag_in_community(_, info, community_id, flag, mode):
    logger.info(f"Calling registeFlagInCommunity for community.id {community_id}")
    community = resolvers.Communities.get(info.context, community_id)
    actions = {"add": community.add_flag, "delete": community.remove_flag}
    response = actions[mode](flag)
    return response


@wrap(mutation, "addFCMToken")
def resolve_create_persona_fcm_token(_, info, token):
    author_id = get_author_id_from_context(info.context)
    response = resolvers.FCMTokens.create(info.context, author_id, token)
    return response


@wrap(query, "community")
def resolve_community(_, info, id):
    # GET `community` given `community.id``
    logger.info(f"Calling GET community for community.id {id}")
    community = resolvers.Communities.get(info.context, id)
    return community


@wrap(query, "round")
def resolve_round(_, info, id):
    # GET `round` given `round.id``
    logger.info(f"Calling GET round for round.id {id}")
    round = resolvers.Rounds.get(info.context, id)
    return round


@wrap(query, "post")
def resolve_post(_, info, id):
    # GET `post` given `post.id``
    logger.info(f"Calling GET post for post.id {id}")
    post = resolvers.Posts.get(info.context, id)
    return post


@wrap(query, "promptReplies")
def resolve_prompt_replies(_, info, prompt_id, first=None, after=None):
    logger.info(f"Calling GET pagedPromptReplies for prompt.id {prompt_id}")
    prompt = resolvers.Prompts.get(info.context, prompt_id)
    replies = prompt.get_replies(first, after)
    return replies


@wrap(query, "audio")
def resolve_audio(_, info, id):
    # GET `audio` given `audio.id``
    logger.info(f"Calling GET audio for audio.id {id}")
    audio = resolvers.Audios.get(info.context, id)
    return audio


@wrap(query, "image")
def resolve_image(_, info, id, w=None, h=None):
    # GET `image` given `image.id``
    logger.info(f"Calling GET image for image.id {id}")
    image = resolvers.Images.get(info.context, id, w, h)
    return image


@wrap(mutation, "uploadUserAudio")
def resolve_upload_audio(_, info, audio_file):
    snippet = audio_file[:50]
    logger.info(f"Calling UPLOAD audio for audio_file {snippet}...")
    audio = resolvers.Audios.create(info.context, audio_file)
    return audio


@wrap(mutation, "uploadUserImage")
def resolve_upload_image(_, info, image_file):
    logger.info("Calling UPLOAD image for image_file")  # {image_file}
    image = resolvers.Images.create(info.context, image_file)
    return image


@wrap(query, "personaCanPost")
def resolve_persona_can_post(_, info, pkh, round_id):
    round = resolvers.Rounds.get(info.context, id=round_id)
    persona = resolvers.Personas.get(info.context, pkh=pkh)
    if persona is None:
        return False
    return persona.can_post_to(round)


@wrap(query, "personaCanPlayRound")
def resolve_persona_can_play_round(_, info, pkh, round_id):
    round = resolvers.Rounds.get(info.context, id=round_id)
    persona = resolvers.Personas.get(info.context, pkh=pkh)
    if persona is None:
        return False
    return persona.can_play_round(round)


@wrap(query, "personaRoundActions")
def resolve_persona_round_actions(_, info, pkh, round_id):
    round = resolvers.Rounds.get(info.context, id=round_id)
    persona = resolvers.Personas.get(info.context, pkh=pkh)
    if persona is None:
        return False
    actions = {
        "can_post_to": persona.can_post_to(round),
        "can_play_round": persona.can_play_round(round),
    }
    return actions


@wrap(query, "personaCommunityPermissions")
def resolve_persona_community_actions(_, info, pkh, community_id):
    persona = resolvers.Personas.get(info.context, pkh=pkh)
    community = resolvers.Communities.get(info.context, id=community_id)
    return persona.user_permissions(community)


@wrap(query, "personaPermissions")
def resolve_persona_actions(_, info, pkh):
    persona = resolvers.Personas.get(info.context, pkh=pkh)
    return persona.persona_global_permissions


@wrap(query, "personaRoleInCommunity")
def resolve_persona_role_in_community(_, info, pkh, community_id):
    community = resolvers.Communities.get(info.context, id=community_id)
    persona = resolvers.Personas.get(info.context, pkh=pkh)
    if persona is None:
        return []
    return persona.role_in_community(community)


@wrap(query, "getAllCommunityPerms")
def resolve_get_all_community_perms(_, info, community_id):
    from api.resolvers.permissions import Permissions

    return Permissions.metadata["permissions"]


@wrap(mutation, "joinPublicCommunity")
def resolve_join_public_community(_, info, community_id):
    pkh = get_auth_pkh(info.context)
    persona = resolvers.Personas.get(info.context, pkh=pkh)
    community = resolvers.Communities.get(info.context, id=community_id)
    return persona.join_community(community)


def get_auth_pkh(context):
    return context.get("auth0", [])[0]


def get_author_id_from_context(context):
    pkh = context.get("auth0", {})[0]
    if not pkh:
        return None

    personas_resolver = resolvers.personas.Personas(context, None, None, pkh)
    persona = personas_resolver.all()
    if not persona:
        # No matching pkh found in the database
        return None

    return persona[0]._fields["id"]


@wrap(query, "debugPassword")
def resolve_debug_password(_, info):
    return "odessa-team"


@wrap(mutation, "personaCreateCommunity")
def resolve_create_community(_, info, pkh, name, description, members_desc, metadata):
    persona = resolvers.Personas.get(info.context, pkh=pkh)
    values = {
        "name": name,
        "description": description,
        "members_desc": members_desc,
        "metadata": json.dumps({"behaviors": json.loads(metadata)}),
        "creator_id": persona.id,
        "access": "private",
    }
    new_id = resolvers.Communities.create(info.context, **values)
    community = resolvers.Communities.get(info.context, new_id)
    assert community.handle_registration(persona, "register") == "registered"
    assert community.handle_role(persona, "owner", "add") == "Added"
    return new_id


@wrap(mutation, "personaUpdatesCommunity")
def resolve_update_community(
    _, info, community_id, name="", description="", members_desc="", metadata=""
):
    values = {
        "name": name,
        "description": description,
        "members_desc": members_desc,
        "metadata": json.dumps({"behaviors": json.loads(metadata)}),
    }
    if not len(name):
        del values["name"]
    if not len(description):
        del values["description"]
    if not len(members_desc):
        del values["members_desc"]
    if not len(metadata):
        del values["metadata"]

    community = resolvers.Communities.update(info.context, community_id, values)
    return community


@wrap(mutation, "forceModCheckPosts")
def resolve_force_mode_check_posts(_, info, community_id):
    # FIXME: unused. Leaving for reference.
    logger.info(f"Calling forceModCheckPosts for community.id {community_id}")
    pkh = get_auth_pkh(info.context)
    persona = resolvers.Personas.get(info.context, pkh=pkh)
    community = resolvers.Communities.get(info.context, community_id)
    active_replies = community.active_round.prompt.replies
    response = {
        "mods": persona.run_ai_mod(
            community=community, posts=active_replies, request_mod_reviews=True
        )
    }
    response = json.dumps(response)
    return response


@wrap(mutation, "personaDisputePost")
def resolve_persona_dispute_post(_, info, post_id, comment, community_id=None):
    logger.info(f"Calling personaDisputePost for post.id {post_id}")

    ctype = "a"
    if community_id is None:
        community = resolvers.Posts.get(info.context, post_id).community
        community_id = community.id
    else:
        community = resolvers.Communities.get(info.context, community_id)
    ctype = "ab" if community.is_bridge else ctype

    pkh = get_auth_pkh(info.context)
    disputer_id = resolvers.Personas.get(info.context, pkh=pkh).id
    new_dispute_id = mod_resolvers.Disputes.persona_create(
        context=info.context,
        post_id=post_id,
        disputer_id=disputer_id,
        comment=comment,
        ctype=ctype,
        community_id=community_id,
        request_mod_reviews=True,
    )
    return new_dispute_id


@wrap(query, "getCommunityDisputes")
def resolve_get_community_disputes(_, info, community_id):
    logger.info(f"Calling getCommunityDisputes for community.id {community_id}")
    community = resolvers.Communities.get(info.context, id=community_id)
    disputes = mod_resolvers.Disputes(
        info.context, community=community, status="pending"
    ).all()
    return disputes


@wrap(query, "getPersonaDisputes")
def resolve_get_persona_disputes(_, info, community_id):
    pkh = get_auth_pkh(info.context)
    persona = resolvers.Personas.get(info.context, pkh=pkh)
    logger.info(f"Calling getPersonaDisputes for persona.id {persona.id}")
    community = resolvers.Communities.get(info.context, id=community_id)
    disputes = mod_resolvers.Disputes(
        info.context, community=community, disputer=persona
    ).all()
    return disputes


@wrap(mutation, "updateModReview")
def resolve_update_mod_review(_, info, review_id, metadata):
    review = mod_resolvers.Reviews.get(info.context, review_id)
    return review.update_metadata(metadata)


@wrap(query, "dispute")
def resolve_dispute(_, info, id):
    logger.info(f"Calling GET dispute for dispute.id {id}")
    dispute = mod_resolvers.Disputes.get(info.context, id)
    return dispute


@wrap(mutation, "createBridgedPrompt")
def resolve_create_bridged_prompt(
    _,
    info,
    pkh,
    text,
    community_ids,
    author_id,
):
    logger.info("createBridgedPrompt > Creating a new prompt with associated post")
    logger.info(f"{text} {community_ids} {author_id}")

    """
    1. check if a bridged_community for these ids exist, if so, swap for that id.
        1.b. if bridged_community doesn't exist. create one.
    2. flag communities as "bridged to not return by default in frontend".
    2. DB implementation:
        -
    """

    BridgedCommunities = b_round_resolvers.BridgedCommunities
    bridge_community = BridgedCommunities.get(info.context, ids=community_ids)
    logger.info(f"bridge_community 0 {bridge_community}")

    if bridge_community is None:
        logger.info(f"bridge_community IS {bridge_community}")

        bridge_community = BridgedCommunities.create(
            info.context, author_id=author_id, community_ids=community_ids
        )

    logger.info(f"bridge_community 1 {bridge_community}")

    new_prompt = resolve_create_prompt(
        _=_, info=info, text=text, community_id=bridge_community.id, author_id=author_id
    )
    return new_prompt
