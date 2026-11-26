import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary.jsx';

afterEach(() => vi.restoreAllMocks());

function Broken() {
  throw new Error('drawing failed');
}

describe('ErrorBoundary', () => {
  it('shows the page when nothing is wrong', () => {
    render(<ErrorBoundary><p>All good</p></ErrorBoundary>);
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('shows a short message with a way back instead of a white screen, and reports the error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const seen = vi.fn();
    window.addEventListener('error', seen);
    render(<ErrorBoundary><Broken /></ErrorBoundary>);
    window.removeEventListener('error', seen);

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('link', { name: 'Back to the start page' })).toHaveAttribute('href', '/');
    expect(seen).toHaveBeenCalled(); // this is what Sentry listens to
  });
});
