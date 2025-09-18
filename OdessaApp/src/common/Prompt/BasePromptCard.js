import React from "react";
import { StyleSheet } from "react-native";
import { Card, Title } from "react-native-paper";
import { Typography } from "../styles";

export const BasePromptCard = ({
  title,
  children,
  lightness,
  onPress,
  color = "primary",
}) => {
  const backgroundColor =
    color === "primary"
      ? `hsl(252, 45%, ${lightness}%)`
      : `hsl(0, 0%, ${lightness}%)`;

  return (
    <Card style={[styles.card, { backgroundColor }]} onPress={onPress}>
      <Card.Content>
        <Title style={styles.cardTitle}>{title}</Title>
        {children}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 0,
    marginBottom: 0,
    marginTop: 0,
    borderWidth: 0,
  },
  cardTitle: {
    ...Typography.bodyLight,
    fontSize: Typography.xs,
    marginTop: 0,
  },
});
