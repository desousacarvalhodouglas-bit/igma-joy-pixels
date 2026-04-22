// Edge Function: lovable-proxy
// Recebe { project_id, bearer, message, images } e repassa para api.lovable.dev
// Resolve CORS porque a chamada acontece server-side.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  project_id?: string;
  bearer?: string;
  message?: string;
  images?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { project_id, bearer, message, images } = body;

  if (!project_id || !bearer) {
    return new Response(
      JSON.stringify({ success: false, error: "project_id e bearer são obrigatórios" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!message && (!images || images.length === 0)) {
    return new Response(
      JSON.stringify({ success: false, error: "Envie uma mensagem ou imagens" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Monta o payload no formato esperado pela API da Lovable
  const parts: Array<Record<string, unknown>> = [];
  if (message) parts.push({ type: "text", text: message });
  if (images && Array.isArray(images)) {
    for (const img of images) {
      if (typeof img === "string" && img.startsWith("data:")) {
        parts.push({ type: "image", image: img });
      }
    }
  }

  const lovablePayload = {
    projectId: project_id,
    messages: [{ role: "user", content: parts }],
  };

  const bearerClean = bearer.startsWith("Bearer ") ? bearer : `Bearer ${bearer}`;

  console.log("[lovable-proxy] forwarding", {
    project_id,
    has_message: !!message,
    images_count: images?.length ?? 0,
    bearer_len: bearer.length,
  });

  try {
    const upstream = await fetch("https://api.lovable.dev/projects/messages", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: bearerClean,
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      },
      body: JSON.stringify(lovablePayload),
    });

    const text = await upstream.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(text); } catch { parsed = text; }

    console.log("[lovable-proxy] upstream", upstream.status, typeof parsed === "string" ? parsed.slice(0, 300) : JSON.stringify(parsed).slice(0, 300));

    if (!upstream.ok) {
      let hint = "";
      if (upstream.status === 401 || upstream.status === 403) {
        hint =
          " — Token Bearer da Lovable inválido ou expirado. Reabra um projeto em lovable.dev e envie qualquer mensagem no chat para capturar um novo token.";
      } else if (upstream.status === 404) {
        hint = " — Endpoint da API da Lovable não encontrado.";
      } else if (upstream.status === 405) {
        hint = " — Método inválido para a rota da API da Lovable.";
      }
      return new Response(
        JSON.stringify({
          success: false,
          status: upstream.status,
          error: `Lovable API ${upstream.status}${hint}`,
          details: parsed,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[lovable-proxy] error", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
