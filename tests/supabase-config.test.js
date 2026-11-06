import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicSupabaseConfig,serverSupabaseConfig} from '../lib/supabase-config.js';

const url='https://example.supabase.co';
const publishable='sb_publishable_configuration_test';
const legacy=role=>`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;

test('Vercel Marketplace variables configure the browser and server independently',()=>{
 const env={SUPABASE_URL:url,SUPABASE_PUBLISHABLE_KEY:publishable,SUPABASE_SECRET_KEY:'sb_secret_server_only',POSTGRES_PASSWORD:'database-password'};
 assert.deepEqual(publicSupabaseConfig(env),{url,key:publishable});
 assert.equal(serverSupabaseConfig(env).key,'sb_secret_server_only');
 assert(!JSON.stringify(publicSupabaseConfig(env)).includes('sb_secret_'));
 assert(!JSON.stringify(publicSupabaseConfig(env)).includes('database-password'));
});

test('Next public aliases and existing Vite/anon deployments remain compatible',()=>{
 assert.deepEqual(publicSupabaseConfig({NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:publishable}),{url,key:publishable});
 const anon=legacy('anon');
 assert.deepEqual(publicSupabaseConfig({VITE_SUPABASE_URL:url,VITE_SUPABASE_ANON_KEY:anon}),{url,key:anon});
 assert.equal(serverSupabaseConfig({SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:legacy('service_role')}).key,legacy('service_role'));
});

test('private keys and user JWTs are rejected before a browser build',()=>{
 for(const key of ['sb_secret_misplaced',legacy('service_role'),legacy('authenticated'),'not-an-api-key']){
  assert.throws(()=>publicSupabaseConfig({VITE_SUPABASE_URL:url,VITE_SUPABASE_PUBLISHABLE_KEY:key}),/clé navigateur/);
 }
 assert.throws(()=>publicSupabaseConfig({SUPABASE_URL:'https://user:password@example.com',SUPABASE_PUBLISHABLE_KEY:publishable}),/URL publique/);
});

test('a server secret alone cannot configure public login',()=>{
 assert.equal(publicSupabaseConfig({SUPABASE_URL:url,SUPABASE_SECRET_KEY:'sb_secret_server_only'}).key,'');
 assert.equal(publicSupabaseConfig({SUPABASE_URL:url}).key,'');
});
