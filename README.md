LinkedIn Extractor Extension

How to load for testing (Chrome/Edge):

1. Open Chrome and go to `chrome://extensions`.
2. Enable "Developer mode" (top-right).
3. Click "Load unpacked" and select the `Ext` folder on your Desktop.

Usage:
- Navigate to a LinkedIn profile (you should be logged in if the profile is private).
- Click the extension icon and press "Extract profile and download TXT".
- A TXT file named `linkedin_profile.txt` will be downloaded containing Name, Location, and Education entries.

Notes:
- LinkedIn's page structure changes frequently; the extractor uses multiple fallback selectors but may not find everything on every profile.
- This extension is for interactive use in your browser while logged in; do not use it to mass-scrape LinkedIn (check policies).
