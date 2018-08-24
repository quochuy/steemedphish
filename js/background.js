/**
 * Background process
 * @type {{alertMessage: string, alertSuspiciousMessage: string, siteList: {whitelist: Array, blacklist: Array, suspicious: Array}, steemCleanersSiteList: Array, steemCleanersUserList: Array, alertDisplayed: boolean, init: background.init, unshortenUrl: background.unshortenUrl, requestListener: background.requestListener, updateIconColorByUrl: background.updateIconColorByUrl, isWhitelisted: background.isWhitelisted, isBlacklisted: background.isBlacklisted, isSuspicious: background.isSuspicious, fetchSiteList: background.fetchSiteList, fetchSteemCleanersSiteList: background.fetchSteemCleanersSiteList, fetchSteemCleanersUserList: background.fetchSteemCleanersUserList, updateSiteList: background.updateSiteList, updateSteemCleanersSiteList: background.updateSteemCleanersSiteList, updateSteemCleanersUserList: background.updateSteemCleanersUserList}}
 */
var background = {
  alertMessage: 'One of your browser tabs has landed on a Steemit SCAM website: ',
  alertSuspiciousMessage: 'One of your browser tabs has landed on a suspicious website. It is not a blacklisted website but looks suspicious. Be careful before using your Steemit keys: ',

  siteList: {
    whitelist: [],
    blacklist: [],
    suspicious: []
  },

  steemCleanersSiteList: [],
  steemCleanersUserList: [],

  alertDisplayed: false,

  /**
   * Initialization
   */
  init: function () {
    background.fetchSiteList(background.updateSiteList);
    background.fetchSteemCleanersSiteList(background.updateSteemCleanersSiteList);
    background.fetchSteemCleanersUserList(background.updateSteemCleanersUserList);

    setInterval(function () {
      background.fetchSiteList(background.updateSiteList);
      background.fetchSteemCleanersSiteList(background.updateSteemCleanersSiteList);
      background.fetchSteemCleanersUserList(background.updateSteemCleanersUserList);
    }, 2 * 3600 * 1000);

    chrome.extension.onRequest.addListener(background.requestListener);

    chrome.tabs.onActivated.addListener(function (info) {
      chrome.tabs.get(info.tabId, function (change) {
        background.updateIconColorByUrl(change.url, info.tabId);
      });
    });

    chrome.tabs.onUpdated.addListener(function (tabId, change, tab) {
      if (tab.url == undefined) {
        return;
      }

      background.updateIconColorByUrl(tab.url, tabId);
    });
  },

  /**
   * Use our custom URL unshortener
   * @param url
   * @param callback
   */
  unshortenUrl: function (url, callback) {
    var http = new XMLHttpRequest();
    http.open('GET', 'https://tools.steemulant.com/api/unshorten.php?url=' + encodeURIComponent(url));
    http.onreadystatechange = function () {
      if (this.status == 200) {
        callback(url, http.responseText);
      }
    };
    http.send();
  },

  /**
   * Listening for messages from the content and popup scripts
   * @param request
   * @param sender
   * @param sendResponse
   */
  requestListener: function (request, sender, sendResponse) {
    // Only process request sent from the current tab
    chrome.tabs.query({active: true, currentWindow: true}, function (arrayOfTabs) {
      // since only one tab should be active and in the current window at once
      // the return variable should only have one entry
      var activeTab = arrayOfTabs[0];
      if (typeof activeTab !== "undefined" && activeTab.hasOwnProperty('id')) {
        var activeTabId = activeTab.id; // or do whatever you need

        if (activeTabId && activeTabId === sender.tab.id) {
          switch (true) {
            case request.hasOwnProperty('getSiteLists'):
              chrome.tabs.sendRequest(activeTabId, {
                siteList: background.siteList,
                steemCleanersSiteList: background.steemCleanersSiteList,
                steemCleanersUserList: background.steemCleanersUserList
              }, function (response) {
              });
              break;

            case request.hasOwnProperty('unshortenUrl'):
              background.unshortenUrl(request.unshortenUrl, function (url, longUrl) {
                chrome.tabs.sendRequest(activeTabId, {url: url, longUrl: longUrl}, function (response) {
                });
              });
              break;
          }
        }
      }
    });

    background.listening = false;
  },

  /**
   * Change our extension icon color to indicate the status of the current page
   * @param url
   * @param tabId
   */
  updateIconColorByUrl: function (url, tabId) {
    var isWhitelisted = background.isWhitelisted(url);
    if (isWhitelisted) {
      //<div>Icons made by <a href="http://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>
      chrome.browserAction.setIcon({path: '../images/icon2-48-green.png', tabId: tabId});
    } else {
      var isBlacklisted = background.isBlacklisted(url);
      if (isBlacklisted) {
        chrome.browserAction.setIcon({path: '../images/icon2-48-red.png', tabId: tabId});

        if (background.alertDisplayed === false) {
          background.alertDisplayed = true;
          alert(background.alertMessage + url);

          setTimeout(function () {
            background.alertDisplayed = false;
          }, 15000);
        }
      } else {
        chrome.browserAction.setIcon({path: '../images/icon2-48-grey.png', tabId: tabId});
      }
    }
  },

  /**
   * Check whether the URL is whitelisted or not
   * @param url
   * @returns {boolean}
   */
  isWhitelisted: function (url) {
    if (url.indexOf('http') === 0) {
      var baseUrl = url.split('/').slice(0, 3).join('/') + '/';

      for (var i = 0; i < background.siteList.whitelist.length; i++) {
        var entry = background.siteList.whitelist[i];
        var regexp = new RegExp(entry, 'gi');
        if (baseUrl.match(regexp)) {
          return true;
        }
      }
    }

    return false;
  },

  /**
   * Check whether the URL is blacklisted or not
   * @param url
   * @returns {boolean}
   */
  isBlacklisted: function (url) {
    if (url.indexOf('http') === 0) {
      var baseUrl = url.split('/').slice(0, 3).join('/') + '/';

      for (var i = 0; i < background.siteList.blacklist.length; i++) {
        var entry = background.siteList.blacklist[i];
        var regexp = new RegExp(entry, 'gi');
        if (baseUrl.match(regexp)) {
          return true;
        }
      }

      for (var i = 0; i < background.steemCleanersSiteList.length; i++) {
        var entry = background.steemCleanersSiteList[i];
        if (entry !== '' && baseUrl.indexOf(entry) !== -1) {
          return true;
        }
      }
    }

    return false;
  },

  /**
   * Check whether the URL is suspiscious or not
   * @param url
   * @returns {boolean}
   */
  isSuspicious: function (url) {
    for (var i = 0; i < background.siteList.suspicious.length; i++) {
      var entry = background.siteList.suspicious[i];
      var regexp = new RegExp(entry.regexp, entry.modifier);

      if (url.match(regexp)) {
        var hostname = url.split('/')[2];

        // If the hostname are IP addresses then don't warn of it is a private IP range
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
   * Fetch our own whitelist/blacklist
   * @param callback
   */
  fetchSiteList: function (callback) {
    var http = new XMLHttpRequest();
    var now = new Date().getTime();
    http.open('GET', 'https://tools.steemulant.com/steemed-phish/conf/siteList.v2.json?ord=' + now);
    http.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        callback(http.responseText);
      } else {
        console.log("xhr response status", this.status);
        if (window.localStorage.hasOwnProperty('steemedPhishSiteList')) {
          callback(window.localStorage.getItem('steemedPhishSiteList'));
        }
      }
    };
    http.send();
  },

  /**
   * Fetch SteemCleaners site blacklist
   * @param callback
   */
  fetchSteemCleanersSiteList: function (callback) {
    var http = new XMLHttpRequest();
    var now = new Date().getTime();
    http.open('GET', 'https://raw.githubusercontent.com/gryter/plentyofphish/master/phishingurls.txt?ord=' + now);
    http.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        console.log("ok");
        callback(http.responseText);
      } else {
        console.log("err", this.status);
        if (window.localStorage.hasOwnProperty('steemCleanersSiteList')) {
          callback(window.localStorage.getItem('steemCleanersSiteList'));
        }
      }
    };
    http.send();
  },

  /**
   * Fetch SteemCleaners user blacklist
   * @param callback
   */
  fetchSteemCleanersUserList: function (callback) {
    var http = new XMLHttpRequest();
    var now = new Date().getTime();
    http.open('GET', 'https://raw.githubusercontent.com/gryter/plentyofphish/master/phishing.txt?ord=' + now);
    http.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        console.log("ok");
        callback(http.responseText);
      } else {
        console.log("err", this.status);
        if (window.localStorage.hasOwnProperty('steemCleanersUserList')) {
          callback(window.localStorage.getItem('steemCleanersUserList'));
        }
      }
    };
    http.send();
  },

  /**
   * Update our list and cache it in localStorage
   * @param payload
   */
  updateSiteList: function (payload) {
    if (payload) {
      window.localStorage.setItem('steemedPhishSiteList', payload);

      try {
        background.siteList = JSON.parse(payload);
      } catch (e) {
        console.error("[error]", e);
      }
    }
  },

  /**
   * Update SteemCleaners list and cache it in localStorage
   * @param payload
   */
  updateSteemCleanersSiteList: function (payload) {
    if (payload) {
      payload = payload.replace(/\n$/, "");
      window.localStorage.setItem('steemCleanersSiteList', payload);

      try {
        const sites = payload.split("\n");
        for (var si in sites) {
          let site = sites[si];
          site = site.replace(/^\s+|\s+$/g, "");
          background.steemCleanersSiteList.push(site);
        }
      } catch (e) {
        console.error("[error]", e);
      }
    }
  },

  Update SteemCleaners user list and cache it in localStorage
  updateSteemCleanersUserList: function(payload) {
    if (payload) {
      payload = payload.replace(/\n$/, "");
      window.localStorage.setItem('steemCleanersUserList', payload);

      try {
        const users = payload.split("\n");
        for (var ui in users) {
          let user = users[ui];
          user = user.replace(/^\s+|\s+$/g, "");
          background.steemCleanersUserList.push(user);
        }
      } catch (e) {
        console.error("[error]", e);
      }
    }
  }
};

background.init();
