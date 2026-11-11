
import { Component, computed, signal } from '@angular/core';
import { Supabase } from '../../services/supabase';
import { Header } from '../../components/header/header';
import { Hero } from '../../components/hero/hero';
import { SurveyCard, Survey } from '../../components/survey-card/survey-card';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Header, Hero, SurveyCard, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  surveys = signal<Survey[]>([]);
  selectedTab = signal<'active' | 'past'>('active');
  selectedCategory = signal('All categories');

  constructor(private supabaseService: Supabase) {
    this.loadSurveys();
  }

  
async loadSurveys() {
  console.log('1. Starting survey request');

  try {
    const surveys = await this.supabaseService.getSurveys();
    console.log('2. Surveys received:', surveys);
    this.surveys.set(surveys);
    console.log('3. Signal updated:', this.surveys());
  } catch (error) {
    console.error('4. Survey request failed:', error);
  }
}


  endingSoonSurveys = computed(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return this.surveys().filter(survey => {
      if (!survey.end_date) return false;
      const remaining = new Date(survey.end_date).getTime() - now;
      return remaining > 0 && remaining <= sevenDays;
    });
  });

  activeSurveys = computed(() => {
    const now = Date.now();
    return this.surveys().filter(survey =>
      !survey.end_date || new Date(survey.end_date).getTime() > now
    );
  });

  pastSurveys = computed(() => {
    const now = Date.now();
    return this.surveys().filter(survey =>
      !!survey.end_date && new Date(survey.end_date).getTime() <= now
    );
  });

  categories = computed(() => {
    const names = this.surveys()
      .map(survey => survey.category)
      .filter((category): category is string => !!category);
    return ['All categories', ...new Set(names)];
  });

  displayedSurveys = computed(() => {
    const surveys = this.selectedTab() === 'active'
      ? this.activeSurveys() : this.pastSurveys();
    if (this.selectedCategory() === 'All categories') return surveys;
    return surveys.filter(survey =>
      survey.category === this.selectedCategory()
    );
  });

  onCategoryChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedCategory.set(select.value);
  }
}
