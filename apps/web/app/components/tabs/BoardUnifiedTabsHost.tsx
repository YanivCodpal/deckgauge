'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BoardUnifiedTabs, type BoardSection } from './BoardUnifiedTabs';
import { BoardSettingsDrawer } from '../BoardSettingsDrawer';
import { fetchViews } from '../../actions/views';

interface View {
  id: string;
  type: 'BOARD' | 'DASHBOARD' | 'ROADMAP';
  name: string;
  position: number;
}

export function BoardUnifiedTabsHost({ boardId }: { boardId: string }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [views, setViews] = useState<View[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    fetchViews(boardId)
      .then((data: View[]) => setViews(data))
      .catch(() => setViews([]));
  }, [boardId]);

  const activeSection: BoardSection | null = pathname.endsWith('/sources')
    ? 'sources'
    : pathname.includes('/intelligence')
    ? 'intelligence'
    : null;

  const onViewChange = (viewId: string) => {
    router.push(`/?boardId=${boardId}&viewId=${viewId}`);
  };

  return (
    <div className="relative">
      <BoardUnifiedTabs
        boardId={boardId}
        views={views}
        activeViewId={views[0]?.id ?? ''}
        activeSection={activeSection}
        onViewChange={onViewChange}
        canEdit={false}
        onSettingsClick={() => setSettingsOpen((v) => !v)}
      />
      <BoardSettingsDrawer
        boardId={boardId}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
