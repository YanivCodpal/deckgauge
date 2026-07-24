import { BoardUnifiedTabsHost } from '../../components/tabs/BoardUnifiedTabsHost';

export default function BoardSubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { boardId: string };
}) {
  return (
    <>
      <BoardUnifiedTabsHost boardId={params.boardId} />
      {children}
    </>
  );
}
