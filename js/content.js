var contentScript = {
    textarea: null,
    pageDataUpdateTimer: 0,
    devtoolsPanelReady: false,

    init: function () {
        console.log('Steemed Phish: init content script...');

        // Listening to messages coming from the injected script (contentObject)
        window.addEventListener('message', contentScript.messageListener);

        document.addEventListener("DOMContentLoaded", function(event) {
            // Requesting blacklist from the background process
            chrome.extension.sendRequest({getSiteLists: true});

            // Listening to messages coming from the background process
            chrome.extension.onRequest.addListener(contentScript.requestListener);
        });
    },

    messageListener: function(event) {
        // Only accept messages from same frame
        if (event.source !== window) {
            return;
        }

        var message = event.data;
        switch(true) {
            // The inject script wants to expand a short URL
            case (message.hasOwnProperty('unshortenUrl')):
                // Forward the message to the background process because Steemit Condenser does not allow calls to external domains
                chrome.extension.sendRequest(message);
                break;
        }
    },

    requestListener: function (request, sender, sendResponse) {
        switch(true) {
            case request.hasOwnProperty('blacklist'):
                var script = document.createElement('script');
                script.appendChild(document.createTextNode('(' + contentScript.inject + ')('+ JSON.stringify(request) +');'));

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

    inject: function (siteList) {
        var contentObject = {
            blacklist: siteList.blacklist,
            whitelist: siteList.whitelist,

            // TODO: find a way to pass regexp from the background script
            suspiciousHostnameRegexp: [
                // URL where the hostname is just an IP address
                /^https?:\/\/(([0-9]|[0-9][0-9\-]*[0-9])\.)*([0-9]|[0-9][0-9\-]*[0-9])\//gm,

                // URL where the hostname is steemit.xxx.xxx
                /^https?:\/\/steemit\..*\..*\//gm
            ],
            observer: null,
            tooltip: null,
            observerConfig: {
                attributes: true,
                childList: true,
                subtree: true,
                characterData: false
            },
            observerTimer: null,
            externalLinkTooltipText: 'This is an external link, it will take you away from ' + window.location.hostname +'. Think before using your Steemit keys.',
            suspiciousLinkTooltipText: 'This link looks suspicious and will take you away from ' + window.location.hostname + '. Take extra care before using your Steemit keys.',

            initObserver: function() {
                var body = document.body;

                // Using a MutationObserver to wait for a DOM change
                // This is to scan dynamically loaded content (lazyload of comments for example)
                contentObject.observer = new MutationObserver(function(contentObject) {
                    return function(mutations) {
                        mutations.forEach(function(mutation) {
                            // Preventing multipl calls to checkAnchors()
                            if (contentObject.observerTimer) {
                                window.clearTimeout(contentObject.observerTimer);
                            }

                            // Lets wait for a DOM change
                            contentObject.observerTimer = window.setTimeout(function() {
                                console.log('Steemed Phish: change detected in DOM');
                                contentObject.checkAnchors();
                            }, 500);
                        });
                    };
                }(contentObject));

                // Waiting for the DOM to be modified (lazy loading)
                contentObject.observer.observe(body, contentObject.observerConfig);
            },

            isWhitelisted: function(url) {
                if (url.indexOf('http') === 0) {
                    var baseUrl = url.split('/').slice(0,3).join('/') + '/';

                    for(var i=0; i<contentObject.whitelist.length; i++) {
                        var wlDomain = contentObject.whitelist[i];
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

                    for(var i=0; i<contentObject.blacklist.length; i++) {
                        var blDomain = contentObject.blacklist[i];
                        if (baseUrl.indexOf(blDomain) !== -1) {
                            return true;
                        }
                    }
                }

                return false;
            },

            isSuspicious: function(url) {
                for(var i=0; i<contentObject.suspiciousHostnameRegexp.length; i++) {
                    var regexp = contentObject.suspiciousHostnameRegexp[i];
                    if (url.match(regexp)) {
                        var hostname = url.split('/')[2];

                        // If the hostname are IP addresses then don't warn of it is a private IP range
                        if (
                            hostname.indexOf("10.") !== 0
                            && hostname.indexOf("192.168.") !== 0
                            && hostname.indexOf("172.16.") !== 0
                        ) {
                            console.log('Is suspiscious', url, i);
                            return true;
                        }
                    }
                }

                return false;
            },

            checkAnchors: function() {
                console.log('Steemed Phish: Checking anchors');

                var host = window.location.host,
                    anchors = document.querySelectorAll('.Post a[href]:not(.steemed-phish-checked)');

                for(var i=0; i< anchors.length; i++) {
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
                                && !anchor.classList.contains('steemed-phish-checked')
                            ) {
                                console.log(anchor.href, 'not whitelisted');
                                if(contentObject.isSuspicious(anchor.href)) {
                                    anchor.style.color = "pink";
                                    anchor.innerHTML = "!" + anchor.innerHTML + "!";
                                    anchor.classList.add("steemed-phish-suspicious");
                                }

                                anchor.title = "";
                                anchor.addEventListener('mousemove', contentObject.mousemoveHandler);
                                anchor.addEventListener('mouseout', contentObject.mouseoutHandler);
                            }

                            // Let see if this is a short URL and what it redirects to
                            if (
                                contentObject.isWhitelisted(anchor.href) === false
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

            mousemoveHandler: function(e) {
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

            mouseoutHandler: function(e) {
                var tooltip = document.querySelector('#external-link-tooltip');
                if (tooltip) {
                    tooltip.style.display = "none";
                }
            },

            messageListener: function(event) {
                // Only accept messages from same frame
                if (event.source !== window) {
                    return;
                }

                var message = event.data;
                switch(true) {
                    case (message.hasOwnProperty('longUrl') && message.hasOwnProperty('url')):
                        var longUrl = message.longUrl;
                        var scamAnchorSelector = 'a[href="'+ message.url +'"]';

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

            init: function () {
                // Listening to messages comming from contentScript
                window.addEventListener('message', contentObject.messageListener);

                console.log(contentObject);

                // Inject the tooltip container
                var span = document.createElement('span');
                span.id = "external-link-tooltip";
                span.innerHTML = contentObject.externalLinkTooltipText;
                document.body.appendChild(span);

                contentObject.checkAnchors();

                console.log('Steemed Phish: Done');
            }
        };

        contentObject.initObserver();
        contentObject.init();
    }
}

contentScript.init();
