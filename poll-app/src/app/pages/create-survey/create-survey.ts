
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

  categories = [
    'Technology',
    'Work',
    'Education',
    'Events',
    'Lifestyle',
    'Other'
  ];

  readonly maxQuestions = 10;
  readonly maxSurveyNameLength = 150;
  readonly maxDescriptionLength = 1000;
  readonly maxQuestionLength = 250;
  readonly maxAnswerLength = 200;

  isPublishing = signal(false);
  publishSuccess = signal(false);
  publishedSurveyId = signal<string | null>(null);

  questions = signal<SurveyQuestion[]>([
    {
      id: 1,
      title: '',
      allowMultiple: false,
      answers: ['', '']
    }
  ]);

  submitted = signal(false);
  errorMessage = signal('');

  private nextQuestionId = 2;

  constructor(
    private supabase: Supabase,
    private router: Router
  ) {}

  addQuestion(): void {
    if (this.questions().length >= this.maxQuestions) return;

    this.questions.update(questions => [
      ...questions,
      {
        id: this.nextQuestionId++,
        title: '',
        allowMultiple: false,
        answers: ['', '']
      }
    ]);
    this.refreshValidation();
  }

  removeQuestion(id: number): void {
    if (this.questions().length <= 1) return;

    this.questions.update(questions =>
      questions.filter(question => question.id !== id)
    );
    this.refreshValidation();
  }

  addAnswer(questionId: number): void {
    this.questions.update(questions =>
      questions.map(question =>
        question.id === questionId && question.answers.length < 6
          ? { ...question, answers: [...question.answers, ''] }
          : question
      )
    );
    this.refreshValidation();
  }

  removeAnswer(questionId: number, answerIndex: number): void {
    this.questions.update(questions =>
      questions.map(question =>
        question.id === questionId && question.answers.length > 2
          ? {
              ...question,
              answers: question.answers.filter((_, i) => i !== answerIndex)
            }
          : question
      )
    );
    this.refreshValidation();
  }

  updateQuestionTitle(id: number, title: string): void {
    this.questions.update(questions =>
      questions.map(question =>
        question.id === id ? { ...question, title } : question
      )
    );
    this.refreshValidation();
  }

  updateMultipleChoice(id: number, allowMultiple: boolean): void {
    this.questions.update(questions =>
      questions.map(question =>
        question.id === id ? { ...question, allowMultiple } : question
      )
    );
  }

  updateAnswer(id: number, index: number, value: string): void {
    this.questions.update(questions =>
      questions.map(question =>
        question.id === id
          ? {
              ...question,
              answers: question.answers.map((answer, i) =>
                i === index ? value : answer
              )
            }
          : question
      )
    );
    this.refreshValidation();
  }

  clearSurveyName(): void {
    this.surveyName = '';
    this.refreshValidation();
  }

  clearDescription(): void {
    this.description = '';
    this.refreshValidation();
  }

  clearEndDate(): void {
    this.endDate = '';
    this.refreshValidation();
  }

  isEmpty(value: string): boolean {
    return !value.trim();
  }

  isTextInvalid(value: string, maxLength: number): boolean {
    const length = value.trim().length;
    return length === 0 || length > maxLength;
  }

  isDescriptionInvalid(): boolean {
    return this.description.length > this.maxDescriptionLength;
  }

  isCategoryInvalid(): boolean {
    return !this.categories.includes(this.category);
  }

  isEndDateInvalid(): boolean {
    if (!this.endDate) return false;

    const selected = new Date(`${this.endDate}T23:59:59`);
    return Number.isNaN(selected.getTime()) ||
      selected.getTime() <= Date.now();
  }

  isQuestionInvalid(questionId: number): boolean {
    const question = this.questions().find(item => item.id === questionId);
    return !question ||
      this.isTextInvalid(question.title, this.maxQuestionLength);
  }

  isAnswerInvalid(questionId: number, index: number): boolean {
    const question = this.questions().find(item => item.id === questionId);
    return !question ||
      this.isTextInvalid(question.answers[index] ?? '', this.maxAnswerLength);
  }

  areQuestionsValid(): boolean {
    return this.questions().every(question =>
      !this.isQuestionInvalid(question.id) &&
      question.answers.length >= 2 &&
      question.answers.length <= 6 &&
      question.answers.every((_, index) =>
        !this.isAnswerInvalid(question.id, index)
      )
    );
  }

  isFormValid(): boolean {
    if (this.isTextInvalid(this.surveyName, this.maxSurveyNameLength)) return false;
    if (this.isDescriptionInvalid() || this.isCategoryInvalid()) return false;
    if (this.isEndDateInvalid()) return false;
    if (this.questions().length < 1 || this.questions().length > 10) return false;
    return this.areQuestionsValid();
  }

  refreshValidation(): void {
    if (!this.submitted()) return;

    this.errorMessage.set(
      this.isFormValid() ? '' : 'Please check the highlighted fields.'
    );
  }

  focusFirstInvalidField(): void {
    const form = this.surveyForm?.nativeElement;
    const field = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
    field?.focus();
    field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

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

  closeSuccessNotification(): void {
    this.publishSuccess.set(false);
  }

  openPublishedSurvey(): void {
    const id = this.publishedSurveyId();
    if (id) this.router.navigate(['/survey', id]);
  }

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
