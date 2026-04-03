import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

interface NavItem {
  label: string;
  icon: string;
  route: string | null;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatListModule, MatIconModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/admin/dashboard' },
    { label: 'Data Upload', icon: 'cloud_upload', route: '/admin/upload' },
    { label: 'Insights', icon: 'insights', route: '/admin/insights' },
    { label: 'Recommendations', icon: 'recommend', route: '/admin/recommendations' },
    { label: 'Volunteers', icon: 'people', route: '/admin/volunteers' },
    { label: 'Settings', icon: 'settings', route: null },
  ];
}
