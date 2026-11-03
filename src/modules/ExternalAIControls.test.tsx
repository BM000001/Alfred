import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExternalAIControls } from './ExternalAIControls';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ExternalAIControls', () => {
  it('exige login, categorias e revisão antes de autorizar um envio', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    const onAuthorizationChange = vi.fn();
    const onAuthenticatedChange = vi.fn();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ configured: true, authenticated: false, aiEnabled: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ authenticated: true }) });
    vi.stubGlobal('fetch', fetchMock);

    render(<ExternalAIControls
      authorized={false}
      onModeChange={onModeChange}
      onAuthorizationChange={onAuthorizationChange}
      onAuthenticatedChange={onAuthenticatedChange}
    />);

    await user.type(await screen.findByLabelText('Senha de acesso do Alfred'), 'senha-de-teste');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    await screen.findByText('Sessão ativa');
    expect(onAuthenticatedChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole('button', { name: 'Ativar IA externa' }));
    expect(onModeChange).toHaveBeenLastCalledWith(true);
    await user.click(screen.getByLabelText('Pessoal'));
    await user.click(screen.getByLabelText(/Revisei a mensagem atual/));
    await user.click(screen.getByRole('button', { name: 'Autorizar somente o próximo envio' }));

    expect(onAuthorizationChange).toHaveBeenLastCalledWith({
      confirmed: true,
      reviewedSensitive: true,
      classes: ['personal'],
    });
  });

  it('mantém a IA externa indisponível quando a API não existe', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Not found'));
    vi.stubGlobal('fetch', fetchMock);
    render(<ExternalAIControls
      authorized={false}
      onModeChange={vi.fn()}
      onAuthorizationChange={vi.fn()}
      onAuthenticatedChange={vi.fn()}
    />);

    expect(await screen.findByText(/backend ainda não está publicado/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ativar IA externa' })).not.toBeInTheDocument();
  });
});
