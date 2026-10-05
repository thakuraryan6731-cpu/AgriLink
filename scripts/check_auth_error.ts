import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gdieiwfkpymcnceeccck.supabase.co',
  'sb_publishable_RAaqlezIM9MRhznReNfQSg_aX26Ejhs'
);

async function inspectSignInError() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'nonexistent_test_user_891@agrilink.gov.in',
    password: 'Password@123',
  });

  console.log('--- SUPABASE EXACT ERROR INSPECTION ---');
  if (error) {
    console.log('error.message:', error.message);
    console.log('error.code:   ', (error as any).code);
    console.log('error.status: ', error.status);
    console.log('error.name:   ', error.name);
    console.log('Full JSON:    ', JSON.stringify(error, null, 2));
  } else {
    console.log('Sign in succeeded unexpectedly:', data);
  }
}

inspectSignInError();
