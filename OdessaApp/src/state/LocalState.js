// Namespace for app globals, some of which are backed by async
// storage. We expose these through the LocalStateContext as variables
// child components can pick out as needed.

import { useEffect, useState, createContext, useCallback } from "react";

import { generateMnemonic } from "ethereum-cryptography/bip39/index.js";
import { wordlist } from "ethereum-cryptography/bip39/wordlists/english.js";
import { cryptoWaitReady, mnemonicGenerate } from "@polkadot/util-crypto";

import { useStoredState } from "../../lib/StoredState";
import { PERSONAKEY_FORMAT, createPersonaKey } from "./PersonaKeys";
import { makeClient } from "../api/apiClient";
import { createHash, createKeyring } from "../features/newAccount/FirstFlow";

// Handy little function that allows us to trigger events in a
// hook-style way. For example, a component can depend on an event,
// fooEvent, and elsewhere in the app if we triggerFooEvent then the
// component will run an effect. See personaChange below for an
// example.
export const useTrigger = () => {
  const [count, setCount] = useState(0);
  return [count, () => setCount(count + 1)];
};

// We expose a React Context for the app's local state. See end of
// LocalStateRoot component for what getters and setters are
// available. Most usage of LocalState will be via this context. Also
// see features/debug/Debug.js for an example of usage.
export const LocalStateContext = createContext();

export const LocalStateRoot = (props) => {
  // This is just a stored state we use for testing and debugging this
  // library. See features/debug/Debug.js.
  const [debugTime, setDebugTime] = useStoredState("debug_time");

  const [HDSeed, setHDSeed] = useStoredState("hdkey_seed", undefined);
  const [localHDKey, setLocalHDKey] = useState();
  const [personaKeys, setPersonaKeys] = useStoredState(
    "persona_keys",
    undefined,
  );
  const [persona0, setPersona0] = useState();
  const [api, setApi] = useState();
  const [activeCommunity, setActiveCommunity] = useState(undefined);
  const [encourageStr, setEncourageStr] = useState("");
  const [discourageStr, setDiscourageStr] = useState("");
  const [banStr, setBanStr] = useState("");
  const [personaChange, triggerPersonaChange] = useTrigger();
  const [personasData, setPersonasData] = useState([]);
  const [persona0Data, setPersona0Data] = useState([]);

  // personaInit is true if the backend has seen one or more personas
  // derived from this hdkey. This is detected in PersonaRoot -- see
  // for further details.
  const [personaInit, setPersonaInit] = useState();

  const CURRENT_HDSEED_FORMAT = 2;
  const setHDSeedPhrase = (phrase) => {
    setHDSeed({
      format: CURRENT_HDSEED_FORMAT,
      phrase: phrase,
    });
  };

  const initHDSeed = () => {
    console.info("creating hdkey seed");

    // a little weird to be storing the seed as a mnemonic, but ok...
    const hdkey_phrase = getNewSeedPhrase();
    setHDSeedPhrase(hdkey_phrase);
  };

  const getNewSeedPhrase = useCallback(() => {
    const hdkey_phrase = generateMnemonic(wordlist, 256);
    return hdkey_phrase;
  });

  const encodeSeedPhrase = useCallback((seedPhrase) => {
    const hdkey = HDKey.fromMasterSeed(mnemonicToEntropy(seedPhrase, wordlist));
    const pkey = createPersonaKey(hdkey, 0);
    return pkey.pkh;
  });

  // initialize HDSeed if it hasn't been already
  useEffect(() => {
    async function initCryptoAndHDSeed() {
      await cryptoWaitReady(); // Ensure Polkadot crypto is ready
      console.info("Polkadot crypto is ready");

      if (HDSeed === undefined) {
        // HDSeed === undefined indicates we haven't had a chance to try
        // to load the seed yet, so let's wait until that happens.
        return;
      }

      if (HDSeed === null) {
        initHDSeed();
        return;
      }

      if (typeof HDSeed == "string") {
        // some apps might have the seed stored as a string, but we're
        // upgrading to a JSON object to be more flexible
        console.info("converting hdkey seed to json format");
        setHDSeedPhrase(HDSeed);
        return;
      }

      if (HDSeed.seed) {
        // some apps have HDSeed.seed instead of .phrase, so we'll fix that
        setHDSeed(HDSeed.seed);
        return;
      }
    }
    initCryptoAndHDSeed();
  }, [HDSeed]);

  const keyring = createKeyring();

  useEffect(() => {
    if (!HDSeed) {
      return;
    }

    const masterAccount = keyring.addFromUri(HDSeed.phrase);
    setLocalHDKey(masterAccount);
  }, [HDSeed]);

  useEffect(() => {
    // if we don't yet have a local hdkey or haven't tried to load
    // personaKeys, then bail...
    if (!localHDKey || personaKeys === undefined) {
      return;
    }

    // Conditions in which we want to create new persona
    // key structures:
    //
    // 1. We haven't made any persona keys at all.
    // 2. We have made persona keys, but the master key has changed.
    // 3. The personaKeys format has changed.
    // 4. We want to add a new persona key.
    const noPersonas = personaKeys === null;
    const masterHash = createHash(localHDKey.publicKey);
    const masterChange = !personaKeys || personaKeys.master_pkh !== masterHash;
    const newFormat = personaKeys && personaKeys.format !== PERSONAKEY_FORMAT;
    const makeNewPersonaKey = false; // FIXME: this condition currently not handled

    // Right now we're making exactly one persona key, called
    // persona0. This structure could hold more than one key in the
    // future to implement multiple personas.
    if (noPersonas || masterChange || newFormat || makeNewPersonaKey) {
      const pkey = createPersonaKey(keyring, HDSeed.phrase, 0);
      const data = {
        num: 1,
        master_pkh: masterHash,
        format: PERSONAKEY_FORMAT,
        info: [pkey],
      };
      setPersonaKeys(data);
    }
  }, [localHDKey, personaKeys]);

  // set up API to auth as persona0
  useEffect(() => {
    if (personaKeys && personaKeys.info) {
      const p0 = personaKeys.info[0];
      setPersona0(p0);
      setApi(makeClient(p0));
    }
  }, [personaKeys]);

  useEffect(() => {
    if (personasData && personasData[0]) {
      setPersona0Data(personasData[0]);
    }
  }, [personasData]);

  return (
    <LocalStateContext.Provider
      value={{
        debugTime,
        setDebugTime,
        HDSeed,
        setHDSeedPhrase,
        localHDKey,
        setLocalHDKey,
        personaKeys,
        setPersonaKeys,
        persona0,
        setPersona0,
        api,
        setApi,
        personaChange,
        triggerPersonaChange,
        personaInit,
        setPersonaInit,
        activeCommunity,
        setActiveCommunity,
        personasData,
        setPersonasData,
        persona0Data,
        setEncourageStr,
        encourageStr,
        setDiscourageStr,
        discourageStr,
        setBanStr,
        banStr,
        getNewSeedPhrase,
        encodeSeedPhrase,
      }}
    >
      {props.children}
    </LocalStateContext.Provider>
  );
};
