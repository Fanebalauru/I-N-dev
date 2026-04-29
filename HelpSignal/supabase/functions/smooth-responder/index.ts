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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

const ALLOWED_ROLES = new Set([
  "firefighter",
  "medic",
  "smurd",
  "police",
  "volunteer",
  "dispatcher",
  "admin",
]);

// deno-lint-ignore no-explicit-any
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });

  if (req.method !== "POST") {
    return json(405, { message: "Method not allowed" });
  }

  try {
    const body = await req.json();

    const type_id = String(body?.type_id ?? "").trim();
    const type_label = String(body?.type_label ?? "").trim();
    const icon = String(body?.icon ?? "").trim();
    const required_role = String(body?.required_role ?? "").trim();
    const severity = Number(body?.severity ?? 3);
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    const description =
      body?.description === undefined || body?.description === null
        ? null
        : String(body.description).trim().slice(0, 240);

    if (!type_id || !type_label || !icon || !required_role) {
      return json(400, { message: "Missing type fields" });
    }

    if (!ALLOWED_ROLES.has(required_role)) {
      return json(400, { message: "Invalid required_role" });
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return json(400, { message: "Missing location" });
    }

    if (!Number.isFinite(severity) || severity < 1 || severity > 5) {
      return json(400, { message: "Severity must be 1..5" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, {
        message: "Missing function secrets",
        hasUrl: !!supabaseUrl,
        hasServiceRoleKey: !!serviceRoleKey,
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const payload = {
      type_id,
      type_label,
      icon,
      required_role,
      severity,
      lat,
      lng,
      status: "open",
      description,
    };

    const { data, error } = await supabase
      .from("alerts")
      .insert(payload)
      .select("id, created_at")
      .single();

    if (error) {
      return json(500, {
        message: "DB error",
        details: error.message,
        code: error.code,
        hint: error.hint,
      });
    }

    return json(200, { ok: true, alert: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, {
      message: "Internal error",
      details: msg,
    });
  }
});