# Authentication helpers.
#
# references:
# https://github.com/ebellocchia/bip_utils/blob/master/readme/bip32.md
# https://github.com/ethereum/js-ethereum-cryptography?tab=readme-ov-file#bip32-hd-keygen

import logging
import os
from hashlib import blake2b

from substrateinterface import Keypair

from api.exceptions import UnauthorizedError

logger = logging.getLogger("api.auth")


def check_v1_auth(pkh, sent_at, nonce, pubkey, sig, body):
    """Checks the authentication of the given parameters using our v1
    signingscheme.

    sent_at is a string (consisting of all numbers)

    nonce, pkh, pubkey, and sig are hex strings

    body is string

    Returns True if all is ok, False if there's some failure.

    """

    public_key_string = pubkey

    # Convert string to a list of integers
    public_key_integers = list(map(int, public_key_string.split(",")))

    public_key_bytes = bytes(public_key_integers)

    try:
        keypair = Keypair(public_key=public_key_bytes, ss58_format=90)
    except ValueError:
        logger.debug("invalid public key")

    message = ".".join([sent_at, nonce, body]).encode("utf-8")

    hash_object = blake2b(keypair.public_key, digest_size=32)
    public_key_hash_hex = "0x" + hash_object.hexdigest()

    # Verify the pkh corresponds to the public key (use Blake2-256 for Polkadot)
    if public_key_hash_hex != pkh:
        logger.debug("pkh / pubkey mismatch")
        return False

    signature_list = list(map(int, sig.split(",")))
    signature_bytes = bytes(signature_list)
    # verify the signature matches the hash of the message
    try:
        is_valid = keypair.verify(message, signature_bytes)
    except ValueError:
        logger.debug("message verification failed")
        return False

    logger.info("is_valid: %s", is_valid)
    return is_valid


async def v1_auth_middleware(resolver, obj, info, **kwargs):
    request = info.context["request"]
    headers = request.headers

    # Ensure auth bypass is only allowed in development environment
    if headers.get("Odessa-Disable-Auth") == "true" and os.getenv("ENV") == "dev":
        logger.debug("Auth disabled in development environment")
        return resolver(obj, info, **kwargs)

    # Check for required 'persona-pkh' header
    pkh = headers.get("persona-pkh")
    if not pkh:
        raise UnauthorizedError("missing persona pkh")

    # Handle authentication with cryptographic headers
    try:
        sent_at = headers["x-sent-at"]
        nonce = headers["x-nonce"]
        pubkey = headers["x-pubkey"]
        sig = headers["x-sig"]
        body = (await request.body()).decode("utf-8")
    except KeyError:
        logger.debug("missing required auth header, request headers follow")
        logger.debug(headers)
        raise UnauthorizedError("missing required auth header")

    if not check_v1_auth(pkh, sent_at, nonce, pubkey, sig, body):
        logger.info("failed authentication")
        raise UnauthorizedError("failed authentication")

    return resolver(obj, info, **kwargs)
