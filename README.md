# steemedphish
## v0.0.20
- not showing the external link warning on friendly websites

## v0.0.19
- blacklist update
- unshorten URL from links and check them against black lists

## v0.0.17 & v0.0.18
- fix a bug that conflicted with Steemit login button

## v0.0.16
- the external link marker is now purple instead of read to not be confused with a scam link that is also red
- faster scan of anchors
- use a tooltip that moves with the mouse to make external links more visible

## v0.0.15
- whitelist update
- icon update

## v0.0.14
- click on the extension icon to see instructions on how to send me new sites to be whitelisted or blacklisted

## v0.0.13
- better fix for flickering of page when injecting custom css

## v0.0.12
- added new blacklisted domain
- share blacklist between the background and content scripts

## v0.0.11
- improve blacklisted links detection by using the MutationObserver API. This allows marking of links from hidden comments due to low ratings.

## v0.0.10
- bug fix

## v0.0.9
- bug fix

## v0.0.8
- added more whitelisted sites
- one extra color for the extension icon: red = blacklisted site, green = known good steemit related site, grey = not a known steemit related site
- the alert on a click on an external link has been removed and replaced by the behaviour below
- steemit.com has added a little grey icon next to a link that takes you away from it, this icon is now made red instead of grey for better visibility
- if an external link is from a blacklisted site, the link will highlighted in red and stricken through and marked as SCAM
- a link back to the equivalent page on Steemit is added to the full page alert

## v0.0.7
- added a popup screen when you click on the extension icon info on how to contact me for reporting new scams
- fixed the full page red warning panel to display for steewit.com

## v0.0.6
- A content script is also injected into blacklisted websites and covers the age with a red warning panel. This does not work for all sites such as steewit.com.

## v0.0.5
- The content script is injected into the page of whitelisted websites. When a user clicks on a link that takes him/her away from the current website, an alert dialog will show up to raise awareness.
- The background script monitor browser tabs and their URL and update the extension icon color accordingly. A green icon means the current website was found in the whitelist else it will be red.
- When a user opens a blacklisted website an alert will show up to raise awareness
