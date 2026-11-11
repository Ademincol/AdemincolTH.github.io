import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://rxvfzskzoiauuiljyxmf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_A7lb8WJgdvVeJF8onfqSbA_aMjbdW2W';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Testing upsert with supabase-js...');
  const res = await supabase.from('empleados').upsert([
    {
      id: 'test-supabase-js-1',
      nombre: 'PRUEBA SUPABASE JS',
      empresa: 'ADC',
      estado: 'ACTIVO'
    }
  ]);
  console.log('Result:', res);
}

run().catch(console.error);
