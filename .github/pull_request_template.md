# Pull Request

## Summary

Describe what changed and why.

## Release Declaration (Required for mobile-impact PRs)

Release-Type: APK

Allowed values: `APK` or `OTA`

## Mobile Impact Checklist

- [ ] I changed mobile-impact files (`mobile/**`, `app.json`, `mobile/app.json`, or `eas.json`)
- [ ] I selected the correct release type above
- [ ] If `Release-Type: OTA`, no native/config files were changed
- [ ] I ran `npm run release:preflight`

## Testing

- [ ] Backend/Web/Mobile tests run as applicable
- [ ] Manual smoke checks completed for impacted flows
