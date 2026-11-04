import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { disciplineRepository, fileRepository } from '../storage/repositories';
import { createFileService } from './files/fileService';
import type { Discipline } from './studies/types';
import type { FileSummary } from './files/types';

const files = createFileService(fileRepository);
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
export function Files() {
  const [items, setItems] = useState<FileSummary[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [query, setQuery] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState('all');
  const [uploadDiscipline, setUploadDiscipline] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function refresh() {
    const [storedFiles, storedDisciplines] = await Promise.all([files.list(), disciplineRepository.getAll()]);
    setItems(storedFiles);
    setDisciplines(storedDisciplines.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
  }
  useEffect(() => {
    let active = true;
    Promise.all([files.list(), disciplineRepository.getAll()])
      .then(([storedFiles, storedDisciplines]) => {
        if (!active) return;
        setItems(storedFiles);
        setDisciplines(storedDisciplines.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      })
      .catch(() => { if (active) setError('Não foi possível acessar seus arquivos e disciplinas locais.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const visible = useMemo(() => items.filter((item) =>
    item.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')) &&
    (filterDiscipline === 'all' || (filterDiscipline === 'unassigned' ? !item.disciplineId : item.disciplineId === filterDiscipline)),
  ), [items, query, filterDiscipline]);
  async function addFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setError('');
    try { await files.add(selected, uploadDiscipline || undefined); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o arquivo.'); }
    event.target.value = '';
  }
  async function openFile(item: FileSummary) {
    try {
      const stored = await files.get(item.id);
      if (!stored) throw new Error('Arquivo não encontrado.');
      const url = URL.createObjectURL(stored.blob);
      const link = document.createElement('a');
      link.href = url; link.download = stored.name; link.target = '_blank'; link.rel = 'noopener';
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível abrir o arquivo.'); }
  }
  async function removeFile(item: FileSummary) {
    if (!window.confirm(`Excluir "${item.name}" do Alfred? Essa ação não pode ser desfeita.`)) return;
    try { await files.delete(item.id); await refresh(); }
    catch { setError('Não foi possível excluir o arquivo.'); }
  }
  function disciplineName(id?: string): string {
    return disciplines.find((discipline) => discipline.id === id)?.name ?? 'Sem disciplina';
  }
  return <section className="files-module">
    {error && <p className="module-error" role="alert">{error}</p>}
    <div className="files-toolbar">
      <label className="file-upload-button">Adicionar arquivo<input type="file" onChange={addFile} aria-label="Selecionar arquivo" /></label>
      <span className="optional-label">Armazenamento local · até 10 MB por arquivo</span>
    </div>
    <label className="field-label" htmlFor="file-discipline">Vincular novo arquivo à disciplina <span className="optional-label">· opcional</span></label>
    <select id="file-discipline" value={uploadDiscipline} onChange={(event) => setUploadDiscipline(event.target.value)}>
      <option value="">Sem disciplina</option>
      {disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}
    </select>
    <label className="field-label" htmlFor="file-search">Pesquisar arquivos</label>
    <input id="file-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite o nome do arquivo..." />
    <label className="field-label" htmlFor="file-filter-discipline">Filtrar por disciplina</label>
    <select id="file-filter-discipline" value={filterDiscipline} onChange={(event) => setFilterDiscipline(event.target.value)}>
      <option value="all">Todas as disciplinas</option>
      <option value="unassigned">Sem disciplina</option>
      {disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}
    </select>
    {loading ? <p className="module-feedback">Carregando arquivos...</p> : visible.length === 0 ?
      <div className="empty-state"><strong>{items.length ? 'Nenhum resultado encontrado.' : 'Sua biblioteca está vazia.'}</strong><p>Adicione materiais de estudo, documentos e outros arquivos para mantê-los organizados neste dispositivo.</p></div> :
      <div className="stored-file-list">{visible.map((item) => <article className="stored-file" key={item.id}>
        <span className="stored-file-icon" aria-hidden="true">▤</span>
        <div className="stored-file-info"><strong>{item.name}</strong><span>{formatSize(item.size)} · {new Date(item.createdAt).toLocaleDateString('pt-BR')} · {disciplineName(item.disciplineId)}</span></div>
        <button className="text-action" type="button" onClick={() => void openFile(item)}>Abrir</button>
        <button className="text-action" type="button" onClick={() => void removeFile(item)}>Excluir</button>
      </article>)}</div>}
  </section>;
}
