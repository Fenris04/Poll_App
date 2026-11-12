
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

interface SurveyDetailData {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  end_date: string | null;
}

interface SurveyQuestion {
  id: string;
  title: string;
  allow_multiple_choices: boolean;
}

interface SurveyOption {
  id: string;
  question_id: string;
  text: string;
}

@Component({
  selector: 'app-survey-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss'
})
export class SurveyDetail implements OnInit, OnDestroy {
  survey = signal<SurveyDetailData | null>(null);
  options = signal<SurveyOption[]>([]);
  questions = signal<SurveyQuestion[]>([]);
  results = signal<SurveyResult[]>([]);

  loading = signal(true);
  submitting = signal(false);
  voteSubmitted = signal(false);

  errorMessage = signal('');
  voteMessage = signal('');

  selectedAnswers = signal<Record<string, string[]>>({});

  private resultsChannel?: RealtimeChannel;
  private destroyed = false;

  /**
   * Creates the survey detail component.
   * @param route Provides the survey ID from the URL.
   * @param supabaseService Provides survey and voting operations.
   */
  constructor(
    private route: ActivatedRoute,
    private supabaseService: Supabase
  ) {}

  /**
   * Loads the survey identified by the current route.
   * @returns Nothing.
   */
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage.set('Survey ID is missing.');
      this.loading.set(false);
      return;
    }

    void this.loadSurvey(id);
  }

  /**
   * Loads the survey, its questions and its options.
   * @param id ID of the requested survey.
   * @returns A promise that resolves when loading finishes.
   */
  async loadSurvey(id: string): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      await this.fetchSurveyData(id);
      if (this.destroyed) return;
      await this.loadResults(id);
      if (!this.destroyed) this.subscribeToResults(id);
    } catch (error) {
      console.error('Failed to load survey:', error);
      if (!this.destroyed) {
        this.errorMessage.set('Survey could not be loaded.');
      }
    } finally {
      if (!this.destroyed) this.loading.set(false);
    }
  }

  /**
   * Retrieves the survey and its related data from Supabase.
   * @param id ID of the requested survey.
   * @returns A promise that resolves after updating the signals.
   */
  private async fetchSurveyData(id: string): Promise<void> {
    const [survey, questions, options] = await Promise.all([
      this.supabaseService.getSurveyById(id),
      this.supabaseService.getSurveyQuestions(id),
      this.supabaseService.getSurveyOptions(id)
    ]);

    if (this.destroyed) return;
    if (!survey) throw new Error('Survey not found.');

    this.survey.set(survey);
    this.questions.set(questions);
    this.options.set(options);
  }

  /**
   * Returns the answer options belonging to a question.
   * @param questionId ID of the question.
   * @returns Options associated with the question.
   */
  getOptionsForQuestion(questionId: string): SurveyOption[] {
    return this.options().filter(
      option => option.question_id === questionId
    );
  }

  /**
   * Checks whether an answer option is selected.
   * @param questionId ID of the question.
   * @param optionId ID of the answer option.
   * @returns True when the option is selected.
   */
  isSelected(questionId: string, optionId: string): boolean {
    return (this.selectedAnswers()[questionId] ?? []).includes(optionId);
  }

  /**
   * Updates the selected answers for a question.
   * @param question Question being answered.
   * @param optionId ID of the selected option.
   * @returns Nothing.
   */
  selectAnswer(question: SurveyQuestion, optionId: string): void {
    if (this.voteSubmitted() || this.submitting()) return;

    const selected = this.selectedAnswers()[question.id] ?? [];
    const answers = question.allow_multiple_choices
      ? this.toggleAnswer(selected, optionId)
      : [optionId];

    this.selectedAnswers.update(current => ({
      ...current,
      [question.id]: answers
    }));
  }

  /**
   * Adds or removes an option from a multiple-choice selection.
   * @param selected Currently selected option IDs.
   * @param optionId Option ID to toggle.
   * @returns Updated selection.
   */
  private toggleAnswer(
    selected: string[],
    optionId: string
  ): string[] {
    return selected.includes(optionId)
      ? selected.filter(id => id !== optionId)
      : [...selected, optionId];
  }

  /**
   * Returns all selected answer option IDs.
   * @returns Flat list of selected option IDs.
   */
  getSelectedOptionIds(): string[] {
    return Object.values(this.selectedAnswers()).flat();
  }

  /**
   * Checks whether every question has at least one answer.
   * @returns True when all questions have been answered.
   */
  private hasAnsweredEveryQuestion(): boolean {
    const questions = this.questions();

    return questions.length > 0 && questions.every(question =>
      (this.selectedAnswers()[question.id] ?? []).length > 0
    );
  }

  /**
   * Validates and submits the selected answers.
   * @returns A promise that resolves after the submission attempt.
   */
  async completeSurvey(): Promise<void> {
    const surveyId = this.survey()?.id;
    if (!surveyId || this.submitting() || this.voteSubmitted()) return;

    if (!this.hasAnsweredEveryQuestion()) {
      this.voteMessage.set('Please answer every question.');
      return;
    }

    this.voteMessage.set('');
    this.submitting.set(true);
    await this.submitAnswers(surveyId);
  }

  /**
   * Sends the selected answers to Supabase.
   * @param surveyId ID of the survey.
   * @returns A promise that resolves after submission.
   */
  private async submitAnswers(surveyId: string): Promise<void> {
    try {
      await this.supabaseService.submitVote(
        surveyId,
        this.getSelectedOptionIds()
      );
      if (this.destroyed) return;
      this.voteSubmitted.set(true);
      this.voteMessage.set('Thank you! Your answers have been submitted.');
      await this.loadResults(surveyId);
    } catch (error) {
      this.handleVoteError(error);
    } finally {
      if (!this.destroyed) this.submitting.set(false);
    }
  }

  /**
   * Displays a message when submitting a vote fails.
   * @param error Error returned during submission.
   * @returns Nothing.
   */
  private handleVoteError(error: unknown): void {
    console.error('Failed to submit vote:', error);

    if (!this.destroyed) {
      this.voteMessage.set(
        'Your answers could not be submitted. Please try again.'
      );
    }
  }

  /**
   * Loads the latest survey results.
   * @param surveyId ID of the survey.
   * @returns A promise that resolves after the results request.
   */
  async loadResults(surveyId: string): Promise<void> {
    try {
      const results = await this.supabaseService.getSurveyResults(surveyId);
      if (!this.destroyed) this.results.set(results);
    } catch (error) {
      console.error('Failed to load results:', error);
    }
  }

  /**
   * Calculates the total votes for one question.
   * @param questionId ID of the question.
   * @returns Total number of votes for that question.
   */
  getTotalVotes(questionId: string): number {
    return this.results()
      .filter(result => result.question_id === questionId)
      .reduce((total, result) => total + Number(result.vote_count), 0);
  }

  /**
   * Calculates the total number of selected answers.
   * @returns Total votes across all survey questions.
   */
  getTotalVotesForSurvey(): number {
    return this.results().reduce(
      (total, result) => total + Number(result.vote_count),
      0
    );
  }

  /**
   * Calculates an answer option's vote percentage.
   * @param questionId ID of the question.
   * @param voteCount Number of votes for the option.
   * @returns Rounded percentage between zero and one hundred.
   */
  getVotePercentage(questionId: string, voteCount: number): number {
    const total = this.getTotalVotes(questionId);

    if (total === 0) return 0;

    return Math.round((Number(voteCount) / total) * 100);
  }

  /**
   * Subscribes to live updates for the survey results.
   * @param surveyId ID of the survey.
   * @returns Nothing.
   */
  subscribeToResults(surveyId: string): void {
    if (this.resultsChannel) return;

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
        () => void this.loadResults(surveyId)
      )
      .subscribe();
  }

  /**
   * Cleans up the realtime subscription when leaving the page.
   * @returns Nothing.
   */
  ngOnDestroy(): void {
    this.destroyed = true;

    if (this.resultsChannel) {
      void this.supabaseService.client.removeChannel(
        this.resultsChannel
      );
      this.resultsChannel = undefined;
    }
  }
}
