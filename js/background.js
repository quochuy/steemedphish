var background = {
    alertMessage: 'One of your browser tabs has landed on a Steemit SCAM website: ',
    alertSuspiciousMessage: 'One of your browser tabs has landed on a suspicious website. It is not a blacklisted website but looks suspicious. Be careful before using your Steemit keys: ',

    siteList: {
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
            "https://steemdb.com/",
            "http://www.steemschool.net/",
            "https://ipfs.io",
            "https://dlive.io",
            "https://discord.gg",
            "https://steemworld.org",
            "https://discordapp.com",
            "https://steemnow.com",

            // Image storage
            "staticflickr.com",
            "steemit-production-imageproxy-upload.s3.amazonaws.com",
            "ipfs.busy.org"
        ],

        blacklist: [
            "steewit.com",
            "steemil.com",
            "sleemit.com",
            "steemitfollowup.ml",
            "steemitfollowup.com",
            "steemitfollowup.ga",
            "steemitfollowup.cf",
            "steemitfollowup.gq",
            "steemit.000webhostapp.com",
            "autosteemit.wapka.mobi",
            "autosteemer.com",
            "steemconnect.ml",
            "steemiit.tk",
            "stemit.com",
            "șteemit.com",
            "steeemit.ml",
            "steamit.ga",
            "steemit.aba.ae",
            "autosteem.info"
        ]
    },

    suspiciousHostnameRegexp: [
        // URL where the hostname is just an IP address
        /^https?:\/\/(([0-9]|[0-9][0-9\-]*[0-9])\.)*([0-9]|[0-9][0-9\-]*[0-9])\//gm,

        // URL where the hostname is steemit.xxx.xxx
        /^https?:\/\/steemit\..*\..*\//gm
    ],

    alertDisplayed: false,

    init: function() {
        background.fetchSiteList(background.updateSiteList);

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

    unshortenUrl: function (url, callback) {
        var http = new XMLHttpRequest();
        http.open('GET', 'http://expandurl.com/api/v1/?url=' + encodeURIComponent(url));
        http.onreadystatechange = function() {
            if (this.status == 200) {
                callback(url, http.responseText);
            }
        };
        http.send();
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
                    case request.hasOwnProperty('getSiteLists'):
                        chrome.tabs.sendRequest(activeTabId, {
                            siteList: background.siteList
                        }, function (response) {});
                        break;

                    case request.hasOwnProperty('unshortenUrl'):
                        background.unshortenUrl(request.unshortenUrl, function(url, longUrl) {
                            chrome.tabs.sendRequest(activeTabId, {url: url, longUrl: longUrl}, function (response) {});
                        });
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
            //<div>Icons made by <a href="http://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>
            chrome.browserAction.setIcon({path: '../images/icon2-48-green.png', tabId: tabId});
        } else {
            var isBlacklisted = background.isBlacklisted(url);
            if (isBlacklisted) {
                chrome.browserAction.setIcon({path: '../images/icon2-48-red.png', tabId: tabId});

                if (background.alertDisplayed === false) {
                    background.alertDisplayed = true;
                    alert(background.alertMessage + url);

                    setTimeout(function() {
                        background.alertDisplayed = false;
                    }, 15000);
                }
            } else {
                if (background.isSuspicious(url)) {
                    if (background.alertDisplayed === false) {
                        background.alertDisplayed = true;
                        alert(background.alertSuspiciousMessage + url);

                        setTimeout(function() {
                            background.alertDisplayed = false;
                        }, 15000);
                    }

                }
                chrome.browserAction.setIcon({path: '../images/icon2-48-grey.png', tabId: tabId});
            }
        }
    },

    isWhitelisted: function(url) {
        if (url.indexOf('http') === 0) {
            var baseUrl = url.split('/').slice(0,3).join('/') + '/';

            for(var i=0; i<background.siteList.whitelist.length; i++) {
                var wlDomain = background.siteList.whitelist[i];
                if (baseUrl.indexOf(wlDomain) === 0) {
                    return true;
                }
            }
        }

        return false;
    },

    isBlacklisted: function(url) {
        if (url.indexOf('http') === 0) {
            var baseUrl = url.split('/').slice(0,3).join('/') + '/';

            for(var i=0; i<background.siteList.blacklist.length; i++) {
                var blDomain = background.siteList.blacklist[i];
                if (baseUrl.indexOf(blDomain) !== -1) {
                    return true;
                }
            }
        }

        return false;
    },

    isSuspicious: function(url) {
        for(var i=0; i<background.suspiciousHostnameRegexp.length; i++) {
            var regexp = background.suspiciousHostnameRegexp[i];
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

    fetchSiteList: function(callback) {
        var http = new XMLHttpRequest();
        http.open('GET', 'https://tools.steemulant.com/steemed-phish/conf/siteList.json');
        http.onreadystatechange = function() {
            if (this.status == 200) {
                callback(http.responseText);
            } else {
                console.log(this.status);
                if (window.localStorage.hasOwnProperty('steemedPhishSiteList')) {
                    background.updateSiteList(window.localStorage.getItem('steemedPhishSiteList'));
                }
            }
        };
        http.send();
    },

    updateSiteList: function(payload) {
        if (payload) {
            window.localStorage.setItem('steemedPhishSiteList', payload);
            try {
                payload = JSON.parse(payload);
                background.siteList = payload;
            } catch(e) {
                console.error("error", e);
            }
        }
    }
};

background.init();
