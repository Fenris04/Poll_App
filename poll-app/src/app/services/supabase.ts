import { Injectable } from '@angular/core';
import {
  createClient,
  SupabaseClient
} from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class Supabase {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      'https://xdxmdhgprengfhtzcrbw.supabase.co',
      'sb_publishable_BqMjR2-3WsRSSlA4FWhdIg_pKQmvyFw'
    );
  }

  get client(): SupabaseClient {
    return this.supabase;
  }
}