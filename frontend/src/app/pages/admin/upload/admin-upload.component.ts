import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';

interface UploadHistoryItem {
  fileName: string;
  timeAgo: string;
  status: 'Done' | 'Processing...';
  type: 'pdf' | 'csv';
}

interface PendingNeed {
  title: string;
  location: string;
  timeInfo: string;
  type: 'education' | 'medical';
  actionType: 'View Details' | 'None';
  urgency?: 'URGENT';
  score?: number;
}

@Component({
  selector: 'app-admin-upload',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    MatCardModule, 
    MatTabsModule, 
    MatButtonModule,
    MatTableModule
  ],
  templateUrl: './admin-upload.component.html',
  styleUrl: './admin-upload.component.scss'
})
export class AdminUploadComponent {
  
  uploadHistory: UploadHistoryItem[] = [
    { fileName: 'Health_Report_Area_A.pdf', timeAgo: '10 minutes ago', status: 'Done', type: 'pdf' },
    { fileName: 'Water_Supply_Log.csv', timeAgo: '20 minutes ago', status: 'Processing...', type: 'csv' },
    { fileName: 'Village_B_Education_Data.csv', timeAgo: '20 minutes ago', status: 'Done', type: 'csv' },
    { fileName: 'Emergency_Report.pdf', timeAgo: '1 hour ago', status: 'Done', type: 'pdf' },
    { fileName: 'Monthly_Hygiene_Survey.pdf', timeAgo: '1 hour ago', status: 'Done', type: 'pdf' }
  ];

  pendingNeeds: PendingNeed[] = [
    {
      title: 'Provide Educational Aid',
      location: 'Community C - Suburban Area',
      timeInfo: '20 minutes ago',
      type: 'education',
      actionType: 'View Details'
    },
    {
      title: 'Assist in Medical Emergency',
      location: 'Area A - Slums',
      timeInfo: 'Scheduled for today at 4:00 PM',
      type: 'medical',
      actionType: 'None',
      urgency: 'URGENT',
      score: 92
    }
  ];

}
