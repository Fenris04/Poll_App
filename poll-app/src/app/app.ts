import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Supabase } from './services/supabase';
import { Header } from './components/header/header';
import { Hero } from './components/hero/hero';
import { SurveyCard } from './components/survey-card/survey-card';

@Component({
  imports: [RouterOutlet, Header, Hero, SurveyCard],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
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

      if (this.surveys.length > 0) {
        this.surveyOptions =
          await this.supabaseService.getSurveyOptions(
            this.surveys[0].id
          );

        console.log('Survey options:', this.surveyOptions);
      }
    } catch (error) {
      console.error('Failed to load surveys:', error);
    }
  }
}

