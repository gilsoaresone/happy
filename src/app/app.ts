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

  draftName = '';
  draftMessage = '';
  selectedEmoji = this.emojiOptions[0];
  selectedStickerId = this.stickerOptions[0]?.id ?? '';

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
