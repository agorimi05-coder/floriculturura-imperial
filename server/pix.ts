import QRCode from "qrcode";

type CheckoutCustomer = {
  fullName?: string;
  email?: string | null;
  phone?: string;
  document?: string;
  address?: {
    cep?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    complement?: string;
    city?: string;
    state?: string;
  };
};

type CheckoutItem = {
  id?: string;
  name?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
};

type AttributionData = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  captured_at?: string;
  [key: string]: unknown;
};

type PixCheckoutInput = {
  amount: number;
  customer?: CheckoutCustomer;
  items?: CheckoutItem[];
  attribution?: AttributionData;
};

type PixWebhookInput = {
  event?: string;
  transactionId?: string;
  status?: string;
  raw?: unknown;
};

const PAID_STATUSES = new Set([
  "paid",
  "approved",
  "completed",
  "success",
  "pago",
  "aprovado",
]);

function toCents(value: number) {
  return Math.round(Number(value) * 100);
}

function fromCents(value?: number) {
  if (typeof value !== "number") return undefined;
  return value / 100;
}

function normalizeDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeString(value?: string | null) {
  return (value ?? "").trim();
}

function normalizeStatus(value?: string | null) {
  return normalizeString(value).toLowerCase();
}

function normalizeEmail(value?: string | null) {
  return normalizeString(value).toLowerCase();
}

function getFallbackEmail(phone: string) {
  const configured = normalizeEmail(process.env.BLACKCAT_DEFAULT_EMAIL);

  if (configured && isValidEmail(configured)) return configured;
  if (phone) return `cliente+${phone}@imperialfloricultura.com.br`;

  return "cliente@imperialfloricultura.com.br";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status: number) {
  return status === 500 || status === 502 || status === 503 || status === 504;
}

function getBaseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function getBlackcatApiBase() {
  return (
    process.env.BLACKCAT_API_BASE_URL ??
    process.env.PIX_API_URL ??
    "https://api.blackcatpay.com.br/api"
  ).replace(/\/$/, "");
}

function getApiKey() {
  return process.env.BLACKCAT_API_KEY ?? process.env.PIX_API_KEY ?? "";
}

function getOrderLogWebhookUrl() {
  return process.env.ORDER_LOG_WEBHOOK_URL ?? "";
}

function inferDocumentType(document: string) {
  return document.length > 11 ? "cnpj" : "cpf";
}

function getFallbackDocument() {
  return normalizeDigits(
    process.env.BLACKCAT_DEFAULT_DOCUMENT ??
      process.env.PIX_DEFAULT_DOCUMENT ??
      "",
  );
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function sanitizePayloadForLog(payload: unknown) {
  if (!payload || typeof payload !== "object") return payload;

  const cloned = JSON.parse(JSON.stringify(payload)) as Record<string, any>;

  if (cloned.customer?.email) {
    const email = String(cloned.customer.email);
    const [name, domain] = email.split("@");
    cloned.customer.email =
      name && domain ? `${name.slice(0, 2)}***@${domain}` : "***";
  }

  if (cloned.customer?.phone) {
    const phone = String(cloned.customer.phone);
    cloned.customer.phone = `${phone.slice(0, 2)}***${phone.slice(-2)}`;
  }

  if (cloned.customer?.document?.number) {
    const doc = String(cloned.customer.document.number);
    cloned.customer.document.number = `${doc.slice(0, 3)}***${doc.slice(-2)}`;
  }

  return cloned;
}

function findStringByKeys(payload: unknown, keys: string[]) {
  const seen = new Set<unknown>();
  const normalizedKeys = keys.map((key) => key.toLowerCase());

  function visit(value: unknown): string {
    if (!value || typeof value !== "object" || seen.has(value)) return "";
    seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = visit(item);
        if (found) return found;
      }

      return "";
    }

    const record = value as Record<string, unknown>;

    for (const [key, item] of Object.entries(record)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const matches = normalizedKeys.some((candidate) =>
        normalizedKey.includes(candidate),
      );

      if (matches && typeof item === "string" && item.trim()) {
        return item.trim();
      }
    }

    for (const item of Object.values(record)) {
      const found = visit(item);
      if (found) return found;
    }

    return "";
  }

  return visit(payload);
}

function pickAttributionFields(attribution: AttributionData) {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(attribution)) {
    if (value === undefined || value === null || value === "") continue;
    output[key] = value;
  }

  return output;
}

function getWebhookTransactionId(input: PixWebhookInput) {
  return (
    normalizeString(input.transactionId) ||
    findStringByKeys(input.raw, [
      "transactionid",
      "transaction",
      "saleid",
      "orderid",
      "externalref",
    ])
  );
}

function getWebhookStatus(input: PixWebhookInput) {
  return (
    normalizeString(input.status) ||
    findStringByKeys(input.raw, ["status", "paymentstatus"])
  );
}

function getWebhookEvent(input: PixWebhookInput) {
  return (
    normalizeString(input.event) ||
    findStringByKeys(input.raw, ["event", "type"]) ||
    "pix_webhook"
  );
}

