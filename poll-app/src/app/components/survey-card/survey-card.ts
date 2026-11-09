
import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';

export interface Survey {
  id: string;
  title: string;
  category: string | null;
  end_date: string | null;
}

@Component({
  selector: 'app-survey-card',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './survey-card.html',
  styleUrl: './survey-card.scss'
})
export class SurveyCard {
  @Input({ required: true }) survey!: Survey;
}
