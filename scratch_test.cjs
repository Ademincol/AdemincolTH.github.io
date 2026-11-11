const fs = require('fs');
const vm = require('vm');
const ctx = {
  self: {},
  fetch: globalThis.fetch,
  Headers: globalThis.Headers,
  Request: globalThis.Request,
  Response: globalThis.Response,
  URL: globalThis.URL,
  URLSearchParams: globalThis.URLSearchParams
};
vm.runInNewContext(fs.readFileSync('supabase.js', 'utf8'), ctx);

const createClient = ctx.supabase.createClient;
const SUPABASE_URL = 'https://rxvfzskzoiauuiljyxmf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_A7lb8WJgdvVeJF8onfqSbA_aMjbdW2W';

const client = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Fetching 5 real employees from Supabase...');
  const { data: emps, error: errEmp } = await client.from('empleados').select('*').limit(5);
  if (errEmp) {
    console.error('Error fetching:', errEmp);
    return;
  }
  console.log('Fetched:', emps.length);

  // Now simulate an import where we have new records (which have all FIELDS with empty strings or values)
  const emptyRec = {};
  Object.keys(emps[0]).forEach(k => {
    emptyRec[k] = '';
  });
  emptyRec.id = 'import-test-1';
  emptyRec.nombre = 'TEST NUEVO EMPLEADO';
  emptyRec.empresa = 'ADC';
  emptyRec.estado = 'ACTIVO';
  delete emptyRec.created_at;
  delete emptyRec.updated_at;

  console.log('\n--- Test 1: Upsert single new record ---');
  const res1 = await client.from('empleados').upsert([emptyRec]);
  console.log('Upsert res1 error:', res1.error);

  console.log('\n--- Test 2: Upsert mixed batch (new record without created_at + merged record with created_at) ---');
  const mergedRec = Object.assign({}, emps[0], { nombre: 'TEST MODIFICADO' });
  const res2 = await client.from('empleados').upsert([emptyRec, mergedRec]);
  console.log('Upsert res2 error:', res2.error);

  console.log('\n--- Test 3: Upsert reverse mixed batch (merged first, new second) ---');
  const res3 = await client.from('empleados').upsert([mergedRec, emptyRec]);
  console.log('Upsert res3 error:', res3.error);

  // Clean up
  await client.from('empleados').delete().eq('id', 'import-test-1');
}

run().catch(console.error);
