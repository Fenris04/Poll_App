
import { Component, computed, OnInit, signal } from '@angular/core';
import { Supabase } from '../../services/supabase';
import { Header } from '../../components/header/header';
import { Hero } from '../../components/hero/hero';
import { SurveyCard, Survey } from '../../components/survey-card/survey-card';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Header, Hero, SurveyCard],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit {
  surveys = signal<Survey[]>([]);
  selectedTab = signal<'active' | 'past'>('active');
  selectedCategory = signal('All categories');
  isLoading = signal(true);
  errorMessage = signal('');

  private currentTime = signal(Date.now());

  /**
   * Creates the home component with the Supabase service.
   * @param supabaseService Service for accessing surveys.
   */
  constructor(private supabaseService: Supabase) {}

  /**
   * Loads surveys when the component initializes.
   * @returns A promise that resolves after initialization.
   */
  async ngOnInit(): Promise<void> {
    await this.loadSurveys();
  }

  /**
   * Retrieves surveys from Supabase and updates the page state.
   * @returns A promise that resolves when loading finishes.
   */
  async loadSurveys(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      this.surveys.set(await this.supabaseService.getSurveys());
      this.currentTime.set(Date.now());
    } catch (error) {
      console.error('Survey request failed:', error);
      this.errorMessage.set('Unable to load surveys.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Returns surveys ending within the next seven days.
   */
  endingSoonSurveys = computed(() => {
    const now = this.currentTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    return this.surveys().filter(survey => {
      if (!survey.end_date) return false;
      const remaining = new Date(survey.end_date).getTime() - now;
      return remaining > 0 && remaining <= sevenDays;
    });
  });

  /**
   * Returns surveys that have not expired.
   */
  activeSurveys = computed(() => {
    const now = this.currentTime();

    return this.surveys().filter(survey =>
      !survey.end_date || new Date(survey.end_date).getTime() > now
    );
  });

  /**
   * Returns surveys whose end dates have passed.
   */
  pastSurveys = computed(() => {
    const now = this.currentTime();

    return this.surveys().filter(survey =>
      !!survey.end_date && new Date(survey.end_date).getTime() <= now
    );
  });

  /**
   * Returns the available survey categories.
   */
  categories = computed(() => {
    const names = this.surveys()
      .map(survey => survey.category)
      .filter((category): category is string => !!category);

    return ['All categories', ...new Set(names)];
  });

  /**
   * Returns surveys matching the selected tab and category.
   */
  displayedSurveys = computed(() => {
    const surveys = this.selectedTab() === 'active'
      ? this.activeSurveys()
      : this.pastSurveys();

    if (this.selectedCategory() === 'All categories') return surveys;

    return surveys.filter(survey =>
      survey.category === this.selectedCategory()
    );
  });

  /**
   * Updates the selected category from the dropdown.
   * @param event Change event from the category selector.
   * @returns Nothing.
   */
  onCategoryChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedCategory.set(select.value);
  }
}
