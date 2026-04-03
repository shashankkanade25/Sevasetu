import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';

interface PriorityNeed {
  title: string;
  location: string;
  description: string;
  score: number;
  urgency: 'URGENT' | 'HIGH' | 'MEDIUM';
  icon: string;
  theme: 'red' | 'yellow' | 'blue' | 'green';
}

interface Action {
  text: string;
  score: number;
  icon: string;
  theme: 'red' | 'yellow' | 'blue' | 'green';
}

interface Volunteer {
  name: string;
  role: string;
  availability: string;
  score: number;
  avatarChar: string;
  theme: 'red' | 'yellow' | 'blue' | 'green' | 'purple';
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatCardModule, MatDividerModule, MatButtonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent {
  priorityNeeds: PriorityNeed[] = [
    {
      title: 'Medical Emergency',
      location: 'Area A - Slums',
      description: '48 reported cases of illness',
      score: 92,
      urgency: 'URGENT',
      icon: 'local_hospital',
      theme: 'red'
    },
    {
      title: 'Water Scarcity',
      location: 'Village B',
      description: 'Severe shortage, 200+ households affected',
      score: 87,
      urgency: 'HIGH',
      icon: 'water_drop',
      theme: 'yellow'
    },
    {
      title: 'Educational Aid Needed',
      location: 'Community C',
      description: 'Lack of teachers & school supplies',
      score: 82,
      urgency: 'MEDIUM',
      icon: 'school',
      theme: 'blue'
    }
  ];

  recommendedActions: Action[] = [
    {
      text: 'Focus medical aid in Area A',
      score: 95,
      icon: 'add_circle',
      theme: 'red'
    },
    {
      text: 'Deploy resources in Zone B',
      score: 87,
      icon: 'water_drop',
      theme: 'yellow'
    }
  ];

  volunteers: Volunteer[] = [
    {
      name: 'David M.',
      role: 'Doctor - Area A',
      availability: 'Medical Assistance - Immediate',
      score: 95,
      avatarChar: 'D',
      theme: 'blue'
    },
    {
      name: 'Sarah K.',
      role: 'Logistics - Village B',
      availability: 'Educational Support Available tomorrow',
      score: 92,
      avatarChar: 'S',
      theme: 'purple'
    }
  ];
}
