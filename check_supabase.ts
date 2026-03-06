import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '/Users/renanbratz/Desktop/postflow-antigravity/content-workflow-mate/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

async function checkPolicies() {
  console.log("Checking fetching the clients to see if anon key can see them...");
  const { data, error } = await supabase.from('clients').select('*');
  console.log("Data:", data?.length);
  console.log("Error:", error);
}

checkPolicies();
