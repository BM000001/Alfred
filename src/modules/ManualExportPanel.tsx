import { useEffect, useMemo, useState } from 'react';
import { memoryRepository, studyTopicRepository, taskRepository } from '../storage/repositories';
import { prepareManualExport, type EgressDataClass, type EgressItem, type ManualExportPreview } from './assistant/egressPolicy';

interface RecordOption { item: EgressItem; label: string; }
const labels: Record<EgressDataClass, string> = { public: 'Pública', personal: 'Pessoal', academic: 'Acadêmica' };

export function ManualExportPanel() {
  const [records, setRecords] = useState<RecordOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [safe, setSafe] = useState<string[]>([]);
  const [consent, setConsent] = useState<EgressDataClass[]>([]);
  const [instruction, setInstruction] = useState('Analise o conteúdo e produza um resumo organizado.');
  const [preview, setPreview] = useState<ManualExportPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([taskRepository.getAll(), studyTopicRepository.getAll(), memoryRepository.getAll()])
      .then(([tasks, topics, memories]) => {
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
        setLoading(false);
      }).catch(() => { if (active) { setError('Não foi possível carregar os dados locais.'); setLoading(false); } });
    return () => { active = false; };
  }, []);

  const chosen = useMemo(() => records.filter(record => selected.includes(record.item.id)), [records, selected]);
  const classes = [...new Set(chosen.map(record => record.item.dataClass))];
  function invalidate() { setPreview(null); setFeedback(''); }
  function toggle(id: string, checked: boolean) {
    invalidate();
    setSelected(current => checked ? [...current, id] : current.filter(value => value !== id));
    if (!checked) setSafe(current => current.filter(value => value !== id));
  }
  function generate() {
    setError('');
    setPreview(prepareManualExport({
      items: chosen.map(({ item }) => ({ ...item, sensitive: !safe.includes(item.id) })),
      acknowledgedClasses: consent,
      userInitiated: true,
      instruction,
    }));
  }
  async function copy() {
    if (!preview?.decision.allowed || !preview.text) return;
    try {
      await navigator.clipboard.writeText(preview.text);
      setFeedback('Copiado. Nenhum dado foi enviado por Alfred.');
    } catch { setError('Não foi possível copiar automaticamente. Copie o texto da prévia manualmente.'); }
  }

  return <section className="assistant-export-panel" aria-labelledby="manual-export-title">
    <header><div><span className="card-label">CONTROLE DE PRIVACIDADE</span><h3 id="manual-export-title">Preparar conteúdo para uma IA externa</h3></div><span>Sem envio automático</span></header>
    <p>Selecione dados locais e prepare um texto para copiar. Alfred não envia nada a outro serviço.</p>
    {loading && <p role="status">Carregando dados locais…</p>}
    {!loading && records.length === 0 && <p>Nenhuma tarefa, tópico de estudo ou memória disponível.</p>}
    {!loading && records.length > 0 && <div className="assistant-export-group">
      <strong>1. Selecione os conteúdos</strong>
      {records.map(({ item, label }) => <div className="assistant-export-record" key={item.id}>
        <label><input type="checkbox" checked={selected.includes(item.id)} onChange={event => toggle(item.id, event.target.checked)} /><span>{label}</span><small>{labels[item.dataClass]}</small></label>
        {selected.includes(item.id) && <label className="assistant-export-safe"><input type="checkbox" checked={safe.includes(item.id)} onChange={event => { invalidate(); setSafe(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id)); }} /><span>Revisei este conteúdo: não contém dados sensíveis.</span></label>}
      </div>)}
    </div>}
    <label className="assistant-export-instruction" htmlFor="manual-export-instruction"><strong>2. O que a IA deve fazer?</strong>
      <textarea id="manual-export-instruction" rows={3} maxLength={500} value={instruction} onChange={event => { setInstruction(event.target.value); invalidate(); }} />
    </label>
    <div className="assistant-export-group"><strong>3. Autorize as categorias selecionadas</strong>
      <p>Esta autorização vale somente para esta preparação.</p>
      {classes.length === 0 ? <small>Selecione conteúdos para ver as autorizações necessárias.</small> : classes.map(value => <label key={value}><input type="checkbox" checked={consent.includes(value)} onChange={event => { invalidate(); setConsent(current => event.target.checked ? [...current, value] : current.filter(item => item !== value)); }} />Autorizo incluir informações da categoria {labels[value].toLowerCase()}.</label>)}
    </div>
    <div className="assistant-export-actions"><button type="button" className="primary-action" onClick={generate} disabled={loading || !selected.length || !instruction.trim()}>Gerar prévia exata</button>
      {preview && <button type="button" className="secondary-action" onClick={() => { setPreview(null); setFeedback(''); }}>Descartar prévia</button>}
    </div>
    {preview && <div className="assistant-export-preview" aria-live="polite"><strong>4. Revise antes de copiar</strong>
      {preview.decision.allowed && preview.text ? <>
        <p>{preview.decision.itemCount} item(ns) · {preview.decision.classes.map(value => labels[value]).join(', ')} · {preview.decision.characterCount} caracteres</p>
        <textarea aria-label="Texto exato que será copiado" readOnly rows={12} value={preview.text} />
        <button type="button" className="primary-action" onClick={() => void copy()}>Copiar texto revisado</button>
      </> : <ul role="alert">{preview.decision.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
    </div>}
    {error && <p className="module-error" role="alert">{error}</p>}{feedback && <p className="module-feedback" role="status">{feedback}</p>}
    <p className="assistant-export-warning">Não inclua senhas, dados médicos, documentos de identificação ou informações de terceiros. Ao colar em outro serviço, aplicam-se também as políticas desse serviço.</p>
  </section>;
}
