// @ts-nocheck
/// <reference lib="deno.ns" />
// @ts-ignore
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// deno-lint-ignore no-explicit-any
Deno.serve((_req: Request) => {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "partner-code alive",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    }
  );
});