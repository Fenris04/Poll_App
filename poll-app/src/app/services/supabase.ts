
import { Injectable } from '@angular/core';

import {
  createClient,
  SupabaseClient
} from '@supabase/supabase-js';

export interface SurveyResult {
  question_id: string;
  option_id: string;
  option_text: string;
  vote_count: number;
}

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

    if (error) throw error;

    return data ?? [];
  }

  async getSurveyById(id: string) {
    const { data, error } = await this.supabase
      .from('surveys')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return data;
  }

  async getSurveyOptions(surveyId: string) {
    const { data, error } = await this.supabase
      .from('survey_options')
      .select('*')
      .eq('survey_id', surveyId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data ?? [];
  }

  async getSurveyQuestions(surveyId: string) {
    const { data, error } = await this.supabase
      .from('survey_questions')
      .select('id, survey_id, title, allow_multiple_choices, position')
      .eq('survey_id', surveyId)
      .order('position', { ascending: true });

    if (error) throw error;

    return data ?? [];
  }

  async submitVote(
    surveyId: string,
    optionIds: string[]
  ): Promise<string> {
    const { data, error } = await this.supabase.rpc('submit_vote', {
      p_survey_id: surveyId,
      p_option_ids: optionIds
    });

    if (error) throw error;

    return data as string;
  }

  async getSurveyResults(surveyId: string): Promise<SurveyResult[]> {
    const { data, error } = await this.supabase.rpc(
      'get_survey_results',
      { p_survey_id: surveyId }
    );

    if (error) throw error;

    return (data ?? []) as SurveyResult[];
  }

  async createSurvey(data: {
    title: string;
    description: string;
    category: string;
    endDate: string;
    questions: {
      title: string;
      allowMultiple: boolean;
      answers: string[];
    }[];
  }): Promise<string> {
    const { data: surveyId, error } = await this.client.rpc('create_survey', {
      p_title: data.title,
      p_description: data.description,
      p_category: data.category,
      p_end_date: data.endDate ? `${data.endDate}T23:59:59` : null,
      p_questions: data.questions
    });

    if (error) throw error;
    return surveyId as string;
  }

}
