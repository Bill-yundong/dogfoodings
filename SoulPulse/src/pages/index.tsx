import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAppStore } from "@/store/appStore";
import { Layout } from "@/components/layout/Layout";
import { DiaryEditor } from "@/components/diary/DiaryEditor";
import { DiaryList } from "@/components/diary/DiaryList";
import { DiaryDetail } from "@/components/diary/DiaryDetail";
import { DiaryEntry } from "@/types";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Plus, X, FileText, Sparkles } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<DiaryEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DiaryEntry | null>(null);

  const { entries, isLoading, error, setError, deleteEntry, loadEntries, generateInsights } =
    useAppStore();

  const searchQuery = router.query.q as string | undefined;

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleCreateEntry = () => {
    setEditingEntry(null);
    setShowEditor(true);
  };

  const handleEditEntry = (entry: DiaryEntry) => {
    setViewingEntry(null);
    setEditingEntry(entry);
    setShowEditor(true);
  };

  const handleViewEntry = (entry: DiaryEntry) => {
    setViewingEntry(entry);
  };

  const handleSaveEntry = () => {
    setShowEditor(false);
    setEditingEntry(null);
    loadEntries();
    generateInsights();
  };

  const handleCancelEdit = () => {
    setShowEditor(false);
    setEditingEntry(null);
  };

  const handleDeleteEntry = async (entry: DiaryEntry) => {
    try {
      await deleteEntry(entry.id);
      setDeleteConfirm(null);
      loadEntries();
    } catch (err) {
      console.error("Failed to delete entry:", err);
    }
  };

  if (isLoading && entries.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" text="加载中..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout onCreateEntry={handleCreateEntry}>
      {error && (
        <ErrorMessage
          message={error}
          onDismiss={() => setError(null)}
          className="mb-6"
        />
      )}

      {showEditor ? (
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {editingEntry ? (
                <>
                  <Sparkles className="w-6 h-6 text-primary-500" />
                  编辑日记
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6 text-primary-500" />
                  写新日记
                </>
              )}
            </h1>
            <button
              onClick={handleCancelEdit}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <DiaryEditor
            entry={editingEntry || undefined}
            onSave={handleSaveEntry}
            onCancel={handleCancelEdit}
          />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary-500" />
                我的日记
              </h1>
              <p className="text-gray-500 mt-1">
                共 {entries.length} 篇日记
                {searchQuery && ` · 搜索: "${searchQuery}"`}
              </p>
            </div>
            <button
              onClick={handleCreateEntry}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-primary-500/30 transition-all"
            >
              <Plus className="w-5 h-5" />
              写日记
            </button>
          </div>

          <DiaryList
            entries={entries}
            isLoading={isLoading}
            onView={handleViewEntry}
            onEdit={handleEditEntry}
            onDelete={(entry) => setDeleteConfirm(entry)}
            searchQuery={searchQuery}
          />
        </>
      )}

      {viewingEntry && (
        <DiaryDetail
          entry={viewingEntry}
          onClose={() => setViewingEntry(null)}
          onEdit={handleEditEntry}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              确认删除
            </h3>
            <p className="text-gray-600 mb-6">
              确定要删除这篇日记吗？此操作无法撤销，所有相关的分析数据也将被删除。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteEntry(deleteConfirm)}
                className="btn-danger flex-1"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
