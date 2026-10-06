import { supabase } from "@/lib/supabase";

// Hit daily by the Vercel cron in vercel.json so the free-tier Supabase
// project never sits idle long enough (7 days) to auto-pause. Unlike the
// GitHub Actions ping, this keeps running even if the repo goes quiet.
export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await supabase.from("cars").select("id").limit(1);
  if (error) {
    console.error("Supabase keepalive failed:", error.message);
    return Response.json({ ok: false }, { status: 503 });
  }
  return Response.json({ ok: true });
}
