## Content Moderations

Defined content moderation resolvers and tools in `services/api/content_mod` for less coupling more cohesion.

Note that `Disputes` receives a community and that's how we can access disputes within a community without touching any Odessa original resolvers.

### Disputes
When a post is flagged either by a persona or AI it creates an object created a dispute.

### Reviews
Reviews are associated to `disputes` and are designed to profide feedback and resolve the dispute.

### `@moderation_except`

Defined in `__init__.py`. This decorator is used to flag and
restrict access to those methods and functions that are meant
to be accessed only by those communities that have activated
the community-level flag for content moderation.

In specific, communities with the flag 'enable_content_moderation_moderator_actions'
registered in the DB have seemingly straightforward access to
all of the decorated functions, while if attempted to be called by
an un-flagged community, an Exception will be triggered.

While decorating methods is encouraged and preferred for easiness
of future developers, use the flag community._FLAG_enabled_mod_actions
when in need to check that status without using a decorator.

## Figma screens

One community: https://www.figma.com/proto/glKgTuYvTh3edFbkkcGuRf/Content-Moderation?type=design&node-id=2-445&t=ZbbpzSpCO5rXm1It-1&scaling=min-zoom&page-id=0%3A1&starting-point-node-id=2%3A445&show-proto-sidebar=1&mode=design
