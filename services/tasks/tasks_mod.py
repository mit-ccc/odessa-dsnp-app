from invoke import task

from tasks_admin import with_db_context
from api.resolvers import Posts, Communities, Personas
from api.content_mod.resolvers import Disputes
from api.assets import AudioBucket


@task
def process_pending_post(c, cid=None, pid=None, verbose=False):
    """
    Processes posts.

    Example:
        invoke process-pending-posts -c INT -p INT
    """
    assert cid is not None or pid is not None, "must provide either cid or pid."
    assert cid is None or pid is None, "only one cant be not None."
    if verbose:
        print(f"\n>>> $ invoke process-pending-post -c {cid} -p {pid}")
    if cid is not None:
        handle_process_community_posts(community_id=cid, verbose=verbose)
    elif pid is not None:
        handle_process_post(post_id=pid, verbose=verbose)


@task
def fasttrack_dispute_to_mod(c, pid=None, verbose=False):
    """
    Automatically release posts hold by posters to moderators.

    Example:
        invoke fasttrack-dispute-to-mod -p INT
    """
    assert pid is not None, "must provide pid."
    if verbose:
        print(f"\n>>> $ invoke fasttrack-dispute-to-mod -p {pid}")
    handle_fasttrack_dispute_to_mod(pid, verbose)


@task
def assing_pending_disputes(c, cid=None, pid=None, verbose=False):
    """
    Assings pending disputes to persona with id `pid` as long as
    that persona has membership in and is a moderator in community with id `cid`.

    Example:
        invoke assing-pending-disputes -cid INT -pid INT
    """
    assert cid is not None and pid is not None, "cid and pid must be INT."
    handle_assing_pending_disputes(community_id=cid, reviewer_id=pid, verbose=verbose)


@with_db_context
def handle_process_community_posts(context, community_id, verbose=False):
    bucket = AudioBucket()
    posts = Posts(context, community_id=community_id).all()
    for post in posts:
        handle_process_post(bucket=bucket, post=post, verbose=verbose)


@with_db_context
def handle_process_post(context, bucket=None, post=None, post_id=None, verbose=False):
    if bucket is None:
        bucket = AudioBucket()
    if post is None:
        post = Posts.get(context, id=post_id)

    if not post.is_prompt:
        status_dict = post.processing_status_dict
        mp3 = status_dict.get("mp3", False)
        waveform = status_dict.get("waveform", False)
        transcript = status_dict.get("transcript", False)
        ai_moderated = status_dict.get("ai_moderated", False)

        if mp3 and waveform and transcript and ai_moderated:
            return

        print(f"cid {post.community_id} -pid {post.id}")

        audio = bucket.process_audio_from_aws(
            post.audio_id,
            context=context,
            mp3=True,
            waveform=not waveform,
            transcipt=not transcript,
            ai_moderate=not ai_moderated,
            verbose=verbose,
        )
        return audio


@with_db_context
def handle_fasttrack_dispute_to_mod(context, pid, verbose):
    post = Posts.get(context, id=pid)
    disputes = Disputes(
        context,
        post=post,
        status="pending",
        reviews_status="requested",
        reviewer=post.author,
    )
    place_holder = (
        """{ "action":"release", "sub_actions": {"with note": "fasttrack task"}}"""
    )
    if verbose:
        print([{d.id: [r.id for r in d.reviews]} for d in disputes.all()])
    results = [
        {d.id: [r.update_metadata(place_holder) for r in d.reviews]}
        for d in disputes.all()
    ]
    if verbose:
        print(results)
    return results


@with_db_context
def handle_assing_pending_disputes(
    context, community_id=None, reviewer_id=None, verbose=False
):
    community = Communities.get(context, id=community_id)
    persona = Personas.get(context, persona_id=reviewer_id)

    if persona.is_in_community and "moderator" in persona.role_in_community(community):
        self_pending = Disputes(
            context,
            community=community,
            status="pending",
            reviews_status="requested",
            reviewer=persona,
        ).all()
        pending_disputes = Disputes(
            context, community=community, status="pending", reviews_status="requested"
        ).all()

        self_pending_ids = [d.id for d in self_pending]
        if verbose:
            print("len(self_pending)", len(self_pending))
            print("self_pending_ids", self_pending_ids)
            print("len(pending_disputes)", len(pending_disputes))

        new_reviews = []
        for dispute in pending_disputes:
            if dispute.id in self_pending_ids:
                continue
            new_review = dispute.request_review(reviewer_id=persona.id)
            new_reviews.append(new_review)

        if verbose:
            print("len(new_reviews)", len(new_reviews))
            print("new_reviews_ids", [d.id for d in new_reviews])

        return new_reviews
    else:
        print(
            f"Persona.id {persona.id} not allowed to review in Community.id {community.id}."
        )
