import React from 'react';

/**
 * Error Boundary Component
 * Catches React errors and displays a graceful fallback UI
 * instead of crashing the entire side panel.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error('[DejaVista ErrorBoundary] Error caught:', error);
    console.error('[DejaVista ErrorBoundary] Component stack:', errorInfo.componentStack);
    
    // Update state with error details for display
    this.setState({
      error: error.toString(),
      errorInfo: errorInfo.componentStack
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '24px 16px',
          textAlign: 'center',
          backgroundColor: 'var(--color-base, #F5E9E2)',
          minHeight: '100%'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            ⚠️
          </div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text-primary, #0B0014)',
            marginBottom: '8px'
          }}>
            Something went wrong
          </h3>
          <p style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary, #5A3D45)',
            marginBottom: '16px'
          }}>
            This component encountered an error. Try refreshing.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              backgroundColor: 'var(--color-accent-action, #D44D5C)',
              color: '#FFFFFF',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Try Again
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{
              marginTop: '16px',
              textAlign: 'left',
              fontSize: '11px',
              color: '#666'
            }}>
              <summary style={{ cursor: 'pointer' }}>Error Details</summary>
              <pre style={{
                marginTop: '8px',
                padding: '8px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '200px',
                fontSize: '10px'
              }}>
                {this.state.error}
                {'\n\n'}
                {this.state.errorInfo}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
