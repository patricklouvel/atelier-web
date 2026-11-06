// Explicit allowlist: only the URL and a public API key may enter the browser build.
export function publicSupabaseConfig(env = {}) {
  const url = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) return { url, key: '' };
  const parsed = new URL(url);
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('L’URL publique Supabase est invalide.');
  }
  let publicKey = key.startsWith('sb_publishable_');
  if (!publicKey && key.split('.').length === 3) {
    try {
      // Legacy anon JWTs remain supported, but never service_role or session JWTs.
      publicKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon';
    } catch { publicKey = false; }
  }
  if (!publicKey) throw new Error('La clé navigateur Supabase doit être publishable ou anon. Une clé privée ne peut pas être exposée.');
  return { url: parsed.href.replace(/\/$/, ''), key };
}

export function serverSupabaseConfig(env = {}) {
  return {
    url: (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim(),
    key: (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
    bucket: env.SUPABASE_BUCKET || 'atelier-private',
  };
}
