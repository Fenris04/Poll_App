import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Supabase } from './services/supabase';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('poll-app');

  
  constructor(private supabaseService: Supabase) {
    this.loadSurveys();
  }

  
  async loadSurveys() {
    try {
      const surveys = await this.supabaseService.getSurveys();

      console.log('Surveys from Supabase:', surveys);

      if (surveys && surveys.length > 0) {
        const firstSurvey = surveys[0];

        const options =
          await this.supabaseService.getSurveyOptions(firstSurvey.id);

        console.log('Survey options:', options);
      }
    } catch (error) {
      console.error('Failed to load surveys:', error);
    }
  }


}
