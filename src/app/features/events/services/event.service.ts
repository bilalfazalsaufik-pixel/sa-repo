import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { Event, ResolveEventRequest, GetEventsQueryParams } from '../../../shared/models/event.model';
import { PagedResult } from '../../../shared/models/paged-result.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private api = inject(ApiService);

  /** Emits whenever an event is resolved or deleted so listeners can refresh counts. */
  private readonly _eventMutated$ = new Subject<void>();
  readonly eventMutated$ = this._eventMutated$.asObservable();

  getEvents(params?: GetEventsQueryParams): Observable<PagedResult<Event>> {
    return this.api.get<PagedResult<Event>>('event', params);
  }

  getEventById(id: number): Observable<Event> {
    return this.api.get<Event>(`event/${id}`);
  }

  getUnresolvedEventsCount(): Observable<number> {
    return this.api.get<number>('event/unresolved/count');
  }

  resolveEvent(id: number, request: ResolveEventRequest): Observable<Event> {
    return this.api.post<Event>(`event/${id}/resolve`, request).pipe(
      tap(() => this._eventMutated$.next())
    );
  }

  deleteEvent(id: number): Observable<void> {
    return this.api.delete<void>(`event/${id}`).pipe(
      tap(() => this._eventMutated$.next())
    );
  }

  // Query params are passed directly to ApiService
}
