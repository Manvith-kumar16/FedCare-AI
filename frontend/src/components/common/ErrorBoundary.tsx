import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Container, Alert, Button } from 'react-bootstrap';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Container className="p-5 text-center">
          <Alert variant="danger">
            <Alert.Heading>Oops! Something went wrong.</Alert.Heading>
            <p>
              An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
            </p>
            <hr />
            <div className="d-flex justify-content-center">
              <Button variant="outline-danger" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </Alert>
          {import.meta.env.DEV && (
            <div className="mt-4 text-start">
              <pre className="p-3 bg-light rounded">{this.state.error?.toString()}</pre>
            </div>
          )}
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
