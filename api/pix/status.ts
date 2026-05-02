import type { IncomingMessage, ServerResponse } from "http";
import { getPixStatus } from "../../server/pix.js";

export default async function handler(
  req: IncomingMessage & { method?: string; query?: Record<string, string> },
  res: ServerResponse,
) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Método não permitido." }));
    return;
  }

  try {
    const url = new URL(req.url ?? "", "http://localhost");
    const transactionId = req.query?.transactionId ?? url.searchParams.get("transactionId");
    const result = await getPixStatus(transactionId);

    res.statusCode = result.status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result.body));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        message: "Não foi possível consultar o status do Pix.",
        details: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
