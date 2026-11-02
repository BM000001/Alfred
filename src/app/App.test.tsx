import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('exibe a identidade e a mensagem inicial do Alfred', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: /alfred, início/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /boa tarde/i })).toBeInTheDocument();
    expect(screen.getByText(/estou preparando seu espaço/i)).toBeInTheDocument();
  });

  it('permite navegar entre as áreas principais', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /agenda/i }));
    expect(screen.getByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    expect(screen.getByText(/compromissos, eventos e prazos/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /estudos/i }));
    expect(screen.getByRole('heading', { name: 'Estudos' })).toBeInTheDocument();
  });
});