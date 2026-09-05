import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envStr = fs.readFileSync(envPath, 'utf8');
const env = {};
envStr.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('armour_pieces')
    .select('slot')
    .eq('game', 'mho');
    
  if (error) {
    console.error(error);
    return;
  }
  
  const slots = [...new Set(data.map(d => d.slot))];
  console.log('Distinct slots in MHO:', slots);
}

run();
