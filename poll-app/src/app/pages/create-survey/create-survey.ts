
import { Component, ElementRef, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

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

  addQuestion(): void {
    this.questions.update(questions => [
      ...questions,
      {
        id: this.nextQuestionId++,
        title: '',
        allowMultiple: false,
        answers: ['', '']
      }
    ]);
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
  }

  clearEndDate(): void {
    this.endDate = '';
    this.refreshValidation();
  }

  isEmpty(value: string): boolean {
    return !value.trim();
  }

  isEndDateInvalid(): boolean {
    if (!this.endDate) return false;

    const selected = new Date(`${this.endDate}T23:59:59`);
    return Number.isNaN(selected.getTime()) ||
      selected.getTime() <= Date.now();
  }

  isQuestionInvalid(questionId: number): boolean {
    const question = this.questions().find(item => item.id === questionId);
    return !question || this.isEmpty(question.title);
  }

  isAnswerInvalid(questionId: number, index: number): boolean {
    const question = this.questions().find(item => item.id === questionId);
    return !question || this.isEmpty(question.answers[index] ?? '');
  }

  isFormValid(): boolean {
    if (this.isEmpty(this.surveyName) || !this.category) return false;
    if (this.isEndDateInvalid()) return false;

    return this.questions().every(question =>
      !this.isQuestionInvalid(question.id) &&
      question.answers.length >= 2 &&
      question.answers.length <= 6 &&
      question.answers.every((_, index) =>
        !this.isAnswerInvalid(question.id, index)
      )
    );
  }

  refreshValidation(): void {
    if (!this.submitted()) return;

    this.errorMessage.set(
      this.isFormValid() ? '' : 'Please complete all required fields.'
    );
  }

  focusFirstInvalidField(): void {
    const form = this.surveyForm?.nativeElement;
    const field = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
    field?.focus();
    field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  publishSurvey(): void {
    this.submitted.set(true);

    if (!this.isFormValid()) {
      this.errorMessage.set('Please complete all required fields.');
      this.focusFirstInvalidField();
      return;
    }

    this.errorMessage.set('');
    console.log('Valid survey draft:', this.getSurveyDraft());
  }

  getSurveyDraft() {
    return {
      title: this.surveyName.trim(),
      description: this.description.trim(),
      endDate: this.endDate,
      category: this.category,
      questions: this.questions()
    };
  }
}
