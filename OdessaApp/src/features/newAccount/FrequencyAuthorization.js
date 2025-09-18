import React, { useContext, useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Linking } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { gql } from "graphql-request";
import { LocalStateContext } from "../../state/LocalState";
import { ActivityIndicator, Banner } from "react-native-paper";
import { Spacing, Typography } from "../../common/styles";
import { SafeAreaView } from "react-native-safe-area-context";
import GoBackButton from "../../common/Button/GoBackButton";

const SIWF_LOGIN_MUTATION = gql`
  mutation SiwfLogin($auth_code: String!) {
    siwfLogin(auth_code: $auth_code) {
      success
      msaId
      exists
      controlKey
    }
  }
`;

const SIWF_MSA_QUERY = gql`
  query SiwfMsaId($control_key: String!) {
    siwfMsaId(control_key: $control_key) {
      msaId
    }
  }
`;

export const FrequencyAuthorization = () => {
  const [authCode, setAuthCode] = useState("");
  const [error, setError] = useState(null);
  const { api, setHDSeedPhrase } = useContext(LocalStateContext);
  // Used to force a re-fetch of the auth code
  const [tryCount, setTryCount] = useState(0);
  const navigation = useNavigation();
  // keep a ref to the interval so we can clear it when the component is unmounted
  const pollIntervalRef = useRef(null);

  const extractAuthCode = (url) => {
    const regex = /[?&]authorizationCode=([^&#]*)/;
    const matches = regex.exec(url);
    return matches ? decodeURIComponent(matches[1]) : null;
  };

  // handle URL when app is opened with deep link
  const handleDeepLink = (event) => {
    const url = event.url;
    const authCodeParam = extractAuthCode(url);
    if (authCodeParam) {
      setAuthCode(authCodeParam);
    }
  };

  // this is a workaround to extract the auth code from the inital URL
  useEffect(() => {
    const navState = navigation.getState();
    const routes = navState.routes;
    const currentRoute = routes[routes.length - 1];
    const params = currentRoute?.params || {};
    const path = currentRoute?.name || "";

    if (params.authorizationCode) {
      setAuthCode(params.authorizationCode);
    } else if (path) {
      // If not in params, try to extract from path
      const url = `${path}`;
      handleDeepLink({ url });
    }
  }, [navigation]);

  useEffect(() => {
    const linkingSubscription = Linking.addEventListener("url", handleDeepLink);
    // attempt to get the URL, but it's always seems to be null
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // clean up
    return () => {
      linkingSubscription.remove();
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const login = async () => {
        setError(null);
        try {
          const variables = {
            auth_code: authCode,
          };
          const data = await api.request(SIWF_LOGIN_MUTATION, variables);
          console.log("Mutation Response:", data);

          if (data.siwfLogin.success) {
            if (data.siwfLogin.msaId) {
              // Using the MSA ID as the seed phrase
              setHDSeedPhrase(data.siwfLogin.msaId);

              if (data.siwfLogin.exists) {
                navigation.navigate("FirstFlowScreen", {
                  initialPage: 10, // Set the page index for SIGN_IN
                  msaId: data.siwfLogin.msaId,
                });
              } else {
                navigation.navigate("FirstFlowScreen", {
                  initialPage: 1, // Set the page index for CREATE_ACCOUNT
                  msaId: data.siwfLogin.msaId,
                });
              }
            } else {
              const pollForMsaId = async (controlKey) => {
                pollIntervalRef.current = setInterval(async () => {
                  try {
                    const queryVariables = {
                      control_key: controlKey,
                    };
                    const queryData = await api.request(
                      SIWF_MSA_QUERY,
                      queryVariables,
                    );

                    if (queryData.siwfMsaId.msaId) {
                      clearInterval(pollIntervalRef.current);
                      pollIntervalRef.current = null;
                      setHDSeedPhrase(queryData.siwfMsaId.msaId);
                      navigation.navigate("FirstFlowScreen", {
                        initialPage: 1, // Set the page index for CREATE_ACCOUNT
                        msaId: queryData.siwfMsaId.msaId,
                      });
                    }
                  } catch (error) {
                    console.error("Error polling for MSA ID:", error);
                  }
                }, 4000);
              };
              pollForMsaId(data.siwfLogin.controlKey);
            }
          }
        } catch (error) {
          console.error("Error submitting mutation:", error);
          setError("Something went wrong. Please try again.");
        }
      };

      if (authCode) {
        login();
      }

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }, [authCode, tryCount]),
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <GoBackButton onPress={() => navigation.goBack()} />
      <View
        style={{
          marginTop: Spacing.lg,
        }}
      />
      {error && (
        <Banner
          visible={!!error}
          actions={[
            {
              label: "Try Again",
              onPress: () => {
                setError(null);
                setTryCount(tryCount + 1);
              },
            },
          ]}
        >
          <Text style={styles.screenText}>{error}</Text>
        </Banner>
      )}
      {!error && authCode ? (
        <View style={styles.statusView}>
          <ActivityIndicator animating={true} size="large" />
          <Text
            style={{
              ...styles.screenText,
              textAlign: "center",
            }}
          >
            Searching for you on Frequency...
          </Text>
        </View>
      ) : (
        <View style={styles.statusView}>
          <Text
            style={{
              ...styles.screenText,
              textAlign: "center",
            }}
          >
            Authorization code is {authCode || "empty"}. Please try again.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screenText: {
    ...Typography.bodyDark,
    fontSize: Typography.lg,
  },
  statusView: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xxl,
    width: "70%",
    alignSelf: "center",
  },
});
