import { IntelligenceConsole } from './IntelligenceConsole';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { boardId: string };
  searchParams: {
    widget?: string;
    config?: string;
    filter?: string;
    period?: string;
    from?: string;
    to?: string;
  };
}

export default async function BoardIntelligencePage({ params, searchParams }: PageProps) {
  return (
    <IntelligenceConsole
      boardId={params.boardId}
      initialWidget={searchParams.widget}
      initialConfig={searchParams.config}
      initialFilter={searchParams.filter}
    />
  );
}