async function createQrCodeDataUrl(copyAndPaste: string) {
  if (!copyAndPaste) return "";

  try {
    return await QRCode.toDataURL(copyAndPaste, {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8,
      type: "image/png",
    });
  } catch (error) {
    console.error("QR CODE GENERATION ERROR", error);
    return "";
  }
}

async function normalizeBlackcatSaleResponse(payload: any, fallbackAmount: number) {
  const data = payload?.data ?? payload ?? {};
  const paymentData = data?.paymentData ?? {};
  const rawQrCodeImage =
    paymentData?.qrCodeBase64 ??
    paymentData?.qrCodeBase64Image ??
    paymentData?.qr_code_base64 ??
    paymentData?.qrCodeImage ??
    paymentData?.qr_code_image ??
    data?.qrCodeBase64 ??
    data?.qr_code_base64 ??
    findStringByKeys(payload, [
      "qrcodebase64",
      "qrcodebase64image",
      "qrcodeimage",
      "qrcodepng",
    ]);

  const qrCode =
    typeof rawQrCodeImage === "string" && rawQrCodeImage.startsWith("data:image")
      ? rawQrCodeImage
      : rawQrCodeImage
        ? `data:image/png;base64,${rawQrCodeImage}`
        : "";

  const copyAndPaste =
    paymentData?.copyPaste ??
    paymentData?.copy_paste ??
    paymentData?.pixCopyPaste ??
    paymentData?.pix_copy_paste ??
    paymentData?.qrCode ??
    data?.copyPaste ??
    data?.pixCopyPaste ??
    findStringByKeys(payload, [
      "copypaste",
      "pixcopypaste",
      "pixcopiaecola",
      "qrcode",
    ]);

  const generatedQrCode = qrCode || (await createQrCodeDataUrl(copyAndPaste));

  return {
    qrCode: generatedQrCode,
    copyAndPaste,
    transactionId: data?.transactionId ?? "",
    amount: fromCents(data?.amount) ?? fallbackAmount,
    status: data?.status ?? payload?.status ?? "PENDING",
    expiresAt: paymentData?.expiresAt ?? data?.expiresAt ?? null,
    invoiceUrl: data?.invoiceUrl ?? null,
    paidAt: data?.paidAt ?? null,
  };
}

async function sendOrderToWebhook(payload: Record<string, unknown>) {
  const webhookUrl = getOrderLogWebhookUrl();
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("ORDER LOG WEBHOOK ERROR", error);
  }
}

export async function createPixCharge(input: PixCheckoutInput) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      status: 500,
      body: { message: "Configure a BLACKCAT_API_KEY na Vercel ou no .env.local." },
    };
  }

  const parsedAmount = Number(input.amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return {
      status: 400,
      body: { message: "Valor total inválido para gerar o Pix." },
    };
  }

  const customer = input.customer ?? {};
  const address = customer.address ?? {};
  const attribution = input.attribution ?? {};

  const fullName = normalizeString(customer.fullName);
  const phone = normalizeDigits(customer.phone);
  const email = normalizeEmail(customer.email) || getFallbackEmail(phone);
  const document = normalizeDigits(customer.document) || getFallbackDocument();

  const cep = normalizeString(address.cep) || "00000-000";
  const street = normalizeString(address.street) || "Rua nao informada";
  const number = normalizeString(address.number) || "S/N";
  const neighborhood = normalizeString(address.neighborhood) || "Centro";
  const complement = normalizeString(address.complement) || "Sem complemento";
  const city = normalizeString(address.city) || "Cidade nao informada";
  const state = normalizeString(address.state).toUpperCase() || "SP";

  if (!fullName || !phone) {
    return {
      status: 400,
      body: { message: "Nome e telefone sao obrigatorios para gerar o Pix." },
    };
  }

  if (!isValidEmail(email)) {
    return {
      status: 400,
      body: { message: "Email inválido para gerar o Pix." },
    };
  }

  if (!document) {
    return {
      status: 500,
      body: {
        message:
          "Configure a BLACKCAT_DEFAULT_DOCUMENT na Vercel para gerar o Pix sem pedir CPF no checkout.",
      },
    };
  }

  const items = (input.items ?? []).map((item) => ({
    title: normalizeString(item.name) || "Produto",
    quantity: Number(item.quantity ?? 1),
    unitPrice: toCents(Number(item.unitPrice ?? 0)),
    tangible: false,
  }));

  if (items.length === 0 || items.some((item) => item.unitPrice <= 0)) {
    return {
      status: 400,
      body: { message: "Envie ao menos um item válido para criar a venda." },
    };
  }

  const body = {
    amount: toCents(parsedAmount),
    currency: "BRL",
    paymentMethod: "pix",
    items,
    customer: {
      name: fullName,
      email,
      phone,
      document: {
        number: document,
        type: inferDocumentType(document),
      },
      address: {
        zipCode: cep,
        street,
        number,
        neighborhood,
        complement,
        city,
        state,
        country: "BR",
      },
    },
    pix: {
      expiresInDays: 1,
    },
    postbackUrl: `${getBaseUrl()}/api/pix/webhook`,
    externalRef: `pedido-${Date.now()}`,
    metadata: "Compra via Imperial Floricultura",
  };

  console.log(
    "BLACKCAT CREATE SALE PAYLOAD",
    JSON.stringify(sanitizePayloadForLog(body), null, 2),
  );

  const requestSale = async () => {
    const response = await fetch(`${getBlackcatApiBase()}/sales/create-sale`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    const rawText = await response.text();
    const payload = safeJsonParse(rawText) ?? {};

    console.log("BLACKCAT CREATE SALE STATUS", response.status);

    return { response, payload, rawText };
  };

  let attempt = await requestSale();

  if (shouldRetryStatus(attempt.response.status)) {
    console.warn("BLACKCAT oscillou no create-sale, tentando novamente...");
    await wait(1200);
    attempt = await requestSale();
  }

  if (!attempt.response.ok || attempt.payload?.success === false) {
    return {
      status: attempt.response.ok ? 400 : attempt.response.status,
      body: {
        message:
          attempt.payload?.message ??
          attempt.payload?.error ??
          "A BlackCatPay retornou um erro ao gerar a cobrança Pix.",
        details:
          attempt.payload && Object.keys(attempt.payload).length > 0
            ? attempt.payload
            : attempt.rawText,
      },
    };
  }

  const normalized = await normalizeBlackcatSaleResponse(attempt.payload, parsedAmount);

  await sendOrderToWebhook({
    event: "pix_created",
    createdAt: new Date().toISOString(),
    transactionId: normalized.transactionId,
    externalRef: body.externalRef,
    fullName,
    email,
    phone,
    amount: parsedAmount,
    status: normalized.status,
    productId: input.items?.[0]?.id ?? "",
    productName: input.items?.[0]?.name ?? "",
    utm_source: attribution.utm_source ?? "",
    utm_medium: attribution.utm_medium ?? "",
    utm_campaign: attribution.utm_campaign ?? "",
    utm_content: attribution.utm_content ?? "",
    utm_term: attribution.utm_term ?? "",
    fbclid: attribution.fbclid ?? "",
    captured_at: attribution.captured_at ?? "",
    attribution: pickAttributionFields(attribution),
  });

  return {
    status: 200,
    body: {
      ...normalized,
      debugFullName: fullName,
      debugEmail: email,
      debugExternalRef: body.externalRef,
    },
  };
}

