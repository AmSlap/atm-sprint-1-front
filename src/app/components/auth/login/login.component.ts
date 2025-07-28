import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
    }

    this.initForm();

    // Clear any pending username when visiting login
    this.authService.clearPendingUsername();
  }

  initForm(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const credentials = this.loginForm.value;

      this.authService.login(credentials.username, credentials.password)
        .pipe(
          // Make sure isLoading is set to false in all cases
          finalize(() => this.isLoading = false)
        )
        .subscribe({
          next: () => {
            console.log('Login successful');
            this.router.navigate(['/dashboard']);
          },
          error: (error) => {
            // Don't show error for SETUP_REQUIRED case, as it's handled by redirect
            if (error.message !== 'SETUP_REQUIRED') {
              this.errorMessage = error.message;
            }
          }
        });
    }
  }
}
