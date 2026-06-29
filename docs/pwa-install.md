# FitNow PWA install notes

FitNow now includes the first installable-app layer as a PWA.

## Android

1. Open `https://restshop7779.github.io/fitnow/index.react.html`.
2. In Chrome, open the menu.
3. Tap `Add to Home screen` or `Install app`.

## iPhone

1. Open `https://restshop7779.github.io/fitnow/index.react.html` in Safari.
2. Tap the share button.
3. Tap `Add to Home Screen`.

## Included files

- `public/manifest.webmanifest`
- `public/sw.js`
- `public/icons/fitnow-icon-192.png`
- `public/icons/fitnow-icon-512.png`

## Next packaging step

For Play Store and App Store distribution, wrap the current web app with Capacitor after the PWA layer is stable. The next work should create Android and iOS project shells, connect app icons/splash assets, and verify camera/photo proof permissions on real devices.
