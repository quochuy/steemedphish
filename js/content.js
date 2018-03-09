var contentScript = {
    textarea: null,
    pageDataUpdateTimer: 0,
    devtoolsPanelReady: false,

    init: function () {
        contentScript.log('Injecting the content script...');

        var script = document.createElement('script');
        script.appendChild(document.createTextNode('(' + contentScript.inject + ')();'));
        document.body.appendChild(script);
        
        contentScript.log('Done.');
    },

    inject: function () {
        var contentObject = {
            init: function () {
                var url = window.location.href,
                    host = window.location.host;

                window.setTimeout(function() {
                    var anchors = document.getElementsByTagName('a');
                    for(var i=0; i< anchors.length; i++) {
                        var anchor = anchors[i];
                        anchor.addEventListener('click', function(e) {


                            var target = e.target;
                            if (target.href && target.href !== '' && target.href.indexOf('https://' + host) === -1) {
                                var response = confirm(
                                    "WARNING\n"
                                    + "***************************************************\n"
                                    + "* This link is taking you away from this website *\n"
                                    + "***************************************************\n\n"
                                    + "The destination URL is:\n" + target.href + "\n\n"
                                    + "Do you want to continue?"
                                );
                                if (!response) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    return false;
                                }
                            }
                        });
                    }
                }, 2000);
            }
        }

        contentObject.init();
    },

    log: function() {
        var prefix = 'Steemed Phish:';
        if (typeof arguments.unshift === 'undefined') {
            arguments[0] = prefix + ' ' + arguments[0];
        } else {
            arguments.unshift(prefix);
        }
        console.log.apply(null, arguments);
    }
}

contentScript.init();