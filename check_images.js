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
    .select('id, slot, image')
    .eq('game', 'mho')
    .in('monster_id', ['great_jagras', 'anjanath']);
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(data);
}

run();
