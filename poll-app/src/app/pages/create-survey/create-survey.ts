
import { Component, signal } from '@angular/core';
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
  }

  addAnswer(questionId: number): void {
    this.questions.update(questions =>
      questions.map(question =>
        question.id === questionId && question.answers.length < 6
          ? { ...question, answers: [...question.answers, ''] }
          : question
      )
    );
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
  }

  updateQuestionTitle(id: number, title: string): void {
    this.questions.update(questions =>
      questions.map(question =>
        question.id === id ? { ...question, title } : question
      )
    );
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
  }

  clearSurveyName(): void {
    this.surveyName = '';
  }

  clearDescription(): void {
    this.description = '';
  }

  clearEndDate(): void {
    this.endDate = '';
  }

  publishSurvey(): void {
    console.log('Survey draft:', {
      title: this.surveyName,
      description: this.description,
      endDate: this.endDate,
      category: this.category,
      questions: this.questions()
    });
  }
}
