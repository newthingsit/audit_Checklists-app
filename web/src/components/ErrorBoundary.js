import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/**
 * React Error Boundary — catches unhandled rendering errors
 * and shows a fallback UI instead of a white screen.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to an error reporting service in production
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary]', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback or default
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="50vh"
          p={4}
          textAlign="center"
        >
          <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 480 }}>
            An unexpected error occurred. Please try refreshing the page.
          </Typography>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <Typography
              variant="body2"
              component="pre"
              sx={{
                mb: 3,
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 1,
                maxWidth: '100%',
                overflow: 'auto',
                fontSize: 12,
                textAlign: 'left',
              }}
            >
              {this.state.error.toString()}
            </Typography>
          )}
          <Box display="flex" gap={2}>
            <Button variant="contained" onClick={this.handleReset}>
              Try Again
            </Button>
            <Button variant="outlined" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
