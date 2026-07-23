import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../BackButton';
// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

describe('BackButton Component', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
  });

  it('renders correctly', () => {
    render(<BackButton />);
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAccessibleName('Go back to previous page');
  });

  it('calls navigate(-1) when clicked without a fallbackTo prop', () => {
    render(<BackButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('calls navigate(fallbackTo) when clicked with a fallbackTo prop', () => {
    render(<BackButton fallbackTo="/home" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/home');
  });
});
