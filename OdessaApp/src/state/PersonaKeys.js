/*

  Persona keys. See discussion in OdessaApp/Identity.md for background.

  The shape of this structure is:

  {
    num: INT,
    master_pkh: STRING, // pubkey hash of the master key
    format: INT,
    info: [
      {
        path: STRING, // BIP-0044 path, which should have index embedded in it
        pkh: STRING, // pubkey hash,
        active: BOOLEAN,
      },
      ...
    ],
  }

  For example:

  {
    num: 2,
    master_pkh: "a4f469df37e09235e20a0e6243b31de3a3d088be",
    info: [
      {
        path: "m/44'/60'/0'/0/0",
        pkh: "9829d17b8ed875a3549be3077a29c9d8a989a81e",
        active: true,
      },
      {
        path: "m/44'/60'/1'/0/0",
        pkh: "27fb9823cc7802bb551ba3532c090d85e0b6cf9b",
        active: false, // user used this key in the past but no longer
      },
    ],
  }
*/

import { createHash } from "../features/newAccount/FirstFlow";

export const createPersonaKey = (keyring, phrase, index) => {
  // Persona key derivation follows Polkadot's keyring standard.
  const p0 = keyring.createFromUri(`${phrase}//${index}`);

  return {
    path: index,
    pkh: createHash(p0.publicKey),
    hdkey: phrase,
    active: true,
  };
};
