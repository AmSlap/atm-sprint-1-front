import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import {AuthService} from '../../service/auth.service';

@Component({
  selector: 'app-account-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account-setup.component.html',
  styleUrls: ['./account-setup.component.css']
})
export class AccountSetupComponent implements OnInit {
  setupForm!: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  username: string | null = null;

  // Profile status
  profileStatus: any = null;
  isCheckingProfile: boolean = false;

  // Password validation patterns
  hasUpperCase: boolean = false;
  hasLowerCase: boolean = false;
  hasNumber: boolean = false;
  hasSpecialChar: boolean = false;
  hasMinLength: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get the pending username
    this.username = this.authService.getPendingUsername();

    // If no pending username, redirect to login
    if (!this.username) {
      this.router.navigate(['/login']);
      return;
    }

    this.initForm();

    // Subscribe to password changes to show validation state
    this.setupForm.get('newPassword')?.valueChanges.subscribe(value => {
      this.validatePassword(value);
    });

    // Check profile status
    this.checkProfileStatus();
  }

  initForm(): void {
    this.setupForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],
      confirmPassword: ['', [Validators.required]],
      email: ['', [Validators.email]],
      firstName: [''],
      lastName: ['']
    }, {
      validators: this.passwordMatchValidator
    });
  }

  checkProfileStatus(): void {
    if (!this.username) return;

    this.isCheckingProfile = true;
    this.authService.checkUserProfile(this.username)
      .pipe(finalize(() => this.isCheckingProfile = false))
      .subscribe({
        next: (status) => {
          this.profileStatus = status;

          // Set validators based on profile status
          if (!status.hasEmail) {
            this.setupForm.get('email')?.setValidators([Validators.required, Validators.email]);
          }

          if (!status.hasFirstName) {
            this.setupForm.get('firstName')?.setValidators([Validators.required]);
          }

          if (!status.hasLastName) {
            this.setupForm.get('lastName')?.setValidators([Validators.required]);
          }

          // Update validators
          this.setupForm.get('email')?.updateValueAndValidity();
          this.setupForm.get('firstName')?.updateValueAndValidity();
          this.setupForm.get('lastName')?.updateValueAndValidity();
        },
        error: (error) => {
          console.error('Failed to check profile status', error);
          this.errorMessage = 'Could not check profile status: ' + error.message;
        }
      });
  }

  validatePassword(password: string): void {
    this.hasUpperCase = /[A-Z]/.test(password);
    this.hasLowerCase = /[a-z]/.test(password);
    this.hasNumber = /\d/.test(password);
    this.hasSpecialChar = /[@$!%*?&]/.test(password);
    this.hasMinLength = password.length >= 8;
  }

  passwordMatchValidator(formGroup: FormGroup) {
    const newPassword = formGroup.get('newPassword')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;

    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.setupForm.invalid || !this.username) {
      this.markFormGroupTouched(this.setupForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValues = this.setupForm.value;

    // Prepare request data
    const setupData: any = {
      username: this.username,
      currentPassword: formValues.currentPassword,
      newPassword: formValues.newPassword
    };

    // Add profile data if provided
    if (formValues.email) setupData.email = formValues.email;
    if (formValues.firstName) setupData.firstName = formValues.firstName;
    if (formValues.lastName) setupData.lastName = formValues.lastName;

    this.authService.setupAccount(setupData)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          this.successMessage = response.message || 'Account setup completed successfully!';

          // Redirect to login after 2 seconds
          setTimeout(() => {
            this.authService.clearPendingUsername();
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (error) => {
          this.errorMessage = error.message;
        }
      });
  }

  // Helper to mark all form controls as touched to display validation errors
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Return to login
  backToLogin(): void {
    this.authService.clearPendingUsername();
    this.router.navigate(['/login']);
  }
}
