(function (w, d, t) {
  var pixelId = "D7QRJOJC77U0A0BNA4N0";

  if (w.ttq && w.ttq._i && w.ttq._i[pixelId]) {
    w.ttq.page();
    return;
  }

  w.TiktokAnalyticsObject = t;
  var ttq = (w[t] = w[t] || []);
  ttq.methods = [
    "page",
    "track",
    "identify",
    "instances",
    "debug",
    "on",
    "off",
    "once",
    "ready",
    "alias",
    "group",
    "enableCookie",
    "disableCookie",
    "holdConsent",
    "revokeConsent",
    "grantConsent",
  ];
  ttq.setAndDefer = function (target, method) {
    target[method] = function () {
      target.push([method].concat(Array.prototype.slice.call(arguments, 0)));
    };
  };

  for (var i = 0; i < ttq.methods.length; i += 1) {
    ttq.setAndDefer(ttq, ttq.methods[i]);
  }

  ttq.instance = function (id) {
    var instance = ttq._i[id] || [];
    for (var i = 0; i < ttq.methods.length; i += 1) {
      ttq.setAndDefer(instance, ttq.methods[i]);
    }
    return instance;
  };

  ttq.load = function (id, options) {
    var url = "https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._i = ttq._i || {};
    ttq._i[id] = [];
    ttq._i[id]._u = url;
    ttq._t = ttq._t || {};
    ttq._t[id] = +new Date();
    ttq._o = ttq._o || {};
    ttq._o[id] = options || {};

    var script = d.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = url + "?sdkid=" + id + "&lib=" + t;
    var first = d.getElementsByTagName("script")[0];
    first.parentNode.insertBefore(script, first);
  };

  ttq.load(pixelId);
  ttq.page();
})(window, document, "ttq");
