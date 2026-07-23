/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-vars, no-console */
import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md" sx={{ mt: 8 }}>
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 3,
            }}
          >
            <Typography variant="h4" color="error" gutterBottom>
              Oops! Something went wrong.
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              We're sorry, but an unexpected error occurred. Our technical team has been notified.
            </Typography>
            
            {import.meta.env.DEV && this.state.error && (
              <Box
                sx={{
                  mt: 3,
                  mb: 4,
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  textAlign: 'left',
                  overflowX: 'auto',
                }}
              >
                <Typography variant="body2" component="pre" color="error.dark" sx={{ fontFamily: 'monospace' }}>
                  {this.state.error.toString()}
                </Typography>
                <Typography variant="caption" component="pre" color="text.secondary" sx={{ mt: 1, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button variant="contained" color="primary" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
              <Button variant="outlined" color="primary" onClick={() => window.location.href = '/'}>
                Return Home
              </Button>
            </Box>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}
