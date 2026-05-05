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
