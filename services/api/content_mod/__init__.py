import logging

from api.content_mod.assistant import get_basic_behav_review
from api.resolvers.flags import Flags

logger = logging.getLogger("api.mod")


def apply_community_checks(community, posts, content="audio.plain_transcript"):
    response = [assistant_checks_post(community, p, content) for p in posts]
    return response


def assistant_checks_post(community, post, content="audio.plain_transcript"):
    assert content in ["post.text", "audio.plain_transcript"], "content not allowed."

    if content == "audio.plain_transcript":
        text = post.audio.plain_transcript
    elif content == "post.text":
        text = post.text

    flags = get_basic_behav_review(community.behaviors, text)
    response = {
        "post": {
            "id": post.id,
            "text": text,
            "content": content,
        },
        "flags": flags,
    }
    logger.info("assistant_checks_post")
    logger.info(response)
    return response


def moderation_required(f):
    def wrapper(self, *args, **kargs):
        decorator = moderation_except(forbid=True, verbose=True, default=None)
        decorated_f = decorator(f)
        return decorated_f(self, *args, **kargs)

    return wrapper


def moderation_except(forbid=True, verbose=True, default=None):
    return check_flagged_community(
        ["enable_content_moderation_moderator_actions"], forbid, verbose, default
    )


def check_flagged_community(flags, forbid=True, verbose=True, default=None):
    assert isinstance(flags, list), "param flags must be of type list."
    allowed_flags = list(Flags.development_flags)
    for flag in flags:
        assert (
            flag in allowed_flags
        ), f"{flag} not available. Chose from {allowed_flags}"

    def decorator(f):
        def wrapper(self, *args, **kargs):
            if not forbid and not verbose:
                # avoiding slowness from below.
                return f(self, *args, **kargs)

            from api.content_mod.resolvers import Dispute, Disputes, Review, Reviews
            from api.resolvers import Audio, Persona, Post, Posts
            from api.bridged_round.resolvers.bridged_post import BridgedPost

            has_mod_flag = None
            community = None
            if type(self) == Post or type(self) == BridgedPost:  # noqa: E721
                community = self.community
            elif type(self) == Audio:  # noqa: E721
                community = self.post.community
            elif type(self) == Persona:  # noqa: E721
                community = kargs["community"]
            elif type(self) == Dispute:  # noqa: E721
                community = self.post.community
            elif type(self) == Review:  # noqa: E721
                community = self.dispute.post.community
            elif self == Disputes:
                context = kargs.get("context", args[0] if args else None) #, args[0])
                post_id = kargs.get("post_id", args[1] if args and len(args) > 1 else None) #, args[1] if len(args) > 1 else None)
                post = Posts.get(context, post_id)
                community = post.community
            elif self == Reviews:
                context = kargs.get("context", args[0] if args else None)
                dispute_id = kargs.get("dispute_id", args[1] if args and len(args) > 1 else None)
                dispute = Disputes.get(context, dispute_id)
                community = dispute.post.community

            if community:
                community_flags = community.flags
                has_mod_flag = all([flag in community_flags for flag in flags])

            if not has_mod_flag:
                message = (
                    "calling moderation method for community "
                    + "without enabled_mod_actions. Wrapped function: "
                    + f"{f}"
                )
                if forbid:
                    if verbose:
                        logger.error(message)
                    if default:
                        return default()
                    raise Exception(message)
                if verbose:
                    logger.warning(message)
            response = f(self, *args, **kargs)
            return response

        return wrapper

    return decorator
