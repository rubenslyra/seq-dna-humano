import { createFileRoute } from "@tanstack/react-router";
import script from "@/lib/presenter/script.json";

export const Route = createFileRoute("/api/teleprompter-script")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Same-origin check to prevent external scraping
        const origin = request.headers.get("origin");
        const url = new URL(request.url);
        if (origin && origin !== url.origin) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Optional slide filter via query param
        const slideParam = url.searchParams.get("slide");
        let data: unknown = script;
        if (slideParam) {
          const slideNum = Math.trunc(Number(slideParam));
          const entry = script.find((s: { n: number }) => s.n === slideNum);
          if (!entry) {
            return new Response(JSON.stringify({ error: "Slide not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }
          data = entry;
        }

        return new Response(JSON.stringify(data), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": url.origin,
          },
        });
      },
    },
  },
});