/**
 * Content script that will be run on the actual page
 * @type {{textarea: null, pageDataUpdateTimer: number, devtoolsPanelReady: boolean, init: contentScript.init, requestListener: contentScript.requestListener, process: {initialized: boolean, siteList: null, steemCleanersSiteList: null, steemCleanersUserList: null, observer: null, tooltip: null, observerConfig: {attributes: boolean, childList: boolean, subtree: boolean, characterData: boolean}, observerTimer: null, externalLinkTooltipText: string, suspiciousLinkTooltipText: string, blacklistLinkTooltipText: string, initObserver: contentScript.process.initObserver, goVoteForMe: contentScript.process.goVoteForMe, getAllTextNodes: (function(*=): Array), highlightBlacklistedUsers: contentScript.process.highlightBlacklistedUsers, isWhitelisted: contentScript.process.isWhitelisted, isBlacklisted: contentScript.process.isBlacklisted, isBypass: contentScript.process.isBypass, isSuspicious: contentScript.process.isSuspicious, checkAnchors: contentScript.process.checkAnchors, mousemoveHandler: contentScript.process.mousemoveHandler, mouseoutHandler: contentScript.process.mouseoutHandler, displayScamWarning: contentScript.process.displayScamWarning, init: contentScript.process.init}}}
 */
