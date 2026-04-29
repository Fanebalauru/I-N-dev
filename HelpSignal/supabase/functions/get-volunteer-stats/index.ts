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

  if (req.method !== "GET") {
    return json(405, { message: "Method not allowed" });
  }

  try {
    const url = new URL(req.url);
    const email = String(url.searchParams.get("email") ?? "").trim();

    if (!email) {
      return json(400, { message: "Missing email" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { message: "Missing function secrets" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("volunteer_stats")
      .select(
        "email, full_name, institution, cases_assigned, cases_resolved, rating_sum, rating_count"
      )
      .eq("email", email)
      .maybeSingle();

    if (error) {
      return json(500, { message: "DB error", details: error.message });
    }

    return json(200, {
      ok: true,
      stats: data ?? {
        email,
        full_name: "",
        institution: "",
        cases_assigned: 0,
        cases_resolved: 0,
        rating_sum: 0,
        rating_count: 0,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { message: "Internal error", details: msg });
  }
});
