import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('exibe a identidade e a mensagem inicial do Alfred', async () => {
    render(<App />);

    expect(screen.getByRole('link', { name: /alfred, início/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /boa tarde/i })).toBeInTheDocument();
    expect(await screen.findByText('PENDÊNCIAS')).toBeInTheDocument();
    expect(await screen.findByText('EM ATRASO')).toBeInTheDocument();
    expect(await screen.findByText('HOJE NA AGENDA')).toBeInTheDocument();
  });

  it('permite navegar entre as áreas principais', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /^agenda$/i }));
    expect(screen.getByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    expect(screen.getByText(/compromissos, eventos e prazos/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^estudos$/i }));
    expect(screen.getByRole('heading', { name: 'Estudos' })).toBeInTheDocument();
  });

  it('abre a Agenda funcional e permite iniciar um novo compromisso', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /^agenda$/i }));

    expect(await screen.findByText('SEUS COMPROMISSOS')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /novo compromisso/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /novo compromisso/i }));
    expect(screen.getByRole('heading', { name: 'O que está marcado?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar compromisso' })).toBeInTheDocument();
  });

  it('abre a área funcional de tarefas', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /^tarefas$/i }));

    expect(await screen.findByRole('heading', { name: 'O que precisa ser feito?' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Adicionar tarefa' })).toBeInTheDocument();
  });

  it('abre a área funcional de projetos', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /^projetos$/i }));

    expect(await screen.findByRole('heading', { name: 'Um objetivo de cada vez.' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Criar projeto' })).toBeInTheDocument();
  });

  it('permite cadastrar disciplina e conteúdo em Estudos', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^estudos$/i }));

    fireEvent.change(await screen.findByLabelText('Nome'), { target: { value: 'Estrutura de Dados' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar disciplina' }));
    expect(await screen.findByRole('button', { name: /Estrutura de Dados/ })).toBeInTheDocument();

    fireEvent.change(await screen.findByLabelText('Novo conteúdo ou tópico'), { target: { value: 'Listas encadeadas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar conteúdo' }));
    expect(await screen.findByText('Listas encadeadas')).toBeInTheDocument();
  });
  it('abre a biblioteca de arquivos', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^arquivos$/i }));
    expect(await screen.findByText('Sua biblioteca está vazia.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /arquivos/i })).toHaveAttribute('aria-current', 'page');
  });
  it('abre as configurações de backup e restauração', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^configurações$/i }));
    expect(await screen.findByRole('heading', { name: 'Backup local' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar meus dados' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Selecionar backup' })).toBeInTheDocument();
  });

});

