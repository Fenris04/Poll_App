
import { Component } from '@angular/core';
import { Supabase } from '../../services/supabase';
import { Header } from '../../components/header/header';
import { Hero } from '../../components/hero/hero';
import { SurveyCard } from '../../components/survey-card/survey-card';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Header, Hero, SurveyCard],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  surveys: any[] = [];
  surveyOptions: any[] = [];
  selectedTab: 'active' | 'past' = 'active';
  selectedCategory = 'All categories';

  constructor(private supabaseService: Supabase) {
    this.loadSurveys();
  }

  async loadSurveys() {
    try {
      this.surveys = await this.supabaseService.getSurveys();
      await this.loadFirstSurveyOptions();
    } catch (error) {
      console.error('Failed to load surveys:', error);
    }
  }

  async loadFirstSurveyOptions() {
    if (this.surveys.length === 0) return;
    this.surveyOptions = await this.supabaseService
      .getSurveyOptions(this.surveys[0].id);
  }

  get endingSoonSurveys() {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    return this.surveys.filter(survey => {
      if (!survey.end_date) return false;
      const remaining = new Date(survey.end_date).getTime() - now;
      return remaining > 0 && remaining <= sevenDays;
    });
  }

  get activeSurveys() {
    const now = Date.now();

    return this.surveys.filter(survey => {
      if (!survey.end_date) return true;
      return new Date(survey.end_date).getTime() > now;
    });
  }

  get pastSurveys() {
    const now = Date.now();

    return this.surveys.filter(survey => {
      if (!survey.end_date) return false;
      return new Date(survey.end_date).getTime() <= now;
    });
  }

  get categories(): string[] {
    const names = this.surveys
      .map(survey => survey.category)
      .filter((category): category is string => !!category);

    return ['All categories', ...new Set(names)];
  }

  get displayedSurveys() {
    const surveys = this.selectedTab === 'active'
      ? this.activeSurveys : this.pastSurveys;

    if (this.selectedCategory === 'All categories') return surveys;
    return surveys.filter(survey => survey.category === this.selectedCategory);
  }

  onCategoryChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedCategory = select.value;
  }
}
