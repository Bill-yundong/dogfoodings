export const SemanticLevel = {
  INFORMATIONAL: 'informational',
  WARNING: 'warning',
  CRITICAL: 'critical',
  EMERGENCY: 'emergency'
} as const;

export type SemanticLevel = typeof SemanticLevel[keyof typeof SemanticLevel];

export const SemanticLevelLabel: Record<SemanticLevel, string> = {
  [SemanticLevel.INFORMATIONAL]: '信息',
  [SemanticLevel.WARNING]: '警告',
  [SemanticLevel.CRITICAL]: '严重',
  [SemanticLevel.EMERGENCY]: '紧急'
};

export const SemanticLevelColor: Record<SemanticLevel, string> = {
  [SemanticLevel.INFORMATIONAL]: '#2196F3',
  [SemanticLevel.WARNING]: '#FFC107',
  [SemanticLevel.CRITICAL]: '#FF9800',
  [SemanticLevel.EMERGENCY]: '#F44336'
};

export const SemanticLevelPriority: Record<SemanticLevel, number> = {
  [SemanticLevel.INFORMATIONAL]: 0,
  [SemanticLevel.WARNING]: 1,
  [SemanticLevel.CRITICAL]: 2,
  [SemanticLevel.EMERGENCY]: 3
};

export const SemanticSyncDelay: Record<SemanticLevel, number> = {
  [SemanticLevel.INFORMATIONAL]: 1000,
  [SemanticLevel.WARNING]: 500,
  [SemanticLevel.CRITICAL]: 200,
  [SemanticLevel.EMERGENCY]: 50
};
