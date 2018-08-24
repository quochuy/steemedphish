## Steemed Phish - Chrome extension that offers protection against Steemit phishing clones
### Features
#### Changing icon color based on white/blacklist
This extension will validate Steemit related websites by changing its icon color:
 - red is for blacklisted sites
 - green is for recognised friendly sites
 - grey is for unrecognised sites

#### Whitelist and blacklist
Steemed Phish does not rely solely on these list as anything not listed won't be protected. Blacklist and whitelist are hard to maintain but adding them helps widening the protection coverage.

When a site is neither whitelisted or blacklisted, Steemed Phish will try to check the URL structure to find known patterns and flag a link as supsicious by coloring it in pink.

There are currently 19 blacklisted websites and 31 whitelisted websites.
#### Phishing Alerts
If a user lands on a phishing website, Steemed Phish will display two types of alerts:
- a dialog that shows up even if the page was loaded in a tab in the background
- a full page alert, that covers the whole phishing page and offers a link to go back to Steemit.com. The full page alert also reminds the user of not using their Steemit Keys on unknown websites and keep their password (Owner Key) safe.

#### Expand shorten URL
Some links are shortened using services such as bit.ly, this prevents people from easily analysing the URL of the link. Steemed Phish uses a link expanding API to determine the destination URL of a link and then compare it again against the white/blacklist logic above.

#### Making external links more visible
Ideally, a user should be more careful on links they are clicking on by always paying attention to the URL of an anchor. But this is easier said than done and even the most experienced user can let down their guard sometimes and get tricked by the scammers.

Recently, Steemit.com, has added a feature that marks external links with a grey icon on the right of each links. Steemed Phish will make that icon more obvious by coloring it in purple. On top of that, it will make a bubble appear next to the mouse cursor with a text explaining the fact that clicking on the link with leads you away so don't use your password. This bubble won't show up on friendly (whitelisted) websites

### Roadmap and potential ideas
- make a bot that browses steemit for reports and extract URLs to be added to the blacklist
- make a bot that follows another bot (@guard) and listens for its downvotes and update the blacklist accordingly
- monitor the https://steem.chat/channel/steemitabuse channel for more URls to be added to the blacklist
- If Steem Guard project goes live, use its API to update the blacklist: https://steemit.com/steem/@hernandev/proposal-steemguard-phishing-and-scam-protection-tools(edited)

### Download the extension
To download and use the extension, just head to the Google Webstore:
https://chrome.google.com/webstore/detail/steemed-phish/eiaigalhddmmpdnehcigmlmgllomljgj

# steemedphish
## v0.0.32
- code cleanup and optimisation
- fix issue with some links not being scanned properly

## v0.0.31
- make comment blocks more visible as a work around the new strategy described here https://steemit.com/steemit/@arcange/be-careful-new-scam-for-phishing-website-uses-fake-comments-with-images
- add support for steemcleaners steemit account blacklist https://github.com/gryter/plentyofphish/blob/master/phishing.txt and mark those authors if found on any steemit blogs
- when hovering the mouse on an image, show a dotted border to help spot fake upvote/reply links

## v0.0.30
- added steemcleaners blacklist https://github.com/gryter/plentyofphish/blob/master/phishingurls.txt

## v0.0.29
- minor fixes on how the blacklist is loaded
- more sites added to the blacklist

## v0.0.28
- improve full page alert within iframes when no body tag is found
- improve URL unshortening script

## v0.0.27
- improve detection within iframes
- fix bug with logic running on neutral sites

## v0.0.26
- fix whitelist bug
- adding cache buster to siteList.json URL

## v0.0.25
- updated the popup screen
- use of regexp for blacklist and whitelist

## v0.0.24
- added own URL expander that works better with services such as https://t.co

## v0.0.23
- better way to handle blacklist and whitelist
- update the popup

## v0.0.21
- blacklist update
- added regexp for suspicious non blacklisted sites. Trying to find a pattern hostname used by scammers and show an alert if found.

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
