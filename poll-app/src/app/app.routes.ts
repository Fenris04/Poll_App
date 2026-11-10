
import { Routes } from '@angular/router';
import { App } from './app';
import { SurveyDetail } from './pages/survey-detail/survey-detail';

export const routes: Routes = [
  {
    path: 'survey/:id',
    component: SurveyDetail
  }
];
