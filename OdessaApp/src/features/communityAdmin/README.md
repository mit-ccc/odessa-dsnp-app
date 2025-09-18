## Strategy for communityAdmin

author: bcsaldias

Currently the `communityAdmin` components are organized into PersonaActions, OwnerActions, and TrusteeActions; where each of these function component receives the full list of permissions and decides what to render for the frontend experience.

I would recommend to deprecate that style and go with a better design for rendering actions, based on groups of actions instead of roles. In specific, I would imagine having the following files:

    components/community.js
    components/memberships.js
    components/permissions.js
    components/personas.js
    components/posts.js
    components/prompts.js
    components/rounds.js
    components/utils.js

Where each file defines a set of function components–according to the file topic–to be displayed based on the relevant permissions.

---

### community.js

Actions that allow high-level community control. For example,

- community.members.pkh.read

---

### memberships.js

Actions that allow managing of membership within a community. For example,

- community.persona.add
- community.persona.delete
- community.persona.swap

---

### permissions.js

Actions that allow managing permissions and roles within a community. For example,

- community.persona.permission.grant
- community.persona.permission.revoke
- community.persona.permission.post.grant
- community.persona.permission.post.revoke
- community.persona.role.add
- community.persona.role.add_trustee
- community.persona.role.delete

---

### posts.js

Actions that allow control over posts within a community. For example,

- community.post.start_quarantine
- community.post.release_quarantine

---

### rounds.js

Actions that allow control over rounds within a community. For example,

- community.round.force_next_round
- community.round.force_stop_current_round

---

### prompts.js

Actions that allow control over propmts within a community. For example,

- community.prompt.mark_ineligible

---

### personas.js

Actions that to read a persona's permissions and roles within a community. For example, a persona may be assigned the following perms:

- persona.view_pkh
- persona.view_pkh_qr
- persona.community.post.add
- persona.community.post.upvode
- persona.community.post.downvote
- persona.community.prompt.add
- persona.community.prompt.delete
- persona.community.prompt.upvote
- persona.community.prompt.downvote

And actions that relate to a persona within a community. For example,

- persona.post.report
- persona.prompt.report
- persona.round.report

---

### utils.js

Shared functions among all coponents.
