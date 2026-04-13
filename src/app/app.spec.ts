import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { BirthdayFeedApi } from './birthday-feed.api';

describe('App', () => {
  const createdPost = {
    id: 1,
    author: 'Carol',
    initials: 'C',
    handle: '@carol',
    createdAt: '2026-04-11T18:00:00.000Z',
    emoji: '🥳',
    sticker: {
      id: 'confetti-turbo',
      emoji: '🎉',
      label: 'Confete turbo',
      tone: 'party' as const,
    },
    message: 'Parabéns!',
  };

  const birthdayFeedApi = jasmine.createSpyObj<
    Pick<BirthdayFeedApi, 'getPosts' | 'createPost'>
  >('BirthdayFeedApi', ['getPosts', 'createPost']);

  beforeEach(async () => {
    birthdayFeedApi.getPosts.calls.reset();
    birthdayFeedApi.createPost.calls.reset();
    birthdayFeedApi.getPosts.and.returnValue(of([]));
    birthdayFeedApi.createPost.and.returnValue(of(createdPost));

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: BirthdayFeedApi, useValue: birthdayFeedApi }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the landscape tv screen', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.tv-screen')).toBeTruthy();
    expect(compiled.querySelector('.scanlines')).toBeTruthy();
  });

  it('should render the birthday guestbook feed', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.guestbook')).toBeTruthy();
    expect(compiled.querySelectorAll('.message-card').length).toBe(0);
    expect(compiled.querySelector('.feed-empty')).toBeTruthy();
  });

  it('should insert an emoji into the message at the cursor position', fakeAsync(() => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const app = fixture.componentInstance;
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    app.draftMessage = 'Feliz Kelly';
    textarea.value = app.draftMessage;

    textarea.focus();
    textarea.setSelectionRange(6, 6);
    app.rememberMessageSelection(textarea);
    app.insertEmoji('🎉', textarea);

    flushMicrotasks();
    fixture.detectChanges();

    expect(app.draftMessage).toBe('Feliz 🎉Kelly');
    expect(textarea.selectionStart).toBe(8);
    expect(textarea.selectionEnd).toBe(8);

    textarea.remove();
  }));
});
