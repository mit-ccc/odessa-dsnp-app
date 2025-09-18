# Identity Concepts & Implementation

## Defintions

An _identity_ refers to a single person, and is not necessarily
legible to Odessa. We may also use _user_ interchangeably.

An _identifier_ is a unique number or string that refers to an
entity. An identity may have multiple identifiers (see personas). We
expect that communities have exactly one identifier. The identifier
makes an entity legible to the system by allowing unambiguous
associations of data, ie it can be stored and referred unambiguously
to in a database.

A _persona_ is the presentation of an identity into a community, such
as name and profile picture. Every user has exactly one person per
community they're a member of. Some of these personas look identical
to each other, and might be explicitly linked through some data
schema. The average user will likely have two personas: work &
personal. They may be members of more than two communities, eg a work
persona might be copied into multiple communities.

A _public key_ is a cryptographic keypair, in which the private part
is typically held securely on a deivce, whereas the public part is
used by the system to authenticate users.

_Authentication_ is the act of verifying to the system that a user is
a particular identity or persona.

_Authorization_ is the act of requesting read or write access to a set
of data from the system.

## Implementation

_Identities are not legible to the system!_ Rather, personas are, and
authentication as a persona is via a hierarchical determistic public
key (HD key). We follow, roughly, a
[BIP-0044](https://en.bitcoin.it/wiki/BIP_0044) strategy. See [persona
state](./src/state/PersonaKeys.js) code for full implementation
details. TLDR: we generate in a repeatable fashion from a seed phrase
an infinte set of public keys that map to different
personas. Authentication on a persona is done through key signing. At
any point in time, there should be exactly one public key that
authenticates a persona.

### Authentication Scheme

As of this writing, there doesn't appear to be a standard for signing
http requests with BIP-0032 or BIP-0044 public keys. So we do
something roughly requivalent to HTTP Signatures, but simpler.

The v1 signature scheme is as follows:

1. Get the unix time in ms (`sentAt`).

2. Generate a hex nonce (`nonce`).

3. Set the payload to the request body (`payload`).

4. Concatenate those 3 values with a '.' in between -- call that the
   message (`message`).

5. Sign the sha256(message) with the persona's public key (`pubkey`),
   producing `sig`. Convert `sig` to hex digits. The signature
   algorithm corresponds to that used with BIP-0032, which is ECC with
   the secp256k1 curve.

6. Send in the request http headers: `sentAt`, `nonce`, `pubkey`,
   `sig`. The server can extract the payload from the request
   body. The server can get the pkh from the request headers, but
   these are sent regardless of if the request is signed, and thus are
   not explicit in this signature scheme.

This scheme has a few properties:

- Ensures that the request body is authenticated, however request
  headers not involved in the signature can be forged.

- `nonce` helps servers avoid replay attacks. Clients should be
  changing `nonce` on every request.

- `sentAt` allows servers to optionally discard requests with times
  that are outside some reasonable window. If a server mitigates
  replay attacks by storing nonces and signatures, `sentAt` allows the
  server to prune entries over time. It could be used to calculate a
  cache TTL for instance. Generally you should not be using a client
  app's clock for this kind of thing, however since Odessa is mobile
  only, and mobile devices rely on accurate clocks for cell tower
  hopping and billing, we'll most likely always have client clocks
  that are reasonably close to server clocks.
