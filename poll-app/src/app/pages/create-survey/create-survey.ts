
import {
  Component,
  ElementRef,
  signal,
  ViewChild
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Supabase } from '../../services/supabase';

interface SurveyQuestion {
  id: number;
  title: string;
  allowMultiple: boolean;
  answers: string[];
}

@Component({
  selector: 'app-create-survey',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss'
})
export class CreateSurvey {
  @ViewChild('surveyForm')
  surveyForm?: ElementRef<HTMLFormElement>;

  surveyName = '';
  description = '';
  endDate = '';
  category = '';

  readonly categories = [
    'Technology',
    'Work',
    'Education',
    'Events',
    'Lifestyle',
    'Other'
  ];

  readonly maxQuestions = 10;
  readonly maxAnswers = 6;
  readonly minAnswers = 2;

  readonly maxSurveyNameLength = 30;
  readonly maxDescriptionLength = 200;
  readonly maxQuestionLength = 50;
  readonly maxAnswerLength = 100;

  isPublishing = signal(false);
  publishSuccess = signal(false);
  successDismissed = signal(false);
  submitted = signal(false);
  errorMessage = signal('');

  questions = signal<SurveyQuestion[]>([
    {
      id: 1,
      title: '',
      allowMultiple: false,
      answers: ['', '']
    }
  ]);

  private nextQuestionId = 2;

  constructor(private supabase: Supabase) {}

  /**
   * Creates an empty survey question.
   * @returns A question with two empty answers.
   */
  private createEmptyQuestion(): SurveyQuestion {
    return {
      id: this.nextQuestionId++,
      title: '',
      allowMultiple: false,
      answers: ['', '']
    };
  }

  /**
   * Updates one question without mutating the signal.
   * @param id Question ID.
   * @param update Transformation for the matching question.
   */
  private updateQuestion(
    id: number,
    update: (question: SurveyQuestion) => SurveyQuestion
  ): void {
    this.questions.update(questions =>
      questions.map(question =>
        question.id === id ? update(question) : question
      )
    );
  }

  /**
   * Restricts a text value to the specified length.
   * @param value Entered text.
   * @param maxLength Maximum number of characters.
   * @returns Limited text.
   */
  private limitText(value: string, maxLength: number): string {
    return value.slice(0, maxLength);
  }

  /**
   * Updates the survey name and applies its limit.
   * @param value Entered survey name.
   */
  updateSurveyName(value: string): void {
    this.surveyName = this.limitText(value, this.maxSurveyNameLength);
    this.refreshValidation();
  }

  /**
   * Updates the description and applies its limit.
   * @param value Entered description.
   */
  updateDescription(value: string): void {
    this.description = this.limitText(value, this.maxDescriptionLength);
    this.refreshValidation();
  }

  /**
   * Adds a new question if fewer than ten exist.
   */
  addQuestion(): void {
    if (this.questions().length >= this.maxQuestions) return;

    this.questions.update(questions => [
      ...questions,
      this.createEmptyQuestion()
    ]);

    this.refreshValidation();
  }

  /**
   * Removes a question while retaining at least one.
   * @param id Question ID.
   */
  removeQuestion(id: number): void {
    if (this.questions().length <= 1) return;

    this.questions.update(questions =>
      questions.filter(question => question.id !== id)
    );

    this.refreshValidation();
  }

  /**
   * Adds an answer if the maximum has not been reached.
   * @param questionId Question ID.
   */
  addAnswer(questionId: number): void {
    this.updateQuestion(questionId, question => ({
      ...question,
      answers: question.answers.length < this.maxAnswers
        ? [...question.answers, '']
        : question.answers
    }));

    this.refreshValidation();
  }

  /**
   * Removes an answer while retaining at least two.
   * @param questionId Question ID.
   * @param answerIndex Answer index.
   */
  removeAnswer(questionId: number, answerIndex: number): void {
    this.updateQuestion(questionId, question => ({
      ...question,
      answers: question.answers.length > this.minAnswers
        ? question.answers.filter((_, index) => index !== answerIndex)
        : question.answers
    }));

    this.refreshValidation();
  }

  /**
   * Updates a question title within its character limit.
   * @param id Question ID.
   * @param title Entered question title.
   */
  updateQuestionTitle(id: number, title: string): void {
    const limitedTitle = this.limitText(title, this.maxQuestionLength);

    this.updateQuestion(id, question => ({
      ...question,
      title: limitedTitle
    }));

    this.refreshValidation();
  }

  /**
   * Enables or disables multiple-choice answers.
   * @param id Question ID.
   * @param allowMultiple Whether multiple answers are allowed.
   */
  updateMultipleChoice(id: number, allowMultiple: boolean): void {
    this.updateQuestion(id, question => ({
      ...question,
      allowMultiple
    }));
  }

  /**
   * Updates an answer within its character limit.
   * @param id Question ID.
   * @param index Answer index.
   * @param value Entered answer.
   */
  updateAnswer(id: number, index: number, value: string): void {
    const limitedValue = this.limitText(value, this.maxAnswerLength);

    this.updateQuestion(id, question => ({
      ...question,
      answers: question.answers.map((answer, answerIndex) =>
        answerIndex === index ? limitedValue : answer
      )
    }));

    this.refreshValidation();
  }

