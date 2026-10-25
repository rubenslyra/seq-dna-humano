import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/presenter')({
  server: { handlers: { POST: async ({ request }) => {
    const { handlePresenterAnswer } = await import('@/lib/presenter/answer.server');
    return handlePresenterAnswer(request);
  } } },
});