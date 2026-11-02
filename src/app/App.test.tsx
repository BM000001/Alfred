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

    fireEvent.click(screen.getByRole('button', { name: /^agenda$/i }));
    expect(screen.getByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    expect(screen.getByText(/compromissos, eventos e prazos/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^estudos$/i }));
    expect(screen.getByRole('heading', { name: 'Estudos' })).toBeInTheDocument();
  });

  it('abre a área funcional de tarefas', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /^tarefas$/i }));

    expect(screen.getByRole('heading', { name: 'O que precisa ser feito?' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Adicionar tarefa' })).toBeInTheDocument();
  });

  it('abre a área funcional de projetos', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /^projetos$/i }));

    expect(screen.getByRole('heading', { name: 'Um objetivo de cada vez.' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Criar projeto' })).toBeInTheDocument();
  });
});
