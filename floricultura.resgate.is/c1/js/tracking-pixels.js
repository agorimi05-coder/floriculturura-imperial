(function () {
  var utmifyPixelId = "69eee39f2ea0d8d4b3dd0239";
  var metaPixelId = "981352047761884";

  if (!window.__imperialUtmifyLoaded) {
    window.__imperialUtmifyLoaded = true;
    window.pixelId = utmifyPixelId;

    var utmifyScript = document.createElement("script");
    utmifyScript.async = true;
    utmifyScript.defer = true;
    utmifyScript.src = "https://cdn.utmify.com.br/scripts/pixel/pixel.js";
    document.head.appendChild(utmifyScript);
  }

  if (!window.fbq) {
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    window.fbq("init", metaPixelId);
  }

  window.fbq("track", "PageView");
})();
