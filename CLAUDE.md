# Home app

@AGENTS.md

## Project rules

- **This app must run in Expo Go.** Do not add custom native code, `ios/`/`android/` folders, config plugins that change native code, or any library that isn't bundled in Expo Go. Use `npx expo install <package>` and confirm the package works in Expo Go before adding it. If a feature needs a development build, say so instead of adding it.
- **Changes go to `main`.** Commit and push directly to `main` — no feature branches or pull requests; every push to `main` runs `.github/workflows/eas-update.yml`, which publishes an EAS Update to the `main` channel so it opens in Expo Go at `exp://u.expo.dev/08996c47-64d7-45fd-b395-a40390e55765?channel-name=main`.
- The app is on SDK 58 (pre-release) because Android Expo Go 57.0.9 can't open private EAS updates (it drops the sign-in); Expo Go 58.0.2+ is installed from https://github.com/expo/expo-go-releases. Move to the stable 58 release once it's out.
- Keep the Expo SDK at a version Expo Go supports. `runtimeVersion` uses the `sdkVersion` policy (`exposdk:<sdk>`), which is what lets Expo Go load the published updates — don't change it.
- Before pushing, run `npx tsc --noEmit` and `npx expo-doctor`.
