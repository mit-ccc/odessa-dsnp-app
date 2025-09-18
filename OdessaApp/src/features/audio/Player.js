/*
Based on https://www.npmjs.com/package/react-native-audio-recorder-player
under MIT License.
*/
import AudioRecorderPlayer from "react-native-audio-recorder-player";
import { Animated, Easing } from "react-native";
import {
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { Component } from "react";

import Button from "../../common/minorComponents/Button";
import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";
import RNFetchBlob from "rn-fetch-blob";
import SubtitlesModal from "./SubtitlesModal";
import {
  QUATERNARY_THEME_COLOR,
  TERTIARY_THEME_COLOR,
} from "../../common/styles/config";

export class Player extends Component {
  dirs = RNFetchBlob.fs.dirs;
  path = Platform.select({});

  constructor(props) {
    super(props);
    this.state = {
      currentPositionSec: 0,
      currentDurationSec: 0,
      playTime: "00:00",
      duration: secondsToHms(props.audio?.duration),
      status: "stopped",
      seek: 0,
      finished: false,
      isSubtitleModalVisible: false,
      currentTime: 0,
      hasSubtitles: props.audio.transcripts?.length > 0,
    };

    this.waveValues = this.props.wave_values;
    this.url = this.props.url;
    this.audioRecorderPlayer = new AudioRecorderPlayer();
    this.audioRecorderPlayer.setSubscriptionDuration(0.1); // optional. Default is 0.5

    // console.log('AUDIO', props.audio);
  }

  componentWillUnmount() {
    if (this.state.status == "playing") {
      this.onStopPlay(true);
    }
  }

  render() {
    var player = this.props.playerRef ? this.props.playerRef : this;
    if (
      player.props.appStateVisible === "background" &&
      player.state.status == "playing"
    ) {
      player.onCloseSubtitles();
    }

    let playWidth =
      (this.state.currentPositionSec / this.state.currentDurationSec) * 230;
    if (!playWidth) {
      playWidth = 0;
    }

    if (this.props.audioId != this.props.activePlayer) {
      if (this.state.status != "stopped") {
        this.onStopPlay(false).then(() => {});
      }
    }

    if (this.props.style == "transcripts") {
      return (
        <View
          style={[{ flex: 0, flexDirection: "column", alignSelf: "center" }]}
        >
          <View style={[{ width: "100%" }, styles.container]}>
            <View style={[styles.viewPlayer, {}]}>
              <TouchableOpacity
                style={styles.viewBarSubtitlesWrapper}
                onPress={this.onStatusPress}
              >
                <View style={styles.viewBar}>
                  <View
                    style={[styles.viewBarPlayPlayer, { width: playWidth }]}
                  />
                </View>
                <Text
                  style={[styles.txtCounter, { color: "white", fontSize: 12 }]}
                >
                  {this.state.status == "playing" &&
                    this.state.playTime.slice(0, 5)}
                  {this.state.status != "playing" &&
                    this.state.duration.slice(0, 5)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[{ width: "100%", alignSelf: "center", marginTop: 15 }]}>
            <Button style={[styles.playBtn]} onPress={this.onPress}>
              {this.state.status == "playing" && (
                <Icon name="pause-circle" size={50} color="white" />
              )}
              {this.state.status != "playing" && (
                <Icon name="play-circle" size={50} color="white" />
              )}
            </Button>
          </View>
        </View>
      );
    }

    return (
      // <SafeAreaView style={styles.container}>
      <View
        style={[
          {
            flex: 0,
            flexDirection: "column",
            justifyContent: "flex-start",
            marginTop: -5,
          },
        ]}
      >
        <View>
          {!this.props.hideTranscript && this.props.audio.plain_transcript && (
            <View style={[{ marginBottom: 14 }]}>
              <Text>
                {this.props.audio.plain_transcript.slice(0, 36)}
                {this.props.audio.plain_transcript.length > 36 ? "..." : ""}
              </Text>
            </View>
          )}
        </View>
        <View
          style={[
            { flex: 0, flexDirection: "row", justifyContent: "space-around" },
          ]}
        >
          <View style={[{ width: "10%" }]}>
            <Button
              style={[styles.playBtn]}
              onPress={() => this.onPress((openSubtitles = true))}
            >
              {this.state.status == "playing" && (
                <Icon name="pause" size={30} color={TERTIARY_THEME_COLOR} />
              )}
              {this.state.status != "playing" && (
                <Icon name="play" size={30} color={QUATERNARY_THEME_COLOR} />
              )}
            </Button>
          </View>

          <View style={[{ width: "100%" }, styles.container]}>
            <View style={[styles.viewPlayer, {}]}>
              <TouchableOpacity
                style={styles.viewBarWrapper}
                onPress={this.onStatusPress}
              >
                {/* <AnimatedSoundBars></AnimatedSoundBars> */}
                <View style={styles.viewBar}>
                  <View
                    style={[styles.viewBarPlayPlayer, { width: playWidth }]}
                  />
                </View>
              </TouchableOpacity>
            </View>
            <View>
              <Text style={styles.txtCounter}>
                {this.state.status == "playing" &&
                  this.state.playTime.slice(0, 5)}
                {this.state.status != "playing" &&
                  this.state.duration.slice(0, 5)}
              </Text>
            </View>
          </View>

          {
            this.state.hasSubtitles && (
              // <View style={[{width: '10%'} ,]}>
              //   <Button
              //       style={[styles.playBtn, ]}
              //       onPress={this.onOpenSubtitles}
              //   >
              //       <Icon name='subtitles-outline' size={30} color='grey'/>
              //   </Button>
              <SubtitlesModal
                isVisible={this.state.isSubtitleModalVisible}
                onClose={() => this.onCloseSubtitles((keepPlaying = true))}
                player={this}
              />
            )
            // </View>
          }
        </View>
      </View>

      // </SafeAreaView>
    );
  }

  onOpenSubtitles = () => {
    this.setState({
      isSubtitleModalVisible: true,
    });
  };

  onCloseSubtitles = (keepPlaying = false) => {
    if (this.state.status == "playing" && !keepPlaying) {
      this.onPress();
    }
    if (this.state.isSubtitleModalVisible) {
      this.setState({
        isSubtitleModalVisible: false,
      });
    }
  };

  onPress = (openSubtitles = false) => {
    var player = this.props.playerRef ? this.props.playerRef : this;

    player.props.handlePlayBack().then((r) => {
      if (player.props.audioId != player.props.activePlayer) {
        return;
      }
      if (player.state.status == "stopped" && player.state.seek > 0) {
        player.onStartPlay((paused = true));
      } else if (player.state.status == "stopped") {
        player.onStartPlay();
        if (openSubtitles) {
          this.onOpenSubtitles();
        }
      } else if (player.state.status == "playing") {
        player.onPausePlay();
      } else if (player.state.status == "paused") {
        player.onResumePlay();
        if (openSubtitles) {
          this.onOpenSubtitles();
        }
      }

      if (player.props.playingByRound) {
        player.props.handlePlayNext(player.state.status);
      }
    });
  };

  onStatusPress = (e) => {
    var player = this.props.playerRef ? this.props.playerRef : this;
    const touchX = e.nativeEvent.locationX;

    if (player) {
      try {
        if (player.state.status != "stopped") {
          player.audioRecorderPlayer?.seekToPlayer(
            (touchX / 230) * this.state.currentDurationSec,
          );
        }
      } catch {}
    }

    // const playWidth =
    //   (this.state.currentPositionSec / this.state.currentDurationSec) *
    //   (230);
    // console.log(`currentPlayWidth: ${playWidth}`);
    // const currentPosition = Math.round(this.state.currentPositionSec);
  };

  onStartPlay = (paused = false) => {
    // console.log('PLAYING, paused = ', paused);
    // console.log('onStartPlay url:', this.url);

    // console.log('\n\n\nPLAYER', this.props.audioId, '\n', this.audioRecorderPlayer);
    // try {
    const msg = this.audioRecorderPlayer.startPlayer(this.url).then((r) => {
      // const volume = this.audioRecorderPlayer.setVolume(1.0);
      // console.log(`path: ${r}`, `volume: ${volume}`);

      if (this.state.status == "stopped") {
        // console.log(this.props.audioId, 'was stopped');
        // console.log(this.props.audioId, 'seek was set to', this.state.seek);

        this.audioRecorderPlayer.addPlayBackListener((e) => {
          this.setState({
            currentPositionSec: e.currentPosition,
            currentDurationSec: e.duration,
            playTime: this.audioRecorderPlayer.mmssss(
              Math.floor(e.currentPosition),
            ),
            duration: this.audioRecorderPlayer.mmssss(Math.floor(e.duration)),
          });

          if (Platform.OS == "android") {
            this.setState({
              currentTime: Math.floor(e.currentPosition),
            });
          } else {
            const ofSec = 900;
            const lct = Math.floor(this.state.currentTime / ofSec);
            const lcp = Math.floor(e.currentPosition / ofSec);
            if (lct != lcp) {
              this.setState({
                currentTime: Math.floor(e.currentPosition),
              });
            }
          }

          if (e.currentPosition >= e.duration) {
            this.onStopPlay();
            // console.log(this.props.audioId, 'finished');
          }
        });

        if (paused) {
          // console.log(this.props.audioId, 'SHOULD BE seeking', this.state.seek);
          this.audioRecorderPlayer?.seekToPlayer(this.state.seek);
        }
      }

      this.setState({
        status: "playing",
        finished: false,
        isSubtitleModalVisible: true,
      });
      // console.log(this.props.audioId, 'playing');

      return r;
    });

    // } catch (err) {
    // console.log('startPlayer error', err);
    // }
  };

  onPausePlay = () => {
    // console.log(this.props.audioId, 'pausing');
    this.audioRecorderPlayer.pausePlayer().then(() => {
      this.setState({ status: "paused" });
    });
  };

  onResumePlay = () => {
    // console.log(this.props.audioId, 'resuming');
    this.audioRecorderPlayer.resumePlayer().then(() => {
      this.setState({ status: "playing" });
    });
  };

  onStopPlay = (finished = true) => {
    // console.log(this.props.audioId, 'stopping');

    // if (finished && (!this.audioRecorderPlayer._isPlaying && !this.audioRecorderPlayer._hasPaused))

    return this.audioRecorderPlayer
      .stopPlayer()
      .then(() => {
        // console.log(this.props.audioId, 'setting seek to value', !finished? this.state.currentPositionSec : 0);
        this.setState({
          status: "stopped",
          seek: !finished ? this.state.currentPositionSec : 0,
          finished: finished,
          isSubtitleModalVisible: false,
        });

        this.audioRecorderPlayer.removePlayBackListener();

        return new Promise((resolve) => {
          resolve("done");
        });
      })
      .then((r) => {
        if (this.props.playingByRound) {
          this.props.handlePlayNext("finished");
          this.props.setPlayingRound(false);
        }
      });
  };
}

function secondsToHms(d) {
  d = Number(d);
  var h = Math.floor(d / 3600);
  var m = Math.floor((d % 3600) / 60);
  var s = Math.floor((d % 3600) % 60);

  // console.log('h, m , s', h, m , s)
  var hDisplay = h > 0 ? (h < 10 ? "0" + h : h) + ":" : "00:";
  var mDisplay = m > 0 ? (m < 10 ? "0" + m : m) + ":" : "00:";
  var sDisplay = s > 0 ? (s < 10 ? "0" + s : s) : "00";
  if (h > 0) {
    return hDisplay + mDisplay + sDisplay;
  }
  return mDisplay + sDisplay;
}

const dotAnimations = Array.from({ length: 40 }).map(
  () => new Animated.Value(0),
);

export const AnimatedSoundBars = ({ barColor = "lightgrey" }) => {
  const loopAnimation = (node) => {
    const keyframes = [1.2, 0.7, 1];

    const loop = Animated.sequence(
      keyframes.map((toValue) =>
        Animated.timing(node, {
          toValue,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ),
    );

    return loop;
  };

  const loadAnimation = (nodes) =>
    Animated.stagger(200, nodes.map(loopAnimation)).start(); // Animated.loop(

  React.useEffect(() => {
    loadAnimation(dotAnimations);
  }, []);

  return (
    <View style={styles.row}>
      {dotAnimations.map((animation, index) => {
        return (
          <Animated.View
            key={`${index}`}
            style={[
              styles.bar,
              { backgroundColor: barColor, marginTop: 5 },
              {
                transform: [
                  {
                    scale: animation,
                  },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    alignItems: "center",
  },
  viewPlayer: {
    alignSelf: "stretch",
    alignItems: "center",
  },
  viewBarWrapper: {
    // alignSelf: 'stretch',
    width: 230,
    paddingVertical: 30,
    marginVertical: -30,
  },
  viewBarSubtitlesWrapper: {
    // alignSelf: 'stretch',
    width: 230,
    height: 50,
    paddingTop: 20,
  },
  viewBar: {
    backgroundColor: "#ccc",
    height: 4,
    alignSelf: "stretch",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  bar: {
    height: 18,
    width: 3.25,
    borderRadius: 10,
    marginHorizontal: 2,
  },
  playBtn: {
    marginTop: -14,
  },
  viewBarPlayPlayer: {
    backgroundColor: "black",
    height: 4,
    width: 0,
  },
  btnPlayer: {
    borderColor: "black",
    borderWidth: 1,
  },
  txtPlayer: {
    color: "black",
    fontSize: 10,
    marginHorizontal: 8,
  },
  txtCounter: {
    marginTop: 6,
    color: "grey",
    fontSize: 10,
    textAlignVertical: "center",
    fontWeight: "200",
    fontFamily: "Helvetica Neue",
    letterSpacing: 1,
    textAlign: "right",
    width: 226,
  },
});
