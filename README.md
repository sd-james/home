# Home

An Android app (Expo SDK 58) with three tabs:

- **Devices**: weekly on/off schedules for Google Home devices, exchanged with Google Home as automation scripts (copy out, import in).
- **Visitor Code**: gets a Les Maisons gate code automatically by SMS (sends the request, reads the reply) and shares it. Falls back to the SMS app and pasting the reply.
- **Settings**: estate number, request format, default uses, visitor message, and app updates.

See CLAUDE.md for the code structure and rules.

## Install on a phone

1. In GitHub, open **Actions → Build Android → Run workflow** (branch `main`).
2. When the job finishes it links to the build on expo.dev. The build itself takes about 10–20 minutes.
3. On the phone, open the build page on expo.dev (or scan its QR code) and tap **Install**. Allow installing apps from your browser if Android asks.

Only needed for the first install and after native changes. Everything else arrives as an update.

## Updates

Every push to `main` checks types, lint and tests, then publishes an EAS Update to the `main` channel (`.github/workflows/eas-update.yml`). The app applies it the next time it opens, or straight away from Settings → **Check for updates**.

Both workflows need the `EXPO_TOKEN` repository secret (a personal access token for the `sd-james` Expo account, from https://expo.dev/settings/access-tokens).

## Develop

```sh
npm install
npm test
npx tsc --noEmit && npx expo lint
```

To run against a local dev server, build a development client (`eas build --profile development`, not set up yet) — the app can't run in Expo Go.
