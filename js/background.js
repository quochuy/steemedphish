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
        "https://smt.steem.io/"
    ],

    blacklist: [
        "steewit.com",
        "steemil.com"
    ],

    alertDisplayed: false,

    init: function() {
        chrome.tabs.onActivated.addListener(function(info){
            chrome.tabs.get(info.tabId, function(change){
                var isWhitelisted = background.isWhitelisted(change.url);
                if(isWhitelisted){
                    chrome.browserAction.setIcon({path: '../images/icon.png', tabId: info.tabId});
                } else {
                    chrome.browserAction.setIcon({path: '../images/icon-red.png', tabId: info.tabId});

                    var isBlacklisted = background.isBlackListed(change.url);
                    if (isBlacklisted) {
                        alert(background.alertMessage + change.url);
                    }
                }
            });
        });

        chrome.tabs.onUpdated.addListener(function (tabId, change, tab){
            if(tab.url == undefined){
                return;
            }

            var isWhitelisted = background.isWhitelisted(tab.url);
            if(isWhitelisted){
                chrome.browserAction.setIcon({path: '../images/icon.png', tabId: tabId});
            } else {
                chrome.browserAction.setIcon({path: '../images/icon-red.png', tabId: tabId});

                var isBlacklisted = background.isBlackListed(tab.url);
                if (isBlacklisted && background.alertDisplayed === false) {
                    background.alertDisplayed = true;
                    alert(background.alertMessage + tab.url);
                    setTimeout(function() {
                        background.alertDisplayed = false;
                    }, 15000);
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