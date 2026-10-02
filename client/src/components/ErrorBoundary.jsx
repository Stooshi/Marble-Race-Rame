import { Component } from 'react';

/** Keeps a rendering bug on one page from blanking the whole app. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prev) {
    // Clear the error when the user navigates elsewhere.
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page">
        <div className="error-box" role="alert">
          <p>Something went wrong on this page: {this.state.error.message}</p>
          <button type="button" className="btn btn--sm" onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    );
  }
}
