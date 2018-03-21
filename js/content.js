var contentScript = {
    textarea: null,
    pageDataUpdateTimer: 0,
    devtoolsPanelReady: false,

    init: function () {
        console.log('Steemed Phish: init content script...');

        document.addEventListener("DOMContentLoaded", function(event) {
            chrome.extension.sendRequest({getBlacklist: true});
            chrome.extension.onRequest.addListener(contentScript.requestListener);
        });
    },

    requestListener: function (request, sender, sendResponse) {
        switch(true) {
            case request.hasOwnProperty('blacklist'):
                var script = document.createElement('script');
                script.appendChild(document.createTextNode('(' + contentScript.inject + ')('+ JSON.stringify(request.blacklist) +');'));

                document.body.appendChild(script);
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
                        anchor.href
                        && anchor.href !== ''
                        && anchor.href.indexOf('https://' + host) === -1
                        && !anchor.classList.contains('steemed-phish')
                    ) {
                        var isBlackListed = contentObject.isBlackListed(anchor.href);

                        if (isBlackListed) {
                            // If in the blacklist then make it very obvious

                            console.log('Steemed Phish: found blacklisted link ', anchor.href);
                            anchor.style.color = "red";
                            anchor.style.textDecoration = "line-through";
                            anchor.title = "This link leads to a blacklisted (SCAM/PHISHING) website!";
                            anchor.innerHTML = "SCAM DETECTED !!" + anchor.innerHTML + "!!";
                            anchor.classList.add("steemed-phish");
                        } else {
                            // else show a tooltip informing that upon click, they will leave the current site
                            anchor.title = "";
                            anchor.addEventListener('mousemove', contentObject.mousemoveHandler);
                            anchor.addEventListener('mouseout', contentObject.mouseoutHandler);
                        }

                        anchor.rel = "noopener";
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

            init: function () {
                document.body.innerHTML += "<span class=\"external-link-tooltip\">This link will take you away from "+ window.location.hostname +". Please do not use your Steemit password or keys elsewhere unless you are sure it is a friendly website!<span>";

                contentObject.checkAnchors();

                console.log('Steemed Phish: Done');
            }
        };

        contentObject.initObserver();
        contentObject.init();
    }
}

contentScript.init();