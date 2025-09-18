import Svg, { G, Circle, Path } from "react-native-svg";
import { Colors } from "../../common/styles";

const FrequencyIconComponent = ({ size }) => {
  const iconScale = size / 64; // Scale factor based on original SVG size

  return (
    <Svg width={size} height={size} viewBox="0 0 128 128">
      <Circle cx="64" cy="64" r="64" fill="white" />
      <G
        transform={`translate(64, 64) scale(${
          iconScale * 15
        }) translate(-27, -25)`}
      >
        <Path
          d="M20.8175 14.1802V35.7428H24.6028V29.027L32.2077 25.7678L32.1087 21.9165L24.6358 25.1097V17.7688H34.2815V14.1802H20.8175Z"
          fill={`${Colors.frequencyColor}`}
        />
      </G>
    </Svg>
  );
};

export default FrequencyIconComponent;
