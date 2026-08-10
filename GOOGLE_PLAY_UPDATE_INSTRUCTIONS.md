# Google Play Console Update Instructions

Successfully built signed AAB file!

**File Location:**
`C:\Users\GRESON\myapp\platforms\android\app\build\outputs\bundle\release\app-release.aab`

**Version:** 1.0.3 (Version Code: 10004)

## Steps to Update in Closed Testing

1.  **Log in** to your [Google Play Console](https://play.google.com/console).
2.  **Select your app** ("Eternal Life").
3.  In the left menu, under **Testing**, select **Closed testing**.
4.  Click **Manage track** for the active alpha/beta track you are using (e.g., "Alpha").
5.  Click **Create new release** (top right).
6.  Under **App bundles**, click **Upload** and select the file mentioned above:
    *   `c:\Users\GRESON\myapp\platforms\android\app\build\outputs\bundle\release\app-release.aab`
7.  Wait for the upload to complete. If successful, you will see the new version (1.0.3) listed.
8.  **Release Name**: This is usually auto-filled (e.g., "1.0.3"). You can leave it.
9.  **Release Notes**: Enter your release notes for this version (e.g., "Bug fixes and improvements").
10. Click **Next** at the bottom right.
11. Review any warnings (if any).
12. Click **Save** and then **Start rollout to Closed testing**.

## Troubleshooting
*   If you get a **Version Code error**, ensure the previous version was 10002 or lower. We used **10003**.
*   If you get a **Signing key error**, ensure the `my-new-release-key.keystore` used in `build.json` matches the one originally uploaded to Google Play (or the upload certificate).
