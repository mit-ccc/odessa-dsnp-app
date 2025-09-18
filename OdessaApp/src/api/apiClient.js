import { GraphQLClient } from "graphql-request";

import { Platform } from "react-native";

import { randomAsHex } from "@polkadot/util-crypto";

import { ANDROID_API_BACKEND, IOS_API_BACKEND } from "@env";
import { versionName } from "./version";

import { createKeyring } from "../features/newAccount/FirstFlow";

export var backend;

if (Platform.OS === "android") {
  backend = ANDROID_API_BACKEND;
} else if (Platform.OS === "ios") {
  // For iOS emulator. If you plan to test on a real device, you might want to use your local network IP.
  backend = IOS_API_BACKEND;
}

console.log("backend!!5", backend);

export var gqlEndpoint = backend + "/graphql/";
export var staticEndpoint = backend + "/static/";

// Cache for keyring instances
const keyringCache = new Map();
/**
 * Create a keyring instance from a URI. Caches the keyring instance
 * since creating keyring instances is expensive.
 */
const getKeyringFromUri = (uri) => {
  if (keyringCache.has(uri)) {
    return keyringCache.get(uri);
  }

  const keyring = createKeyring();
  const keyringInstance = keyring.createFromUri(uri);
  keyringCache.set(uri, keyringInstance);
  return keyringInstance;
};

// Returns a client that is authenticated with the given persona.
export function makeClient(persona) {
  console.log("makeClient persona", persona);
  if (!persona || !persona.hdkey) {
    console.error("invalid or missing persona details");
    return;
  }
  const authMiddleware = (request) => {
    // see Identity.md for documentation and rationale on the
    // signature scheme:
    //
    // 1. get the unix time in ms
    // 2. generate a hex nonce
    // 3. set the payload to the request body
    // 4. concatenate those 3 values with a '.' in between -- call that the message
    // 5. sign the sha256(message) with the persona's keyring pair

    const sentAt = new Date().getTime().toString();
    const nonce = randomAsHex(16);

    var hdk;
    try {
      hdk = HDKey.fromJSON(persona.hdkey);
    } catch {
      hdk = persona.hdkey;
    }

    const payload = request.body;

    // create Polkadot keyring for persona
    const uri = `${hdk}//${persona.path}`;
    const p0 = getKeyringFromUri(uri);

    // we sign the string 'sentAt.nonce.payload', where the . is
    // the period character
    const message = [sentAt, nonce, payload].join(".");
    const signedHash = p0.sign(message);
    console.info("signedHash", typeof signedHash.toString("hex"));
    console.info("public key", p0.publicKey);
    console.info("pubkeyhash ", p0.publicKey.toString());

    return {
      ...request,
      headers: {
        ...request.headers,
        "x-sent-at": sentAt,
        "x-nonce": nonce,
        "x-pubkey": p0.publicKey,
        "x-sig": signedHash.toString("hex"),
      },
    };
  };

  console.info("persona", persona);

  const client = new GraphQLClient(gqlEndpoint, {
    requestMiddleware: authMiddleware,
    headers: {
      // fixme: implement a signing mechanism to prove control of this
      // pkh, ideally signing the entire request
      "persona-pkh": persona.pkh,

      // sending frontend version
      "frontend-version": versionName,
    },
  });
  console.info("client", client);

  return client;
}
