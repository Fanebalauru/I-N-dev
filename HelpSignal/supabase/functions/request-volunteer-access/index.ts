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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });

  if (req.method !== "POST") {
    return json(405, { message: "Method not allowed" });
  }

  try {
    const body = await req.json().catch(() => null);

    const full_name = String(body?.full_name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const phone = String(body?.phone ?? "").trim();
    const dob = String(body?.dob ?? "").trim();
    const ngo_name = String(body?.ngo_name ?? "").trim();
    const motivation = String(body?.motivation ?? "").trim();

    if (!full_name || !email || !phone || !ngo_name) {
      return json(400, {
        message: "Completează numele, emailul, telefonul și ONG-ul.",
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { message: "Missing function secrets" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("volunteer_requests")
      .insert({
        full_name,
        email,
        phone,
        dob,
        ngo_name,
        motivation,
        status: "pending",
      })
      .select("id, created_at, status")
      .single();

    if (error) {
      return json(500, { message: "DB error", details: error.message });
    }

    return json(200, {
      ok: true,
      request: data,
      message:
        "Cererea a fost trimisă. ONG-ul va verifica datele și te va contacta.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { message: "Internal error", details: msg });
  }
});
