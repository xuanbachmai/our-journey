/**
 * Keeps the free Supabase project from pausing.
 *
 * Vercel runs this on a schedule (see "crons" in vercel.json). It reads a
 * single row, which counts as activity, so the farm is always awake when
 * either of you opens the game. Until the Supabase env vars exist it reports
 * "idle" and does nothing.
 */
export default async function handler(_req, res) {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const key = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  if (!url || !key) {
    return res.status(200).json({ ok: true, state: 'idle', note: 'No Supabase project connected yet.' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/worlds?select=code&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    // 401/403/404 still prove the server answered, so the project is awake
    const awake = r.status === 200 || r.status === 206 || r.status === 401 || r.status === 403 || r.status === 404;
    return res.status(awake ? 200 : 503).json({
      ok: awake,
      status: r.status,
      state: r.status === 200 || r.status === 206 ? 'awake' : awake ? 'awake, but check the key or the worlds table' : 'asleep or failing',
    });
  } catch (e) {
    return res.status(503).json({ ok: false, state: 'unreachable', error: String(e?.message ?? e) });
  } finally {
    clearTimeout(timer);
  }
}
