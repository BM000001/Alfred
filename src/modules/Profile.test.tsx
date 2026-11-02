import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Profile } from './Profile';
import { profileRepository } from '../storage/repositories';

beforeEach(async () => {
  const existing = await profileRepository.getAll();
  await Promise.all(existing.map((item) => profileRepository.delete(item.id)));
});

describe('Profile', () => {
  it('saves the personal profile locally', async () => {
    render(<Profile />);
    fireEvent.change(await screen.findByLabelText('Interesses profissionais'), {
      target: { value: 'Desenvolvimento de software, IA e cibersegurança' },
    });
    fireEvent.change(screen.getByLabelText('Objetivos'), {
      target: { value: 'Desenvolver o Alfred com foco em segurança e privacidade' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));

    await waitFor(async () => {
      expect(await profileRepository.getById('primary')).toMatchObject({
        careerInterests: 'Desenvolvimento de software, IA e cibersegurança',
        goals: 'Desenvolver o Alfred com foco em segurança e privacidade',
      });
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Perfil salvo neste dispositivo.');
  });

  it('informa que os dados do perfil são locais', async () => {
    render(<Profile />);
    expect(await screen.findByText('Seu perfil fica no seu dispositivo.')).toBeInTheDocument();
  });
});
