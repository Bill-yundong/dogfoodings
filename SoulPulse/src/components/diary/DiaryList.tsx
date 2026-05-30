import React from "react";
import { DiaryEntry } from "@/types";
import { DiaryCard } from "@/components/diary/DiaryCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { FileText, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiaryListProps {
  entries: DiaryEntry[];
  isLoading?: boolean;
  onView: (entry: DiaryEntry) => void;
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (entry: DiaryEntry) => void;
  className?: string;
  searchQuery?: string;
}

export const DiaryList: React.FC<DiaryListProps> = ({
  entries,
  isLoading,
  onView,
  onEdit,
  onDelete,
  className,
  searchQuery,
}) => {
  const filteredEntries = searchQuery
    ? entries.filter(
        (entry) =>
          entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : entries;

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-16", className)}>
        <LoadingSpinner size="lg" text="加载日记中..." />
      </div>
    );
  }

  if (filteredEntries.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-16 text-center",
          className
        )}
      >
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          {searchQuery ? (
            <Search className="w-8 h-8 text-gray-400" />
          ) : (
            <FileText className="w-8 h-8 text-gray-400" />
          )}
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {searchQuery ? "未找到匹配的日记" : "还没有日记"}
        </h3>
        <p className="text-gray-500 max-w-sm">
          {searchQuery
            ? "尝试使用其他关键词搜索，或清除搜索条件查看所有日记。"
            : "开始记录你的第一篇日记，探索内心的情绪世界吧！"}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
        className
      )}
    >
      {filteredEntries.map((entry) => (
        <DiaryCard
          key={entry.id}
          entry={entry}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          className="animate-fade-in"
        />
      ))}
    </div>
  );
};

export default DiaryList;
