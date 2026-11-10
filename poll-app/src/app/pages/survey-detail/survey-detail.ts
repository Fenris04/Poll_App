
import { Component, OnInit } from '@angular/core';
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
  survey: any = null;
  options: any[] = [];
  loading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private supabaseService: Supabase
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadSurvey(id);
    else {
      this.errorMessage = 'Survey ID is missing.';
      this.loading = false;
    }
  }

  async loadSurvey(id: string) {
    try {
      this.survey = await this.supabaseService.getSurveyById(id);
      this.options = await this.supabaseService.getSurveyOptions(id);
    } catch (error) {
      console.error('Failed to load survey:', error);
      this.errorMessage = 'Survey could not be loaded.';
    } finally {
      this.loading = false;
    }
  }
}
