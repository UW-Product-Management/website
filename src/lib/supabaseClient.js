import { createClient } from '@supabase/supabase-js';
import {
  DEFAULT_LOCAL_PUBLISHABLE_KEY,
  SUPABASE_URL,
  portalEnvironment,
} from '../portal/portalEnvironment.mjs';

if (portalEnvironment.error) {
  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.error(portalEnvironment.error);
  } else {
    throw new Error(portalEnvironment.error);
  }
}

const supabasePublishableKey =
  process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY ||
  DEFAULT_LOCAL_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, supabasePublishableKey);
export default supabase;
