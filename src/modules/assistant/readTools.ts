import type { Appointment } from '../agenda/types';
import type { Task } from '../tasks/types';
import type { StudyTopic } from '../studies/types';
import type { ToolDefinition } from './contracts';
import type { PersonalProfile } from '../profile/types';

export interface ReadToolData {
  tasks: Task[];
  appointments: Appointment[];
  topics: StudyTopic[];
  profile?: PersonalProfile;
  now?: Date;
}

export interface ReadToolInput {
  query?: string;
}

export interface ReadToolResult {
  summary: string;
  items: string[];
}

function matches(value: string, query: string): boolean {
  return value.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'));
}

export function createReadOnlyTools(data: ReadToolData): ToolDefinition<ReadToolInput, ReadToolResult>[] {
  const now = data.now ?? new Date();
  return [
    {
      id: 'profile.read',
      description: 'Consulta o perfil pessoal salvo localmente.',
      risk: 'read',
      approval: 'never',
      async execute() {
        const profile = data.profile;
        if (!profile) return { summary: 'Ainda não há perfil salvo.', items: ['Abra Meu perfil para preencher ou importar suas informações.'] };
        const fields = [
          ['Como chamar', profile.preferredName],
          ['Estudos e formação', profile.education],
          ['Interesses profissionais', profile.careerInterests],
          ['Objetivos', profile.goals],
          ['Preferências de aprendizagem', profile.learningPreferences],
          ['Como Alfred deve ajudar', profile.assistantPreferences],
        ];
        const items = fields.filter(([, value]) => value.trim()).map(([label, value]) => label + ': ' + value);
        return { summary: items.length ? 'Informações do seu perfil local.' : 'Seu perfil ainda está vazio.', items: items.length ? items : ['Abra Meu perfil para preencher ou importar suas informações.'] };
      },
    },
    {
      id: 'tasks.list',
      description: 'Consulta tarefas pendentes ou todas as tarefas locais.',
      risk: 'read',
      approval: 'never',
      async execute(input) {
        const items = data.tasks.filter((task) => task.status === 'pending' &&
          (!input.query || matches(task.title, input.query) || matches(task.description ?? '', input.query)));
        return { summary: items.length ? `${items.length} tarefa(s) pendente(s) encontrada(s).` : 'Nenhuma tarefa pendente encontrada.', items: items.map((task) => `${task.title}${task.dueDate ? ` — prazo ${task.dueDate}` : ''}`) };
      },
    },
    {
      id: 'agenda.upcoming',
      description: 'Consulta compromissos futuros locais.',
      risk: 'read',
      approval: 'never',
      async execute(input) {
        const items = data.appointments.filter((item) => item.status === 'scheduled' &&
          Date.parse(item.startsAt) >= now.getTime() &&
          (!input.query || matches(item.title, input.query) || matches(item.description ?? '', input.query)))
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 10);
        return { summary: items.length ? `${items.length} compromisso(s) futuro(s) encontrado(s).` : 'Nenhum compromisso futuro encontrado.', items: items.map((item) => `${item.title} — ${new Date(item.startsAt).toLocaleString('pt-BR')}`) };
      },
    },
    {
      id: 'studies.progress',
      description: 'Consulta tópicos e progresso dos estudos locais.',
      risk: 'read',
      approval: 'never',
      async execute(input) {
        const topics = data.topics.filter((topic) => !input.query || matches(topic.title, input.query));
        const completed = topics.filter((topic) => topic.status === 'completed').length;
        return { summary: `${completed} de ${topics.length} tópico(s) concluído(s).`, items: topics.slice(0, 20).map((topic) => `${topic.title} — ${topic.status === 'completed' ? 'concluído' : 'pendente'}`) };
      },
    },
  ];
}