export async function getPixStatus(transactionId?: string | null) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      status: 500,
      body: { message: "Configure a BLACKCAT_API_KEY na Vercel ou no .env.local." },
    };
  }

  if (!transactionId?.trim()) {
    return {
      status: 400,
      body: { message: "Informe o transactionId para consultar o Pix." },
    };
  }

  const response = await fetch(
    `${getBlackcatApiBase()}/sales/${encodeURIComponent(transactionId)}/status`,
    {
      headers: {
        "X-API-Key": apiKey,
      },
    },
  );

  const rawText = await response.text();
  const payload = safeJsonParse(rawText) ?? {};

  const txId = payload?.data?.transactionId ?? transactionId ?? "unknown";
  const txStatus = payload?.data?.status ?? payload?.status ?? "unknown";

  console.log("BLACKCAT STATUS CHECK", response.status, txId, txStatus);

  if (!response.ok || payload?.success === false) {
    return {
      status: response.ok ? 400 : response.status,
      body: {
        message:
          payload?.message ??
          payload?.error ??
          "A BlackCatPay retornou um erro ao consultar o status.",
        details:
          payload && Object.keys(payload).length > 0 ? payload : rawText,
      },
    };
  }

  const normalized = await normalizeBlackcatSaleResponse(payload, 0);

  if (PAID_STATUSES.has(normalizeStatus(normalized.status))) {
    await sendOrderToWebhook({
      event: "pix_paid_status_check",
      checkedAt: new Date().toISOString(),
      transactionId: normalized.transactionId || transactionId,
      amount: normalized.amount,
      status: normalized.status,
      paidAt: normalized.paidAt ?? null,
    });
  }

  return {
    status: 200,
    body: normalized,
  };
}

export async function receivePixWebhook(input: PixWebhookInput) {
  const webhookSecret =
    process.env.BLACKCAT_WEBHOOK_SECRET ?? process.env.PIX_WEBHOOK_SECRET;

  if (webhookSecret && input?.raw && typeof input.raw === "object") {
    const providedSecret =
      (input.raw as Record<string, unknown>)["secret"] ??
      (input.raw as Record<string, unknown>)["token"];

    if (providedSecret !== webhookSecret) {
      return {
        status: 401,
        body: { message: "Webhook Pix não autorizado." },
      };
    }
  }

  const transactionId = getWebhookTransactionId(input);
  const status = getWebhookStatus(input);
  const event = getWebhookEvent(input);
  const isPaid = PAID_STATUSES.has(normalizeStatus(status));

  await sendOrderToWebhook({
    event: "pix_webhook",
    receivedAt: new Date().toISOString(),
    providerEvent: event,
    transactionId,
    status,
    isPaid,
  });

  return {
    status: 200,
    body: {
      received: true,
      event,
      transactionId: transactionId || null,
      status: status || "received",
      isPaid,
    },
  };
}
