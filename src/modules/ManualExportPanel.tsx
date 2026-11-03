import { useEffect, useMemo, useState } from 'react';
import {
  egressAuditRepository,
  egressSettingsRepository,
  memoryRepository,
  studyTopicRepository,
  taskRepository,
} from '../storage/repositories';
import {
  DEFAULT_EGRESS_SETTINGS,
  createEgressAuditEntry,
  type EgressAuditEntry,
  type EgressSettings,
} from './assistant/egressAudit';
import {
  prepareManualExport,
  type EgressDataClass,
  type EgressItem,
  type ManualExportPreview,
} from './assistant/egressPolicy';

interface RecordOption { item: EgressItem; label: string; }
const labels: Record<EgressDataClass, string> = {
  public: 'Pública',
  personal: 'Pessoal',
  academic: 'Acadêmica',
};

export function ManualExportPanel() {
  const [records, setRecords] = useState<RecordOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [safe, setSafe] = useState<string[]>([]);
  const [consent, setConsent] = useState<EgressDataClass[]>([]);
  const [instruction, setInstruction] = useState('Analise o conteúdo e produza um resumo organizado.');
  const [preview, setPreview] = useState<ManualExportPreview | null>(null);
  const [settings, setSettings] = useState<EgressSettings | null>(null);
  const [audit, setAudit] = useState<EgressAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      taskRepository.getAll(),
      studyTopicRepository.getAll(),
      memoryRepository.getAll(),
      egressSettingsRepository.getById('global'),
      egressAuditRepository.getAll(),
    ]).then(([tasks, topics, memories, savedSettings, savedAudit]) => {
      if (!active) return;
      const options: RecordOption[] = [
        ...tasks.map(task => ({ label: `Tarefa · ${task.title}`, item: {
          id: `task:${task.id}`, label: task.title, dataClass: 'personal' as const,
          content: [`Título: ${task.title}`, `Status: ${task.status}`, `Prioridade: ${task.priority}`,
            task.dueDate ? `Prazo: ${task.dueDate}` : '', task.description ? `Descrição: ${task.description}` : ''].filter(Boolean).join('\n'),
        }})),
        ...topics.map(topic => ({ label: `Estudo · ${topic.title}`, item: {
          id: `topic:${topic.id}`, label: topic.title, dataClass: 'academic' as const,
          content: [`Tópico: ${topic.title}`, topic.notes ? `Anotações: ${topic.notes}` : ''].filter(Boolean).join('\n'),
        }})),
        ...memories.map(memory => ({ label: `Memória · ${memory.title}`, item: {
          id: `memory:${memory.id}`, label: memory.title, dataClass: 'personal' as const,
          content: `Título: ${memory.title}\nCategoria: ${memory.category}\nConteúdo: ${memory.content}`,
        }})),
      ];
      setRecords(options);
      setSettings(savedSettings ?? DEFAULT_EGRESS_SETTINGS);
      setAudit(savedAudit.sort((a, b) => b.copiedAt.localeCompare(a.copiedAt)));
      setLoading(false);
    }).catch(() => {
      if (active) {
        setError('Não foi possível carregar os dados e controles locais de privacidade.');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const chosen = useMemo(
    () => records.filter(record => selected.includes(record.item.id)),
    [records, selected],
  );
  const classes = [...new Set(chosen.map(record => record.item.dataClass))];

  function invalidate() {
    setPreview(null);
    setFeedback('');
  }

  function toggle(id: string, checked: boolean) {
    invalidate();
    setConsent([]);
    setSelected(current => checked ? [...current, id] : current.filter(value => value !== id));
    if (!checked) setSafe(current => current.filter(value => value !== id));
  }

  function generate() {
    setError('');
    setFeedback('');
    if (!settings?.enabled) {
      setPreview(null);
      setError('A exportação está desativada. Reative-a nos controles de privacidade antes de continuar.');
      return;
    }
    setPreview(prepareManualExport({
      items: chosen.map(({ item }) => ({ ...item, sensitive: !safe.includes(item.id) })),
      acknowledgedClasses: consent,
      userInitiated: true,
      instruction,
    }));
  }

  async function copy() {
    if (copying || !settings?.enabled || !preview?.decision.allowed || !preview.text) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(preview.text);
      const entry = createEgressAuditEntry({
        classes: preview.decision.classes,
        itemCount: preview.decision.itemCount,
        characterCount: preview.decision.characterCount,
      });
      try {
        await egressAuditRepository.save(entry);
        const savedEntries = await egressAuditRepository.getAll();
        const orderedEntries = savedEntries.sort((a, b) => b.copiedAt.localeCompare(a.copiedAt));
        await Promise.all(orderedEntries.slice(100).map(oldEntry => egressAuditRepository.delete(oldEntry.id)));
        setAudit(orderedEntries.slice(0, 100));
        setFeedback('Copiado. Nenhum dado foi enviado por Alfred. A ação foi registrada apenas com metadados.');
      } catch {
        setFeedback('O texto foi copiado, mas não foi possível salvar o registro de auditoria neste dispositivo.');
      }
      setPreview(null);
      setSelected([]);
      setSafe([]);
      setConsent([]);
    } catch {
      setError('Não foi possível copiar automaticamente. Copie o texto da prévia manualmente; nenhuma cópia foi registrada.');
    } finally {
      setCopying(false);
    }
  }

  async function changeExportAvailability(enabled: boolean) {
    if (savingSettings || !settings) return;
    setSavingSettings(true);
    setError('');
    try {
      const next = { id: 'global' as const, enabled };
      await egressSettingsRepository.save(next);
      setSettings(next);
      invalidate();
      setSelected([]);
      setSafe([]);
      setConsent([]);
      setFeedback(enabled
        ? 'Preparação manual reativada. Será necessário autorizar cada operação novamente.'
        : 'Preparação manual desativada. Nenhum conteúdo poderá ser copiado por este painel.');
    } catch {
      setError('Não foi possível salvar a preferência de privacidade.');
    } finally {
      setSavingSettings(false);
    }
  }

  async function clearAudit() {
    if (!window.confirm('Apagar todo o histórico de auditoria deste dispositivo? Esta ação não pode ser desfeita.')) return;
    try {
      await egressAuditRepository.clear();
      setAudit([]);
      setFeedback('Histórico de auditoria apagado. Nenhum conteúdo de exportação era armazenado nele.');
    } catch {
      setError('Não foi possível apagar o histórico de auditoria.');
    }
  }

  return <section className="assistant-export-panel" aria-labelledby="manual-export-title">
    <header>
      <div><span className="card-label">CONTROLE DE PRIVACIDADE</span><h3 id="manual-export-title">Preparar conteúdo para uma IA externa</h3></div>
      <span>{settings?.enabled ? 'Preparação manual ativa' : 'Preparação desativada'}</span>
    </header>
    <p>Selecione dados locais e prepare um texto para copiar. Alfred não envia nada a outro serviço.</p>
    {!loading && settings && <div className="assistant-export-controls">
      <div><strong>Permitir preparação manual</strong><small>Desativar bloqueia novas prévias e cópias futuras neste painel; não apaga o que já foi copiado.</small></div>
      <button type="button" className={settings.enabled ? 'secondary-action' : 'primary-action'} disabled={savingSettings} onClick={() => void changeExportAvailability(!settings.enabled)}>
        {savingSettings ? 'Salvando…' : settings.enabled ? 'Desativar exportação' : 'Reativar exportação'}
      </button>
    </div>}
    {!loading && !settings?.enabled && <p className="assistant-export-disabled" role="status">Bloqueado: a preparação de conteúdo para serviços externos está desativada neste dispositivo.</p>}
    {loading && <p role="status">Carregando dados locais…</p>}
    {!loading && records.length === 0 && <p>Nenhuma tarefa, tópico de estudo ou memória disponível.</p>}
    {!loading && settings?.enabled && records.length > 0 && <div className="assistant-export-group">
      <strong>1. Selecione os conteúdos</strong>
      {records.map(({ item, label }) => <div className="assistant-export-record" key={item.id}>
        <label><input type="checkbox" checked={selected.includes(item.id)} onChange={event => toggle(item.id, event.target.checked)} /><span>{label}</span><small>{labels[item.dataClass]}</small></label>
        {selected.includes(item.id) && <label className="assistant-export-safe"><input type="checkbox" checked={safe.includes(item.id)} onChange={event => { invalidate(); setConsent([]); setSafe(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id)); }} /><span>Revisei este conteúdo: não contém dados sensíveis.</span></label>}
      </div>)}
    </div>}
    {settings?.enabled && <label className="assistant-export-instruction" htmlFor="manual-export-instruction"><strong>2. O que a IA deve fazer?</strong>
      <textarea id="manual-export-instruction" rows={3} maxLength={500} value={instruction} onChange={event => { setInstruction(event.target.value); setConsent([]); invalidate(); }} />
    </label>}
    {settings?.enabled && <div className="assistant-export-group"><strong>3. Autorize as categorias selecionadas</strong>
      <p>Esta autorização vale somente para esta preparação.</p>
      {classes.length === 0 ? <small>Selecione conteúdos para ver as autorizações necessárias.</small> : classes.map(value => <label key={value}><input type="checkbox" checked={consent.includes(value)} onChange={event => { invalidate(); setConsent(current => event.target.checked ? [...current, value] : current.filter(item => item !== value)); }} />Autorizo incluir informações da categoria {labels[value].toLowerCase()}.</label>)}
    </div>}
    {settings?.enabled && <div className="assistant-export-actions">
      <button type="button" className="primary-action" onClick={generate} disabled={loading || !selected.length || !instruction.trim()}>Gerar prévia exata</button>
      {preview && <button type="button" className="secondary-action" onClick={() => { setPreview(null); setFeedback(''); }}>Descartar prévia</button>}
    </div>}
    {preview && settings?.enabled && <div className="assistant-export-preview" aria-live="polite"><strong>4. Revise antes de copiar</strong>
      {preview.decision.allowed && preview.text ? <>
        <p>{preview.decision.itemCount} item(ns) · {preview.decision.classes.map(value => labels[value]).join(', ')} · {preview.decision.characterCount} caracteres</p>
        <textarea aria-label="Texto exato que será copiado" readOnly rows={12} value={preview.text} />
        <button type="button" className="primary-action" disabled={copying} onClick={() => void copy()}>{copying ? 'Copiando…' : 'Copiar texto revisado'}</button>
      </> : <ul role="alert">{preview.decision.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
    </div>}
    <div className="assistant-export-audit">
      <div><strong>Histórico de auditoria</strong><small>Somente data, categorias e contagens. O texto copiado nunca é armazenado.</small></div>
      {audit.length > 0 && <button type="button" className="secondary-action" onClick={() => void clearAudit()}>Apagar histórico</button>}
      {audit.length === 0 ? <p>Nenhuma cópia registrada.</p> : <ul>{audit.slice(0, 10).map(entry => <li key={entry.id}>
        <span>{new Date(entry.copiedAt).toLocaleString('pt-BR')}</span>
        <span>{entry.classes.map(value => labels[value]).join(', ') || 'Sem categoria'}</span>
        <span>{entry.itemCount} item(ns) · {entry.characterCount} caracteres · {entry.action === 'sent_to_ai' ? 'Enviado à IA' : 'Copiado'}</span>
      </li>)}</ul>}
    </div>
    {error && <p className="module-error" role="alert">{error}</p>}
    {feedback && <p className="module-feedback" role="status">{feedback}</p>}
    <p className="assistant-export-warning">Não inclua senhas, dados médicos, documentos de identificação ou informações de terceiros. Ao colar em outro serviço, aplicam-se também as políticas desse serviço. A auditoria fica somente neste dispositivo.</p>
  </section>;
}
