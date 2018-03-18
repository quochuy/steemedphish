var background = {
    alertMessage: 'Steemed Phish Alert\n\nOne of your browser tabs has landed on a Steemit SCAM website: ',

    whitelist: [
        "https://steemit.com/",
        "https://busy.org/",
        "https://beta.chainbb.com/",
        "https://steemitstage.com/",
        "https://mspsteem.com/",
        "https://utopian.io/",
        "https://d.tube/",
        "https://dsound.audio/",
        "https://steemconnect.com/",
        "https://steemit.chat/",
        "https://steem.chat/",
        "https://steemtools.com/",
        "https://thesteemitshop.com/",
        "https://developers.steem.io/",
        "https://steem.io/",
        "https://smt.steem.io/",
        "https://steemkr.com/",
        "https://yehey.org/",
        "https://steemitstage.com/",
        "https://steemd.com/",
        "https://steemdb.com/"
    ],

    blacklist: [
        "steewit.com",
        "steemil.com",
        "sleemit.com"
    ],

    alertDisplayed: false,

    init: function() {
        chrome.extension.onRequest.addListener(background.requestListener);

        chrome.tabs.onActivated.addListener(function(info){
            chrome.tabs.get(info.tabId, function(change){
                background.updateIconColorByUrl(change.url, info.tabId);
            });
        });

        chrome.tabs.onUpdated.addListener(function (tabId, change, tab){
            if(tab.url == undefined){
                return;
            }

            background.updateIconColorByUrl(tab.url, tabId);
        });
    },

    requestListener: function (request, sender, sendResponse) {
        // Only process request sent from the current tab
        chrome.tabs.query({active: true, currentWindow: true}, function (arrayOfTabs) {
            // since only one tab should be active and in the current window at once
            // the return variable should only have one entry
            var activeTab = arrayOfTabs[0];
            var activeTabId = activeTab.id; // or do whatever you need

            if (activeTabId == sender.tab.id) {
                switch(true) {
                    case request.hasOwnProperty('getBlacklist'):
                        console.log('getBlacklist request');
                        chrome.tabs.sendRequest(activeTabId, {blacklist: background.blacklist}, function (response) {});
                        break;
                }
            }

        });

        background.listening = false;
    },

    updateIconColorByUrl: function(url, tabId)
    {
        var isWhitelisted = background.isWhitelisted(url);
        if(isWhitelisted){
            chrome.browserAction.setIcon({path: '../images/icon.png', tabId: tabId});
        } else {
            var isBlacklisted = background.isBlackListed(url);
            if (isBlacklisted) {
                chrome.browserAction.setIcon({path: '../images/icon-red.png', tabId: tabId});

                if (background.alertDisplayed === false) {
                    background.alertDisplayed = true;
                    alert(background.alertMessage + url);

                    setTimeout(function() {
                        background.alertDisplayed = false;
                    }, 15000);
                }
            } else {
                chrome.browserAction.setIcon({path: '../images/icon-grey.png', tabId: tabId});
            }
        }
    },

    isWhitelisted: function(url) {
        for(var i=0; i<background.whitelist.length; i++) {
            var wlDomain = background.whitelist[i];
            if (url.indexOf(wlDomain) === 0) {
                return true;
            }
        }

        return false;
    },

    isBlackListed: function(url) {
        for(var i=0; i<background.blacklist.length; i++) {
            var blDomain = background.blacklist[i];
            if (url.indexOf(blDomain) !== -1) {
                return true;
            }
        }

        return false;
    }
};

background.init();