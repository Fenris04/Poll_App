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

  
  async getSurveyOptions(surveyId: string) {
    const { data, error } = await this.supabase
      .from('survey_options')
      .select('*')
      .eq('survey_id', surveyId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading survey options:', error);
      throw error;
    }

    return data;
  }


  async getSurveyById(id: string) {
    const { data, error } = await this.client
      .from('surveys')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

}