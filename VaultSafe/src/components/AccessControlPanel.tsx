'use client';

import { useState } from 'react';
import { SecurityNode, MockUser } from '@/types/security';
import { Fingerprint, ScanFace, Eye, Hand, Shield, Loader2 } from 'lucide-react';

interface AccessControlPanelProps {
  nodes: SecurityNode[];
  users: MockUser[];
  onAccessRequest: (
    biometricData: string,
    hashType: 'fingerprint' | 'facial' | 'iris' | 'palm',
    userId: string,
    nodeId: string
  ) => Promise<void>;
}

const biometricTypes = [
  { type: 'fingerprint' as const, icon: Fingerprint, label: '指纹识别' },
  { type: 'facial' as const, icon: ScanFace, label: '人脸识别' },
  { type: 'iris' as const, icon: Eye, label: '虹膜识别' },
  { type: 'palm' as const, icon: Hand, label: '掌纹识别' },
];

export function AccessControlPanel({ nodes, users, onAccessRequest }: AccessControlPanelProps) {
  const [selectedUser, setSelectedUser] = useState<string>(users[0]?.id || '');
  const [selectedNode, setSelectedNode] = useState<string>(nodes[0]?.id || '');
  const [selectedType, setSelectedType] = useState<'fingerprint' | 'facial' | 'iris' | 'palm'>('fingerprint');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!selectedUser || !selectedNode) return;

    setIsProcessing(true);
    try {
      const user = users.find(u => u.id === selectedUser);
      const biometricData = user ? user[selectedType] : `test-data-${Date.now()}`;
      
      await onAccessRequest(biometricData, selectedType, selectedUser, selectedNode);
    } finally {
      setIsProcessing(false);
    }
  };

  const onlineNodes = nodes.filter(n => n.status === 'online' || n.status === 'warning');

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-lg bg-vault-500/10">
          <Shield size={24} className="text-vault-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">门禁控制</h2>
          <p className="text-sm text-slate-400">生物特征鉴权与毫秒级对齐</p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            选择用户
          </label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-vault-500 transition-colors"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} (安全等级: {user.level})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            选择门禁节点
          </label>
          <select
            value={selectedNode}
            onChange={(e) => setSelectedNode(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-vault-500 transition-colors"
          >
            {onlineNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name} - {node.location} (等级: {node.level})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            生物特征类型
          </label>
          <div className="grid grid-cols-4 gap-2">
            {biometricTypes.map((bio) => {
              const Icon = bio.icon;
              const isSelected = selectedType === bio.type;
              return (
                <button
                  key={bio.type}
                  onClick={() => setSelectedType(bio.type)}
                  className={`
                    flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all
                    ${isSelected
                      ? 'bg-vault-500/20 border-2 border-vault-500 text-vault-400'
                      : 'bg-slate-900/50 border border-slate-700 text-slate-400 hover:border-slate-600'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium">{bio.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isProcessing || !selectedUser || !selectedNode}
          className="w-full py-3 px-6 bg-gradient-to-r from-vault-600 to-vault-500 hover:from-vault-500 hover:to-vault-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              鉴权处理中...
            </>
          ) : (
            <>
              <Fingerprint size={20} />
              发起访问请求
            </>
          )}
        </button>
      </div>
    </div>
  );
}
