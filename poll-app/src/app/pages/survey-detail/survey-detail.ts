
import {
  Component,
  OnInit,
  OnDestroy,
  signal
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';

import {
  Supabase,
  SurveyResult
} from '../../services/supabase';

@Component({
  selector: 'app-survey-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss'
})
export class SurveyDetail implements OnInit, OnDestroy {
  survey = signal<any>(null);
  options = signal<any[]>([]);
  questions = signal<any[]>([]);
  results = signal<SurveyResult[]>([]);

  loading = signal(true);
  submitting = signal(false);
  voteSubmitted = signal(false);

  errorMessage = signal('');
  voteMessage = signal('');

  selectedAnswers = signal<Record<string, string[]>>({});

  private resultsChannel?: RealtimeChannel;

  constructor(
    private route: ActivatedRoute,
    private supabaseService: Supabase
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      void this.loadSurvey(id);
    } else {
      this.errorMessage.set('Survey ID is missing.');
      this.loading.set(false);
    }
  }

  async loadSurvey(id: string): Promise<void> {
    try {
      const survey = await this.supabaseService.getSurveyById(id);
      const questions = await this.supabaseService.getSurveyQuestions(id);
      const options = await this.supabaseService.getSurveyOptions(id);
      this.survey.set(survey);
      this.questions.set(questions);
      this.options.set(options);
      await this.loadResults(id);
      this.subscribeToResults(id);
    } catch (error) {
      console.error('Failed to load survey:', error);
      this.errorMessage.set('Survey could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  isSelected(questionId: string, optionId: string): boolean {
    return (this.selectedAnswers()[questionId] ?? []).includes(optionId);
  }

  selectAnswer(question: any, optionId: string): void {
    if (this.voteSubmitted() || this.submitting()) return;

    const selected = this.selectedAnswers()[question.id] ?? [];
    const answers = question.allow_multiple_choices
      ? selected.includes(optionId)
        ? selected.filter(id => id !== optionId)
        : [...selected, optionId]
      : [optionId];

    this.selectedAnswers.update(current => ({
      ...current,
      [question.id]: answers
    }));
  }

  getSelectedOptionIds(): string[] {
    return Object.values(this.selectedAnswers()).flat();
  }

  async completeSurvey(): Promise<void> {
    const surveyId = this.survey()?.id;
    if (!surveyId || this.submitting() || this.voteSubmitted()) return;
    this.voteMessage.set('');
    this.submitting.set(true);
    try {
      await this.supabaseService.submitVote(surveyId, this.getSelectedOptionIds());
      this.voteSubmitted.set(true);
      this.voteMessage.set('Thank you! Your answers have been submitted.');
      await this.loadResults(surveyId);
    } catch (error) {
      console.error('Failed to submit vote:', error);
      this.voteMessage.set('Please answer every question and try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  async loadResults(surveyId: string): Promise<void> {
    try {
      const results = await this.supabaseService.getSurveyResults(surveyId);
      this.results.set(results);
    } catch (error) {
      console.error('Failed to load results:', error);
    }
  }

  getTotalVotes(questionId: string): number {
    return this.results()
      .filter(result => result.question_id === questionId)
      .reduce((total, result) => total + Number(result.vote_count), 0);
  }

  getTotalVotesForSurvey(): number {
    return this.results().reduce(
      (total, result) => total + Number(result.vote_count),
      0
    );
  }

  getVotePercentage(questionId: string, voteCount: number): number {
    const total = this.getTotalVotes(questionId);

    if (total === 0) return 0;

    return Math.round((Number(voteCount) / total) * 100);
  }

  subscribeToResults(surveyId: string): void {
    this.resultsChannel = this.supabaseService.client
      .channel(`survey-results-${surveyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'survey_result_notifications',
          filter: `survey_id=eq.${surveyId}`
        },
        () => {
          void this.loadResults(surveyId);
        }
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    if (this.resultsChannel) {
      void this.supabaseService.client.removeChannel(
        this.resultsChannel
      );
    }
  }
}
