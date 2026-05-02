import type { IncomingMessage, ServerResponse } from "http";
import { receivePixWebhook } from "../../server/pix.js";

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
    const result = await receivePixWebhook({
      event: (body as Record<string, unknown>)?.event as string | undefined,
      transactionId: (body as Record<string, unknown>)?.transactionId as
        | string
        | undefined,
      status: (body as Record<string, unknown>)?.status as string | undefined,
      raw: body,
    });

    res.statusCode = result.status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result.body));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        message: "Não foi possível processar o webhook Pix.",
        details: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
