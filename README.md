# Home

An Expo app (SDK 58) that runs in Expo Go.

On Android, use Expo Go 58.0.2 or later (https://github.com/expo/expo-go-releases/releases). Expo Go 57.0.9 does not send your sign-in when downloading updates, so it cannot open this (private) project.

## Develop

```sh
npm install
npx expo start
```

Scan the QR code with Expo Go.

## Publishing

Every push to `main` publishes an EAS Update to the `main` channel (see `.github/workflows/eas-update.yml`). It needs:

- the `EXPO_TOKEN` repository secret (create one at https://expo.dev/settings/access-tokens), and
- the Expo project ID in `app.json` (`updates.url` and `extra.eas.projectId`).

To open the latest version in Expo Go, scan a QR code for `exp://u.expo.dev/08996c47-64d7-45fd-b395-a40390e55765?channel-name=main`.
