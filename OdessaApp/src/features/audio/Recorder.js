/*
Based on https://www.npmjs.com/package/react-native-audio-recorder-player
under MIT License.
*/
import AudioRecorderPlayer, {
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
} from "react-native-audio-recorder-player";
import {
  Dimensions,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { Component, useState, useEffect } from "react";
import { PRIMARY_THEME_COLOR } from "../../common/styles/config";

import Icon from "react-native-vector-icons/dist/MaterialCommunityIcons";

import Button from "../../common/minorComponents/Button";
import RNFetchBlob from "rn-fetch-blob";
import { uploadUserAudio } from "../../api/wrappers";

const screenWidth = Dimensions.get("screen").width;
const screenDelta = 70;

export class Recorder extends Component {
  dirs = RNFetchBlob.fs.dirs;
  path = Platform.select({});

  constructor(props) {
    super(props);
    this.state = {
      uri: null,
      recordMiliSecs: 0,
      recordTime: "00:00:00",
      maxRecordSecs: this.props.recordingConstraint.length, // seconds
      notificationTime: this.props.recordingConstraint.alert_length,
      status: "waiting",
      submitting: false,
    };

    this.props.setRecorderStatus("waiting");
    this.audioRecorderPlayer = new AudioRecorderPlayer();
    this.audioRecorderPlayer.setSubscriptionDuration(0.1); // optional. Default is 0.5
  }

  componentWillUnmount() {
    this.onStopRecord();
  }

  shouldNotifyRunningOutOfTime() {
    return (
      this.state.recordMiliSecs >=
      (this.state.maxRecordSecs - this.state.notificationTime) * 1000
    );
  }

  formattedTime() {
    const tvalues = this.state.recordTime.split(":");
    return tvalues[0] + ":" + tvalues[1];
  }

  formattedMaxTime() {
    const maxRecordTime = this.audioRecorderPlayer.mmssss(
      Math.floor(this.state.maxRecordSecs * 1000),
    );
    const tvalues = maxRecordTime.split(":");
    return tvalues[0] + ":" + tvalues[1];
  }

  setFileName() {
    var RNFS = require("react-native-fs");
    RNFS.readDir(this.dirs.CacheDir).then((files) => {
      let audioFileList = files
        .filter((file) => file.path.indexOf(this.format) >= 0)
        .map((file) => {
          return {
            path: file.path,
            name: file.name,
          };
        });
      console.log("audioFileList", audioFileList);
    });
  }

  render() {
    return (
      <SafeAreaView style={styles.container}>
        {this.state.submitting && (
          <View>
            <ActivityIndicator
              size="large"
              style={{ transform: [{ scaleX: 2 }, { scaleY: 2 }] }}
              color={PRIMARY_THEME_COLOR}
            />
            <Text style={[styles.txtRecordCounter]}>Processing...</Text>
          </View>
        )}
        {!this.state.submitting && (
          <View style={styles.container}>
            <View>
              {!this.shouldNotifyRunningOutOfTime() && (
                <View>
                  <Text style={[styles.txtRecordCounter, {}]}>
                    {this.formattedTime()}
                  </Text>
                </View>
              )}
              {this.shouldNotifyRunningOutOfTime() && (
                <View style={{ flexDirection: "row" }}>
                  <Text
                    style={[
                      styles.txtRecordCounter,
                      ((this.state.recordMiliSecs / 1000) | 0) % 2
                        ? { color: "grey" }
                        : { color: "white" },
                    ]}
                  >
                    {this.formattedTime()}
                  </Text>
                  <Text style={[styles.txtRecordCounter]}>
                    {" "}
                    / {this.formattedMaxTime()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.viewRecorder}>
              <View style={[styles.recordBtnWrapper, { marginTop: 20 }]}>
                <Button
                  style={[styles.recordBtn, { marginLeft: 0 }]}
                  onPress={this.onPress}
                >
                  <this.Ring size={35} maxSize={70} speed={12.5}></this.Ring>
                </Button>
              </View>
              <View style={styles.postBtnWrapper}>
                {/* <Button
                          style={[styles.postBtn, ]}
                          onPress={this.onStartPlay}
                          >
                              <Icon name='play-outline' size={50}/>
                      </Button> */}
                {/* <View style={[{width: 30, height: 0}]}></View> */}
                <View style={[{}]}></View>
                <Button style={[styles.postBtn]} onPress={this.onSubmitAudio}>
                  <Icon name="check" size={50} color="white" />
                </Button>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  onPress = async () => {
    if (this.state.status == "waiting") {
      await this.onStartRecord();
      // console.log(this.state.status);
    } else if (this.state.status == "recording") {
      await this.onPauseRecord();
    } else if (this.state.status == "paused") {
      await this.onResumeRecord();
    }
  };

  onStartRecord = async () => {
    if (this.state.recordMiliSecs >= this.state.maxRecordSecs * 1000) {
      return;
    }

    this.setState({ status: "recording" });
    this.props.setRecorderStatus("recording");

    const audioSet = {
      AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
      AudioSourceAndroid: AudioSourceAndroidType.MIC,
      AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
      AVNumberOfChannelsKeyIOS: 2,
      AVFormatIDKeyIOS: AVEncodingOption.aac,
      OutputFormatAndroid: OutputFormatAndroidType.AAC_ADTS,
    };

    // console.log('audioSet', audioSet);

    const uri = await this.audioRecorderPlayer.startRecorder(
      this.path,
      audioSet,
    );

    this.audioRecorderPlayer.addRecordBackListener((e) => {
      // console.log('record-back', e);
      this.setState({
        recordMiliSecs: e.currentPosition,
        recordTime: this.audioRecorderPlayer.mmssss(
          Math.floor(e.currentPosition),
        ),
      });

      if (e.currentPosition >= this.state.maxRecordSecs * 1000) {
        this.onStopRecord();
      }
    });

    this.setState({ uri: uri });
    console.log("onStartRecord", `uri: ${this.state.uri}`);
  };

  onPauseRecord = async () => {
    this.setState({ status: "paused" });
    this.props.setRecorderStatus("paused");
    try {
      const r = await this.audioRecorderPlayer.pauseRecorder();
      this.audioRecorderPlayer.removePlayBackListener();
      console.log(r);
    } catch (err) {
      console.log("pauseRecord", err);
    }
  };

  onResumeRecord = async () => {
    this.setState({ status: "recording" });
    this.props.setRecorderStatus("recording");
    console.log("Recorder resumed.");
    await this.audioRecorderPlayer.resumeRecorder();
  };

  onStopRecord = async () => {
    this.setState({ status: "stopped" });
    this.props.setRecorderStatus("stopped");
    const result = await this.audioRecorderPlayer.stopRecorder();
    this.audioRecorderPlayer.removeRecordBackListener();
    this.setState({
      recordMiliSecs: 0,
      uri: result,
    });
    console.log("onStopRecord", result);
  };

  onStartPlay = async () => {
    if (this.state.submitting) {
      return;
    }

    if (this.state.status == "waiting") {
      Alert.alert("", "You haven't started recording", [{ text: "Cancel" }], {
        cancelable: true,
      });
      return;
    }

    this.onPauseRecord();
    console.log("onStartPlay", this.path);

    try {
      const msg = await this.audioRecorderPlayer.startPlayer(this.path);

      // const msg = await this.audioRecorderPlayer.startPlayer();
      const volume = await this.audioRecorderPlayer.setVolume(1.0);
      console.log(`path: ${msg}`, `volume: ${volume}`);
    } catch (err) {
      console.log("startPlayer error", err);
    }
  };

  onSubmitAudio = async () => {
    if (this.state.submitting) {
      return;
    }

    if (this.state.status == "waiting") {
      Alert.alert("", "You haven't started recording", [{ text: "Cancel" }], {
        cancelable: true,
      });
      return;
    }

    this.setState({ submitting: true });
    this.onStopRecord().then(async () => {
      console.log("submitAudio", this.state.uri);
      const uploadStatus = await uploadUserAudio(
        this.props.api,
        this.state.uri,
      ).then((resp) => {
        this.setState({
          public_url: resp["data"]["uploadUserAudio"]["public_url"],
        });
        this.setState({ audio_id: resp["data"]["uploadUserAudio"]["id"] });
        this.props.setPostAudioId(this.state.audio_id);
        this.props.createPost();
      });
    });
  };

  Ring = ({ size = 2, maxSize = 50, direcc = 1, speed = 50 }) => {
    const [innerSize, setInnerSize] = useState(size);
    const [innerDirecc, setInnerDirecc] = useState(direcc);

    useEffect(() => {
      const interval = setInterval(() => {
        if (this.state.status == "recording") {
          if (innerDirecc % 2 == 1) {
            // if going up
            if (innerSize < maxSize) {
              setInnerSize(innerSize + 1);
            } else {
              setInnerDirecc(innerDirecc + 1);
            }
          } else {
            if (innerSize > size) {
              setInnerSize(innerSize - 1);
            } else {
              setInnerDirecc(innerDirecc + 1);
            }
          }
        }
      }, speed);
      return () => clearInterval(interval);
    }, [innerSize, maxSize, innerDirecc]);

    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size,
            borderWidth: (innerSize * 20) / 100,
            borderColor: "rgba(0, 0, 0, 1)",
          },
        ]}
      />
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    alignItems: "center",
  },
  viewRecorder: {
    marginTop: 10,
    marginBottom: 10,
    width: "100%",
    alignItems: "center",
  },
  postBtnWrapper: {
    flexDirection: "row",
    marginTop: 60,

    // marginBottom: 45,
    // marginBottom: 45,
  },

  recordBtnWrapper: {
    flexDirection: "row",
    justifyContent: "center", // Center the button vertically
    alignItems: "center", // Align items vertically in the center
    alignSelf: "center",
  },
  recordBtn: {
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 1)",
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "rgba(255, 255, 255, 1)",
    shadowOpacity: 0.5,
    paddingLeft: Platform.OS == "ios" ? 1 : 0,
    paddingTop: Platform.OS == "ios" ? 6 : 0,
    // elevation: 20,
    // shadowRadius: 50,
  },
  txtRecord: {
    color: "black",
    fontSize: 14,
    includeFontPadding: false,
  },

  postBtn: {
    borderRadius: 40,
    // backgroundColor: 'rgba(255, 255, 255, .75)',
    width: 70,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    // shadowColor: 'rgba(255, 255, 255, 1)',
    shadowOpacity: 0.5,
    elevation: 20,
    // shadowRadius: 50,
  },
  txtPost: {
    color: "black",
    fontSize: 14,
    includeFontPadding: false,
  },
  btnRecorder: {
    borderColor: "rgba(255, 255, 255, .0)",
    borderWidth: 5,
  },
  btnRecord: {
    borderColor: "white",
    borderWidth: 5,
    borderRadius: 30,
  },
  btnStop: {
    borderColor: "white",
    borderWidth: 5,
    borderRadius: 30,
  },
  txtRecorder: {
    color: "white",
    fontSize: 14,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  txtRecordCounter: {
    marginTop: 24,
    color: "white",
    fontSize: 18,
    textAlignVertical: "center",
    fontWeight: "200",
    fontFamily: "Helvetica Neue",
    letterSpacing: 1,
  },
});
