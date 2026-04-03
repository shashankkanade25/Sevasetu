import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      // ===== Admin Routes =====
      {
        path: 'admin/dashboard',
        loadComponent: () =>
          import('./pages/admin/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
      },
      {
        path: 'admin/upload',
        loadComponent: () =>
          import('./pages/admin/upload/admin-upload.component').then(
            (m) => m.AdminUploadComponent
          ),
      },
      {
        path: 'admin/insights',
        loadComponent: () =>
          import('./pages/admin/insights/admin-insights.component').then(
            (m) => m.AdminInsightsComponent
          ),
      },
      {
        path: 'admin/recommendations',
        loadComponent: () =>
          import('./pages/admin/recommendations/admin-recommendations.component').then(
            (m) => m.AdminRecommendationsComponent
          ),
      },
      {
        path: 'admin/allocation',
        loadComponent: () =>
          import('./pages/admin/allocation/admin-allocation.component').then(
            (m) => m.AdminAllocationComponent
          ),
      },
      {
        path: 'admin/volunteers',
        loadComponent: () =>
          import('./pages/admin/volunteers/admin-volunteers.component').then(
            (m) => m.AdminVolunteersComponent
          ),
      },

      // ===== Volunteer Routes =====
      {
        path: 'volunteer/dashboard',
        loadComponent: () =>
          import('./pages/volunteer/dashboard/volunteer-dashboard.component').then(
            (m) => m.VolunteerDashboardComponent
          ),
      },
      {
        path: 'volunteer/tasks',
        loadComponent: () =>
          import('./pages/volunteer/tasks/volunteer-tasks.component').then(
            (m) => m.VolunteerTasksComponent
          ),
      },

      // ===== Default Redirect =====
      {
        path: '',
        redirectTo: 'admin/dashboard',
        pathMatch: 'full',
      },
    ],
  },

  // Catch-all fallback
  {
    path: '**',
    redirectTo: 'admin/dashboard',
  },
];
