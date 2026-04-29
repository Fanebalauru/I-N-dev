// @ts-nocheck
/// <reference lib="deno.window" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(status: number, data: any) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });
  if (req.method !== "POST") return json(405, { message: "Method not allowed" });

  try {
    const body = await req.json().catch(() => null);
    const alertId = String(body?.alert_id ?? "").trim();

    if (!alertId) return json(400, { message: "Missing alert_id" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { message: "Missing function secrets" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("alerts")
      .update({
        status: "cancelled",
        resolved_at: new Date().toISOString(),
        resolution_note: "Alertă anulată de persoana care a trimis-o.",
      })
      .eq("id", alertId)
      .in("status", ["open", "assigned"])
      .select("*")
      .single();

    if (error || !data) {
      return json(500, {
        message: "Nu s-a putut anula alerta.",
        details: error?.message,
      });
    }

    return json(200, { ok: true, alert: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { message: "Internal error", details: msg });
  }
});
