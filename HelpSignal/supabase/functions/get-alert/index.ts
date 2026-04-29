import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });
  if (req.method !== "GET") return json(405, { message: "Method not allowed" });

  try {
    const url = new URL(req.url);
    const role = (url.searchParams.get("role") ?? "").trim();
    const status = (url.searchParams.get("status") ?? "open").trim();

    if (!role) return json(400, { message: "Missing role" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, {
        message: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in function secrets",
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("alerts")
      .select(
        "id, created_at, status, type_id, type_label, icon, severity, lat, lng, required_role, description"
      )
      .eq("required_role", role)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return json(500, { message: "DB error", details: error.message });
    }

    return json(200, { ok: true, alerts: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { message: "Internal error", details: msg });
  }
});