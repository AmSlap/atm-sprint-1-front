import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { catchError, tap, finalize } from 'rxjs/operators';

// Define an interface for the decoded token with the specific structure
export interface DecodedToken {
  sub: string;
  preferred_username: string;
  name: string;
  email: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [client: string]: {
      roles: string[];
    };
  };
  entity?: string;
  given_name?: string;
  family_name?: string;
  email_verified?: boolean;
}

// Define a user profile interface
export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  roles: string[];
  entity: string;
  givenName?: string;
  familyName?: string;
  emailVerified?: boolean;
}

// Profile check response interface
export interface ProfileCheckResponse {
  username: string;
  hasEmail: boolean;
  hasFirstName: boolean;
  hasLastName: boolean;
  profileComplete: boolean;
  requiredActions: string[];
}

// Account setup data interface
export interface AccountSetupData {
  username: string;
  currentPassword: string;
  newPassword: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:8082/api'; // Adjust base URL as needed

  // Observable to track authentication state
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // Observable to track user profile
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  userProfile$ = this.userProfileSubject.asObservable();

  // User details for setup flow - added for account setup
  private pendingUsernameSubject = new BehaviorSubject<string | null>(
    localStorage.getItem('pending_username')
  );
  pendingUsername$ = this.pendingUsernameSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Update auth status when service is created
    this.isAuthenticatedSubject.next(this.hasValidToken());

