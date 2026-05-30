import React, { useState, useEffect, useCallback } from "react";
import { EmotionType, DiaryEntry, PhysiologicalData } from "@/types";
import { EmotionPicker } from "@/components/ui/EmotionPicker";
import { EmotionBadge } from "@/components/ui/EmotionBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useAppStore } from "@/store/appStore";
import { semanticAlignmentEngine } from "@/lib/semanticAlignment";
import { formatDate } from "@/lib/utils";
import { X, Tag, Plus, Activity, Heart, Save, Sparkles } from "lucide-react";

interface DiaryEditorProps {
  entry?: DiaryEntry;
  onSave?: (entry: DiaryEntry) => void;
  onCancel?: () => void;
}

export const DiaryEditor: React.FC<DiaryEditorProps> = ({ entry, onSave, onCancel }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [mood, setMood] = useState<EmotionType>("neutral");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [includePhysio, setIncludePhysio] = useState(false);
  const [physioData, setPhysioData] = useState<PhysiologicalData | null>(null);

  const { createEntry, updateEntry, error, setError, isLoading } = useAppStore();

  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setContent(entry.content);
      setTags(entry.tags);
      setMood(entry.mood);
      if (entry.physiologicalData) {
        setPhysioData(entry.physiologicalData);
        setIncludePhysio(true);
      }
    }
  }, [entry]);

  const simulatePhysioData = useCallback(() => {
    const data = semanticAlignmentEngine.simulatePhysiologicalData(mood, 0.5);
    setPhysioData(data);
  }, [mood]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsAnalyzing(true);
    try {
      const physiologicalData = includePhysio ? physioData || undefined : undefined;

      if (entry) {
        const updatedEntry = await updateEntry({
          ...entry,
          title: title.trim(),
          content: content.trim(),
          tags,
          mood,
          physiologicalData,
        });
        onSave?.(updatedEntry);
      } else {
        const newEntry = await createEntry(
          title.trim(),
          content.trim(),
          tags,
          mood,
          physiologicalData
        );
        onSave?.(newEntry);
      }

      if (!entry) {
        setTitle("");
        setContent("");
        setTags([]);
        setMood("neutral");
        setIncludePhysio(false);
        setPhysioData(null);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <div className="card p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            标题
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="今天的主题是什么？"
            className="input-field text-lg"
            maxLength={100}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            心情
          </label>
          <EmotionPicker value={mood} onChange={setMood} />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            内容
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="记录今天的心情和发生的事情..."
            className="textarea-field min-h-[200px]"
          />
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{wordCount} 字</span>
            <span>{charCount} 字符</span>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Tag className="w-4 h-4 inline mr-1" />
            标签
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="添加标签后按回车"
              className="input-field flex-1"
              maxLength={20}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="btn-secondary px-4"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-primary-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Activity className="w-4 h-4" />
              生理指标
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includePhysio}
                onChange={(e) => {
                  setIncludePhysio(e.target.checked);
                  if (e.target.checked && !physioData) {
                    simulatePhysioData();
                  }
                }}
                className="w-4 h-4 text-primary-500 rounded"
              />
              <span className="text-sm text-gray-600">包含生理数据</span>
            </label>
          </div>
          {includePhysio && physioData && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Heart className="w-4 h-4 text-red-500" />
                  心率
                </span>
                <span className="text-sm font-medium">
                  {physioData.heartRate} BPM
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">压力水平</span>
                <span className="text-sm font-medium">
                  {physioData.stressLevel}/10
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">睡眠质量</span>
                <span className="text-sm font-medium">
                  {physioData.sleepQuality}/10
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">能量水平</span>
                <span className="text-sm font-medium">
                  {physioData.energyLevel}/10
                </span>
              </div>
              <button
                type="button"
                onClick={simulatePhysioData}
                className="w-full text-sm text-primary-600 hover:text-primary-700 py-2"
              >
                <Sparkles className="w-4 h-4 inline mr-1" />
                重新生成模拟数据
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{formatDate(Date.now())}</span>
          {mood && <EmotionBadge emotion={mood} size="sm" />}
        </div>
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
              disabled={isLoading || isAnalyzing}
            >
              取消
            </button>
          )}
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={!title.trim() || !content.trim() || isLoading || isAnalyzing}
          >
            {isAnalyzing ? (
              <LoadingSpinner size="sm" text="分析中..." />
            ) : (
              <>
                <Save className="w-4 h-4" />
                {entry ? "更新日记" : "保存日记"}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default DiaryEditor;
