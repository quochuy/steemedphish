var contentScript = {
    textarea: null,
    pageDataUpdateTimer: 0,
    devtoolsPanelReady: false,

    init: function () {
        console.log('Steemed Phish: Injecting the content script...');

        var script = document.createElement('script');
        script.appendChild(document.createTextNode('(' + contentScript.inject + ')();'));
        document.body.appendChild(script);
    },

    inject: function () {
        var contentObject = {
            blacklist: [
                "steewit.com",
                "steemil.com"
            ],
            observer: null,
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
                    anchors = document.getElementsByTagName('a');

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
                            console.log('Steemed Phish: found blacklisted link ', anchor.href);
                            anchor.style.color = "red";
                            anchor.style.textDecoration = "line-through";
                            anchor.title = "This link leads to a blacklisted (SCAM/PHISHING) website!";
                            anchor.innerHTML = "SCAM DETECTED !!" + anchor.innerHTML + "!!";
                            anchor.classList.add("steemed-phish");
                        }
                    }
                }
            },

            init: function () {
                contentObject.observerTimer = window.setTimeout(contentObject.checkAnchors, 3000);

                var head = document.getElementsByTagName('head')[0];
                head.innerHTML += '<style>' +
                    '.PostFull__body a[rel="noopener"]:after, .PostFull__body a[rel="nofollow noopener"]:after,' +
                    'a[rel="noopener"]:after, a[rel="nofollow noopener"]:after {' +
                    '  background-image: url(\'data:image/svg+xml; utf8, <svg height="1024" width="768" xmlns="http://www.w3.org/2000/svg"><path d="M640 768H128V257.90599999999995L256 256V128H0v768h768V576H640V768zM384 128l128 128L320 448l128 128 192-192 128 128V128H384z" fill="#ff0000"/></svg>\') !important;' +
                    '}' +
                    '</style>';

                console.log('Steemed Phish: Done');
            }
        };

        contentObject.initObserver();

        // Wait until the post content is loaded into the DOM
        var timer = window.setInterval(function(contentObject) {
            return function() {
                if (document.getElementsByClassName('entry-title').length > 0) {
                    contentObject.init();
                    window.clearInterval(timer);
                }
            };
        }(contentObject), 500);

    }
}

contentScript.init();