    // Initialize user profile if token exists
    if (this.hasValidToken()) {
      this.initUserProfile();
    }
  }

  /**
   * Initialize user profile from token
   */
  private initUserProfile(): void {
    const profile = this.getUserProfileFromToken();
    if (profile) {
      this.userProfileSubject.next(profile);
    }
  }

  /**
   * Log in a user with username and password
   */
  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, { username, password })
      .pipe(
        tap(response => {
          this.handleLoginSuccess(response);
          this.initUserProfile();
        }),
        catchError(error => {
          console.error('Login error:', error);

          // Check if we need to redirect to account setup - enhanced detection
          if (this.isAccountSetupRequired(error, username)) {
            console.log('Account setup required, redirecting...');
            this.setPendingUsername(username);
            this.router.navigate(['/setup-account']);
            return throwError(() => new Error('SETUP_REQUIRED'));
          }

          // Fall back to standard error handling
          return this.handleError(error);
        })
      );
  }

  /**
   * Determine if account setup is required based on the error response
   * This is a helper method that examines different error patterns
   */
  private isAccountSetupRequired(error: HttpErrorResponse, username: string): boolean {
    // Case 1: Explicit SETUP_REQUIRED error
    if (error.status === 400 &&
      (error.error?.error === "SETUP_REQUIRED" ||
        error.error?.error_description?.includes("Account is not fully set up"))) {
      return true;
    }

    // Case 2: Check for 401 with special error messages that might indicate setup required
    if (error.status === 401) {
      // Convert error body to string for consistent checking
      const errorBody = typeof error.error === 'string'
        ? error.error
        : JSON.stringify(error.error || '');

      // Check for keywords that might indicate setup is required
      const setupKeywords = [
        'not fully set up',
        'update_password',
        'UPDATE_PASSWORD',
        'temporary password',
        'required action',
        'configure_totp',
        'CONFIGURE_TOTP',
        'verify_email',
        'VERIFY_EMAIL'
      ];

      if (setupKeywords.some(keyword => errorBody.toLowerCase().includes(keyword.toLowerCase()))) {
        return true;
      }
    }

    // Case 3: As a fallback, check if the user needs profile completion
    // This makes a separate request to check user status
    if (error.status === 401) {
      // Make a synchronous check to see if the user exists and needs setup
      // Note: This is not ideal but helps with immediate diagnosis
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${this.baseUrl}/auth/check-user-profile`, false); // Synchronous
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({ username }));

        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          return !response.profileComplete ||
            (response.requiredActions && response.requiredActions.length > 0);
        }
      } catch (e) {
        console.warn('Failed to check user profile:', e);
      }
    }

    return false;
  }

  /**
   * Log out the current user
   */
  logout(): Observable<any> {
    // Get refresh token from localStorage
    const refreshToken = localStorage.getItem('refresh_token');

    if (!refreshToken) {
      console.error('No refresh token found');
      this.handleLogoutSuccess();
      return of(null);
    }

    // Set proper headers
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Call the logout endpoint with proper options
    return this.http.post(`${this.baseUrl}/auth/logout`,
      { refresh_token: refreshToken },
      { headers, observe: 'response' }
    )
      .pipe(
        tap(response => {
          console.log('Logout response:', response);
          // Call handleLogoutSuccess on successful response
          if (response && response.status === 200) {
            this.handleLogoutSuccess();
          }
        }),
        catchError(error => {
          console.error('Logout error:', error);
          // Still clear local storage even if server call fails
          this.handleLogoutSuccess();
          return of(null);
        }),
        finalize(() => {
          // Double-check if tokens still exist and clear them if needed
          if (localStorage.getItem('access_token') || localStorage.getItem('refresh_token')) {
            console.warn('Tokens still exist after logout attempt, forcing cleanup');
            this.handleLogoutSuccess();
          }
        })
      );
  }

  /**
   * Refresh the access token using the refresh token
   */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refresh_token');

    if (!refreshToken) {
      this.handleLogoutSuccess();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/refresh`, { refresh_token: refreshToken })
      .pipe(
        tap(response => {
          localStorage.setItem('access_token', response.access_token);
          localStorage.setItem('refresh_token', response.refresh_token);

          if (response.expires_in) {
            const expiryTime = new Date().getTime() + (response.expires_in * 1000);
            localStorage.setItem('token_expiry', expiryTime.toString());
          }

          this.isAuthenticatedSubject.next(true);

          // Update user profile with new token
          this.initUserProfile();
        }),
        catchError(error => {
          console.error('Refresh token error:', error);
          this.handleLogoutSuccess();
          return throwError(() => error);
        })
      );
  }

  /**
   * Check user profile for required fields
   * New method for account setup
   */
  checkUserProfile(username: string): Observable<ProfileCheckResponse> {
    return this.http.post<ProfileCheckResponse>(`${this.baseUrl}/auth/check-user-profile`, { username })
      .pipe(
        catchError(error => {
          console.error('Profile check error:', error);
          return throwError(() => new Error('Failed to check profile: ' + error.message));
        })
      );
  }

  /**
   * Setup account with new password and profile information
   * New method for account setup
   */
  setupAccount(setupData: AccountSetupData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/setup-account`, setupData)
      .pipe(
        catchError(error => {
          console.error('Setup account error:', error);
          let errorMessage: string;

          if (error.status === 400) {
            errorMessage = error.error?.error || 'Invalid request data';
          } else if (error.status === 401) {
            errorMessage = 'Current password is incorrect';
          } else {
            errorMessage = 'Account setup failed: ' + (error.error?.error || 'Please try again');
          }

          return throwError(() => new Error(errorMessage));
        })
      );
  }

  /**
   * Set pending username during account setup flow
   * New method for account setup
   */
  setPendingUsername(username: string): void {
    localStorage.setItem('pending_username', username);
    this.pendingUsernameSubject.next(username);
  }

  /**
   * Get pending username for account setup
   * New method for account setup
   */
  getPendingUsername(): string | null {
    return localStorage.getItem('pending_username');
  }

  /**
   * Clear pending username after setup is complete
   * New method for account setup
   */
  clearPendingUsername(): void {
    localStorage.removeItem('pending_username');
    this.pendingUsernameSubject.next(null);
  }

  /**
   * Check if the user is currently logged in
   */
  isLoggedIn(): boolean {
    return this.hasValidToken();
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Decode the JWT token
   */
  decodeToken(token: string): DecodedToken | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''));

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Get all user roles from the token
   */
  getUserRoles(): string[] {
    const token = this.getAccessToken();
    if (!token) return [];

    const decoded = this.decodeToken(token);
    if (!decoded) return [];

    let roles: string[] = [];

    // Add realm roles
    if (decoded.realm_access?.roles) {
      roles = [...decoded.realm_access.roles];
    }

    // Add resource roles
    if (decoded.resource_access) {
      Object.keys(decoded.resource_access).forEach(client => {
        if (decoded.resource_access?.[client]?.roles) {
          roles = [...roles, ...decoded.resource_access[client].roles];
        }
      });
    }

    return roles;
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: string): boolean {
    const roles = this.getUserRoles();
    return roles.includes(role);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.getUserRoles();
    return roles.some(role => userRoles.includes(role));
  }

  /**
   * Get user entity from token
   */
  getUserEntity(): string {
    const token = this.getAccessToken();
    if (!token) return '';

    const decoded = this.decodeToken(token);
    return decoded?.entity || '';
  }

  /**
   * Get complete user profile from token
   */
  getUserProfileFromToken(): UserProfile | null {
    const token = this.getAccessToken();
    if (!token) return null;

    const decoded = this.decodeToken(token);
    if (!decoded) return null;

    console.log('Decoded token:', decoded);
    return {
      id: decoded.sub,
      username: decoded.preferred_username || '',
      fullName: decoded.name || '',
      email: decoded.email || '',
      roles: this.getUserRoles(),
      entity: decoded.entity || '',
      givenName: decoded.given_name,
      familyName: decoded.family_name,
      emailVerified: decoded.email_verified
    };
  }

  /**
   * Get current user profile or null if not logged in
   */
  getUserProfile(): UserProfile | null {
    return this.userProfileSubject.value;
  }

  /**
   * Check if user has access to user management module
   */
  hasUserManagementAccess(): boolean {
    return this.hasRole('user-manager');
  }

  /**
   * Check if user has access to logging module
   */
  hasLoggingAccess(): boolean {
    return this.hasRole('logging-manager');
  }

  /**
   * Check if user has access to system logs
   */
  hasSystemLogsAccess(): boolean {
    return this.hasRole('system-logs-reader');
  }

  /**
   * Handle successful login
   */
  private handleLoginSuccess(response: AuthResponse): void {
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);

    if (response.expires_in) {
      const expiryTime = new Date().getTime() + (response.expires_in * 1000);
      localStorage.setItem('token_expiry', expiryTime.toString());
    }

    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Handle successful logout
   */
  private handleLogoutSuccess(): void {
    // Clear all stored tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expiry');
    localStorage.removeItem('pending_username'); // Also clear pending username on logout
    console.log('Logged out successfully - local storage cleared');

    this.isAuthenticatedSubject.next(false);
    this.userProfileSubject.next(null);
    this.pendingUsernameSubject.next(null); // Reset pending username subject

    // Add a small delay to ensure state is updated before navigation
    setTimeout(() => {
      console.log('Navigating to login page after logout');
      this.router.navigate(['/login']);
    }, 100);
  }

  /**
   * Handle authentication errors
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage: string;

    if (error.status === 401) {
      errorMessage = 'Nom d\'utilisateur ou mot de passe incorrect';
    } else {
      errorMessage = 'Une erreur est survenue. Veuillez réessayer plus tard.';
    }

    return throwError(() => new Error(errorMessage));
  }

  /**
   * Check if there's a valid token in localStorage
   */
  private hasValidToken(): boolean {
    const token = localStorage.getItem('access_token');
    const expiry = localStorage.getItem('token_expiry');

    if (!token) {
      return false;
    }

    // If we have an expiry time, check if the token is still valid
    if (expiry) {
      const expiryTime = parseInt(expiry, 10);
      const now = new Date().getTime();

      if (now >= expiryTime) {
        // Token has expired
        return false;
      }
    }

    return true;
  }
}
