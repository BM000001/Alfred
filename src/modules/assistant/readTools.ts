import type { Appointment } from '../agenda/types';
import type { Task } from '../tasks/types';
import type { StudyTopic } from '../studies/types';
import type { StudyFlashcard } from '../studies/flashcardTypes';
import type { StudyQuestion, StudyQuizAttempt } from '../studies/questionTypes';
import { isFlashcardDue } from '../studies/flashcardService';
import { summarizeStudyPerformance } from '../studies/studyPerformance';
import type { ToolDefinition } from './contracts';

export interface ReadToolData {
  tasks: Task[];
  appointments: Appointment[];
  topics: StudyTopic[];
  flashcards?: StudyFlashcard[];
  questions?: StudyQuestion[];
  quizAttempts?: StudyQuizAttempt[];
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
  const flashcards = data.flashcards ?? [];
  const questions = data.questions ?? [];
  const quizAttempts = data.quizAttempts ?? [];
  return [
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
      description: 'Consulta progresso dos estudos, flashcards vencidos, questões, tentativas e desempenho por tópico.',
      risk: 'read',
      approval: 'never',
      async execute(input) {
        const topics = data.topics.filter((topic) => !input.query || matches(topic.title, input.query));
        const topicIds = new Set(topics.map(topic => topic.id));
        const selectedDisciplineIds = new Set(topics.map(topic => topic.disciplineId));
        const dueCards = flashcards.filter(card => isFlashcardDue(card, now) &&
          (!input.query || selectedDisciplineIds.has(card.disciplineId)));
        const scopedQuestions = questions.filter(question =>
          !input.query || (question.topicId ? topicIds.has(question.topicId) : matches(question.prompt, input.query)),
        );
        const scopedQuestionIds = new Set(scopedQuestions.map(question => question.id));
        const scopedAttempts = quizAttempts.filter(attempt =>
          attempt.answers.some(answer => scopedQuestionIds.has(answer.questionId)),
        );
        const completed = topics.filter((topic) => topic.status === 'completed').length;
        const performance = summarizeStudyPerformance(topics, scopedQuestions, scopedAttempts);
        const answered = performance.reduce((sum, topic) => sum + topic.answered, 0);
        const correct = performance.reduce((sum, topic) => sum + topic.correct, 0);
        const items = [
          `${dueCards.length} flashcard(s) vencido(s) de ${flashcards.length} cadastrado(s).`,
          `${scopedQuestions.length} questão(ões) disponível(is); ${scopedAttempts.length} tentativa(s) de simulado relacionada(s).`,
          answered
            ? `Desempenho nas questões: ${Math.round(correct / answered * 100)}% de acerto em ${answered} resposta(s).`
            : 'Ainda não há respostas registradas para os tópicos consultados.',
          ...performance.slice(0, 10).map(topic =>
            `${topic.title}: ${topic.accuracy}% de acerto (${topic.correct}/${topic.answered}); ${topic.incorrect} erro(s).`,
          ),
        ];
        return {
          summary: `${completed} de ${topics.length} tópico(s) concluído(s).`,
          items,
        };
      },
    },
  ];
}
