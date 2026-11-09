
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Supabase } from './services/supabase';
import { Header } from './components/header/header';
import { Hero } from './components/hero/hero';
import { SurveyCard } from './components/survey-card/survey-card';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Hero, SurveyCard],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('poll-app');

  surveys: any[] = [];
  surveyOptions: any[] = [];

  constructor(private supabaseService: Supabase) {
    this.loadSurveys();
  }

  async loadSurveys() {
    try {
      this.surveys = await this.supabaseService.getSurveys();
      console.log('Surveys from Supabase:', this.surveys);
      await this.loadFirstSurveyOptions();
    } catch (error) {
      console.error('Failed to load surveys:', error);
    }
  }

  async loadFirstSurveyOptions() {
    if (this.surveys.length === 0) return;

    this.surveyOptions = await this.supabaseService
      .getSurveyOptions(this.surveys[0].id);

    console.log('Survey options:', this.surveyOptions);
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
}
