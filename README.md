# steemedphish

## v0.0.7
- added a popup screen when you click on the extension icon info on how to contact me for reporting new scams
- fixed the full page red warning panel to display for steewit.com

## v0.0.6
- A content script is also injected into blacklisted websites and covers the age with a red warning panel. This does not work for all sites such as steewit.com.

## v0.0.5
- The content script is injected into the page of whitelisted websites. When a user clicks on a link that takes him/her away from the current website, an alert dialog will show up to raise awareness.
- The background script monitor browser tabs and their URL and update the extension icon color accordingly. A green icon means the current website was found in the whitelist else it will be red.
- When a user opens a blacklisted website an alert will show up to raise awareness
