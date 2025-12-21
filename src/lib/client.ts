/**
 * This file initializes the Supabase client for the frontend application.
 * It uses Vite's specific way of handling environment variables.
 */
import { createClient } from '@supabase/supabase-js';

// Use import.meta.env to access environment variables exposed by Vite.
// These variables must be prefixed with VITE_ in your .env file.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Create and export the Supabase client.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('[Supabase] Client initialized.');