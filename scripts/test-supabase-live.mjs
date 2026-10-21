import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection:');
console.log('URL:', url);
console.log('Key length:', key ? key.length : 0);

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('\n1. Checking connection to expenses table...');
  const { data: expData, error: expErr, count } = await supabase
    .from('expenses')
    .select('id, merchant, amount, date, created_at', { count: 'exact' })
    .limit(5);

  if (expErr) {
    console.error('Expenses query error:', expErr);
  } else {
    console.log(`✓ Successfully queried 'expenses' table! Total rows: ${count}`);
    console.log('Sample rows:', expData);
  }

  console.log('\n2. Checking other tables...');
  const tables = [
    'profiles',
    'incomes',
    'subscription_plans',
    'customer_subscriptions',
    'subscription_transactions',
    'customer_usage',
    'token_request_logs',
    'activity_logs'
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.log(`- Table '${table}': NOT READY or error (${error.message})`);
    } else {
      console.log(`✓ Table '${table}': READY`);
    }
  }
}

run().catch(console.error);
