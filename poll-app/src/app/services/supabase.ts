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

  
  async getSurveys() {
    const { data, error } = await this.supabase
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading surveys:', error);
      throw error;
    }

    return data;
  }

}