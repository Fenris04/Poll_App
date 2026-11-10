
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Supabase } from '../../services/supabase';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-survey-detail',
  standalone: true,
  imports: [Header, RouterLink],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss'
})
export class SurveyDetail implements OnInit {
  survey = signal<any>(null);
  options = signal<any[]>([]);
  loading = signal(true);
  errorMessage = signal('');

  constructor(
    private route: ActivatedRoute,
    private supabaseService: Supabase
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.loadSurvey(id);
    } else {
      this.errorMessage.set('Survey ID is missing.');
      this.loading.set(false);
    }
  }

  async loadSurvey(id: string) {
    try {
      const survey = await this.supabaseService.getSurveyById(id);
      this.survey.set(survey);
      const options = await this.supabaseService.getSurveyOptions(id);
      this.options.set(options);
    } catch (error) {
      console.error('Failed to load survey:', error);
      this.errorMessage.set('Survey could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
}
