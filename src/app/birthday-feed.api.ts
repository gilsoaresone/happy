import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { type BirthdayPost, type CreateBirthdayPostPayload } from './birthday-feed.data';

@Injectable({ providedIn: 'root' })
export class BirthdayFeedApi {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/posts';

  getPosts(): Observable<BirthdayPost[]> {
    return this.http.get<BirthdayPost[]>(this.apiUrl);
  }

  createPost(payload: CreateBirthdayPostPayload): Observable<BirthdayPost> {
    return this.http.post<BirthdayPost>(this.apiUrl, payload);
  }
}
