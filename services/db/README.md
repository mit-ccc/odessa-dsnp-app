# Data Model

A _persona_ is a person's projection of their self to a community,
like a specific profile picture, name and bio. We represent this at
the moment as a different user ID. The Odessa app has the capability
of holding multiple personas for a single person. Personas hold
information such as name and bio.

A _community_ is a collection of personas, and represents a group of
people that are tied together through some shared knowledge,
experience, or culture.

## Authentication vs Authorization

Standard security practice separates the functionaliy of
authentication (proving the user is who they say they are) and
authorization (a user requesting access to a resource). We treat
persona public keys as an authentication mechanism to a persona, and
separately the persona has authorized access to certain resources such
as groups they are a member of.

This distinction allows us to separate between different
authentication methods (we may plug into MIT's Kerberos, or implement
email based authentication), and authorization for access. Despite
this separation of concerns. The correct way to model this would be a
many-to-many relationship on personas, however since we currently
support only public key auth, we place the pubkey hash directly on the
personas table. This should be fixed in the future if we support
additional authentication methods.
