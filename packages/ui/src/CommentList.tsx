"use client";

import { CommentItem } from "./CommentItem";

interface CommentData {
  id: string;
  projectId: string;
  content: unknown;
  authorName: string;
  authorAvatar: string | null;
  pinned: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface CommentListProps {
  comments: CommentData[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export function CommentList({
  comments,
  onEdit,
  onDelete,
  onTogglePin,
}: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-400">No updates yet. Write the first one!</p>
      </div>
    );
  }

  return (
    <div>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePin={onTogglePin}
        />
      ))}
    </div>
  );
}
