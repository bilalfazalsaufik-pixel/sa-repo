import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { UserProfileService, UserProfile, UpdateUserProfileRequest } from '../../services/user-profile.service';
import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    ErrorMessageComponent,
    LoadingSpinnerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  profile = signal<UserProfile | null>(null);
  fullNameEdit = signal<string>('');
  email = signal<string>('');
  defaultView = signal<string>('Engineering');
  phoneNumber = signal<string>('');
  isEditing = signal(false);
  isSaving = signal(false);

  viewOptions = [
    { label: 'Engineering', value: 'Engineering' },
    { label: 'Operator', value: 'Operator' }
  ];

  private userProfileService = inject(UserProfileService);
  errorService = inject(ErrorService);
  loadingService = inject(LoadingService);
  private destroyRef = inject(DestroyRef);

  fullName = computed(() => {
    const p = this.profile();
    return p ? `${p.firstName} ${p.lastName}` : '';
  });

  initials = computed(() => {
    const p = this.profile();
    if (!p) return '?';
    const first = p.firstName?.[0] ?? '';
    const last = p.lastName?.[0] ?? '';
    return (first + last).toUpperCase() || '?';
  });

  filteredPermissions = computed(() => {
    const permissions = this.profile()?.permissions ?? [];
    const lowerSet = new Set(permissions.map(p => p.toLowerCase()));
    return permissions.filter(p => {
      if (p.toLowerCase().startsWith('view ')) {
        const manageName = 'manage ' + p.toLowerCase().slice(5);
        return !lowerSet.has(manageName);
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loadingService.setLoading(true);
    this.errorService.clearError();

    this.userProfileService.getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.fullNameEdit.set(`${profile.firstName} ${profile.lastName}`);
          this.email.set(profile.email);
          this.defaultView.set(profile.defaultView);
          this.phoneNumber.set(profile.phoneNumber ?? '');
          this.isEditing.set(false);
          this.isSaving.set(false);
          this.loadingService.setLoading(false);
        },
        error: (err) => {
          this.errorService.setErrorFromHttp(err);
          this.loadingService.setLoading(false);
        }
      });
  }

  startEdit(): void {
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    const profile = this.profile();
    if (profile) {
      this.fullNameEdit.set(`${profile.firstName} ${profile.lastName}`);
      this.email.set(profile.email);
      this.defaultView.set(profile.defaultView);
      this.phoneNumber.set(profile.phoneNumber ?? '');
    }
  }

  saveProfile(): void {
    const phone = this.phoneNumber().trim();
    const nameParts = this.fullNameEdit().trim().split(/\s+/);
    const first = nameParts[0] || '';
    const last = nameParts.slice(1).join(' ') || '';
    const request: UpdateUserProfileRequest = {
      firstName: first,
      lastName: last,
      email: this.email().trim(),
      defaultView: this.defaultView(),
      phoneNumber: phone || null
    };

    this.isSaving.set(true);
    this.loadingService.setLoading(true);
    this.errorService.clearError();

    this.userProfileService.updateProfile(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadProfile();
        },
        error: (err) => {
          this.errorService.setErrorFromHttp(err);
          this.loadingService.setLoading(false);
          this.isSaving.set(false);
        }
      });
  }

  clearError = (): void => {
    this.errorService.clearError();
  };
}
