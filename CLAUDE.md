# Home app

@AGENTS.md

## Project rules

- **This app must run in Expo Go.** Do not add custom native code, `ios/`/`android/` folders, config plugins that change native code, or any library that isn't bundled in Expo Go. Use `npx expo install <package>` and confirm the package works in Expo Go before adding it. If a feature needs a development build, say so instead of adding it.
- **Changes go to `main`.** Commit and push directly to `main`; every push to `main` runs `.github/workflows/eas-update.yml`, which publishes an EAS Update to the `main` branch so it opens in Expo Go.
- Keep the Expo SDK at a version Expo Go supports. `runtimeVersion` uses the `sdkVersion` policy (`exposdk:<sdk>`), which is what lets Expo Go load the published updates — don't change it.
- Before pushing, run `npx tsc --noEmit` and `npx expo-doctor`.
