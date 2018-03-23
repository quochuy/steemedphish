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
            chrome.extension.sendRequest({getBlacklist: true});

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
                script.appendChild(document.createTextNode('(' + contentScript.inject + ')('+ JSON.stringify(request.blacklist) +');'));

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

    inject: function (blacklist) {
        var contentObject = {
            blacklist: blacklist,
            observer: null,
            tooltip: null,
            observerConfig: {
                attributes: false,
                childList: true,
                subtree: true,
                characterData: false
            },
            observerTimer: null,

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

            isBlackListed: function(url) {
                for(var i=0; i<contentObject.blacklist.length; i++) {
                    var blDomain = contentObject.blacklist[i];
                    if (url.indexOf(blDomain) !== -1) {
                        return true;
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
                        var isBlackListed = contentObject.isBlackListed(anchor.href);

                        if (isBlackListed) {
                            // If in the blacklist then make it very obvious

                            console.log('Steemed Phish: found blacklisted link ', anchor.href);
                            anchor.style.color = "red";
                            anchor.style.textDecoration = "line-through";
                            anchor.innerHTML = "SCAM DETECTED !!" + anchor.innerHTML + "!!";
                            anchor.classList.add("steemed-phish");
                            
                        } else {
                            // else show a tooltip informing that upon click, they will leave the current site
                            if (!anchor.classList.contains('steemed-phish-checked')) {
                                anchor.title = "";
                                anchor.addEventListener('mousemove', contentObject.mousemoveHandler);
                                anchor.addEventListener('mouseout', contentObject.mouseoutHandler);
                            }

                            // Let see if this is a short URL and what it redirects to
                            if (!anchor.classList.contains('steemed-phish-unshortened')) {
                                anchor.classList.add("steemed-phish-unshortening");
                                window.postMessage({unshortenUrl: anchor.href}, '*');
                            }
                        } 
                    }

                    anchor.classList.add("steemed-phish-checked");
                }
            },

            mousemoveHandler: function(e) {
                var tooltip = document.querySelector('.external-link-tooltip');
                if (tooltip) {
                    tooltip.style.display = "block";
                    tooltip.style.left = e.pageX + 'px';
                    tooltip.style.top = e.pageY + 'px';
                }
            },

            mouseoutHandler: function(e) {
                var tooltip = document.querySelector('.external-link-tooltip');
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

                // Inject the tooltip container
                var span = document.createElement('span');
                span.className = "external-link-tooltip";
                span.innerHTML = 'This link will take you away from this website. Please do not use your Steemit password or keys elsewhere unless you are sure it is a friendly website!';
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