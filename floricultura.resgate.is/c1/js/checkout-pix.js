(function () {
  var PAID_STATUSES = ["paid", "approved", "completed", "success", "pago", "aprovado"];
  var PIX_ENDPOINT = "/api/pix/create";
  var STATUS_ENDPOINT = "/api/pix/status";
  var tiktokPixelId =
    window.TIKTOK_PIXEL_ID ||
    (document.querySelector('meta[name="tiktok-pixel-id"]') || {}).content ||
    "";

  function injectCheckoutStyles() {
    if (document.getElementById("imperial-checkout-style")) return;

    var style = document.createElement("style");
    style.id = "imperial-checkout-style";
    style.textContent = `
      :root {
        --imperial-red: #b80f1f;
        --imperial-red-dark: #8f0712;
        --imperial-green: #248437;
        --imperial-green-dark: #17652a;
        --imperial-ink: #22181c;
        --imperial-muted: #71646a;
        --imperial-line: #eadde1;
        --imperial-soft: #fff6f8;
        --imperial-cream: #fffaf6;
      }

      body {
        background:
          radial-gradient(circle at top left, rgba(184, 15, 31, .12), transparent 32rem),
          linear-gradient(180deg, #fff8fa 0%, #fffaf6 42%, #f7f4f1 100%) !important;
        color: var(--imperial-ink) !important;
        padding: 0 14px 34px !important;
      }

      .fixed-timer {
        width: min(540px, calc(100% - 28px)) !important;
        left: 50% !important;
        right: auto !important;
        top: 10px !important;
        transform: translateX(-50%) !important;
        border-radius: 999px !important;
        background: linear-gradient(135deg, var(--imperial-red-dark), var(--imperial-red)) !important;
        box-shadow: 0 12px 26px rgba(143, 7, 18, .22) !important;
        padding: 11px 18px !important;
        letter-spacing: 0 !important;
      }

      .container {
        max-width: 620px !important;
        margin-top: 76px !important;
        border-radius: 20px !important;
        padding: 22px !important;
        border: 1px solid rgba(184, 15, 31, .10) !important;
        box-shadow: 0 24px 60px rgba(86, 42, 53, .15) !important;
        overflow: hidden !important;
      }

      .container h2 {
        margin: 4px 0 18px !important;
        color: var(--imperial-red-dark) !important;
        font-size: clamp(1.35rem, 4.8vw, 1.85rem) !important;
        line-height: 1.15 !important;
      }

      .product {
        padding: 14px !important;
        border-radius: 16px !important;
        background: linear-gradient(135deg, #fff, var(--imperial-soft)) !important;
        border: 1px solid var(--imperial-line) !important;
      }

      .product img {
        width: 112px !important;
        height: 112px !important;
        border-radius: 16px !important;
        box-shadow: 0 12px 24px rgba(90, 42, 50, .14) !important;
      }

      .product-details p {
        font-size: .93rem !important;
        line-height: 1.38 !important;
      }

      .price-new,
      .price-new strong {
        color: var(--imperial-green) !important;
        font-size: 1.08rem !important;
      }

      .discount {
        border: 0 !important;
        border-radius: 14px !important;
        background: #fff1f4 !important;
        color: var(--imperial-red-dark) !important;
        box-shadow: inset 0 0 0 1px rgba(184, 15, 31, .14) !important;
      }

      form {
        display: grid !important;
        gap: 14px !important;
      }

      .imperial-stepper {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin: 12px 0 16px;
      }

      .imperial-stepper__item {
        border: 1px solid var(--imperial-line);
        border-radius: 14px;
        background: #fff;
        padding: 10px 8px;
        text-align: center;
        transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
      }

      .imperial-stepper__item.is-active {
        border-color: rgba(184, 15, 31, .34);
        background: #fff6f8;
        box-shadow: 0 10px 22px rgba(184, 15, 31, .10);
      }

      .imperial-stepper__item.is-done .imperial-stepper__number {
        background: var(--imperial-green);
      }

      .imperial-stepper__number {
        display: inline-grid;
        place-items: center;
        width: 24px;
        height: 24px;
        border-radius: 999px;
        background: var(--imperial-red);
        color: #fff;
        font-size: .78rem;
        font-weight: 900;
      }

      .imperial-stepper__label {
        display: block;
        margin-top: 6px;
        color: var(--imperial-muted);
        font-size: .76rem;
        font-weight: 800;
      }

      .imperial-pay-note {
        display: flex;
        gap: 12px;
        align-items: center;
        margin: 0 0 14px;
        padding: 13px 14px;
        border-radius: 16px;
        background: #eefaf1;
        border: 1px solid rgba(36, 132, 55, .18);
        color: #185a28;
        font-size: .9rem;
        font-weight: 800;
      }

      .imperial-pay-note::before {
        content: "Pix";
        flex: 0 0 auto;
        padding: 6px 9px;
        border-radius: 999px;
        background: var(--imperial-green);
        color: #fff;
        font-size: .76rem;
        font-weight: 900;
      }

      .imperial-step-panel {
        display: grid;
        gap: 14px;
      }

      .imperial-step-panel[hidden] {
        display: none !important;
      }

      .imperial-review {
        display: grid;
        gap: 10px;
      }

      .imperial-review__box {
        padding: 13px 14px;
        border: 1px solid var(--imperial-line);
        border-radius: 14px;
        background: #fffafc;
      }

      .imperial-review__label {
        display: block;
        color: var(--imperial-muted);
        font-size: .76rem;
        font-weight: 900;
        text-transform: uppercase;
        margin-bottom: 4px;
      }

      .imperial-review__value {
        color: var(--imperial-ink);
        font-size: .96rem;
        line-height: 1.35;
        font-weight: 750;
      }

      .imperial-form-actions {
        display: grid;
        grid-template-columns: 1fr 1.4fr;
        gap: 10px;
        align-items: center;
        margin-top: 2px;
      }

      .imperial-form-actions button {
        min-height: 52px !important;
        margin: 0 !important;
      }

      .imperial-back-button {
        border: 1px solid var(--imperial-line) !important;
        border-radius: 16px !important;
        background: #fff !important;
        color: var(--imperial-red-dark) !important;
        box-shadow: none !important;
        font-size: .98rem !important;
        font-weight: 900 !important;
      }

      .imperial-next-button {
        border: 0 !important;
        border-radius: 16px !important;
        background: linear-gradient(135deg, var(--imperial-green), var(--imperial-green-dark)) !important;
        color: #fff !important;
        box-shadow: 0 16px 26px rgba(36, 132, 55, .24) !important;
        font-size: .98rem !important;
        font-weight: 900 !important;
      }

      .section {
        margin-top: 0 !important;
        padding: 16px !important;
        border: 1px solid var(--imperial-line) !important;
        border-radius: 16px !important;
        background: #fff !important;
      }

      .section h3 {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        margin: 0 0 12px !important;
        color: var(--imperial-red-dark) !important;
        font-size: 1rem !important;
      }

      .section h3::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: var(--imperial-red);
        box-shadow: 0 0 0 4px rgba(184, 15, 31, .10);
        flex: 0 0 auto;
      }

      label {
        color: #37282e !important;
        margin: 12px 0 7px !important;
        font-size: .9rem !important;
        font-weight: 700 !important;
      }

      input,
      textarea,
      select {
        min-height: 50px !important;
        border: 1px solid #e2d5da !important;
        border-radius: 14px !important;
        background: #fffafc !important;
        color: #1f171b !important;
        font-size: 1rem !important;
        padding: 13px 14px !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .8), 0 1px 0 rgba(31, 23, 27, .02) !important;
        transition: border-color .18s ease, box-shadow .18s ease, background .18s ease !important;
      }

      textarea {
        min-height: 104px !important;
        line-height: 1.4 !important;
      }

      input::placeholder,
      textarea::placeholder {
        color: #a39299 !important;
      }

      input:focus,
      textarea:focus,
      select:focus {
        background: #fff !important;
        border-color: var(--imperial-red) !important;
        box-shadow: 0 0 0 4px rgba(184, 15, 31, .13) !important;
      }

      .form-row {
        gap: 12px !important;
      }

      button[type="submit"] {
        min-height: 54px !important;
        border-radius: 16px !important;
        margin-top: 4px !important;
        background: linear-gradient(135deg, var(--imperial-green), var(--imperial-green-dark)) !important;
        box-shadow: 0 16px 26px rgba(36, 132, 55, .26) !important;
        font-size: 1.02rem !important;
        font-weight: 800 !important;
      }

      form > button[type="submit"] {
        display: none !important;
      }

      button[type="submit"]:hover {
        opacity: 1 !important;
        transform: translateY(-1px);
      }

      .footer-note {
        color: #8d7c83 !important;
      }

      .imperial-pix-popup {
        border-radius: 22px !important;
        padding: 0 !important;
        overflow: hidden !important;
        color: var(--imperial-ink) !important;
      }

      .imperial-pix-title {
        display: none !important;
      }

      .imperial-pix-html {
        margin: 0 !important;
        padding: 0 !important;
      }

      .imperial-pix {
        text-align: left;
        background: #fffaf8;
      }

      .imperial-pix__hero {
        padding: 22px 22px 18px;
        background: linear-gradient(135deg, var(--imperial-red-dark), var(--imperial-red));
        color: #fff;
      }

      .imperial-pix__eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255,255,255,.16);
        font-size: .78rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      .imperial-pix__title {
        margin: 12px 0 6px;
        font-size: 1.55rem;
        line-height: 1.12;
        font-weight: 900;
      }

      .imperial-pix__subtitle {
        margin: 0;
        color: rgba(255,255,255,.86);
        font-size: .96rem;
        line-height: 1.4;
      }

      .imperial-pix__body {
        padding: 18px;
      }

      .imperial-pix__summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 14px;
        background: #fff;
        border: 1px solid var(--imperial-line);
        margin-bottom: 14px;
      }

      .imperial-pix__summary span {
        display: block;
        color: var(--imperial-muted);
        font-size: .78rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      .imperial-pix__summary strong {
        display: block;
        margin-top: 3px;
        color: var(--imperial-ink);
      }

      .imperial-pix__amount {
        color: var(--imperial-green) !important;
        font-size: 1.18rem;
      }

      .imperial-pix__qr-card {
        padding: 14px;
        border-radius: 18px;
        background: #fff;
        border: 1px solid var(--imperial-line);
        text-align: center;
      }

      .imperial-pix__qr {
        width: min(245px, 74vw);
        height: min(245px, 74vw);
        object-fit: contain;
        display: block;
        margin: 0 auto;
        border-radius: 14px;
      }

      .imperial-pix__hint {
        margin: 10px 0 0;
        color: var(--imperial-muted);
        font-size: .86rem;
      }

      .imperial-pix__copy-label {
        display: block;
        margin: 14px 0 8px;
        color: var(--imperial-ink);
        font-size: .88rem;
        font-weight: 800;
      }

      #pix-copy-code {
        width: 100%;
        min-height: 88px;
        max-height: 120px;
        resize: none;
        border: 1px solid #e2d5da;
        border-radius: 14px;
        background: #fff;
        padding: 12px;
        color: #37282e;
        font-size: .78rem;
        line-height: 1.35;
      }

      #copy-pix-button {
        width: 100%;
        min-height: 50px;
        margin-top: 10px;
        border: 0;
        border-radius: 14px;
        background: linear-gradient(135deg, var(--imperial-green), var(--imperial-green-dark));
        color: #fff;
        font-size: 1rem;
        font-weight: 900;
        box-shadow: 0 14px 24px rgba(36, 132, 55, .24);
      }

      #pix-status-text {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin: 13px 0 0;
        color: var(--imperial-muted);
        font-size: .9rem;
        font-weight: 700;
      }

      #pix-status-text::before {
        content: "";
        width: 9px;
        height: 9px;
        border-radius: 999px;
        background: #f6a800;
        box-shadow: 0 0 0 4px rgba(246, 168, 0, .16);
      }

      @media (max-width: 520px) {
        body {
          padding-left: 10px !important;
          padding-right: 10px !important;
        }

        .container {
          padding: 16px !important;
          border-radius: 18px !important;
        }

        .product {
          gap: 12px !important;
        }

        .product img {
          width: 92px !important;
          height: 92px !important;
        }

        .form-row {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
        }

        .form-row .half {
          width: 100% !important;
        }

        .section {
          padding: 14px !important;
        }

        .imperial-stepper {
          grid-template-columns: 1fr;
        }

        .imperial-form-actions {
          grid-template-columns: 1fr;
        }

        .imperial-pix__hero {
          padding: 20px 18px 16px;
        }

        .imperial-pix__body {
          padding: 15px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function enhanceCheckoutFields() {
    var placeholders = {
      tipoEntrega: "Selecione quem ira receber",
      nomeComprador: "Ex: Ana Souza",
      telComprador: "(11) 99999-9999",
      nomeDestinatario: "Nome do destinatario",
      telDestinatario: "(11) 99999-9999",
      rua: "Rua, avenida ou travessa",
      numero: "123",
      bairro: "Bairro",
      complemento: "Apartamento, bloco, referencia",
      observacoes: "Ex: Feliz aniversario, com carinho..."
    };

    Object.keys(placeholders).forEach(function (id) {
      var field = document.getElementById(id);
      if (field && !field.getAttribute("placeholder")) {
        field.setAttribute("placeholder", placeholders[id]);
      }
    });

    ["telComprador", "telDestinatario"].forEach(function (id) {
      var field = document.getElementById(id);
      if (field) field.setAttribute("inputmode", "tel");
    });

    var numero = document.getElementById("numero");
    if (numero) numero.setAttribute("inputmode", "numeric");

    var form = document.querySelector("form");
    if (form && !document.querySelector(".imperial-stepper")) {
      var stepper = document.createElement("div");
      stepper.className = "imperial-stepper";
      stepper.innerHTML =
        '<div class="imperial-stepper__item"><span class="imperial-stepper__number">1</span><span class="imperial-stepper__label">Dados</span></div>' +
        '<div class="imperial-stepper__item"><span class="imperial-stepper__number">2</span><span class="imperial-stepper__label">Entrega</span></div>' +
        '<div class="imperial-stepper__item"><span class="imperial-stepper__number">3</span><span class="imperial-stepper__label">Pix</span></div>';
      form.parentNode.insertBefore(stepper, form);
    }

    if (form && !document.querySelector(".imperial-pay-note")) {
      var note = document.createElement("div");
      note.className = "imperial-pay-note";
      note.textContent = "Pagamento gerado na hora com QR Code e copia e cola.";
      form.parentNode.insertBefore(note, form);
    }

    var submit = document.querySelector('button[type="submit"]');
    if (submit) submit.textContent = "Gerar Pix do pedido";
  }

  function setupSteppedCheckout() {
    var form = document.querySelector("form");
    if (!form || form.dataset.imperialStepped === "true") return;

    var sections = Array.prototype.slice.call(form.querySelectorAll(".section"));
    if (sections.length < 3) return;

    form.dataset.imperialStepped = "true";

    var panels = [
      { title: "Dados", nodes: sections.slice(0, 3) },
      { title: "Entrega", nodes: sections.slice(3) },
      { title: "Confirmar", nodes: [] }
    ];

    panels.forEach(function (panel, index) {
      var wrapper = document.createElement("div");
      wrapper.className = "imperial-step-panel";
      wrapper.dataset.step = String(index);
      if (index !== 0) wrapper.hidden = true;

      if (index < 2) {
        panel.nodes[0].parentNode.insertBefore(wrapper, panel.nodes[0]);
        panel.nodes.forEach(function (node) {
          wrapper.appendChild(node);
        });
      } else {
        wrapper.innerHTML =
          '<div class="section imperial-review-section">' +
            '<h3>Confira seu pedido</h3>' +
            '<div class="imperial-review" id="imperial-review"></div>' +
          '</div>';
        form.insertBefore(wrapper, form.querySelector('button[type="submit"]'));
      }
    });

    var actions = document.createElement("div");
    actions.className = "imperial-form-actions";
    actions.innerHTML =
      '<button type="button" class="imperial-back-button" id="imperial-back-button">Voltar</button>' +
      '<button type="button" class="imperial-next-button" id="imperial-next-button">Continuar</button>';
    form.appendChild(actions);

    var currentStep = 0;
    var backButton = document.getElementById("imperial-back-button");
    var nextButton = document.getElementById("imperial-next-button");
    var originalSubmit = form.querySelector('button[type="submit"]');
    var stepItems = Array.prototype.slice.call(document.querySelectorAll(".imperial-stepper__item"));

    function fieldsForStep(step) {
      var panel = form.querySelector('.imperial-step-panel[data-step="' + step + '"]');
      return panel ? Array.prototype.slice.call(panel.querySelectorAll("input, select, textarea")) : [];
    }

    function validateStep(step) {
      var fields = fieldsForStep(step).filter(function (field) {
        return !field.disabled && field.offsetParent !== null;
      });

      for (var i = 0; i < fields.length; i += 1) {
        if (!fields[i].checkValidity()) {
          fields[i].reportValidity();
          fields[i].focus();
          return false;
        }
      }

      return true;
    }

    function reviewLine(label, value) {
      return (
        '<div class="imperial-review__box">' +
          '<span class="imperial-review__label">' + escapeHtml(label) + '</span>' +
          '<div class="imperial-review__value">' + escapeHtml(value || "-") + '</div>' +
        '</div>'
      );
    }

    function updateReview() {
      var product = getProduct();
      var review = document.getElementById("imperial-review");
      var receiver =
        getField("tipoEntrega") === "presente"
          ? getField("nomeDestinatario") || "Presente para outra pessoa"
          : "Eu mesmo vou receber";
      var address = [getField("rua"), getField("numero"), getField("bairro")]
        .filter(Boolean)
        .join(", ");
      var delivery = [getField("data_entrega"), getField("horario")]
        .filter(Boolean)
        .join(" - ");

      if (!review) return;

      review.innerHTML =
        reviewLine("Produto", product.name + " - " + formatCurrency(product.totalPrice)) +
        reviewLine("Comprador", getField("nomeComprador") + " - " + getField("telComprador")) +
        reviewLine("Recebimento", receiver) +
        reviewLine("Endereco", address + (getField("complemento") ? " - " + getField("complemento") : "")) +
        reviewLine("Data e horario", delivery) +
        reviewLine("Mensagem", getField("observacoes"));
    }

    function setStep(step) {
      currentStep = Math.max(0, Math.min(2, step));

      Array.prototype.slice.call(form.querySelectorAll(".imperial-step-panel")).forEach(function (panel) {
        panel.hidden = panel.dataset.step !== String(currentStep);
      });

      stepItems.forEach(function (item, index) {
        item.classList.toggle("is-active", index === currentStep);
        item.classList.toggle("is-done", index < currentStep);
      });

      if (backButton) backButton.style.visibility = currentStep === 0 ? "hidden" : "visible";
      if (nextButton) nextButton.textContent = currentStep === 2 ? "Gerar Pix do pedido" : "Continuar";
      if (currentStep === 2) updateReview();

      var container = document.querySelector(".container");
      if (container) container.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (backButton) {
      backButton.addEventListener("click", function () {
        setStep(currentStep - 1);
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", function () {
        if (currentStep < 2) {
          if (!validateStep(currentStep)) return;
          setStep(currentStep + 1);
          return;
        }

        if (form.requestSubmit) {
          form.requestSubmit(originalSubmit || undefined);
        } else if (originalSubmit) {
          originalSubmit.click();
        }
      });
    }

    setStep(0);
  }

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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
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

  function pixHtml(data, product, amount) {
    var copy = data.copyAndPaste || "";
    var qrSrc = data.qrCode || (copy
      ? "https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=" + encodeURIComponent(copy)
      : "");
    var qr = qrSrc
      ? '<img class="imperial-pix__qr" src="' + qrSrc + '" alt="QR Code Pix">'
      : '<div class="imperial-pix__hint">QR Code indisponivel. Use o Pix copia e cola abaixo.</div>';

    return (
      '<div class="imperial-pix">' +
        '<div class="imperial-pix__hero">' +
          '<div class="imperial-pix__eyebrow">Pagamento seguro</div>' +
          '<div class="imperial-pix__title">Finalize pelo Pix</div>' +
          '<p class="imperial-pix__subtitle">Escaneie o QR Code ou copie o codigo Pix. A confirmacao aparece automaticamente.</p>' +
        '</div>' +
        '<div class="imperial-pix__body">' +
          '<div class="imperial-pix__summary">' +
            '<div><span>Pedido</span><strong>' + escapeHtml(product.name) + '</strong></div>' +
            '<strong class="imperial-pix__amount">' + formatCurrency(amount) + '</strong>' +
          '</div>' +
          '<div class="imperial-pix__qr-card">' +
            qr +
            '<p class="imperial-pix__hint">Abra o app do banco e aponte a camera para o QR Code.</p>' +
          '</div>' +
          '<label class="imperial-pix__copy-label" for="pix-copy-code">Pix copia e cola</label>' +
          '<textarea id="pix-copy-code" readonly>' + escapeHtml(copy) + '</textarea>' +
          '<button type="button" id="copy-pix-button">Copiar codigo Pix</button>' +
          '<p id="pix-status-text">Aguardando pagamento</p>' +
        '</div>' +
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
          html: pixHtml(data, product, payload.amount),
          width: 560,
          showConfirmButton: false,
          customClass: {
            popup: "imperial-pix-popup",
            title: "imperial-pix-title",
            htmlContainer: "imperial-pix-html"
          },
          didOpen: function () {
            var button = document.getElementById("copy-pix-button");
            var textarea = document.getElementById("pix-copy-code");
            if (button && textarea) {
              button.addEventListener("click", async function () {
                textarea.select();
                if (navigator.clipboard && window.isSecureContext) {
                  await navigator.clipboard.writeText(textarea.value);
                } else {
                  document.execCommand("copy");
                }
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
    injectCheckoutStyles();
    enhanceCheckoutFields();
    setupSteppedCheckout();
    var product = getProduct();
    if (product.totalPrice) track("ViewContent", product, product.totalPrice);
  });
})();
