import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gdieiwfkpymcnceeccck.supabase.co',
  'sb_publishable_RAaqlezIM9MRhznReNfQSg_aX26Ejhs'
);

async function checkSchema() {
  console.log('--- AUDITING REMOTE SUPABASE SCHEMA ---');
  
  console.log('\n1. Checking crop_inventory columns (specifically photo_urls):');
  const { data: inv, error: invErr } = await supabase.from('crop_inventory').select('id, crop_name, photo_urls').limit(1);
  if (invErr) {
    console.log('   crop_inventory query error:', invErr.message, '| code:', invErr.code);
  } else {
    console.log('   crop_inventory query SUCCESS. Data:', inv);
  }

  console.log('\n2. Checking farmer_conversations table:');
  const { data: conv, error: convErr } = await supabase.from('farmer_conversations').select('*').limit(1);
  if (convErr) {
    console.log('   farmer_conversations query error:', convErr.message, '| code:', convErr.code);
  } else {
    console.log('   farmer_conversations query SUCCESS. Data:', conv);
  }

  console.log('\n3. Checking farmer_messages table:');
  const { data: msg, error: msgErr } = await supabase.from('farmer_messages').select('*').limit(1);
  if (msgErr) {
    console.log('   farmer_messages query error:', msgErr.message, '| code:', msgErr.code);
  } else {
    console.log('   farmer_messages query SUCCESS. Data:', msg);
  }

  console.log('\n4. Checking storage buckets (produce-photos):');
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) {
    console.log('   storage buckets error:', bErr.message);
  } else {
    console.log('   storage buckets list:', buckets?.map(b => b.name));
  }

  console.log('\n5. Checking aggregated_orders columns (price_override_approved):');
  const { data: agg, error: aggErr } = await supabase.from('aggregated_orders').select('id, price_override_approved').limit(1);
  if (aggErr) {
    console.log('   aggregated_orders query error:', aggErr.message, '| code:', aggErr.code);
  } else {
    console.log('   aggregated_orders query SUCCESS. Data:', agg);
  }

  console.log('\n6. Checking profiles for Aryan / thakuraryan6731@gmail.com:');
  const { data: profs, error: pErr } = await supabase.from('profiles').select('*');
  if (pErr) {
    console.log('   profiles error:', pErr.message);
  } else {
    console.log('   profiles found:', profs);
  }
}

checkSchema();
