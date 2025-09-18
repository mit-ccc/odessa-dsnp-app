/*
  Hooks for storing app state in AsyncStorage.

  1. state is defaultValue until after we've attempted to load data
  from disk. If the caller uses undefined as a defaultValue then it
  will be able to distinguish between an async wait on disk versus a
  missing key.

  2. setState(null) removes the key from storage.

  3. The caller will not be able to distinguish between a missing key,
  or a key that has been set to have a value of null.

  See the following for clarification:

  const [state, useState] = useStoredState("my-key", undefined);
  useEffect(() => {
    if (state === undefined) {
      console.log("loading my-key from async storage");
      // state does not yet reflect a value in storage
    } else {
      if (state === null) {
        console.log("my-key does not exist or is set to null");
      } else {
        console.log("my-key loaded, value =", state);
      }
    }
  }, [state]);
*/

import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useStoredState = (key, defaultValue) => {
  const [state, setState] = useState(defaultValue);

  const set = async (data) => {
    if (data === null) {
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    }
    setState(data);
  };

  const get = async () => {
    const item = await AsyncStorage.getItem(key);
    if (item === null) {
      setState(null);
    } else {
      setState(JSON.parse(item));
    }
  };

  useEffect(() => {
    get();
  }, []);

  return [state, set];
};
