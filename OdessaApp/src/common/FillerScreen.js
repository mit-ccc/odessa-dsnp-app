import { Text, View, ScrollView } from "react-native";

export const FillerScreen = () => {
  const styles = {
    margin: 12,
    fontSize: 24,
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <Text style={styles}>
        Bacon ipsum dolor amet pig brisket turducken burgdoggen tongue salami
        chuck bacon hamburger. Salami prosciutto pork belly, kielbasa shankle
        pig cupim chuck t-bone fatback. Pork belly jowl pork loin corned beef
        meatloaf ham pastrami spare ribs tenderloin ground round shoulder shank
        ball tip sausage pork chop. T-bone sirloin venison beef ribs,
        frankfurter buffalo tenderloin boudin. Tongue leberkas cow capicola
        turkey rump kevin chicken biltong drumstick.
      </Text>

      <Text style={styles}>
        Beef pastrami beef ribs cupim. Tongue pastrami bresaola alcatra spare
        ribs buffalo drumstick meatball t-bone. Sirloin kevin pork chop, ball
        tip landjaeger venison short loin pork belly. Pig venison landjaeger
        prosciutto filet mignon burgdoggen. Beef ribs biltong shoulder pig ham
        burgdoggen kielbasa strip steak ham hock jerky sirloin t-bone ground
        round.
      </Text>

      <Text style={styles}>
        Ball tip sausage tongue pork belly. Frankfurter landjaeger burgdoggen
        pancetta. Filet mignon burgdoggen shank, prosciutto kevin pork belly
        short ribs pancetta cupim meatball pork loin spare ribs. Boudin pork
        chop landjaeger drumstick ham brisket porchetta kielbasa chislic. Pig
        chislic ham hock, landjaeger biltong brisket hamburger kevin cupim
        pancetta. Strip steak jowl jerky alcatra bresaola swine drumstick
        landjaeger. Pork chop bacon fatback picanha, spare ribs tri-tip
        porchetta tongue sausage biltong capicola beef ribs ball tip.
      </Text>
    </ScrollView>
  );
};
