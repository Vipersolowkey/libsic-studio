import { Component } from 'react';

// If a page crashes while drawing, show a short message instead of an empty white screen.
// The error itself still reaches the console (and Sentry, when it is on) because it is re-reported below.
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error(error);
    if (typeof window !== 'undefined') window.dispatchEvent(new ErrorEvent('error', { error, message: error?.message }));
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="message-page" role="alert">
        <h1>Something went wrong</h1>
        <p>The page stopped working. Reloading usually fixes it.</p>
        <a href="/">Back to the start page</a>
      </main>
    );
  }
}
