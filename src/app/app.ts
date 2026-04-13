import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  type BirthdayPost,
  type CreateBirthdayPostPayload,
  type StickerOption,
  EMOJI_OPTIONS,
  STICKER_OPTIONS,
} from './birthday-feed.data';
import { BirthdayFeedApi } from './birthday-feed.api';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly emojiOptions = EMOJI_OPTIONS;
  readonly stickerOptions = STICKER_OPTIONS;
  readonly posts = signal<BirthdayPost[]>([]);
  readonly postCount = computed(() => this.posts().length);
  readonly stickerCount = this.stickerOptions.length;
  readonly emojiCount = this.emojiOptions.length;
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly loadError = signal('');
  readonly submitError = signal('');
  readonly maxMessageLength = 220;

  draftName = '';
  draftMessage = '';
  selectedEmoji = this.emojiOptions[0];
  selectedStickerId = this.stickerOptions[0]?.id ?? '';
  private messageSelectionStart = 0;
  private messageSelectionEnd = 0;

  private readonly destroyRef = inject(DestroyRef);
  private readonly birthdayFeedApi = inject(BirthdayFeedApi);

  constructor() {
    this.loadPosts();
  }

  get activeSticker(): StickerOption {
    return this.findSticker(this.selectedStickerId);
  }

  get isSubmitDisabled(): boolean {
    return !this.draftName.trim() || !this.draftMessage.trim();
  }

  preserveMessageSelection(event: MouseEvent): void {
    event.preventDefault();
  }

  rememberMessageSelection(textarea: HTMLTextAreaElement): void {
    this.messageSelectionStart = textarea.selectionStart ?? this.draftMessage.length;
    this.messageSelectionEnd = textarea.selectionEnd ?? this.messageSelectionStart;
  }

  insertEmoji(emoji: string, textarea: HTMLTextAreaElement): void {
    let selectionStart = this.messageSelectionStart;
    let selectionEnd = this.messageSelectionEnd;

    if (document.activeElement === textarea) {
      selectionStart = textarea.selectionStart ?? selectionStart;
      selectionEnd = textarea.selectionEnd ?? selectionEnd;
    } else if (selectionStart === 0 && selectionEnd === 0) {
      selectionStart = this.draftMessage.length;
      selectionEnd = this.draftMessage.length;
    }

    const nextMessageLength = this.draftMessage.length - (selectionEnd - selectionStart) + emoji.length;

    if (nextMessageLength > this.maxMessageLength) {
      return;
    }

    this.draftMessage = `${this.draftMessage.slice(0, selectionStart)}${emoji}${this.draftMessage.slice(selectionEnd)}`;
    this.selectedEmoji = emoji;
    this.messageSelectionStart = selectionStart + emoji.length;
    this.messageSelectionEnd = this.messageSelectionStart;

    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(this.messageSelectionStart, this.messageSelectionEnd);
      this.rememberMessageSelection(textarea);
    });
  }

  addPost(): void {
    const author = this.draftName.trim();
    const message = this.draftMessage.trim();

    if (!author || !message) {
      return;
    }

    const sticker = this.findSticker(this.selectedStickerId);
    const currentEmojiIndex = this.emojiOptions.indexOf(this.selectedEmoji);
    const payload: CreateBirthdayPostPayload = {
      author,
      emoji: this.selectedEmoji,
      message,
      stickerId: sticker.id,
    };

    this.submitError.set('');
    this.isSubmitting.set(true);

    this.birthdayFeedApi
      .createPost(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe({
        next: (post) => {
          this.posts.update((posts) => [post, ...posts]);
          this.draftName = '';
          this.draftMessage = '';
          this.messageSelectionStart = 0;
          this.messageSelectionEnd = 0;
          this.selectedStickerId = this.stickerOptions[0]?.id ?? '';
          this.selectedEmoji =
            this.emojiOptions[(currentEmojiIndex + 1) % this.emojiOptions.length];
        },
        error: () => {
          this.submitError.set('Servidor do mural indisponível. Verifique se a API está online.');
        },
      });
  }

  trackByPostId(_: number, post: BirthdayPost): number {
    return post.id;
  }

  private findSticker(stickerId: string): StickerOption {
    return this.stickerOptions.find((sticker) => sticker.id === stickerId) ?? this.stickerOptions[0];
  }

  formatRelativeTime(createdAt: string): string {
    const timestamp = Date.parse(createdAt);

    if (Number.isNaN(timestamp)) {
      return 'agora mesmo';
    }

    const diffInMinutes = Math.floor((Date.now() - timestamp) / 60000);

    if (diffInMinutes < 1) {
      return 'agora mesmo';
    }

    if (diffInMinutes < 60) {
      return `há ${diffInMinutes} min`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);

    if (diffInHours < 24) {
      return `há ${diffInHours} h`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return `há ${diffInDays} d`;
  }

  private loadPosts(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.birthdayFeedApi
      .getPosts()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (posts) => {
          this.posts.set(posts);
        },
        error: () => {
          this.posts.set([]);
          this.loadError.set('Servidor do mural indisponível. Verifique se a API está online.');
        },
      });
  }

  get hasLoadError(): boolean {
    return this.loadError().length > 0;
  }

  get hasSubmitError(): boolean {
    return this.submitError().length > 0;
  }
}
