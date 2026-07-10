import type { Breadcrumb, User } from './types';

export class Scope {
  user: User | null = null;
  tags: Record<string, unknown> = {};
  private breadcrumbs: Breadcrumb[] = [];
  private readonly maxBreadcrumbs: number;

  constructor(maxBreadcrumbs = 30) {
    this.maxBreadcrumbs = maxBreadcrumbs;
  }

  setUser(user: User | null): void {
    this.user = user;
  }

  setTag(key: string, value: unknown): void {
    this.tags[key] = value;
  }

  setTags(tags: Record<string, unknown>): void {
    Object.assign(this.tags, tags);
  }

  addBreadcrumb(b: Breadcrumb): void {
    this.breadcrumbs.push(b);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.splice(0, this.breadcrumbs.length - this.maxBreadcrumbs);
    }
  }

  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  clear(): void {
    this.user = null;
    this.tags = {};
    this.breadcrumbs = [];
  }
}
