/**
 * SuperPlane REST integration — status + canvases proxy for demos and ops.
 * Docs: https://docs.superplane.com/concepts/api-reference/
 */
import { Router, type Request, type Response } from "express";
import {
  getSuperplaneConfig,
  superplaneRequest,
  summarizeCanvasesResponse,
} from "../integrations/superplaneClient.js";

export const superplaneRouter = Router();

const DOCS = "https://docs.superplane.com/concepts/api-reference/";

/** GET /api/integrations/superplane/status — token configured + optional live ping */
superplaneRouter.get("/status", async (_req: Request, res: Response) => {
  const cfg = getSuperplaneConfig();
  if (!cfg.configured) {
    res.json({
      integration: "superplane",
      configured: false,
      docs: DOCS,
      hint: "Add SUPERPLANE_API_TOKEN (Render / .env.local) from SuperPlane Profile → API token or a service account.",
    });
    return;
  }

  try {
    const r = await superplaneRequest("/canvases", { method: "GET" });
    const summary = summarizeCanvasesResponse(r.data);
    res.json({
      integration: "superplane",
      configured: true,
      baseUrl: cfg.baseUrl,
      ping: {
        ok: r.ok,
        httpStatus: r.status,
        canvases: summary,
      },
      docs: DOCS,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(503).json({
      integration: "superplane",
      configured: true,
      error: message,
      docs: DOCS,
    });
  }
});

/** GET /api/integrations/superplane/canvases — proxy (for admin/demo; requires token on server) */
superplaneRouter.get("/canvases", async (_req: Request, res: Response) => {
  const cfg = getSuperplaneConfig();
  if (!cfg.configured) {
    res.status(503).json({
      ok: false,
      error: "SUPERPLANE_API_TOKEN not configured",
    });
    return;
  }

  try {
    const r = await superplaneRequest("/canvases", { method: "GET" });
    res.status(r.status).json({
      ok: r.ok,
      status: r.status,
      data: r.data,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(503).json({ ok: false, error: message });
  }
});
