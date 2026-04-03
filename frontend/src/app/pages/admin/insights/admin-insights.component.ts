import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-insights',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="placeholder-page">
      <mat-icon class="placeholder-icon">insights</mat-icon>
      <h2>Insights</h2>
      <p>Insights &amp; analytics coming soon...</p>
    </div>
  `,
  styles: [`
    .placeholder-page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; color: #64748B; }
    .placeholder-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px; color: #1A73E8; }
    h2 { font-size: 24px; font-weight: 600; margin: 0 0 8px; color: #1F2937; }
    p { font-size: 14px; margin: 0; }
  `]
})
export class AdminInsightsComponent {}
