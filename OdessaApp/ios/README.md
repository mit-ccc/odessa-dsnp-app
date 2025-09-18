Getting xcode up and running is as simple as this:

1. brew install cocoapods
2. cd odessa/OdessaApp/ios
3. pod install
4. run the command "open OdessaApp.xcworkspace" (if this doesn't work, just open directly from xcode)
5. it should default to give you a device -- iphone14 pro for me. Change device if you'd like.
6. cmd + r to run the application. Took about 2 minutes to boot up. Lots of warnings and stuff but worked perfectly fine.

-- if you are the first one working ios --

7. you will need to change the client endpoint. Android and ios use different tunneling methods to talk on insecure network from unrecognized ip.

8. if you are having trouble with fonts or icons, you need to manually install them. There is a medium article for react-native-paper that explains this perfectly. Pretty much, you drag in your fonts from xcode (locate which node_modules it is from the package.json file), then you need to go to app/app/info.plist in xcode, then type in Fonts Provided by Application, then type in subvalues for the specific ttf files or other files that you want. Then it seems this is sufficient for apple to be able to locate them.
