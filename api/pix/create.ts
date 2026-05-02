import type { IncomingMessage, ServerResponse } from "http";
import { createPixCharge } from "../../server/pix.js";

type PixRequestBody = {
  amount: number;
  customer?: unknown;
  items?: unknown[];
};

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

function isValidPixRequest(body: unknown): body is PixRequestBody {
  if (!body || typeof body !== "object") return false;

  const parsed = body as PixRequestBody;

  if (!Number.isFinite(parsed.amount) || parsed.amount <= 0) return false;
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) return false;
  if (!parsed.customer || typeof parsed.customer !== "object") return false;

  return true;
}

function isRetryablePixError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("500") ||
    normalized.includes("502") ||
    normalized.includes("503") ||
    normalized.includes("504") ||
    normalized.includes("timeout") ||
    normalized.includes("tempor") ||
    normalized.includes("internal server error")
  );
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(
  req: IncomingMessage & { method?: string; body?: unknown },
  res: ServerResponse,
) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Método não permitido." }));
    return;
  }

  try {
    const body =
      req.body && typeof req.body === "object" ? req.body : await readJsonBody(req);

    if (!isValidPixRequest(body)) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          message: "Payload inválido para gerar Pix.",
        }),
      );
      return;
    }

    try {
      const result = await createPixCharge(body as any);

      res.statusCode = result.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(result.body));
      return;
    } catch (firstError) {
      const firstMessage =
        firstError instanceof Error ? firstError.message : String(firstError);

      console.error("PIX first attempt failed:", firstMessage);

      if (!isRetryablePixError(firstMessage)) {
        throw firstError;
      }

      await wait(1200);

      const retryResult = await createPixCharge(body as any);

      res.statusCode = retryResult.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(retryResult.body));
      return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error("PIX handler failed:", message);

    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        message: "Não foi possível gerar o Pix agora.",
        details: message,
      }),
    );
  }
}
