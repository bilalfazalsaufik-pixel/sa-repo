import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RolesService } from '../../services/roles.service';
import {
  ScreenPermissionDto,
  ScreenAccessLevel,
  ScreenAccessLevels
} from '../../../../shared/models/role.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

interface Row {
  screenKey: string;
  displayName: string;
  access: ScreenAccessLevel;
}

@Component({
  selector: 'app-manage-permissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardModule,
    TableModule,
    ButtonModule,
    ErrorMessageComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './manage-permissions.component.html',
  styleUrls: ['./manage-permissions.component.css']
})
export class ManagePermissionsComponent implements OnInit {
  roleId = signal<number | null>(null);
  roleName = signal<string>('');
  rows = signal<Row[]>([]);
  saving = signal(false);

  private rolesService = inject(RolesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  errorService = inject(ErrorService);
  loadingService = inject(LoadingService);

  clearError = (): void => this.errorService.clearError();

  canSave = computed(() => this.rows().length > 0 && !this.saving());

  readonly None = ScreenAccessLevels['None'];
  readonly View = ScreenAccessLevels['View'];
  readonly Manage = ScreenAccessLevels['Manage'];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('roleId');
    const n = id ? parseInt(id, 10) : NaN;
    if (!id || isNaN(n)) {
      this.router.navigate(['/roles']);
      return;
    }
    this.roleId.set(n);
    this.loadRoleAndData(n);
  }

  private loadRoleAndData(roleId: number): void {
    this.loadingService.setLoading(true);
    this.errorService.clearError();

    this.rolesService.getRoleById(roleId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: role => this.roleName.set(role.name),
      error: e => {
        this.loadingService.setLoading(false);
        this.errorService.setErrorFromHttp(e);
      }
    });

    this.rolesService.getScreens().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: screens => {
        this.rolesService.getRoleScreenPermissions(roleId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: perms => {
            const permMap = new Map(perms.map(p => [p.screenKey, p.access]));
            this.rows.set(
              screens.map(s => ({
                screenKey: s.key,
                displayName: s.displayName,
                access: (permMap.get(s.key) ?? 0) as ScreenAccessLevel
              }))
            );
            this.loadingService.setLoading(false);
          },
          error: e => {
            this.loadingService.setLoading(false);
            this.errorService.setErrorFromHttp(e);
          }
        });
      },
      error: e => {
        this.loadingService.setLoading(false);
        this.errorService.setErrorFromHttp(e);
      }
    });
  }

  setAccess(row: Row, value: ScreenAccessLevel): void {
    this.rows.update(list =>
      list.map(r => (r.screenKey === row.screenKey ? { ...r, access: value } : r))
    );
  }

  save(): void {
    const id = this.roleId();
    if (id == null || this.saving()) return;
    this.saving.set(true);
    this.errorService.clearError();

    const screens: ScreenPermissionDto[] = this.rows().map(r => ({
      screenKey: r.screenKey,
      access: r.access
    }));

    this.rolesService.setRoleScreenPermissions(id, screens).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/roles']);
      },
      error: e => {
        this.saving.set(false);
        this.errorService.setErrorFromHttp(e);
      }
    });
  }
}