  /**
   * Clears the survey name.
   */
  clearSurveyName(): void {
    this.surveyName = '';
    this.refreshValidation();
  }

  /**
   * Clears the description.
   */
  clearDescription(): void {
    this.description = '';
    this.refreshValidation();
  }

  /**
   * Clears the end date.
   */
  clearEndDate(): void {
    this.endDate = '';
    this.refreshValidation();
  }

  /**
   * Checks whether required text is empty or too long.
   * @param value Text to validate.
   * @param maxLength Maximum permitted length.
   * @returns True when invalid.
   */
  isTextInvalid(value: string, maxLength: number): boolean {
    const length = value.trim().length;
    return length === 0 || length > maxLength;
  }

  /**
   * Checks the optional description's length.
   * @returns True when the description is too long.
   */
  isDescriptionInvalid(): boolean {
    return this.description.length > this.maxDescriptionLength;
  }

  /**
   * Checks whether the category is supported.
   * @returns True when invalid.
   */
  isCategoryInvalid(): boolean {
    return !this.categories.includes(this.category);
  }

  /**
   * Checks whether the end date is valid and in the future.
   * @returns True when invalid.
   */
  isEndDateInvalid(): boolean {
    if (!this.endDate) return false;

    const selected = new Date(`${this.endDate}T23:59:59`);

    return Number.isNaN(selected.getTime()) ||
      selected.getTime() <= Date.now();
  }

  /**
   * Checks a question title.
   * @param questionId Question ID.
   * @returns True when invalid.
   */
  isQuestionInvalid(questionId: number): boolean {
    const question = this.questions().find(
      item => item.id === questionId
    );

    return !question ||
      this.isTextInvalid(question.title, this.maxQuestionLength);
  }

  /**
   * Checks an answer.
   * @param questionId Question ID.
   * @param index Answer index.
   * @returns True when invalid.
   */
  isAnswerInvalid(questionId: number, index: number): boolean {
    const question = this.questions().find(
      item => item.id === questionId
    );

    return !question ||
      this.isTextInvalid(
        question.answers[index] ?? '',
        this.maxAnswerLength
      );
  }

  /**
   * Checks whether the answer count is permitted.
   * @param question Question to validate.
   * @returns True when valid.
   */
  private hasValidAnswerCount(question: SurveyQuestion): boolean {
    return question.answers.length >= this.minAnswers &&
      question.answers.length <= this.maxAnswers;
  }

  /**
   * Validates every question and answer.
   * @returns True when all questions are valid.
   */
  areQuestionsValid(): boolean {
    return this.questions().every(question =>
      !this.isQuestionInvalid(question.id) &&
      this.hasValidAnswerCount(question) &&
      question.answers.every((_, index) =>
        !this.isAnswerInvalid(question.id, index)
      )
    );
  }

  /**
   * Validates the complete survey.
   * @returns True when all fields are valid.
   */
  isFormValid(): boolean {
    if (this.isTextInvalid(this.surveyName, this.maxSurveyNameLength)) {
      return false;
    }

    if (this.isDescriptionInvalid() || this.isCategoryInvalid()) {
      return false;
    }

    if (this.isEndDateInvalid()) return false;

    const count = this.questions().length;
    if (count < 1 || count > this.maxQuestions) return false;

    return this.areQuestionsValid();
  }

  /**
   * Refreshes validation after the first publish attempt.
   */
  refreshValidation(): void {
    if (!this.submitted()) return;

    this.errorMessage.set(
      this.isFormValid()
        ? ''
        : 'Please check the highlighted fields.'
    );
  }

  /**
   * Focuses the first invalid input.
   */
  focusFirstInvalidField(): void {
    const form = this.surveyForm?.nativeElement;
    const field = form?.querySelector<HTMLElement>(
      '[aria-invalid="true"]'
    );

    field?.focus();
    field?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  /**
   * Validates and publishes the survey.
   */
  async publishSurvey(): Promise<void> {
    if (this.isPublishing() || this.publishSuccess()) return;

    this.submitted.set(true);

    if (!this.isFormValid()) {
      this.errorMessage.set('Please check the highlighted fields.');
      this.focusFirstInvalidField();
      return;
    }

    this.errorMessage.set('');
    this.isPublishing.set(true);

    await this.saveSurvey();
  }

  /**
   * Saves the survey in Supabase.
   */
  private async saveSurvey(): Promise<void> {
    try {
      await this.supabase.createSurvey(this.getSurveyDraft());

      this.publishSuccess.set(true);
      this.successDismissed.set(false);
    } catch (error) {
      console.error('Error publishing survey:', error);
      this.errorMessage.set('Publishing failed. Please try again.');
    } finally {
      this.isPublishing.set(false);
    }
  }

  /**
   * Hides the success notification without allowing another publish.
   */
  closeSuccessNotification(): void {
    this.successDismissed.set(true);
  }

  /**
   * Creates the survey payload for Supabase.
   * @returns Survey data ready for publishing.
   */
  getSurveyDraft() {
    return {
      title: this.surveyName.trim(),
      description: this.description.trim(),
      endDate: this.endDate,
      category: this.category,
      questions: this.questions().map(question => ({
        title: question.title.trim(),
        allowMultiple: question.allowMultiple,
        answers: question.answers.map(answer => answer.trim())
      }))
    };
  }
}
