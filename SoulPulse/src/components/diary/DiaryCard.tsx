import React from "react";
import { DiaryEntry } from "@/types";
import { EmotionBadge } from "@/components/ui/EmotionBadge";
import { getSentimentLabel } from "@/lib/sentiment";
import { formatTimeAgo, formatDate } from "@/lib/utils";
import { Lock, Eye, Edit2, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiaryCardProps {
  entry: DiaryEntry;
  onView: (entry: DiaryEntry) => void;
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (entry: DiaryEntry) => void;
  className?: string;
}

export const DiaryCard: React.FC<DiaryCardProps> = ({
  entry,
  onView,
  onEdit,
  onDelete,
  className,
}) => {
  const sentimentLabel = getSentimentLabel(entry.sentimentLevel);
  const sentimentColor =
    entry.sentimentScore > 0.2
      ? "text-green-600"
      : entry.sentimentScore < -0.2
      ? "text-red-600"
      : "text-gray-600";

  const preview = entry.content.length > 150
    ? entry.content.substring(0, 150) + "..."
    : entry.content;

  return (
    <div
      className={cn(
        "card p-5 hover:shadow-lg transition-all duration-300 group",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <EmotionBadge emotion={entry.mood} intensity={entry.emotionVector[entry.mood]} size="sm" />
          {entry.isEncrypted && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Lock className="w-3 h-3" />
              已加密
            </span>
          )}
        </div>
        <span className={cn("text-xs font-medium", sentimentColor)}>
          {sentimentLabel}
        </span>
      </div>

      <h3
        className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1 cursor-pointer hover:text-primary-600 transition-colors"
        onClick={() => onView(entry)}
      >
        {entry.title}
      </h3>

      <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
        {preview}
      </p>

      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {entry.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              #{tag}
            </span>
          ))}
          {entry.tags.length > 3 && (
            <span className="px-2 py-0.5 text-gray-400 text-xs">
              +{entry.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span title={formatDate(entry.createdAt)}>
            {formatTimeAgo(entry.createdAt)}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onView(entry)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-primary-600"
            title="查看详情"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(entry)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-primary-600"
            title="编辑"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(entry)}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-500 hover:text-red-600"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {entry.semanticAlignment && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">语义对齐</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                  style={{ width: `${entry.semanticAlignment.alignmentConfidence * 100}%` }}
                />
              </div>
              <span className="text-gray-600 font-medium">
                {Math.round(entry.semanticAlignment.alignmentConfidence * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiaryCard;