var contentScript = {
  textarea: null,
  pageDataUpdateTimer: 0,
  devtoolsPanelReady: false,

  /**
   * Initializing the module
   */
  init: function () {
    console.log('Steemed Phish: init content script...', window.location.href);

    document.addEventListener("DOMContentLoaded", function (event) {
      // Requesting blacklist from the background process
      chrome.extension.sendRequest({getSiteLists: true});

      // Listening to messages coming from the background process
      chrome.extension.onRequest.addListener(contentScript.requestListener);
    });
  },

  /**
   * Listening to messages coming from the background process
   * @param request
   * @param sender
   * @param sendResponse
   */
  requestListener: function (request, sender, sendResponse) {
    switch (true) {
      case request.hasOwnProperty('siteList'):
        var script = document.createElement('script');
        contentScript.process.siteList = request.siteList;
        contentScript.process.steemCleanersSiteList = request.steemCleanersSiteList;
        contentScript.process.steemCleanersUserList = request.steemCleanersUserList;

        contentScript.process.init();
        break;

      // Short URL expanded
      case request.hasOwnProperty('longUrl'):
        if (request.longUrl !== '') {
          var longUrl = request.longUrl;
          var anchorId = btoa(longUrl);
          var scamAnchorSelector = 'a[data-url="' + anchorId + '"]';
          var scamAnchors = document.querySelectorAll(scamAnchorSelector);

          if (scamAnchors) {
            for (var ai=0; ai<scamAnchors.length; ai++) {
              var scamAnchor = scamAnchors[ai];

              scamAnchor.href = longUrl;
              scamAnchor.classList.add('steemed-phish-unshortened');
              scamAnchor.classList.remove('steemed-phish-checked');
              scamAnchor.classList.remove("steemed-phish-unshortening");
            }

            contentScript.process.checkAnchors();
          }
        }

        break;
    }
  },

  /**
   * This contains the logic for actually processing the content on the page
   */
  process: {
    initialized: false,
    siteList: null,
    steemCleanersSiteList: null,
    steemCleanersUserList: null,
    observer: null,
    tooltip: null,
    observerConfig: {
      attributes: false,
      childList: true,
      subtree: true,
      characterData: false
    },
    observerTimer: null,
    externalLinkTooltipText: 'This is an external link, it will take you away from ' + window.location.hostname + '. Think before using your Steemit keys.',
    suspiciousLinkTooltipText: 'This link looks suspicious and will take you away from ' + window.location.hostname + '. Take extra care before using your Steemit keys.',
    blacklistLinkTooltipText: 'This user is on Steem Cleaners\' blacklist',

    /**
     * Initializing the MutationObserver to support pages with lazy-loading
     */
    initObserver: function () {
      var body = document.body;

      // Using a MutationObserver to wait for a DOM change
      // This is to scan dynamically loaded content (lazyload of comments for example)
      contentScript.process.observer = new MutationObserver(function (process) {
        return function (mutations) {
          mutations.forEach(function (mutation) {
            // Preventing multipl calls to checkAnchors()
            if (process.observerTimer) {
              window.clearTimeout(process.observerTimer);
            }

            // Lets wait for a DOM change
            process.observerTimer = window.setTimeout(function () {
              console.log('Steemed Phish: change detected in DOM');
              process.checkAnchors();
              process.highlightBlacklistedUsers();

              process.goVoteForMe();
            }, 500);
          });
        };
      }(contentScript.process));

      // Waiting for the DOM to be modified (lazy loading)
      contentScript.process.observer.observe(body, contentScript.process.observerConfig);
    },

    /**
     * If the user clicked on my witness link from the popup, take them to the input field directly
     */
    goVoteForMe: function () {
      if (window.location.href.indexOf('https://steemit.com/~witnesses#votefor=quochuy') !== -1) {
        var buttons = document.evaluate("//button[contains(., 'Vote')]", document, null, XPathResult.ANY_TYPE, null);
        if (buttons) {
          var voteButton = buttons.iterateNext(),
            voteField = voteButton.parentElement.parentElement.querySelector('input');

          voteField.value = 'quochuy';
          voteButton.focus();
          window.setTimeout(function () {
            voteButton.blur();
          }, 1000);
        }
      }
    },

    /**
     * Find all text nodes from the startNode
     * @param startNode
     * @returns {Array}
     */
    getAllTextNodes: function(startNode) {
      var result = [];

      (function scanSubTree(node){
        if(node.childNodes.length)
          for(var i = 0; i < node.childNodes.length; i++)
            scanSubTree(node.childNodes[i]);
        else if(node.nodeType == Node.TEXT_NODE)
          result.push(node);
      })(startNode);

      return result;
    },

    /**
     * Find blacklisted users and highlight them
     */
    highlightBlacklistedUsers: function() {
      var authorNodes = document.getElementsByClassName('Author');

      var regexp = new RegExp("\\b(" + contentScript.process.steemCleanersUserList.join('|') + ")\\b", 'g');

      for (var ni=0; ni<authorNodes.length; ni++) {
        var node = authorNodes[ni];

        contentScript.process.getAllTextNodes(node).forEach(function(node) {
          if (node.nodeValue.length > 2 && node.nodeValue.indexOf("⚠️") === -1) {
            node.nodeValue = node.nodeValue.replace(
              regexp,
              "⚠️ $1 ⚠️"
            );
          }
        });
      }
    },

    /**
     * Is this URL whtielisted?
     * @param url
     * @returns {boolean}
     */
    isWhitelisted: function (url) {
      if (url.indexOf('http') === 0) {
        var baseUrl = url.split('/').slice(0, 3).join('/') + '/';

        for (var i = 0; i < contentScript.process.siteList.whitelist.length; i++) {
          var entry = contentScript.process.siteList.whitelist[i];
          var regexp = new RegExp(entry, 'gi');
          if (baseUrl.match(regexp)) {
            return true;
          }
        }
      }

      return false;
    },

    /**
     * Is this URL blacklisted?
     * @param url
     * @returns {boolean}
     */
    isBlacklisted: function (url) {
      if (url.indexOf('http') === 0) {
        var baseUrl = url.split('/').slice(0, 3).join('/') + '/';

        for (var i = 0; i < contentScript.process.siteList.blacklist.length; i++) {
          var entry = contentScript.process.siteList.blacklist[i];
          var regexp = new RegExp(entry, 'gi');
          if (baseUrl.match(regexp)) {
            return true;
          }
        }

        for (var i = 0; i < contentScript.process.steemCleanersSiteList.length; i++) {
          var entry = contentScript.process.steemCleanersSiteList[i];
          if (entry !== '' && baseUrl.indexOf(entry) !== -1) {
            return true;
          }
        }
      }

      return false;
    },

    /**
     * Should we bypass checks for these URLs ? (Google etc...)
     * @param url
     * @returns {boolean}
     */
    isBypass: function (url) {
      if (url.indexOf('http') === 0) {
        var baseUrl = url.split('/').slice(0, 3).join('/') + '/';

        for (var i = 0; i < contentScript.process.siteList.bypass.length; i++) {
          var entry = contentScript.process.siteList.bypass[i];
          var regexp = new RegExp(entry, 'gi');
          if (baseUrl.match(regexp)) {
            return true;
          }
        }
      }

      return false;
    },

    /**
     * Is this URL suspiscious? Checking their pattern
     * @param url
     * @returns {boolean}
     */
    isSuspicious: function (url) {
      for (var i = 0; i < contentScript.process.siteList.suspicious.length; i++) {
        var entry = contentScript.process.siteList.suspicious[i];
        var regexp = new RegExp(entry.regexp, entry.modifier);

        if (url.match(regexp)) {
          var hostname = url.split('/')[2];

          // If the hostname are IP addresses then don't warn if it is a private IP range
          if (
            hostname.indexOf("10.") !== 0
            && hostname.indexOf("192.168.") !== 0
            && hostname.indexOf("172.16.") !== 0
          ) {
            return true;
          }
        }
      }

      return false;
    },

    /**
     * Verify all anchors to find scammy links
     */
    checkAnchors: function () {
      console.log('Steemed Phish: Checking anchors');

      var urlRequestedForUnshortening = [];

      var host = window.location.host,
        anchors = document.querySelectorAll('.Post a[href]:not(.steemed-phish-checked)');

      for (var i = 0; i < anchors.length; i++) {
        var anchor = anchors[i];

        if (
          anchor.href             // If the anchor has a HREF attribute
          && anchor.href !== ''   // That is not empty
          && (
            anchor.href.indexOf('https://') === -1
            || anchor.href.indexOf('https://' + host) === -1    // That is external
          )
          && !anchor.classList.contains('steemed-phish-checked')  // That was not checked before
        ) {
          if (contentScript.process.isBlacklisted(anchor.href) === true) {
            // If in the blacklist then make it very obvious

            console.log('Steemed Phish: found blacklisted link ', anchor.href);
            anchor.style.color = "red";
            anchor.style.textDecoration = "line-through";
            anchor.innerHTML = "SCAM DETECTED !!" + anchor.innerHTML + "!!";
          } else {
            // else show a tooltip informing that upon click, they will leave the current site
            if (
              contentScript.process.isWhitelisted(anchor.href) === false   // Skip the tooltip on friendly websites
              && contentScript.process.isBypass(anchor.href) === false
              && !anchor.classList.contains('steemed-phish-checked')
            ) {
              if (
                !anchor.classList.contains("steemed-phish-suspicious")
                && contentScript.process.isSuspicious(anchor.href)
              ) {
                anchor.style.color = "pink";
                anchor.innerHTML = "!" + anchor.innerHTML + "!";
                anchor.classList.add("steemed-phish-suspicious");
              }

              anchor.title = "";
              anchor.addEventListener('mousemove', contentScript.process.mousemoveHandler);
              anchor.addEventListener('mouseout', contentScript.process.mouseoutHandler);
            } else {
              anchor.removeEventListener('mousemove', contentScript.process.mousemoveHandler);
              anchor.removeEventListener('mouseout', contentScript.process.mouseoutHandler);
            }

            // Let see if this is a short URL and what it redirects to
            if (
              contentScript.process.isWhitelisted(anchor.href) === false
              && contentScript.process.isBypass(anchor.href) === false
              && !anchor.classList.contains('steemed-phish-unshortened')
            ) {
              var anchorId = btoa(anchor.href);
              anchor.classList.add("steemed-phish-unshortening");
              anchor.dataset.url = anchorId;

              // No need to unshorten the same URL more than once
              if (urlRequestedForUnshortening.indexOf(anchorId) === -1) {
                chrome.extension.sendRequest({unshortenUrl: anchor.href});
                urlRequestedForUnshortening.push(anchorId);
              }
            }
          }
        }

        anchor.classList.add("steemed-phish-checked");
      }
    },

    /**
     * Move the info bubble
     * @param e
     */
    mousemoveHandler: function (e) {
      var target = e.target;
      var tooltip = document.querySelector('#external-link-tooltip');

      if (target.classList.contains('steemed-phish-suspicious')) {
        tooltip.innerHTML = contentScript.process.suspiciousLinkTooltipText;
      } else if (target.classList.contains('steemed-phish-user-blacklist')) {
        tooltip.innerHTML = contentScript.process.blacklistLinkTooltipText;
      } else {
        tooltip.innerHTML = contentScript.process.externalLinkTooltipText;
      }

      if (tooltip) {
        tooltip.style.display = "block";
        tooltip.style.left = e.pageX + 'px';
        tooltip.style.top = e.pageY + 'px';
      }
    },

    /**
     * Hide the info bubble
     * @param e
     */
    mouseoutHandler: function (e) {
      var tooltip = document.querySelector('#external-link-tooltip');
      if (tooltip) {
        tooltip.style.display = "none";
      }
    },

    /**
     * Display a full-page warning if the user landed on a phishing website
     */
    displayScamWarning: function () {
      var div = document.createElement('div');
      div.id = "steemedphishwarning";
      div.innerHTML = '<div><h2>STEEMED PHISH WARNING</h2>' +
        '<p>This site is known to be stealing username and password from Steemit users.</p>' +
        '<p>Close this browser tab or window to return to safety.</p>' +
        '<p><a href="https://steemit.com' + window.location.pathname + '"' +
        'style="color: lightgreen; font-size: 22px; font-weight: bold">Go back to Steemit.com!</a></p>' +
        '<p><a href="javascript:void(null)"' +
        'onclick="alert(\'You have chosen to dismiss the warning. Beware, this is a SCAM website, do not use your password here!\'); document.getElementById(\'steemedphishwarning\').style.display=\'none\';"' +
        'style="color: yellow">Dismiss this message</a></p>' +
        '<p>KEEP YOUR STEEMIT PASSWORD FOR YOURSELF ONLY!</p>' +
        '<p>USE YOUR STEEMIT POSTING KEY FOR CREATING/CURATING CONTENT</p>' +
        '<p>USE YOUR STEEMIT ACTIVE KEY FOR TRANSFERS AND ACCOUNT OPERATIONS</p>' +
        '<p>BE AWARE OF WHICH SITE YOU ARE CURRENTLY ON</p>' +
        '</div>';


      if (document.body.tagName === 'FRAMESET') {
        document.body.parentNode.appendChild(div);
      } else {
        document.body.appendChild(div);
      }

    },

    /**
     * Initialize the scanning process
     */
    init: function () {
      if (contentScript.process.isBlacklisted(window.location.href)) {
        contentScript.process.displayScamWarning();
      } else if (contentScript.process.isWhitelisted(window.location.href)) {
        contentScript.process.initObserver();
        contentScript.process.goVoteForMe();

        // Inject the tooltip container
        var span = document.createElement('span');
        span.id = "external-link-tooltip";
        span.innerHTML = contentScript.process.externalLinkTooltipText;
        document.body.appendChild(span);

        contentScript.process.checkAnchors();
        contentScript.process.highlightBlacklistedUsers();
      } else {
        // console.log('Steemed Phish: this is a neutral site, doing nothing... ' + window.location.href);
      }
    }
  }
}

contentScript.init();
