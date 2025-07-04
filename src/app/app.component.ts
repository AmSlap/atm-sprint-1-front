import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'atm-dashboard';
  sidebarOpen = true;
  currentRoute = '';

  // Message system
  showMessage = false;
  messageText = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  // Add module expansion state
  atmModuleExpanded = false;
  incidentModuleExpanded = false;
  constructor(private router: Router) {}

  ngOnInit() {
    // Set initial sidebar state based on screen size
    this.checkScreenSize();
    
    // Set initial module expansion based on current route
    this.setInitialModuleState();
    
    // Track route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.url;
      this.updateModuleExpansion();
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    if (window.innerWidth <= 768) {
      this.sidebarOpen = false;
    } else {
      this.sidebarOpen = true;
    }
  }

  private setInitialModuleState() {
    this.currentRoute = this.router.url;
    this.updateModuleExpansion();
  }

  private updateModuleExpansion() {
    // Expand ATM module for ATM-related routes
    this.atmModuleExpanded = this.isAtmRoute(this.currentRoute);
    
    // Expand Incident module for incident-related routes
    this.incidentModuleExpanded = this.isIncidentRoute(this.currentRoute);
  }

  private isAtmRoute(route: string): boolean {
    const atmRoutes = ['/', '/atm', '/admin/registry', '/agency-management'];
    return atmRoutes.some(atmRoute => 
      atmRoute === '/' ? route === '/' : route.startsWith(atmRoute)
    );
  }

  private isIncidentRoute(route: string): boolean {
    const incidentRoutes = ['/dashboard', '/incidents', '/create-incident', '/my-tasks', '/available-tasks'];
    return incidentRoutes.some(incidentRoute => route.startsWith(incidentRoute));
  }

  toggleAtmModule() {
    this.atmModuleExpanded = !this.atmModuleExpanded;
    if (this.atmModuleExpanded) {
      this.incidentModuleExpanded = false;
    }
  }

  toggleIncidentModule() {
    this.incidentModuleExpanded = !this.incidentModuleExpanded;
    if (this.incidentModuleExpanded) {
      this.atmModuleExpanded = false;
    }
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }

  closeSidebarOnMobile() {
    if (this.isMobile()) {
      this.sidebarOpen = false;
    }
  }

  isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  isRouteActive(route: string): boolean {
    if (route === '/') {
      return this.currentRoute === '/';
    }
    return this.currentRoute.startsWith(route);
  }

  // Real data methods
  getCurrentUser(): string {
    return 'AmSlap';
  }

  getCurrentDateTime(): string {
    return '2025-06-12 16:17:57 UTC';
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });
  }

  showComingSoon(feature: string) {
    this.showInfoMessage(`${feature} feature - Coming Soon...`);
  }

  // Message system
  showSuccessMessage(text: string) {
    this.messageText = text;
    this.messageType = 'success';
    this.showMessage = true;
    setTimeout(() => this.closeMessage(), 3000);
  }

  showErrorMessage(text: string) {
    this.messageText = text;
    this.messageType = 'error';
    this.showMessage = true;
    setTimeout(() => this.closeMessage(), 5000);
  }

  showInfoMessage(text: string) {
    this.messageText = text;
    this.messageType = 'info';
    this.showMessage = true;
    setTimeout(() => this.closeMessage(), 3000);
  }

  closeMessage() {
    this.showMessage = false;
  }

  getMessageIcon(): string {
    switch (this.messageType) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  }
}
