
import { Component, ElementRef, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  @ViewChild('surveyForm') surveyForm?: ElementRef<HTMLFormElement>;

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
  readonly maxSurveyNameLength = 150;
  readonly maxDescriptionLength = 1000;
  readonly maxQuestionLength = 250;
  readonly maxAnswerLength = 200;

  isPublishing = signal(false);
  publishSuccess = signal(false);
  publishedSurveyId = signal<string | null>(null);
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

  constructor(
    private supabase: Supabase,
    private router: Router
  ) {}

  /**
   * Creates an empty survey question.
   *
   * @returns A new question with two empty answers.
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
   * Updates a question using the provided transformation.
   *
   * @param id - ID of the question to update.
   * @param update - Function that transforms the matching question.
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
   * Adds a new question if the maximum has not been reached.
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
   * Removes a question while keeping at least one question.
   *
   * @param id - ID of the question to remove.
   */
  removeQuestion(id: number): void {
    if (this.questions().length <= 1) return;

    this.questions.update(questions =>
      questions.filter(question => question.id !== id)
    );
    this.refreshValidation();
  }

  /**
   * Adds an empty answer to the selected question.
   *
   * @param questionId - ID of the question.
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
   * Removes an answer while keeping at least two answers.
   *
   * @param questionId - ID of the question.
   * @param answerIndex - Index of the answer to remove.
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
   * Updates the title of a question.
   *
   * @param id - ID of the question.
   * @param title - New question title.
   */
  updateQuestionTitle(id: number, title: string): void {
    this.updateQuestion(id, question => ({ ...question, title }));
    this.refreshValidation();
  }

  /**
   * Enables or disables multiple answers for a question.
   *
   * @param id - ID of the question.
   * @param allowMultiple - Whether multiple answers are allowed.
   */
  updateMultipleChoice(id: number, allowMultiple: boolean): void {
    this.updateQuestion(id, question => ({
      ...question,
      allowMultiple
    }));
  }

  /**
   * Updates a specific answer of a question.
   *
   * @param id - ID of the question.
   * @param index - Index of the answer.
   * @param value - New answer text.
   */
  updateAnswer(id: number, index: number, value: string): void {
    this.updateQuestion(id, question => ({
      ...question,
      answers: question.answers.map((answer, answerIndex) =>
        answerIndex === index ? value : answer
      )
    }));
    this.refreshValidation();
  }

  /**
   * Clears the survey name and refreshes validation.
   */
  clearSurveyName(): void {
    this.surveyName = '';
    this.refreshValidation();
  }

  /**
   * Clears the survey description and refreshes validation.
   */
  clearDescription(): void {
    this.description = '';
    this.refreshValidation();
  }

  /**
   * Clears the survey end date and refreshes validation.
   */
  clearEndDate(): void {
    this.endDate = '';
    this.refreshValidation();
  }

  /**
   * Checks whether a required text is empty or too long.
   *
   * @param value - Text to validate.
   * @param maxLength - Maximum allowed length.
   * @returns True if the text is invalid.
   */
  isTextInvalid(value: string, maxLength: number): boolean {
    const length = value.trim().length;
    return length === 0 || length > maxLength;
  }

  /**
   * Checks whether the optional description exceeds its limit.
   *
   * @returns True if the description is too long.
   */
  isDescriptionInvalid(): boolean {
    return this.description.length > this.maxDescriptionLength;
  }

  /**
   * Checks whether the selected category is valid.
   *
   * @returns True if the category is not available.
   */
  isCategoryInvalid(): boolean {
    return !this.categories.includes(this.category);
  }

  /**
   * Checks whether the selected end date is invalid or expired.
   *
   * @returns True if the date is invalid or in the past.
   */
  isEndDateInvalid(): boolean {
    if (!this.endDate) return false;

    const selected = new Date(`${this.endDate}T23:59:59`);
    return Number.isNaN(selected.getTime()) ||
      selected.getTime() <= Date.now();
  }

  /**
   * Checks whether a question has a valid title.
   *
   * @param questionId - ID of the question.
   * @returns True if the question is missing or invalid.
   */
  isQuestionInvalid(questionId: number): boolean {
    const question = this.questions().find(item => item.id === questionId);
    return !question ||
      this.isTextInvalid(question.title, this.maxQuestionLength);
  }

  /**
   * Checks whether an answer contains valid text.
   *
   * @param questionId - ID of the question.
   * @param index - Index of the answer.
   * @returns True if the answer is missing or invalid.
   */
  isAnswerInvalid(questionId: number, index: number): boolean {
    const question = this.questions().find(item => item.id === questionId);
    return !question ||
      this.isTextInvalid(question.answers[index] ?? '', this.maxAnswerLength);
  }

  /**
   * Checks whether a question has a valid number of answers.
   *
   * @param question - Question to validate.
   * @returns True if the answer count is valid.
   */
  private hasValidAnswerCount(question: SurveyQuestion): boolean {
    return question.answers.length >= this.minAnswers &&
      question.answers.length <= this.maxAnswers;
  }

  /**
   * Checks whether all questions and answers are valid.
   *
   * @returns True if every question is valid.
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
   * Checks whether the complete survey form is valid.
   *
   * @returns True if all required fields are valid.
   */
  isFormValid(): boolean {
    if (this.isTextInvalid(this.surveyName, this.maxSurveyNameLength)) return false;
    if (this.isDescriptionInvalid() || this.isCategoryInvalid()) return false;
    if (this.isEndDateInvalid()) return false;
    if (this.questions().length < 1 || this.questions().length > this.maxQuestions) return false;
    return this.areQuestionsValid();
  }

  /**
   * Refreshes the error message after a submitted form changes.
   */
  refreshValidation(): void {
    if (!this.submitted()) return;

    this.errorMessage.set(
      this.isFormValid() ? '' : 'Please check the highlighted fields.'
    );
  }

  /**
   * Focuses the first invalid form field.
   */
  focusFirstInvalidField(): void {
    const form = this.surveyForm?.nativeElement;
    const field = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
    field?.focus();
    field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /**
   * Validates the form and starts publishing the survey.
   *
   * @returns A promise that resolves when publishing finishes.
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
   * Saves the survey to Supabase and updates the publishing state.
   *
   * @returns A promise that resolves after the save attempt.
   */
  async saveSurvey(): Promise<void> {
    try {
      const surveyId = await this.supabase.createSurvey(this.getSurveyDraft());
      this.publishedSurveyId.set(surveyId);
      this.publishSuccess.set(true);
    } catch (error) {
      console.error('Error publishing survey:', error);
      this.errorMessage.set('Publishing failed. Please try again.');
    } finally {
      this.isPublishing.set(false);
    }
  }

  /**
   * Closes the success notification.
   */
  closeSuccessNotification(): void {
    this.publishSuccess.set(false);
  }

  /**
   * Navigates to the newly published survey.
   */
  openPublishedSurvey(): void {
    const id = this.publishedSurveyId();
    if (id) this.router.navigate(['/survey', id]);
  }

  /**
   * Creates a trimmed survey draft for the Supabase service.
   *
   * @returns The survey data ready to be published.
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
