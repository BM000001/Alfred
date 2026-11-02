import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('exibe a identidade e a mensagem inicial do Alfred', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: /alfred, início/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /boa tarde/i })).toBeInTheDocument();
    expect(screen.getByText(/estou preparando seu espaço/i)).toBeInTheDocument();
  });
});