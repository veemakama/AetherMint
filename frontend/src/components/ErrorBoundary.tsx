'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorDisplay } from './LoadingFallback';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const details = this.state.error
        ? [this.state.error.toString(), this.state.errorInfo?.componentStack].filter(Boolean).join('\n\n')
        : undefined;

      return (
        <div className="min-h-[200px] flex items-center justify-center p-4">
          <ErrorDisplay
            title="Something went wrong"
            message="An unexpected error occurred. Please try again or contact support if the problem persists."
            details={details}
            onRetry={this.handleRetry}
            className="max-w-md w-full"
          />
        </div>
      );
    }

    return this.props.children;
  }
}
