import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const { userId, status } = await req.json() as {
      userId: string;
      status: 'active' | 'inactive' | 'suspended';
    };

    if (!userId || !['active', 'inactive', 'suspended'].includes(status))
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    // ── 1. Verify the caller is an admin ────────────────────────────────────
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !caller)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    const { data: callerProfile } = await callerClient
      .from('profiles').select('role').eq('id', caller.id).single();

    if (callerProfile?.role !== 'admin')
      return new Response(
        JSON.stringify({ error: 'Forbidden: admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    // ── 2. Use service role for privileged operations ────────────────────────
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── 3. Update profiles table ─────────────────────────────────────────────
    const { error: profileErr } = await adminClient
      .from('profiles')
      .update({ status })
      .eq('id', userId);

    if (profileErr) throw profileErr;

    // ── 4. Ban / unban in Supabase Auth ──────────────────────────────────────
    //    ban_duration:'infinity' → blocks new logins AND invalidates refresh tokens
    //    ban_duration:'none'     → reinstates the account
    const { error: authUpdateErr } = await adminClient.auth.admin.updateUserById(
      userId,
      { ban_duration: status === 'active' ? 'none' : 'infinity' }
    );
    if (authUpdateErr) throw authUpdateErr;

    // ── 5. Revoke all active sessions immediately (sign out globally) ────────
    if (status !== 'active') {
      await adminClient.auth.admin.signOut(userId, 'global');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
