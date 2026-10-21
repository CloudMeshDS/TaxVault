/**
 * Supabase Edge Function entry for the TaxVault API (deployed as the function "api").
 *
 * Supabase routes https://<project>.supabase.co/functions/v1/api/<rest> to this function with
 * the request path /api/<rest>, which matches the shared routes as-is. The app reaches it by
 * building with VITE_API_BASE_URL=https://<project>.supabase.co/functions/v1.
 *
 * SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase;
 * GEMINI_API_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET etc. are set as function secrets.
 * Built into supabase/functions/api/index.js by `npm run build:edge`.
 */
import { createApi } from './api';

const app = createApi();
app.listen(Number(process.env.PORT) || 8000);
