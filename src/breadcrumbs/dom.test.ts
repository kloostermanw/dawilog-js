import { describe, it, expect } from 'vitest';
import { installDomBreadcrumbs } from './dom';
import { Scope } from '../scope';

describe('installDomBreadcrumbs', () => {
  it('records a ui.click breadcrumb describing the target', () => {
    const scope = new Scope();
    const teardown = installDomBreadcrumbs(scope);

    const button = document.createElement('button');
    button.id = 'buy';
    button.className = 'btn primary';
    document.body.appendChild(button);
    button.click();

    const crumbs = scope.getBreadcrumbs();
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0]).toMatchObject({ category: 'ui.click', message: 'button#buy.btn.primary' });

    teardown();
    button.click();
    expect(scope.getBreadcrumbs()).toHaveLength(1);
  });
});
