var contentScript = {
  textarea: null,
  pageDataUpdateTimer: 0,
  devtoolsPanelReady: false,

  init: function () {
    console.log('Steemed Phish: init content script...', window.location.href);

    // Listening to messages coming from the injected script (contentObject)
    window.addEventListener('message', contentScript.messageListener);

    document.addEventListener("DOMContentLoaded", function (event) {
      // Requesting blacklist from the background process
      chrome.extension.sendRequest({getSiteLists: true});

      // Listening to messages coming from the background process
      chrome.extension.onRequest.addListener(contentScript.requestListener);
    });
  },

  messageListener: function (event) {
    // Only accept messages from same frame
    if (event.source !== window) {
      return;
    }

    var message = event.data;
    switch (true) {
      // The inject script wants to expand a short URL
      case (message.hasOwnProperty('unshortenUrl')):
        // Forward the message to the background process because Steemit Condenser does not allow calls to external domains
        chrome.extension.sendRequest(message);
        break;
    }
  },

  requestListener: function (request, sender, sendResponse) {
    switch (true) {
      case request.hasOwnProperty('siteList'):
        var script = document.createElement('script');
        var siteList = JSON.stringify(request.siteList);
        var steemCleanersSiteList = JSON.stringify(request.steemCleanersSiteList);
        var steemCleanersUserList = JSON.stringify(request.steemCleanersUserList);

        script.appendChild(
          document.createTextNode(
            `(${contentScript.inject})(${siteList}, ${steemCleanersSiteList}, ${steemCleanersUserList});`
          )
        );

        document.body.appendChild(script);
        break;

      case request.hasOwnProperty('longUrl'):
        if (request.longUrl !== '') {
          // Short URL expanded, forwarding message to the injected script
          window.postMessage(request, '*');
        }

        break;
    }
  },

  inject: function (siteList, steemCleanersSiteList, steemCleanersUserList) {
    var contentObject = {
      initialized: false,
      siteList: siteList,
      steemCleanersSiteList: steemCleanersSiteList,
      steemCleanersUserList: steemCleanersUserList,
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

      initObserver: function () {
        var body = document.body;

        // Using a MutationObserver to wait for a DOM change
        // This is to scan dynamically loaded content (lazyload of comments for example)
        contentObject.observer = new MutationObserver(function (contentObject) {
          return function (mutations) {
            mutations.forEach(function (mutation) {
              // Preventing multipl calls to checkAnchors()
              if (contentObject.observerTimer) {
                window.clearTimeout(contentObject.observerTimer);
              }

              // Lets wait for a DOM change
              contentObject.observerTimer = window.setTimeout(function () {
                console.log('Steemed Phish: change detected in DOM');
                contentObject.checkAnchors();
                contentObject.highlightBlacklistedUsers();

                contentObject.goVoteForMe();
              }, 500);
            });
          };
        }(contentObject));

        // Waiting for the DOM to be modified (lazy loading)
        contentObject.observer.observe(body, contentObject.observerConfig);
      },

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

      highlightBlacklistedUsers: function() {
        var authorNodes = document.getElementsByClassName('Author');

        var regexp = new RegExp("\\b(" + contentObject.steemCleanersUserList.join('|') + ")\\b", 'g');

        for (var ni=0; ni<authorNodes.length; ni++) {
          var node = authorNodes[ni];

          contentObject.getAllTextNodes(node).forEach(function(node) {
            if (node.nodeValue.length > 2 && node.nodeValue.indexOf("⚠️") === -1) {
              node.nodeValue = node.nodeValue.replace(
                regexp,
                "⚠️ $1 ⚠️"
              );
            }
          });
        }
      },

      isWhitelisted: function (url) {
        if (url.indexOf('http') === 0) {
          var baseUrl = url.split('/').slice(0, 3).join('/') + '/';

          for (var i = 0; i < contentObject.siteList.whitelist.length; i++) {
            var entry = contentObject.siteList.whitelist[i];
            var regexp = new RegExp(entry, 'gi');
            if (baseUrl.match(regexp)) {
              return true;
            }
          }
        }

        return false;
      },

      isBlacklisted: function (url) {
        if (url.indexOf('http') === 0) {
          var baseUrl = url.split('/').slice(0, 3).join('/') + '/';

          for (var i = 0; i < contentObject.siteList.blacklist.length; i++) {
            var entry = contentObject.siteList.blacklist[i];
            var regexp = new RegExp(entry, 'gi');
            if (baseUrl.match(regexp)) {
              return true;
            }
          }

          for (var i = 0; i < contentObject.steemCleanersSiteList.length; i++) {
            var entry = contentObject.steemCleanersSiteList[i];
            if (entry !== '' && baseUrl.indexOf(entry) !== -1) {
              return true;
            }
          }
        }

        return false;
      },

      isBypass: function (url) {
        if (url.indexOf('http') === 0) {
          var baseUrl = url.split('/').slice(0, 3).join('/') + '/';

          for (var i = 0; i < contentObject.siteList.bypass.length; i++) {
            var entry = contentObject.siteList.bypass[i];
            var regexp = new RegExp(entry, 'gi');
            if (baseUrl.match(regexp)) {
              return true;
            }
          }
        }

        return false;
      },

      isSuspicious: function (url) {
        for (var i = 0; i < contentObject.siteList.suspicious.length; i++) {
          var entry = contentObject.siteList.suspicious[i];
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

      checkAnchors: function () {
        console.log('Steemed Phish: Checking anchors');

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
            if (contentObject.isBlacklisted(anchor.href) === true) {
              // If in the blacklist then make it very obvious

              console.log('Steemed Phish: found blacklisted link ', anchor.href);
              anchor.style.color = "red";
              anchor.style.textDecoration = "line-through";
              anchor.innerHTML = "SCAM DETECTED !!" + anchor.innerHTML + "!!";
            } else {
              // else show a tooltip informing that upon click, they will leave the current site
              if (
                contentObject.isWhitelisted(anchor.href) === false   // Skip the tooltip on friendly websites
                && contentObject.isBypass(anchor.href) === false
                && !anchor.classList.contains('steemed-phish-checked')
              ) {
                if (
                  !anchor.classList.contains("steemed-phish-suspicious")
                  && contentObject.isSuspicious(anchor.href)
                ) {
                  anchor.style.color = "pink";
                  anchor.innerHTML = "!" + anchor.innerHTML + "!";
                  anchor.classList.add("steemed-phish-suspicious");
                }

                anchor.title = "";
                anchor.addEventListener('mousemove', contentObject.mousemoveHandler);
                anchor.addEventListener('mouseout', contentObject.mouseoutHandler);
              } else {
                anchor.removeEventListener('mousemove', contentObject.mousemoveHandler);
                anchor.removeEventListener('mouseout', contentObject.mouseoutHandler);
              }

              // Let see if this is a short URL and what it redirects to
              if (
                contentObject.isWhitelisted(anchor.href) === false
                && contentObject.isBypass(anchor.href) === false
                && !anchor.classList.contains('steemed-phish-unshortened')
              ) {
                anchor.classList.add("steemed-phish-unshortening");
                window.postMessage({unshortenUrl: anchor.href}, '*');
              }
            }
          }

          anchor.classList.add("steemed-phish-checked");
        }
      },

      mousemoveHandler: function (e) {
        var target = e.target;
        var tooltip = document.querySelector('#external-link-tooltip');

        if (target.classList.contains('steemed-phish-suspicious')) {
          tooltip.innerHTML = contentObject.suspiciousLinkTooltipText;
        } else {
          tooltip.innerHTML = contentObject.externalLinkTooltipText;
        }

        if (tooltip) {
          tooltip.style.display = "block";
          tooltip.style.left = e.pageX + 'px';
          tooltip.style.top = e.pageY + 'px';
        }
      },

      mouseoutHandler: function (e) {
        var tooltip = document.querySelector('#external-link-tooltip');
        if (tooltip) {
          tooltip.style.display = "none";
        }
      },

      messageListener: function (event) {
        // Only accept messages from same frame
        if (event.source !== window) {
          return;
        }

        var message = event.data;
        switch (true) {
          case (message.hasOwnProperty('longUrl') && message.hasOwnProperty('url')):
            var longUrl = message.longUrl;
            var scamAnchorSelector = 'a[href="' + message.url + '"]';

            var scamAnchor = document.querySelector(scamAnchorSelector);
            if (scamAnchor) {

              scamAnchor.href = message.longUrl;
              scamAnchor.classList.add('steemed-phish-unshortened');
              scamAnchor.classList.remove('steemed-phish-checked');
              scamAnchor.classList.remove("steemed-phish-unshortening");

              contentObject.checkAnchors();
            }
            break;
        }
      },

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

      init: function () {
        if (contentObject.isBlacklisted(window.location.href)) {
          contentObject.displayScamWarning();
        } else if (contentObject.isWhitelisted(window.location.href)) {
          contentObject.initObserver();
          contentObject.goVoteForMe();

          // Listening to messages comming from contentScript
          window.addEventListener('message', contentObject.messageListener);

          // Inject the tooltip container
          var span = document.createElement('span');
          span.id = "external-link-tooltip";
          span.innerHTML = contentObject.externalLinkTooltipText;
          document.body.appendChild(span);

          contentObject.checkAnchors();
          contentObject.highlightBlacklistedUsers();
        } else {
          // console.log('Steemed Phish: this is a neutral site, doing nothing... ' + window.location.href);
        }

        // console.log('Steemed Phish: Done');
      }
    };

    contentObject.init();
  }
}

contentScript.init();
