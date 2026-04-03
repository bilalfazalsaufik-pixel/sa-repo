import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NotificationHistoryListComponent } from './notification-history-list.component';
import { NotificationHistoryService } from '../../services/notification-history.service';
import { NotificationService } from '../../services/notification.service';
import { UsersService } from '../../../users/services/users.service';
import { ErrorService } from '../../../../core/services/error.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { of } from 'rxjs';

describe('NotificationHistoryListComponent', () => {
  let component: NotificationHistoryListComponent;
  let fixture: ComponentFixture<NotificationHistoryListComponent>;

  beforeEach(async () => {
    const historyService = jasmine.createSpyObj<NotificationHistoryService>('NotificationHistoryService', ['getNotificationHistory']);
    historyService.getNotificationHistory.and.returnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 10 }));
    const notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', ['getNotificationRules']);
    notificationService.getNotificationRules.and.returnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 10 }));
    const usersService = jasmine.createSpyObj<UsersService>('UsersService', ['getUsers']);
    usersService.getUsers.and.returnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 10 }));
    const permissionService = jasmine.createSpyObj<PermissionService>('PermissionService', ['hasPermission']);
    permissionService.hasPermission.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [NotificationHistoryListComponent, RouterTestingModule],
      providers: [
        { provide: NotificationHistoryService, useValue: historyService },
        { provide: NotificationService, useValue: notificationService },
        { provide: UsersService, useValue: usersService },
        { provide: PermissionService, useValue: permissionService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationHistoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
