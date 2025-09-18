// FullPersonasScreen object -> Responsible for user-level state, searching/selecting/adding persona
// SinglePersonaScreen object -> Responsible for managing the items for a persona = ProfileCard, DetailsToggleSection  ; and then has an edit persona toggle which will pass down to children
// ProfileCard object -> name, email, dob, address, photo
// DetailsToggleSection object -> three sections, about, communities, activities - which each have boxes of information available on the backend
// the children should update their state, and use callbacks to send client requests
// use ... formatting to allow for simple expansion of the sections .. or be explicit

/*
- FullPersonasScreen (Container Component)
  - State: User-level state, Active Persona
  - Handles: Searching, selecting, and adding personas
  - Children: SinglePersonaScreen

  - SinglePersonaScreen (Container Component)
    - State: Editing Mode Toggle
    - Children: ProfileCard, DetailsToggleSection
    - Responsibilities: Toggling between view and edit mode

    - ProfileCard (Presentational Component)
      - Props: name, email, dob, address, photo, isEditing, onSave (callback)
      - Displays: User profile details
      - Responsibilities: Allows editing of profile details if isEditing is true

    - DetailsToggleSection (Container Component)
      - State: Active Section (about, communities, activities)
      - Children: Dynamic based on active section, e.g., AboutSection, CommunitiesSection, ActivitiesSection
      - Responsibilities: Toggle visibility of sections

      - AboutSection, CommunitiesSection, ActivitiesSection (Presentational Components)
        - Props: respective data, isEditing, onSave (callback)
        - Displays: Section details
        - Responsibilities: Allows editing of section details if isEditing is true
*/

// imports
import React, { useState, useEffect } from "react";
import { GraphQLClient, gql } from "graphql-request";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";

import { client } from "../api/apiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { get_personas_call_old, updatePersonaCall } from "../api/wrappers";

const FullPersonasScreen = () => {
  return <ScrollView></ScrollView>;
};

export const SinglePersonaScreen = () => {
  const [userId, setUserId] = useState(null);
  const [activePersonaId, setActivePersonaId] = useState(null);
  const [personas, setPersonas] = useState([]);

  // 1 TIME HOOK: fetch user id on entrance
  useEffect(() => {
    const fetchUserId = async () => {
      const storedUserId = await AsyncStorage.getItem("user_id");
      if (storedUserId != null) {
        setUserId(JSON.parse(storedUserId));
      }
    };
    fetchUserId();
  }, []); // Runs once after initial render

  // HOOK: fetching user data on changes, setting state
  useEffect(() => {
    if (userId != null) {
      const fetchData = async () => {
        const userData = await get_personas_call_old(userId);
        setPersonas(userData);
        setActivePersonaId(userId); // Setting activePersonaId here if needed
      };
      fetchData();
    }
  }, [userId]); // Runs whenever userId changes

  // EVENT HANDLER: update persona request when hit update
  const updatePersona = async (persona) => {
    const response = await updatePersonaCall(persona);
    if (!response) {
      Alert.alert("Failed to update persona.");
    }
  };

  // RENDER: return the personas onto the screen
  return (
    <ScrollView style={styles.container}>
      {Array.isArray(personas) &&
        personas.map((persona) => (
          <Persona
            key={persona.id}
            persona={persona}
            isActive={persona.id === activePersonaId}
            onSelect={setActivePersonaId}
            onUpdate={() => updatePersona(persona)}
          />
        ))}
    </ScrollView>
  );
};

const Persona = ({ persona, isActive, onSelect, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(persona.name);
  const [bio, setBio] = useState(persona.bio);
  const [picId, setPicId] = useState(persona.image_id);

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setIsEditing(false);
    setName(persona.name);
    setBio(persona.bio);
    setPicId(persona.image_id);
  };

  const handleSave = () => {
    persona.name = name;
    persona.bio = bio;
    onUpdate(persona);
    Alert.alert("Data saved!"); // Placeholder for server request
    setIsEditing(false);
  };

  const handlePlusClick = () => {
    // Placeholder for authentication and popup logic
    Alert.alert(
      "More Information! Like your label, and list of commmunities you're in.",
    );
  };

  return (
    <TouchableOpacity onPress={() => onSelect(persona.id)}>
      <View style={[styles.personaContainer, isActive && styles.activePersona]}>
        {/* Header containing photo and plus button */}
        <View style={styles.header}>
          {/* Placeholder for photo */}
          {/*<View style={styles.photoPlaceholder} />*/}
          <Image
            source={require("../../assets/icons/img.jpg")}
            style={styles.photoPlaceholder}
          />
          <TouchableOpacity style={styles.plusButton} onPress={handlePlusClick}>
            <Text style={styles.plusText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          editable={isEditing}
        />
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={styles.bioInput}
          value={bio}
          onChangeText={setBio}
          multiline
          editable={isEditing}
        />
        <View style={styles.buttonContainer}>
          {isEditing ? (
            <>
              <Button title="Cancel" onPress={handleCancel} />
              <Button title="Save" onPress={handleSave} />
            </>
          ) : (
            <Button title="Edit" onPress={handleEdit} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  personaContainer: {
    borderWidth: 5,
    borderColor: "lightgray",
    padding: 16,
    marginBottom: 16,
    // Removed alignItems: 'center'
  },
  plusButton: {
    width: 30,
    height: 30,
    backgroundColor: "blue",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 15,
  },
  plusText: {
    color: "white",
    fontSize: 20,
  },
  activePersona: {
    borderColor: "green",
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: "gray",
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "gray",
    padding: 8,
    marginBottom: 16,
  },
  bioInput: {
    textAlignVertical: "top",
    height: 100,
    borderWidth: 1,
    borderColor: "gray",
    padding: 8,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
