
import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';

import {
  Supabase,
  Survey,
  SurveyQuestion,
  SurveyOption,
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
  survey = signal<Survey | null>(null);
  options = signal<SurveyOption[]>([]);
  questions = signal<SurveyQuestion[]>([]);
  results = signal<SurveyResult[]>([]);

  loading = signal(true);
  submitting = signal(false);
  voteSubmitted = signal(false);
  alreadyParticipated = signal(false);
  participationLoading = signal(true);
  validationStarted = signal(false);

  errorMessage = signal('');
  voteMessage = signal('');
  selectedAnswers = signal<Record<string, string[]>>({});

  private currentTime = signal(Date.now());
  private expirationTimer?: ReturnType<typeof setInterval>;
  private resultsChannel?: RealtimeChannel;
  private destroyed = false;

  isExpired = computed(() => {
    const endDate = this.survey()?.end_date;
    if (!endDate) return false;

    const expiration = this.getExpirationTime(endDate);
    return expiration !== null && this.currentTime() > expiration;
  });

  allQuestionsAnswered = computed(() => {
    const questions = this.questions();
    const selected = this.selectedAnswers();

    return questions.length > 0 && questions.every(
      question => (selected[question.id] ?? []).length > 0
    );
  });

  cannotVote = computed(() =>
    this.isExpired() ||
    this.alreadyParticipated() ||
    this.participationLoading() ||
    this.submitting() ||
    this.voteSubmitted()
  );

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
    this.startExpirationTimer();

    if (!id) {
      this.errorMessage.set('Survey ID is missing.');
      this.loading.set(false);
      return;
    }

    void this.loadSurvey(id);
  }

  /**
   * Updates the current time to detect expired surveys.
   * @returns Nothing.
   */
  private startExpirationTimer(): void {
    this.expirationTimer = setInterval(() => {
      this.currentTime.set(Date.now());
    }, 1000);
  }

  /**
   * Converts an end date into an expiration timestamp.
   * @param endDate Survey end date.
   * @returns Timestamp or null for invalid dates.
   */
  private getExpirationTime(endDate: string): number | null {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(endDate);
    const date = dateOnly
      ? new Date(`${endDate}T23:59:59.999`)
      : new Date(endDate);

    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }

  /**
   * Checks expiration against the current clock.
   * @returns True when the survey has expired.
   */
  private hasSurveyExpiredNow(): boolean {
    const endDate = this.survey()?.end_date;
    if (!endDate) return false;

    const expiration = this.getExpirationTime(endDate);
    return expiration !== null && Date.now() > expiration;
  }

  /**
   * Loads the survey and its participation state.
   * @param id Survey ID.
   * @returns A promise resolving after loading.
   */
  async loadSurvey(id: string): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    this.participationLoading.set(true);

    try {
      await this.fetchSurveyData(id);
      if (this.destroyed) return;
      await this.loadParticipation(id);
      if (this.destroyed) return;
      await this.loadResults(id);
      if (!this.destroyed) this.subscribeToResults(id);
    } catch (error) {
      console.error('Failed to load survey:', error);
      if (!this.destroyed) {
        this.errorMessage.set('Survey could not be loaded.');
      }
    } finally {
      if (!this.destroyed) {
        this.participationLoading.set(false);
        this.loading.set(false);
      }
    }
  }

  /**
   * Retrieves the survey, questions and answer options.
   * @param id Survey ID.
   * @returns A promise resolving after retrieval.
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
   * Checks whether the browser already participated.
   * @param id Survey ID.
   * @returns A promise resolving after the check.
   */
  private async loadParticipation(id: string): Promise<void> {
    const participated = await this.supabaseService.hasParticipated(id);

    if (!this.destroyed) {
      this.alreadyParticipated.set(participated);
    }
  }

  /**
   * Returns the answer options belonging to a question.
   * @param questionId Question ID.
   * @returns Options for the question.
   */
  getOptionsForQuestion(questionId: string): SurveyOption[] {
    return this.options().filter(
      option => option.question_id === questionId
    );
  }

  /**
   * Checks whether an option is selected.
   * @param questionId Question ID.
   * @param optionId Option ID.
   * @returns True if selected.
   */
  isSelected(questionId: string, optionId: string): boolean {
    return (this.selectedAnswers()[questionId] ?? []).includes(optionId);
  }

  /**
   * Checks whether a question needs an error message.
   * @param questionId Question ID.
   * @returns True if the question is unanswered.
   */
  showQuestionError(questionId: string): boolean {
    return this.validationStarted() &&
      !this.cannotVote() &&
      (this.selectedAnswers()[questionId] ?? []).length === 0;
  }

  /**
   * Updates the selected answers for a question.
   * @param question Question being answered.
   * @param optionId Selected option ID.
   * @returns Nothing.
   */
  selectAnswer(question: SurveyQuestion, optionId: string): void {
    if (this.cannotVote() || this.hasSurveyExpiredNow()) return;

    this.validationStarted.set(true);

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
   * Toggles an answer in a multiple-choice selection.
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
   * @returns Selected option IDs.
   */
  getSelectedOptionIds(): string[] {
    return Object.values(this.selectedAnswers()).flat();
  }

  /**
   * Checks whether a preview should be displayed.
   * @returns True when unsent selections can be previewed.
   */
  private canPreviewVote(): boolean {
    return !this.cannotVote() && !this.hasSurveyExpiredNow();
  }

  /**
   * Returns the saved vote count for an answer option.
   * @param optionId Answer option ID.
   * @returns Number of saved votes.
   */
  getSavedVoteCount(optionId: string): number {
    return Number(
      this.results().find(result => result.option_id === optionId)
        ?.vote_count ?? 0
    );
  }

  /**
   * Returns saved votes including the current selection.
   * @param optionId Answer option ID.
   * @param voteCount Number of saved votes.
   * @returns Vote count including the unsent selection.
   */
  getPreviewVoteCount(optionId: string, voteCount: number): number {
    const selected = this.getSelectedOptionIds();
    const previewVote = this.canPreviewVote() && selected.includes(optionId)
      ? 1
      : 0;

    return Number(voteCount) + previewVote;
  }

  /**
   * Calculates the percentage including unsent selections.
   * @param questionId Question ID.
   * @param optionId Answer option ID.
   * @param voteCount Number of saved votes.
   * @returns Rounded preview percentage.
   */
  getPreviewPercentage(
    questionId: string,
    optionId: string,
    voteCount: number
  ): number {
    const selected = this.selectedAnswers()[questionId] ?? [];
    const previewCount = this.canPreviewVote() ? selected.length : 0;
    const total = this.getTotalVotes(questionId) + previewCount;

    if (total === 0) return 0;

    return Math.round(
      (this.getPreviewVoteCount(optionId, voteCount) / total) * 100
    );
  }

  /**
   * Validates and submits the selected answers.
   * @returns A promise resolving after submission.
   */
  async completeSurvey(): Promise<void> {
    const surveyId = this.survey()?.id;
    if (!surveyId || this.cannotVote()) return;

    this.validationStarted.set(true);
    if (this.hasSurveyExpiredNow()) return;
    if (!this.allQuestionsAnswered()) return;

    this.voteMessage.set('');
    this.submitting.set(true);
    await this.submitAnswers(surveyId);
  }

  /**
   * Sends the selected answers to Supabase.
   * @param surveyId Survey ID.
   * @returns A promise resolving after submission.
   */
  private async submitAnswers(surveyId: string): Promise<void> {
    try {
      if (this.hasSurveyExpiredNow()) return;

      await this.supabaseService.submitVote(
        surveyId,
        this.getSelectedOptionIds()
      );

      if (this.destroyed) return;

      this.voteSubmitted.set(true);
      this.alreadyParticipated.set(true);
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
   * @param error Submission error.
   * @returns Nothing.
   */
  private handleVoteError(error: unknown): void {
    console.error('Failed to submit vote:', error);
    if (this.destroyed) return;

    const message = error instanceof Error ? error.message : '';

    if (message.includes('Already participated')) {
      this.alreadyParticipated.set(true);
      this.voteMessage.set('You have already completed this survey.');
      return;
    }

    if (message.includes('Survey has expired')) {
      this.currentTime.set(Date.now());
      this.voteMessage.set('This survey has ended.');
      return;
    }

    this.voteMessage.set(
      'Your answers could not be submitted. Please try again.'
    );
  }

  /**
   * Loads the latest survey results.
   * @param surveyId Survey ID.
   * @returns A promise resolving after loading.
   */
  async loadResults(surveyId: string): Promise<void> {
    try {
      const results = await this.supabaseService.getSurveyResults(surveyId);

      if (!this.destroyed) {
        this.results.set(results);
      }
    } catch (error) {
      console.error('Failed to load results:', error);
    }
  }

  /**
   * Calculates the total votes for one question.
   * @param questionId Question ID.
   * @returns Total votes for the question.
   */
  getTotalVotes(questionId: string): number {
    return this.results()
      .filter(result => result.question_id === questionId)
      .reduce((total, result) => total + Number(result.vote_count), 0);
  }

  /**
   * Calculates the total selected answers.
   * @returns Total votes across all questions.
   */
  getTotalVotesForSurvey(): number {
    return this.results().reduce(
      (total, result) => total + Number(result.vote_count),
      0
    );
  }

  /**
   * Calculates an answer option's saved vote percentage.
   * @param questionId Question ID.
   * @param voteCount Votes for the option.
   * @returns Rounded percentage.
   */
  getVotePercentage(questionId: string, voteCount: number): number {
    const total = this.getTotalVotes(questionId);
    if (total === 0) return 0;

    return Math.round((Number(voteCount) / total) * 100);
  }

  /**
   * Subscribes to live updates for the survey results.
   * @param surveyId Survey ID.
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
   * Cleans up subscriptions and timers.
   * @returns Nothing.
   */
  ngOnDestroy(): void {
    this.destroyed = true;

    if (this.expirationTimer) {
      clearInterval(this.expirationTimer);
    }

    if (this.resultsChannel) {
      void this.supabaseService.client.removeChannel(
        this.resultsChannel
      );

      this.resultsChannel = undefined;
    }
  }
}
