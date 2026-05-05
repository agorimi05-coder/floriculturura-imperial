(function () {
  var utmifyPixelId = "69eee39f2ea0d8d4b3dd0239";
  var metaPixelId = "981352047761884";
  var TRACKING_STORAGE_KEY = "imperialTrackingParams";
  var URL_PARAMS_STORAGE_KEY = "urlParams";
  var TRACKING_COOKIE_KEY = "imperial_tracking_params";
  var THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

  function shouldPersistParam(key) {
    return (
      key.indexOf("utm_") === 0 ||
      key.indexOf("utmify") === 0 ||
      [
        "fbclid",
        "gclid",
        "gbraid",
        "wbraid",
        "ttclid",
        "msclkid",
        "twclid",
        "xcod",
        "sck",
        "src",
        "campaign",
        "campaign_id",
        "adset",
        "adset_id",
        "ad",
        "ad_id",
        "placement",
        "site_source_name"
      ].indexOf(key) !== -1
    );
  }

  function readJsonStorage(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}") || {};
    } catch (error) {
      return {};
    }
  }

  function writeTrackingCookie(params) {
    try {
      var expires = new Date(Date.now() + THIRTY_DAYS_IN_MS).toUTCString();
      document.cookie =
        TRACKING_COOKIE_KEY +
        "=" +
        encodeURIComponent(JSON.stringify(params)) +
        "; expires=" +
        expires +
        "; path=/; SameSite=Lax";
    } catch (error) {}
  }

  function persistTrackingParams() {
    var params = new URLSearchParams(window.location.search);
    var captured = {};

    params.forEach(function (value, key) {
      if (shouldPersistParam(key) && value) captured[key] = value;
    });

    if (!Object.keys(captured).length) return;

    var merged = Object.assign(
      {},
      readJsonStorage(URL_PARAMS_STORAGE_KEY),
      readJsonStorage(TRACKING_STORAGE_KEY),
      captured,
      { captured_at: new Date().toISOString() }
    );

    try {
      localStorage.setItem(URL_PARAMS_STORAGE_KEY, JSON.stringify(merged));
      localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(merged));
      writeTrackingCookie(merged);
    } catch (error) {}
  }

  persistTrackingParams();

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

  function moneyToNumber(value) {
    var normalized = String(value || "")
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    var parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function slug(value) {
    return String(value || "produto")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function getProductFromCard(link) {
    var nameElement = link.querySelector("h3");
    var priceElement = link.querySelector(".preco");
    var imageElement = link.querySelector("img");
    var name = nameElement ? nameElement.textContent.trim() : "Produto";
    var value = moneyToNumber(priceElement ? priceElement.textContent : "");

    return {
      id: slug(name),
      name: name,
      value: value,
      image: imageElement ? imageElement.getAttribute("src") : "",
    };
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest(".produtos a.disponivel");
    if (!link || !window.fbq) return;

    var product = getProductFromCard(link);

    window.fbq("track", "InitiateCheckout", {
      content_type: "product",
      content_ids: [product.id],
      content_name: product.name,
      currency: "BRL",
      value: product.value,
    });

    try {
      sessionStorage.setItem("imperialSelectedProduct", JSON.stringify(product));
    } catch (error) {}
  });
})();
