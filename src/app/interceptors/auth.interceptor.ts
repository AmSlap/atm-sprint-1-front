import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Check if we should add the token (based on URL or other criteria)
    if (this.shouldAddToken(request)) {
      const token = this.authService.getAccessToken();

      if (token) {
        // Clone the request and add the authorization header
        request = request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    }

    // Handle the modified request
    return next.handle(request).pipe(
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          // Handle 401 Unauthorized errors (optional)
          // You might want to redirect to login or refresh the token
          this.authService.refreshToken();
        }

        return throwError(() => error);
      })
    );
  }

  private shouldAddToken(request: HttpRequest<unknown>): boolean {
    // Add your logic to determine if the token should be added
    // For example, only add the token for API requests, not for public resources
    //const isApiUrl = request.url.startsWith('http://localhost:8989/');
    return true;
  }
}
