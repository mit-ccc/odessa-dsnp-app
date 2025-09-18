import { useState, useEffect, useContext } from "react";
import { gql } from "graphql-request";
import { LocalStateContext } from "../../state/LocalState";
import {
  getPersonaPermissions,
  getUserCommunityPermissions,
} from "../../api/wrappers";

export const usePermissions = () => {
  const { api, persona0, personaChange, activeCommunity } =
    useContext(LocalStateContext);

  const [personaRoles, setPersonaRoles] = useState([]);
  const [personaPermissions, setPersonaPermissions] = useState([]);

  useEffect(() => {
    const setPermissions = async () => {
      if (activeCommunity) {
        return await getUserCommunityPermissions(
          api,
          persona0.pkh,
          activeCommunity.id,
        );
      } else {
        return await getPersonaPermissions(api, persona0.pkh);
      }
    };
    setPermissions().then(({ roles, groups, permissions }) => {
      setPersonaRoles(roles);
      setPersonaPermissions(permissions);
    });
  }, []);

  return { personaPermissions };
};
