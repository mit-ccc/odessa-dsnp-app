// this should display either the time until stops taking answers, or time until next question opens up
// TimeRemaining.js

import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { IconButton } from "react-native-paper"; // Import IconButton from react-native-paper
import { PRIMARY_THEME_COLOR } from "../../../common/styles/config";
import { LINE_HORIZONTAL_PADDING } from "../styles/config";

// prompt complete determines whether the time is end of active or next prompt (implement later)
const TimeRemaining = ({ onTimeExpire, promptComplete, round }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [timeText, setTimeText] = useState("");
  const [displayingTime, setDisplayingTime] = useState("nextRound");

  useEffect(() => {
    const interval = setInterval(() => {
      const completionTimeUTC = new Date(round.completion_time);
      const endTimeUTC = new Date(round.end_time);
      const now = new Date();

      // DON'T fix, the endTime already brings the timezone.
      // const endTimeLocal = endTimeUTC; //new Date(endTimeUTC.getTime() - (endTimeUTC.getTimezoneOffset() * 60000));

      // NEXT ROUND IN {distance}
      let distance = Math.max(0, endTimeUTC - now);

      // PROMPT CLOSES IN {remainingTime}
      const remainingTime = Math.max(0, completionTimeUTC - now);

      if (distance == 0) {
        clearInterval(interval);
        onTimeExpire();
      } else if (remainingTime == 0) {
        onTimeExpire();
      }
      if (remainingTime > 0) {
        distance = remainingTime;
        setDisplayingTime("closingTime");
      } else {
        setDisplayingTime("nextRound");
      }

      let timeString = "";
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      if (days > 0) timeString += days + "d ";
      if (days > 0 || hours > 0) timeString += hours + "h ";
      if (days > 0 || hours > 0 || minutes > 0) timeString += minutes + "m ";
      timeString += seconds + "s";
      setTimeLeft(timeString);
    }, 1000);
    return () => clearInterval(interval);
  }, [round]);

  useEffect(() => {
    if (round === null) {
      return;
    }
    if (round.status == "archived") {
      setTimeText(`Round closed.`);
    } else if (round.status == "completed" || displayingTime == "nextRound") {
      if (timeLeft.length > 0) {
        setTimeText(`Round closed.\nNext round in ${timeLeft}`);
      } else {
        setTimeText(`Round closed.`);
      }
    } else if (
      round.status == "accept_answers" ||
      displayingTime == "closingTime"
    ) {
      setTimeText(`Round closes in ${timeLeft}`);
    }
  }, [promptComplete, timeLeft]);

  return (
    <View style={styles.container}>
      <IconButton
        icon="clock" // Use the 'clock' icon
        size={20} // Set the size of the icon
        style={styles.icon}
      />
      <Text style={styles.text}>{timeText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row", // Align children in a row
    alignItems: "center", // Center children vertically in the container
    marginHorizontal: LINE_HORIZONTAL_PADDING,
    justifyContent: "flex-start", // Align children to the start of the container
  },
  icon: {
    marginRight: 8, // Add some margin between the icon and the text
  },
  text: {
    fontSize: 12,
    color: PRIMARY_THEME_COLOR,
    fontFamily: "SpaceMono-Regular",
  },

  boldText: {
    fontWeight: "bold",
  },
});

export default TimeRemaining;
