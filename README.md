# Home

An Expo app (SDK 57) that runs in Expo Go.

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
