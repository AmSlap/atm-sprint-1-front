import { Injectable, signal } from '@angular/core';

export interface User {
  username: string;
  groups: string[];
  displayName: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // Simulate current user - In real app, this would come from authentication
  private _currentUser = signal<User>({
    username: 'wbadmin',
    groups: ['helpdesk', 'atm_monitoring','supplier', 'purchasing', 'insurance'],
    displayName: 'wbadmin'
  });

  currentUser = this._currentUser.asReadonly();

  setCurrentUser(user: User) {
    this._currentUser.set(user);
  }

  getCurrentUsername(): string {
    return this._currentUser().username;
  }

  getCurrentUserGroups(): string[] {
    return this._currentUser().groups;
  }

  hasGroup(group: string): boolean {
    return this._currentUser().groups.includes(group);
  }
}
