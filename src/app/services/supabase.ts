
import { Injectable } from '@angular/core';

import {
  createClient,
  SupabaseClient
} from '@supabase/supabase-js';

export interface Survey {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  end_date: string | null;
  created_at: string;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  title: string;
  allow_multiple_choices: boolean;
  position: number;
}

export interface SurveyOption {
  id: string;
  survey_id: string;
  question_id: string;
  text: string;
  created_at: string;
}

export interface SurveyResult {
  question_id: string;
  option_id: string;
  option_text: string;
  vote_count: number;
}

export interface CreateSurveyData {
  title: string;
  description: string;
  category: string;
  endDate: string;
  questions: {
    title: string;
    allowMultiple: boolean;
    answers: string[];
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class Supabase {
  private supabase: SupabaseClient;
  private readonly participantKey = 'poll-app-participant-id';
  private participantId?: string;

  /**
   * Initializes the Supabase client.
   */
  constructor() {
    this.supabase = createClient(
      'https://xdxmdhgprengfhtzcrbw.supabase.co',
      'sb_publishable_BqMjR2-3WsRSSlA4FWhdIg_pKQmvyFw'
    );
  }

  /**
   * Provides access to the Supabase client.
   * @returns The initialized Supabase client.
   */
  get client(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Gets or creates an anonymous browser participant ID.
   * @returns The participant UUID.
   */
  getParticipantId(): string {
    if (this.participantId) return this.participantId;

    const saved = localStorage.getItem(this.participantKey);
    const valid = saved && /^[0-9a-f-]{36}$/i.test(saved);

    this.participantId = valid ? saved : crypto.randomUUID();
    localStorage.setItem(this.participantKey, this.participantId);

    return this.participantId;
  }

  /**
   * Checks whether this browser already voted in a survey.
   * @param surveyId ID of the survey.
   * @returns True if a participation exists.
   */
  async hasParticipated(surveyId: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc(
      'has_participated',
      {
        p_survey_id: surveyId,
        p_participant_id: this.getParticipantId()
      }
    );

    if (error) throw error;
    return data === true;
  }

  /**
   * Retrieves all surveys ordered by creation date.
   * @returns A promise containing the surveys.
   */
  async getSurveys(): Promise<Survey[]> {
    const { data, error } = await this.supabase
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Survey[];
  }

  /**
   * Retrieves a survey by its ID.
   * @param id ID of the requested survey.
   * @returns A promise containing the survey.
   */
  async getSurveyById(id: string): Promise<Survey> {
    const { data, error } = await this.supabase
      .from('surveys')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Survey;
  }

  /**
   * Retrieves the answer options of a survey.
   * @param surveyId ID of the survey.
   * @returns A promise containing the answer options.
   */
  async getSurveyOptions(surveyId: string): Promise<SurveyOption[]> {
    const { data, error } = await this.supabase
      .from('survey_options')
      .select('*')
      .eq('survey_id', surveyId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as SurveyOption[];
  }

  /**
   * Retrieves survey questions ordered by position.
   * @param surveyId ID of the survey.
   * @returns A promise containing the survey questions.
   */
  async getSurveyQuestions(surveyId: string): Promise<SurveyQuestion[]> {
    const { data, error } = await this.supabase
      .from('survey_questions')
      .select('id, survey_id, title, allow_multiple_choices, position')
      .eq('survey_id', surveyId)
      .order('position', { ascending: true });

    if (error) throw error;
    return (data ?? []) as SurveyQuestion[];
  }

  /**
   * Submits one vote for the current browser participant.
   * @param surveyId ID of the survey.
   * @param optionIds IDs of selected answer options.
   * @returns The submitted vote ID.
   */
  async submitVote(
    surveyId: string,
    optionIds: string[]
  ): Promise<string> {
    const { data, error } = await this.supabase.rpc(
      'submit_vote_once',
      {
        p_survey_id: surveyId,
        p_option_ids: optionIds,
        p_participant_id: this.getParticipantId()
      }
    );

    if (error) throw error;
    return data as string;
  }

  /**
   * Retrieves the aggregated results of a survey.
   * @param surveyId ID of the survey.
   * @returns A promise containing the survey results.
   */
  async getSurveyResults(surveyId: string): Promise<SurveyResult[]> {
    const { data, error } = await this.supabase.rpc(
      'get_survey_results',
      { p_survey_id: surveyId }
    );

    if (error) throw error;
    return (data ?? []) as SurveyResult[];
  }

  /**
   * Creates a survey with questions and answer options.
   * @param data Data required to create the survey.
   * @returns The new survey ID.
   */
  async createSurvey(data: CreateSurveyData): Promise<string> {
    const { data: surveyId, error } = await this.client.rpc(
      'create_survey',
      {
        p_title: data.title,
        p_description: data.description,
        p_category: data.category,
        p_end_date: data.endDate
          ? `${data.endDate}T23:59:59`
          : null,
        p_questions: data.questions
      }
    );

    if (error) throw error;
    return surveyId as string;
  }
}
