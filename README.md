# Home

An Expo app (SDK 57) that runs in Expo Go.

## Develop

```sh
npm install
npx expo start
```

Scan the QR code with Expo Go.

## Publishing

Every push to `main` publishes an EAS Update to the `main` update branch (see `.github/workflows/eas-update.yml`). It needs:

- the `EXPO_TOKEN` repository secret (create one at https://expo.dev/settings/access-tokens), and
- the Expo project ID in `app.json` (`updates.url` and `extra.eas.projectId`).

To open an update in Expo Go, open it on expo.dev (Project → Updates) and scan its QR code with Expo Go.
