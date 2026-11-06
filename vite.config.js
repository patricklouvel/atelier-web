import {defineConfig, loadEnv} from 'vite';
import portal from './api/portal.js';
import access from './api/access.js';
import {devApiMiddleware} from './lib/dev-api.js';
export default defineConfig(({mode}) => {
 const env = loadEnv(mode, process.cwd(), '');
 // Only VITE_ variables are exposed to the browser. Secrets stay server-side.
 for (const key of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_BUCKET','ATELIER_PUBLISH_KEY','PUBLIC_PORTAL_URL']) {
  if (env[key]) process.env[key] = env[key];
 }
 return {server:{strictPort:true}, plugins:[{name:'atelier-local-api',configureServer(server){
  server.middlewares.use(devApiMiddleware({'/api/portal':portal,'/api/access':access}));
 }}],build:{chunkSizeWarningLimit:700}};
});
