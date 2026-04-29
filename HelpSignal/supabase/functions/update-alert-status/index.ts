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

async function incrementStats(
  supabase: any,
  email: string,
  fullName: string,
  type: "assigned" | "resolved"
) {
  const { data: existing } = await supabase
    .from("volunteer_stats")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (!existing) {
    await supabase.from("volunteer_stats").insert({
      email,
      full_name: fullName,
      cases_assigned: type === "assigned" ? 1 : 0,
      cases_resolved: type === "resolved" ? 1 : 0,
    });
    return;
  }

  await supabase
    .from("volunteer_stats")
    .update({
      full_name: fullName || existing.full_name,
      cases_assigned:
        type === "assigned"
          ? (existing.cases_assigned ?? 0) + 1
          : existing.cases_assigned ?? 0,
      cases_resolved:
        type === "resolved"
          ? (existing.cases_resolved ?? 0) + 1
          : existing.cases_resolved ?? 0,
    })
    .eq("email", email);
}

// deno-lint-ignore no-explicit-any
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });
  if (req.method !== "POST") return json(405, { message: "Method not allowed" });

  try {
    const body = await req.json();

    const action = String(body?.action ?? "").trim();
    const alertId = String(body?.alert_id ?? "").trim();
    const volunteerEmail = String(body?.volunteer_email ?? "").trim();
    const volunteerName = String(body?.volunteer_name ?? "Voluntar").trim();
    const resolutionNote = String(body?.resolution_note ?? "").trim();

    if (!action || !alertId || !volunteerEmail) {
      return json(400, {
        message: "Missing action, alert_id or volunteer_email",
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { message: "Missing function secrets" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (action === "assign") {
      const { data: activeCase } = await supabase
        .from("alerts")
        .select("id")
        .eq("assigned_to", volunteerEmail)
        .eq("status", "assigned")
        .maybeSingle();

      if (activeCase) {
        return json(409, {
          message: "Ai deja un caz activ. Finalizează-l înainte să preiei altul.",
        });
      }

      const { data, error } = await supabase
        .from("alerts")
        .update({
          status: "assigned",
          assigned_to: volunteerEmail,
          assigned_to_name: volunteerName,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", alertId)
        .eq("status", "open")
        .select("*")
        .single();

      if (error || !data) {
        return json(500, {
          message: "Nu s-a putut prelua cazul.",
          details: error?.message,
        });
      }

      await incrementStats(supabase, volunteerEmail, volunteerName, "assigned");

      return json(200, { ok: true, alert: data });
    }

    if (action === "resolve") {
      const { data, error } = await supabase
        .from("alerts")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolved_by: volunteerEmail,
          resolved_by_name: volunteerName,
          resolution_note: resolutionNote,
        })
        .eq("id", alertId)
        .eq("assigned_to", volunteerEmail)
        .eq("status", "assigned")
        .select("*")
        .single();

      if (error || !data) {
        return json(500, {
          message: "Nu s-a putut finaliza cazul.",
          details: error?.message,
        });
      }

      await incrementStats(supabase, volunteerEmail, volunteerName, "resolved");

      const { error: historyError } = await supabase
        .from("volunteer_history")
        .insert({
          alert_id: data.id,
          volunteer_email: volunteerEmail,
          volunteer_name: volunteerName,
          type_label: data.type_label,
          icon: data.icon,
          severity: data.severity,
          description: data.description,
          resolution_note: resolutionNote,
        });

      if (historyError) {
        return json(500, {
          message: "Cazul a fost finalizat, dar istoricul nu s-a salvat.",
          details: historyError.message,
        });
      }

      return json(200, { ok: true, alert: data });
    }

    return json(400, { message: "Invalid action" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { message: "Internal error", details: msg });
  }
});