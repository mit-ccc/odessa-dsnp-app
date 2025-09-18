import { useState, useEffect } from "react";
import {
  getUnusedPromptsForUser,
  sendPrompt,
  removePrompt,
  sendBridgedPrompt,
} from "../../api/wrappers";

export const usePrompts = (
  api,
  activeCommunity,
  activePersona,
  activePersonaData,
) => {
  const [triggerRefresh, setTriggerRefresh] = useState(true);
  const [userPrompts, setUserPrompts] = useState();
  const [userCanCreatePrompt, setUserCanCreatePrompt] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchUnusedPrompts = async () => {
    if (activePersona && activeCommunity) {
      const unusedPrompts = await getUnusedPromptsForUser(
        api,
        activePersona,
        activeCommunity.id,
      );
      setUserPrompts(unusedPrompts);
      setUserCanCreatePrompt(
        unusedPrompts === undefined || unusedPrompts.length < 5,
      );
    }
  };

  const savePrompt = async (promptText, onSuccess, onError) => {
    const result = await sendPrompt(
      api,
      promptText.trim(),
      activeCommunity.id,
      activePersonaData.id,
    );

    if (result.success) {
      setTriggerRefresh((prev) => !prev);
      if (onSuccess) {
        onSuccess();
      }
    } else {
      if (onError) {
        onError(result.error);
      }
    }
  };

  const saveBridgedPrompt = async (
    promptText,
    community_ids,
    onSuccess,
    onError,
  ) => {
    const result = await sendBridgedPrompt(
      api,
      promptText.trim(),
      community_ids,
      activePersonaData,
    );

    if (result.success) {
      setTriggerRefresh((prev) => !prev);
      if (onSuccess) {
        onSuccess();
      }
    } else {
      if (onError) {
        onError(result.error);
      }
    }
  };

  const deletePrompt = async (promptId, onRemoveSuccess, onRemoveError) => {
    removePrompt(api, promptId, activePersonaData)
      .then(() => {
        setTriggerRefresh(true);
        if (onRemoveSuccess) {
          onRemoveSuccess();
        }
      })
      .catch((error) => {
        if (onRemoveError) {
          onRemoveError(error);
        }
      });
  };

  useEffect(() => {
    fetchUnusedPrompts();
    setTriggerRefresh(false);
  }, [activePersona, triggerRefresh, activeCommunity, modalVisible]);

  return {
    userPrompts,
    userCanCreatePrompt,
    savePrompt,
    deletePrompt,
    setTriggerRefresh,
    triggerRefresh,
    modalVisible,
    setModalVisible,
    saveBridgedPrompt,
  };
};
