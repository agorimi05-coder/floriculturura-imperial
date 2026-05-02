(function () {
  var PAID_STATUSES = ["paid", "approved", "completed", "success", "pago", "aprovado"];
  var PIX_ENDPOINT = "/api/pix/create";
  var STATUS_ENDPOINT = "/api/pix/status";
  var tiktokPixelId =
    window.TIKTOK_PIXEL_ID ||
    (document.querySelector('meta[name="tiktok-pixel-id"]') || {}).content ||
    "";

  function moneyToNumber(value) {
    var normalized = String(value || "")
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    var parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function getText(selector) {
    var element = document.querySelector(selector);
    return element ? element.textContent.trim() : "";
  }

  function getField(id) {
    var element = document.getElementById(id);
    return element ? element.value.trim() : "";
  }

  function slug(value) {
    return String(value || "produto")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function getProduct() {
    var name = getText(".product-details p strong") || getText(".product-details p") || document.title;
    var fullProductText = getText(".product-details");
    var priceText = getText(".price-new strong") || getText(".price-new");
    var amount = moneyToNumber(priceText);

    return {
      id: slug(name),
      name: fullProductText.split("\n")[0].replace(/^Kit:\s*/i, "").trim() || name,
      quantity: 1,
      unitPrice: amount,
      totalPrice: amount
    };
  }

  function getAttribution() {
    var params = new URLSearchParams(window.location.search);
    try {
      var saved = JSON.parse(localStorage.getItem("urlParams") || "{}");
      Object.keys(saved).forEach(function (key) {
        if (!params.has(key) && saved[key]) params.set(key, saved[key]);
      });
    } catch (error) {}

    return {
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      utm_content: params.get("utm_content") || "",
      utm_term: params.get("utm_term") || "",
      fbclid: params.get("fbclid") || "",
      captured_at: new Date().toISOString()
    };
  }

  function ensureTikTok() {
    if (!tiktokPixelId || window.ttq) return;

    !function (w, d, t) {
      w.TiktokAnalyticsObject = t;
      var ttq = w[t] = w[t] || [];
      ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
      ttq.setAndDefer = function (target, method) {
        target[method] = function () {
          target.push([method].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (name) {
        var instance = ttq._i[name] || [];
        for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(instance, ttq.methods[i]);
        return instance;
      };
      ttq.load = function (id) {
        var script = d.createElement("script");
        script.type = "text/javascript";
        script.async = true;
        script.src = "https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=" + id + "&lib=" + t;
        var first = d.getElementsByTagName("script")[0];
        first.parentNode.insertBefore(script, first);
      };
      ttq._i = {};
      ttq._t = {};
      ttq._o = {};
      ttq._partner = "codex";
      ttq.load(tiktokPixelId);
      ttq.page();
    }(window, document, "ttq");
  }

  function track(eventName, product, value) {
    ensureTikTok();
    if (!window.ttq || !eventName) return;
    window.ttq.track(eventName, {
      content_type: "product",
      content_ids: [product.id],
      description: product.name,
      quantity: product.quantity,
      currency: "BRL",
      value: value
    });
  }

  function buildPayload() {
    var product = getProduct();
    var fullName = getField("nomeComprador");
    var phone = getField("telComprador");

    return {
      amount: product.totalPrice,
      customer: {
        fullName: fullName,
        email: "",
        phone: phone,
        address: {
          street: getField("rua"),
          number: getField("numero"),
          neighborhood: getField("bairro"),
          complement: getField("complemento"),
          city: "Cidade nao informada",
          state: "SP"
        }
      },
      items: [product],
      attribution: getAttribution(),
      delivery: {
        receiverType: getField("tipoEntrega"),
        receiverName: getField("nomeDestinatario"),
        receiverPhone: getField("telDestinatario"),
        deliveryDate: getField("data_entrega"),
        deliveryTime: getField("horario"),
        note: getField("observacoes")
      }
    };
  }

  function pixHtml(data) {
    var qr = data.qrCode
      ? '<img src="' + data.qrCode + '" alt="QR Code Pix" style="width:220px;max-width:100%;margin:12px auto;display:block;border-radius:8px;">'
      : "";
    var copy = data.copyAndPaste || "";

    return (
      '<div style="text-align:left">' +
      '<p style="margin:0 0 10px">Pix gerado. Pague pelo QR Code ou copie o codigo abaixo.</p>' +
      qr +
      '<textarea id="pix-copy-code" readonly style="width:100%;min-height:92px;border:1px solid #ddd;border-radius:8px;padding:10px;font-size:12px">' + copy + '</textarea>' +
      '<button type="button" id="copy-pix-button" style="margin-top:10px;width:100%;padding:12px;border:0;border-radius:8px;background:#2E7D32;color:#fff;font-weight:700">Copiar codigo Pix</button>' +
      '<p id="pix-status-text" style="margin:12px 0 0;text-align:center;color:#666;font-size:13px">Aguardando pagamento...</p>' +
      '</div>'
    );
  }

  async function pollStatus(transactionId, product, amount) {
    if (!transactionId) return;

    var attempts = 0;
    var timer = window.setInterval(async function () {
      attempts += 1;
      if (attempts > 60) {
        window.clearInterval(timer);
        return;
      }

      try {
        var response = await fetch(STATUS_ENDPOINT + "?transactionId=" + encodeURIComponent(transactionId));
        var data = await response.json();
        var status = String(data.status || "").toLowerCase();
        var statusText = document.getElementById("pix-status-text");

        if (statusText && data.status) statusText.textContent = "Status: " + data.status;

        if (PAID_STATUSES.indexOf(status) >= 0 || data.paidAt) {
          window.clearInterval(timer);
          track("Purchase", product, amount);
          if (window.Swal) {
            Swal.fire("Pagamento aprovado", "Recebemos seu Pix. Seu pedido foi confirmado.", "success");
          }
        }
      } catch (error) {}
    }, 5000);
  }

  window.enviarPedido = async function enviarPedido(event) {
    event.preventDefault();

    var payload = buildPayload();
    var product = payload.items[0];

    if (!payload.customer.fullName || !payload.customer.phone || !payload.amount) {
      if (window.Swal) Swal.fire("Confira os dados", "Preencha nome, telefone e dados do pedido.", "warning");
      return;
    }

    track("InitiateCheckout", product, payload.amount);

    if (window.Swal) {
      Swal.fire({
        title: "Gerando Pix...",
        text: "Aguarde alguns segundos.",
        allowOutsideClick: false,
        didOpen: function () { Swal.showLoading(); }
      });
    }

    try {
      var response = await fetch(PIX_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      var data = await response.json();

      if (!response.ok) throw new Error(data.message || "Nao foi possivel gerar o Pix.");

      track("AddPaymentInfo", product, payload.amount);

      if (window.Swal) {
        Swal.fire({
          title: "Pagamento via Pix",
          html: pixHtml(data),
          width: 520,
          showConfirmButton: false,
          didOpen: function () {
            var button = document.getElementById("copy-pix-button");
            var textarea = document.getElementById("pix-copy-code");
            if (button && textarea) {
              button.addEventListener("click", async function () {
                textarea.select();
                await navigator.clipboard.writeText(textarea.value);
                button.textContent = "Codigo copiado";
              });
            }
          }
        });
      }

      pollStatus(data.transactionId, product, payload.amount);
    } catch (error) {
      if (window.Swal) {
        Swal.fire("Ops", error.message || "Nao foi possivel gerar o Pix agora.", "error");
      } else {
        alert(error.message || "Nao foi possivel gerar o Pix agora.");
      }
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    var product = getProduct();
    if (product.totalPrice) track("ViewContent", product, product.totalPrice);
  });
})();
