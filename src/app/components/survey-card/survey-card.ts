
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Survey {
  id: string;
  title: string;
  category: string | null;
  end_date: string | null;
}

@Component({
  selector: 'app-survey-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './survey-card.html',
  styleUrl: './survey-card.scss'
})
export class SurveyCard {
  @Input({ required: true }) survey!: Survey;
  @Input() compact = false;

  /**
   * Calculates the remaining days until the survey ends.
   * Returns null if the end date is missing or invalid.
   *
   * @returns The remaining days or null.
   */
  get daysRemaining(): number | null {
    if (!this.survey.end_date) return null;

    const endDate = new Date(this.survey.end_date).getTime();
    if (Number.isNaN(endDate)) return null;

    const difference = endDate - Date.now();
    return Math.max(0, Math.ceil(difference / 86400000));
  }

  /**
   * Returns a readable expiration message for the survey.
   *
   * @returns The expiration status as text.
   */
  get expirationText(): string {
    const days = this.daysRemaining;
    if (days === null) return 'No end date';
    if (days === 0) return 'Survey ended';
    if (days === 1) return 'Ends in 1 Day';
    return `Ends in ${days} Days`;
  }
}
