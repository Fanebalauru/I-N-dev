// @ts-nocheck
/// <reference lib="deno.ns" />
// @ts-ignore
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(status: number, data: any) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

// deno-lint-ignore no-explicit-any
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });
  if (req.method !== "GET") return json(405, { message: "Method not allowed" });

  try {
    const url = new URL(req.url);
    const alertId = String(url.searchParams.get("alert_id") ?? "").trim();

    if (!alertId) {
      return json(400, { message: "Missing alert_id" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { message: "Missing function secrets" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("alerts")
      .select(
        "id, created_at, status, type_label, icon, severity, description, assigned_to_name, assigned_at, resolved_at, resolved_by_name, resolution_note"
      )
      .eq("id", alertId)
      .single();

    if (error || !data) {
      return json(404, { message: "Alert not found", details: error?.message });
    }

    return json(200, { ok: true, alert: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { message: "Internal error", details: msg });
  }
});
