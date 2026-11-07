import {defineConfig, loadEnv} from 'vite';
import portal from './api/portal.js';
import access from './api/access.js';
import workshop from './api/workshop.js';
import catalogue from './api/catalogue.js';
import {devApiMiddleware} from './lib/dev-api.js';
import {publicSupabaseConfig} from './lib/supabase-config.js';
export default defineConfig(({mode}) => {
 const env = {...loadEnv(mode, process.cwd(), ''), ...process.env};
 const publicConfig = publicSupabaseConfig(env);
 // Server credentials remain in the API runtime, never in define or envPrefix.
 for (const key of ['SUPABASE_URL','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_BUCKET','ATELIER_PUBLISH_KEY','PUBLIC_PORTAL_URL']) {
  if (env[key]) process.env[key] = env[key];
 }
 return {define:{
  'import.meta.env.VITE_SUPABASE_URL':JSON.stringify(publicConfig.url),
  'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify(publicConfig.key),
 },server:{strictPort:true}, plugins:[{name:'atelier-local-api',configureServer(server){
  server.middlewares.use(devApiMiddleware({'/api/portal':portal,'/api/access':access,'/api/workshop':workshop,'/api/catalogue':catalogue}));
 }}],build:{chunkSizeWarningLimit:700}};
});
