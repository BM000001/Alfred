import { useState, type ChangeEvent } from 'react';
import { createBackup, inspectBackup, restoreBackup } from './backup/backupService';

type BackupPreview = ReturnType<typeof inspectBackup>;

const labels: Record<string, string> = {
  tasks: 'Tarefas', projects: 'Projetos', appointments: 'Compromissos',
  disciplines: 'Disciplinas', studyTopics: 'Conteúdos de estudo', files: 'Arquivos',
};

export function BackupSettings() {
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  async function exportData() {
    setBusy(true); setError(''); setFeedback('');
    try {
      const json = await createBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `alfred-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
      setFeedback('Backup gerado. Guarde o arquivo em um local seguro.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível gerar o backup.'); }
    finally { setBusy(false); }
  }

  async function selectBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview(null); setError(''); setFeedback('');
    if (!file) return;
    try {
      if (file.size > 100 * 1024 * 1024) throw new Error('O backup excede o limite de 100 MB.');
      setPreview(inspectBackup(await file.text()));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível ler o backup.'); }
    event.target.value = '';
  }

  async function confirmRestore() {
    if (!preview || !window.confirm('Atenção: a restauração substituirá todos os dados atuais do Alfred neste dispositivo. Essa ação não pode ser desfeita. Deseja continuar?')) return;
    setBusy(true); setError(''); setFeedback('');
    try {
      await restoreBackup(preview.payload);
      setFeedback('Backup restaurado. Recarregue a página para atualizar todos os módulos.');
      setPreview(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível restaurar o backup.'); }
    finally { setBusy(false); }
  }

  return <section className="backup-settings">
    <article className="entry-panel">
      <span className="card-label">PROTEÇÃO DOS SEUS DADOS</span>
      <h2>Backup local</h2>
      <p>Exporte tarefas, projetos, agenda, estudos e arquivos em um único documento. O Alfred não envia esses dados para um servidor.</p>
      <button className="primary-action" type="button" disabled={busy} onClick={() => void exportData()}>{busy ? 'Processando...' : 'Exportar meus dados'}</button>
    </article>
    <article className="entry-panel">
      <span className="card-label">RECUPERAÇÃO</span>
      <h2>Restaurar backup</h2>
      <p>Selecione um backup JSON criado pelo Alfred. Antes de restaurar, você poderá conferir o conteúdo. A restauração substitui os dados atuais deste dispositivo.</p>
      <label className="file-upload-button">Selecionar backup<input type="file" accept="application/json,.json" aria-label="Selecionar arquivo de backup" onChange={selectBackup} disabled={busy} /></label>
      {preview && <div className="backup-preview" aria-live="polite">
        <strong>Backup de {new Date(preview.createdAt).toLocaleString('pt-BR')}</strong>
        <ul>{Object.entries(preview.counts).map(([key, count]) => <li key={key}>{labels[key]}: {count}</li>)}</ul>
        <button className="primary-action danger-action" type="button" disabled={busy} onClick={() => void confirmRestore()}>Substituir dados e restaurar</button>
      </div>}
    </article>
    {error && <p className="module-error" role="alert">{error}</p>}
    {feedback && <p className="module-feedback" role="status">{feedback}</p>}
  </section>;
}
