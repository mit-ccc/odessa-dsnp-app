# Odessa React Native app.

Dependencies:

- Node v20
- Android Studio (2022.3.1 or greater)
- Pixel 5 API 33 AVD, see [how to create and manage
  AVDs](https://developer.android.com/studio/run/managing-avds)
- [React Native
  Paper](https://callstack.github.io/react-native-paper/) UI kit
- [React Navigation](https://reactnavigation.org/)

## Important Notes

- [Identity concepts & implementation](./Identity.md)

## Development

### If this is your first time accessing Odessa

Make sure to do the following to get the Android emulator ready:

- Download the `Odessa Google Play Store Upload Keystore` file from 1Password and save it as in the `OdessaApp/android/app/` directory as `odessa-upload-key.keystore`
- Set the JAVA_HOME and ANDROID_HOME variables and add android-sdk to your path

  - To do this on a Mac, add the following to ~/.bash-profile:

    ```bash
    # Set Java location
    export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home

    # Set SDK location
    export ANDROID_HOME=$HOME/Library/Android/sdk
    export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk

    # Add Android locations to path
    export PATH=$PATH:$ANDROID_HOME/emulator
    export PATH=$PATH:$ANDROID_HOME/tools
    export PATH=$PATH:$ANDROID_HOME/platform-tools
    ```

- In Android Studio, go to settings → Android SDK and check “show package details” in the bottom right
  - Make sure Tiramisu 33 is checked
  - Under SDK Tools, make sure 33.0 and “command line tools” are checked
  - Save these settings to install/apply them

Setup is now complete!

### Running the Odessa application locally

NOTE: make sure you complete the steps in the root README, the `services/` directory README, and above to ensure you're set up to run the application locally.

1. Start the services postgres container if it’s not already running (can be done in Docker desktop or via command line)
2. In the `services/` directory, enter your virtual environment, and runthe following to start the API service:
   ```bash
   uvicorn api:app --log-config log-debug.ini --reload
   ```
3. In **_another terminal instance_**, in the `OdessaApp/` directory, run `npm start` to get Metro running
   - Metro is the JavaScript bundler that ships with React Native
4. In **_a third terminal instance_**, in the `OdessaApp/` directory, run `npm run {operating system}` to get the emulator you want running
   - You could also do this from the terminal running Metro by typing `a` for Android or `i` for iOS
   - NOTE: if running the Android emulator, you must have Android Studio open and a device running before you run `npm run android`
     - This is not necessary for iOS, but you may need to run `pod install` from the `ios/` directory

If you run into issues, `npx react-native doctor` will help you troubleshoot.

If you edit the application and want to see it reflected in the emulator:

- For **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Developer Menu** (<kbd>Ctrl</kbd> + <kbd>M</kbd> (on Window and Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (on macOS)) to see your changes!
- For **iOS**: Hit <kbd>Cmd ⌘</kbd> + <kbd>R</kbd> in your iOS Simulator to reload the app and see your changes!

### DotEnv Configuration

Background: [multi-env
dotenv](https://github.com/goatandsheep/react-native-dotenv#multi-env)
and
[NODE_ENV](https://nodejs.dev/en/learn/nodejs-the-difference-between-development-and-production/).

In the default development mode, npm will build an environment from
`.env.development` first, then `.env`, so you will need one or both of
those files. It's generally simplest just to use `.env`. The repo
contains a `.env.template` file which describes what environment
variables must be present in `.env`. In this mode, npm sets `NODE_ENV`
to `development`.

When doing a production build, npm will set `NODE_ENV` to
`production`. This tells the dotenv system to instead look for
`.env.production`. You will need to fill this file in with production
values.

If either a development or production build requires secrets, you will
generally find them in 1pw.

`.env`, `.env.development`, and `.env.production` are in `.gitignore`
to avoid accidentally checking in secrets.

If you change a `.env` file, you must restart Metro and tell it to
clear cache:

```
npm start -- --reset-cache
```

Otherwise it does not detect changes to `.env` as changes to code, and
so it will hold a stale compiled copy of any jsx file that includes
`@env` values.

### Signing in with Frequency (a.k.a. DSNP)

Odessa offers two ways to sign in:

1. Using your seed phrase.
2. Signing in with Frequency (SIWF).

Signing in with frequency requires the [Frequency Gateway services](https://github.com/ProjectLibertyLabs/gateway) are running. From the `services` directory run:

```
./start_frequency_gatway.sh
```

To sign in via Frequency, choose that option when opening Odessa. Enter an email that you've previously used for Frequency to sign in into Odessa or choose a new email (**tip**: use "+" in your email address to test, e.g. user+new@media.mit.edu).

You'll be set an email that links to a web page. Open the page to continue signing in. If you're testing this on a physical mobile device continue normally.

If you're using a simulator/emulator:

1. Open the deep link found on the page (use web inspector to find it).
2. Copy the authorization code.
3. Open the deep link via the command line, e.g. ` npx uri-scheme open "odessa://login?authorizationCode=f9cfda29-8c29-45e1-b042-8733b5a1aef8" --ios`

Congratulations! You've signed in with Frequency. If you run into trouble:

- The service workers docker containers often shut down and may need to be started again. If you run into errors registering new users, check to see if they've need to be restarted.
- Did you start the postgres database?
- Try opening up the deep link twice. We've address this, and in the past have found the initial URL to be `null` when opening the deep link.

### Formatting and Linting

We use [prettier](https://prettier.io/docs/en/install.html) for automatic JS code formatting and linting.
We recommend the [VS Code Prettier Plugin](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode).

We use [ruff](https://docs.astral.sh/ruff/) for automatic PEP8 formatting and linting. We recommend the
[VS Code ruff plugin](https://marketplace.visualstudio.com/items?itemName=charliermarsh.ruff).

## Google Play Store Deployment

At present the app is in the Play store with internal test users. This
allows us to have < 100 users without having to go through app review.

### Build

1. The Odessa app must be built and signed with the deploy key, which
   can be found in 1pw in the "Eng - Deployment" vault under "Odessa
   Google Play Store Upload Keystore." You need to download this and
   place the file at:
   `OdessaApp/android/app/odessa-upload-key.keystore`.
2. Configure Gradle so that it knows the location of this
   keystore. Modify (or create) your `~/.gradle/gradle.properties`
   file to have the following:

   ```
   ODESSA_UPLOAD_STORE_FILE=odessa-upload-key.keystore
   ODESSA_UPLOAD_KEY_ALIAS=odessa-upload-key
   ODESSA_UPLOAD_STORE_PASSWORD=XXX
   ODESSA_UPLOAD_KEY_PASSWORD=XXX
   ```

   Where XXX can be found in 1pw in that "Odessa Google Play Store
   Upload Keystore" entry. It is not the file, but the "password"
   field. Note that both `ODESSA_UPLOAD_STORE_PASSWORD` and
   `ODESSA_UPLOAD_KEY_PASSWORD` are the same.

3. Update `versionCode` and `versionName` in
   `./android/app/build.gradle`. We're aiming to keep `versionName` in
   sync with the iOS build, but `versionCode` should be incremented
   independently (iOS has a similar revision number). It is the way
   that Android keeps track of unique app versions. Commit this change
   to the repo.

   For iOS update `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` in `OdessaApp/ios/OdessaApp.xcodeproj/project.pbxproj`.

4. Run `npx react-native build-android --mode=release` or `npx react-native build-ios --mode=Release`. This will
   create the file
   `OdessaApp/android/app/build/outputs/bundle/release/app-release.aab`,
   which is the file you upload to the Play store.
5. Test the production build with:

   ```
   npm run android -- --mode="release"
   npm run ios -- --mode="Release"
   ```

   ...before uploading to the Play store. This will run the app bundle
   in your emulator. In order to do this, you may need to first
   uninstall Odessa from your emulator. The development build of
   Odessa is signed with a different upload key than the production
   build. Android doesn't like apps switching between the two (might
   be an adversarial attack), and so will block installation of the
   prod app if the dev one is installed and vice versa. Uninstalling
   the app fixes this.

6. Upload the app via the [Odessa App Play
   Console](https://play.google.com/console/u/0/developers/9203078970954226764/app/4974273577176137209/app-dashboard). You
   must be registered as a developer on the project by IS&T (email
   app-publish@mit.edu to get on the list). First, upload the via the
   "App bundle explorer" side nav link. Then, under Testing, go to
   "Internal testing" and create a new release.

### Internal Testing

The "internal testing" feature of the Play store allows us to
circumvent app review for < 100 users. Every user who installs the app
must have their Google account associated email in the "MIT CCC
Developers" testing group. You can get there by clicking Testing ->
Internal Testing -> Testers, then scroll down and look for "MIT CCC
Developers."

Background information: https://reactnative.dev/docs/signed-apk-android.

## Troubleshooting

If you can't get this to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

## Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
