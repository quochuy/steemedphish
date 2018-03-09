var background = {
    currentUrl: '',
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
        "https://smt.steem.io/"
    ],

    blacklist: [
        "steewit.com",
        "steemil.com"
    ],

    init: function() {
        chrome.tabs.onActivated.addListener(function(info){
            chrome.tabs.get(info.tabId, function(change){
                background.currentUrl = change.url;
                var isWhitelisted = background.isWhitelisted(change.url);
                if(isWhitelisted){
                    chrome.browserAction.setIcon({path: '../images/icon.png', tabId: info.tabId});
                } else {
                    chrome.browserAction.setIcon({path: '../images/icon-red.png', tabId: info.tabId});

                    var isBlacklisted = background.isBlackListed(change.url);
                    if (isBlacklisted) {
                        alert("Steemed Phish Alert\n\nThis website is blacklisted and marked as a Steemit SCAM!");
                    }
                }
            });
        });

        chrome.tabs.onUpdated.addListener(function (tabId, change, tab){
            if(tab.url == undefined){
                return;
            }

            background.currentUrl = tab.url;
            var isWhitelisted = background.isWhitelisted(tab.url);
            if(isWhitelisted){
                chrome.browserAction.setIcon({path: '../images/icon.png', tabId: tabId});
            } else {
                chrome.browserAction.setIcon({path: '../images/icon-red.png', tabId: tabId});

                var isBlacklisted = background.isBlackListed(change.url);
                if (isBlacklisted) {
                    alert("Steemed Phish Alert\n\nThis website is blacklisted and marked as a Steemit SCAM!");
                }
            }
        });
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