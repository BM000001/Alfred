import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { profileRepository } from '../storage/repositories';
import type { PersonalProfile } from './profile/types';

const EMPTY_PROFILE: PersonalProfile = {
  id: 'primary',
  preferredName: '',
  education: '',
  careerInterests: '',
  goals: '',
  learningPreferences: '',
  assistantPreferences: '',
  updatedAt: '',
};

function isProfile(value: unknown): value is Omit<PersonalProfile, 'id' | 'updatedAt'> {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return ['preferredName', 'education', 'careerInterests', 'goals', 'learningPreferences', 'assistantPreferences']
    .every((key) => typeof candidate[key] === 'string');
}

export function Profile() {
  const [profile, setProfile] = useState<PersonalProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let active = true;
    profileRepository.getById('primary')
      .then((saved) => { if (active && saved) setProfile(saved); })
      .catch(() => { if (active) setError('Não foi possível carregar o perfil salvo neste dispositivo.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function update(field: keyof Omit<PersonalProfile, 'id' | 'updatedAt'>, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
    setFeedback('');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFeedback('');
    try {
      const saved = { ...profile, id: 'primary', updatedAt: new Date().toISOString() };
      await profileRepository.save(saved);
      setProfile(saved);
      setFeedback('Perfil salvo neste dispositivo.');
    } catch {
      setError('Não foi possível salvar o perfil. Verifique o armazenamento do navegador.');
    }
  }

  async function importProfile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setFeedback('');
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const raw = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
      const candidate = raw.profile ?? parsed;
      if (!isProfile(candidate)) throw new Error('Formato inválido');
      setProfile({ ...candidate, id: 'primary', updatedAt: new Date().toISOString() } as PersonalProfile);
      setFeedback('Perfil importado para o formulário. Pressione “Salvar perfil” para gravá-lo localmente.');
    } catch {
      setError('Arquivo inválido. Selecione um JSON de perfil do Alfred com os campos esperados.');
    }
  }

  function exportProfile() {
    const payload = {
      schemaVersion: 1,
      profile: {
        preferredName: profile.preferredName,
        education: profile.education,
        careerInterests: profile.careerInterests,
        goals: profile.goals,
        learningPreferences: profile.learningPreferences,
        assistantPreferences: profile.assistantPreferences,
      },
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'perfil-alfred.json';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (loading) return <p className="module-feedback">Carregando seu perfil local...</p>;

  return (
    <section className="profile-module">
      <div className="profile-privacy"><strong>Seu perfil fica no seu dispositivo.</strong><p>Os dados são salvos no IndexedDB deste navegador. Eles não são enviados a um servidor por esta tela e não devem ser colocados no repositório público.</p></div>
      {error && <p role="alert" className="module-error">{error}</p>}
      {feedback && <p role="status" className="profile-feedback">{feedback}</p>}
      <form className="entry-panel" onSubmit={(event) => void save(event)}>
        <span className="card-label">MEU PERFIL</span>
        <h2>O que Alfred deve saber sobre você?</h2>
        <label className="field-label" htmlFor="profile-name">Como prefere ser chamado? <span className="optional-label">· opcional</span></label>
        <input id="profile-name" value={profile.preferredName} onChange={(event) => update('preferredName', event.target.value)} maxLength={80} autoComplete="nickname" />
        <label className="field-label" htmlFor="profile-education">Estudos e formação</label>
        <textarea id="profile-education" value={profile.education} onChange={(event) => update('education', event.target.value)} rows={3} maxLength={2000} placeholder="Sua formação atual, assuntos estudados e objetivos acadêmicos." />
        <label className="field-label" htmlFor="profile-interests">Interesses profissionais</label>
        <textarea id="profile-interests" value={profile.careerInterests} onChange={(event) => update('careerInterests', event.target.value)} rows={3} maxLength={2000} placeholder="Áreas, tecnologias e carreiras que interessam a você." />
        <label className="field-label" htmlFor="profile-goals">Objetivos</label>
        <textarea id="profile-goals" value={profile.goals} onChange={(event) => update('goals', event.target.value)} rows={3} maxLength={3000} placeholder="Metas de curto e longo prazo." />
        <label className="field-label" htmlFor="profile-learning">Como prefere aprender</label>
        <textarea id="profile-learning" value={profile.learningPreferences} onChange={(event) => update('learningPreferences', event.target.value)} rows={3} maxLength={2000} placeholder="Explicações, exercícios, exemplos e formatos que ajudam você." />
        <label className="field-label" htmlFor="profile-assistant">Como Alfred deve ajudar</label>
        <textarea id="profile-assistant" value={profile.assistantPreferences} onChange={(event) => update('assistantPreferences', event.target.value)} rows={3} maxLength={3000} placeholder="Preferências de organização, privacidade, autonomia e confirmação de ações." />
        <div className="profile-actions">
          <button className="primary-action" type="submit">Salvar perfil</button>
          <button className="secondary-action" type="button" onClick={exportProfile}>Exportar JSON</button>
          <label className="secondary-action profile-import">Importar JSON<input type="file" accept="application/json,.json" onChange={(event) => void importProfile(event)} /></label>
        </div>
      </form>
    </section>
  );
}
