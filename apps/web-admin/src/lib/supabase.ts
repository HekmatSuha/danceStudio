import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eqztgdhhhhrmdfvlgnhx.supabase.co';
const supabaseAnonKey = 'sb_publishable_xzxk7Avlv3abcYCGd00abQ_pzTl3lVa';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
