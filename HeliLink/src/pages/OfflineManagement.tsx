import { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Table, Progress, Switch, Alert, Tag, Space, Modal, message, List } from 'antd';
import { motion } from 'framer-motion';
import { Database, Wifi, WifiOff, AlertTriangle, Shield, Clock, Trash2, RefreshCw, HardDrive, Play, CheckCircle, XCircle, Info } from 'lucide-react';
import dayjs from 'dayjs';
import { useOfflineStore } from '@/store/offlineStore';
import { useAlertStore } from '@/store/alertStore';
import type { OfflineQueueItem } from '@/types';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusBadge } from '@/components/StatusBadge';

const { confirm } = Modal;

export default function OfflineManagement() {
  const {
    isOnline,
    emergencyMode,
    storageStats,
    queueItems,
    lastSyncAttempt,
    init,
    enterEmergencyMode,
    exitEmergencyMode,
    loadStorageStats,
    loadQueueItems,
    processQueue,
    clearOldData,
    getEmergencyGuidance,
  } = useOfflineStore();

  const { addAlert } = useAlertStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [guidanceVisible, setGuidanceVisible] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadStorageStats();
      loadQueueItems();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadStorageStats, loadQueueItems]);

  const handleProcessQueue = async () => {
    if (!isOnline) {
      message.error('当前处于离线状态，无法同步队列');
      return;
    }

    setIsProcessing(true);
    try {
      await processQueue();
      message.success('离线队列同步完成');
    } catch (e) {
      message.error('同步队列失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearData = () => {
    confirm({
      title: '确认清除历史数据',
      content: '这将删除超过7天的气象历史数据，此操作不可恢复。',
      okText: '确认清除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await clearOldData(7);
        message.success('历史数据已清除');
        addAlert({
          type: 'system',
          severity: 'info',
          title: '数据清理完成',
          message: '已清除超过7天的气象历史数据',
        });
      },
    });
  };

  const handleToggleEmergency = (checked: boolean) => {
    if (checked) {
      confirm({
        title: '确认进入应急模式',
        content: '应急模式将启用本地缓存数据，确保在极端海况下的离线安全指引。确认继续？',
        okText: '进入应急模式',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => {
          enterEmergencyMode();
          message.warning('已进入应急模式，所有数据将优先使用本地缓存');
          addAlert({
            type: 'safety',
            severity: 'critical',
            title: '系统进入应急模式',
            message: '极端海况通信可能中断，已启用离线安全指引',
          });
        },
      });
    } else {
      exitEmergencyMode();
      message.info('已退出应急模式');
    }
  };

  const guidance = getEmergencyGuidance();

  const storageItems = storageStats ? [
    { name: '平台元数据', count: storageStats.platformMetadata, color: '#1B998B' },
    { name: '海缆数据', count: storageStats.submarineCables, color: '#3B82F6' },
    { name: '气象历史', count: storageStats.weatherHistory, color: '#F46036' },
    { name: '着陆历史', count: storageStats.landingHistory, color: '#8B5CF6' },
    { name: '离线队列', count: storageStats.offlineQueue, color: '#EF4444' },
  ] : [];

  const totalStorage = storageStats?.total || 0;
  const maxStorage = 100000;
  const storagePercent = Math.min(100, (totalStorage / maxStorage) * 100);

  const queueColumns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (val: number) => (
        <span className="text-gray-300 font-mono text-sm">
          {dayjs(val).format('MM-DD HH:mm:ss')}
        </span>
      ),
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      render: (val: string) => {
        const colors: Record<string, string> = {
          weather: 'blue',
          landing: 'green',
          route: 'purple',
          alert: 'orange',
        };
        return <Tag color={colors[val]}>{val}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (val: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: '等待同步' },
          processing: { color: 'blue', text: '同步中' },
          failed: { color: 'red', text: '同步失败' },
          synced: { color: 'green', text: '已同步' },
        };
        const s = statusMap[val];
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '重试次数',
      dataIndex: 'retryCount',
      key: 'retryCount',
      render: (val: number) => (
        <span className={val > 2 ? 'text-red-400' : 'text-gray-300'}>{val}</span>
      ),
    },
    {
      title: '最后尝试',
      dataIndex: 'lastAttempt',
      key: 'lastAttempt',
      render: (val?: number) => (
        val ? (
          <span className="text-gray-400 text-sm">
            {dayjs(val).format('HH:mm:ss')}
          </span>
        ) : <span className="text-gray-500">-</span>
      ),
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">离线管理</h1>
            <p className="text-gray-400 text-sm mt-1">
              管理 IndexedDB 本地缓存，确保极端海况下的离线安全指引
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => { loadStorageStats(); loadQueueItems(); }}
              icon={<RefreshCw size={16} />}
            >
              刷新
            </Button>
            <Button
              type="primary"
              onClick={handleProcessQueue}
              loading={isProcessing}
              icon={<Play size={16} />}
              disabled={!isOnline || queueItems.filter(i => i.status === 'pending').length === 0}
              className="bg-[#1B998B] border-[#1B998B]"
            >
              同步队列
            </Button>
          </div>
        </div>
      </motion.div>

      {emergencyMode && (
        <motion.div variants={itemVariants}>
          <Alert
            type="warning"
            showIcon
            icon={<Shield size={20} />}
            message="应急模式已激活"
            description="系统当前处于应急模式，所有数据优先使用本地缓存。点击查看应急指引。"
            action={
              <Button size="small" type="default" onClick={() => setGuidanceVisible(true)}>
                查看指引
              </Button>
            }
            className="bg-orange-900/20 border-orange-800/50"
          />
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <div className="p-6 bg-[#0f141f] border border-[#1f2937] rounded-xl h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isOnline ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                    {isOnline ? <Wifi size={24} className="text-emerald-400" /> : <WifiOff size={24} className="text-red-400" />}
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isOnline ? '在线' : '离线'}
                    </div>
                    <div className="text-gray-500 text-sm">网络状态</div>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {lastSyncAttempt ? `最后同步: ${dayjs(lastSyncAttempt).format('HH:mm:ss')}` : '尚未同步'}
              </div>
            </div>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <div className="p-6 bg-[#0f141f] border border-[#1f2937] rounded-xl h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-900/30 flex items-center justify-center">
                    <HardDrive size={24} className="text-blue-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{totalStorage.toLocaleString()}</div>
                    <div className="text-gray-500 text-sm">缓存条目</div>
                  </div>
                </div>
              </div>
              <Progress
                percent={storagePercent}
                showInfo={false}
                strokeColor={storagePercent > 80 ? '#EF4444' : storagePercent > 60 ? '#F46036' : '#1B998B'}
                size="small"
              />
              <div className="text-xs text-gray-500 mt-2">
                已使用 {storagePercent.toFixed(1)}% 的存储配额
              </div>
            </div>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <div className="p-6 bg-[#0f141f] border border-[#1f2937] rounded-xl h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-orange-900/30 flex items-center justify-center">
                    <Clock size={24} className="text-orange-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {queueItems.filter(i => i.status === 'pending').length}
                    </div>
                    <div className="text-gray-500 text-sm">待同步队列</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={12} className="text-green-500" />
                <span className="text-xs text-gray-500">
                  已同步 {queueItems.filter(i => i.status === 'synced').length}
                </span>
                <XCircle size={12} className="text-red-500 ml-2" />
                <span className="text-xs text-gray-500">
                  失败 {queueItems.filter(i => i.status === 'failed').length}
                </span>
              </div>
            </div>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <div className="p-6 bg-[#0f141f] border border-[#1f2937] rounded-xl h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${emergencyMode ? 'bg-red-900/30' : 'bg-gray-800'}`}>
                    <Shield size={24} className={emergencyMode ? 'text-red-400' : 'text-gray-500'} />
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${emergencyMode ? 'text-red-400' : 'text-white'}`}>
                      应急模式
                    </div>
                    <div className="text-gray-500 text-sm">{emergencyMode ? '已激活' : '未激活'}</div>
                  </div>
                </div>
              </div>
              <Switch
                checked={emergencyMode}
                onChange={handleToggleEmergency}
                checkedChildren="开启"
                unCheckedChildren="关闭"
              />
            </div>
          </Col>
        </Row>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card
          className="bg-[#0f141f] border-[#1f2937] rounded-xl"
          styles={{ body: { padding: '24px' } }}
        >
          <SectionHeader
            title="缓存存储详情"
            subtitle="IndexedDB 各数据类型存储统计"
            icon={<Database size={18} className="text-[#1B998B]" />}
          />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
            {storageItems.map((item, idx) => (
              <div key={idx} className="p-4 bg-[#1f2937]/50 rounded-lg text-center">
                <div
                  className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center"
                  style={{ backgroundColor: `${item.color}20` }}
                >
                  <Database size={18} style={{ color: item.color }} />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{item.count.toLocaleString()}</div>
                <div className="text-gray-500 text-xs">{item.name}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-[#1f2937]">
            <Button
              danger
              icon={<Trash2 size={16} />}
              onClick={handleClearData}
            >
              清除7天前数据
            </Button>
            <Button
              icon={<Info size={16} />}
              onClick={() => setGuidanceVisible(true)}
            >
              查看应急指引
            </Button>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card
          className="bg-[#0f141f] border-[#1f2937] rounded-xl"
          styles={{ body: { padding: '24px' } }}
        >
          <SectionHeader
            title="离线同步队列"
            subtitle="等待网络恢复后自动同步的数据"
            icon={<Clock size={18} className="text-[#1B998B]" />}
          />
          <div className="mt-4">
            <Table
              dataSource={queueItems}
              columns={queueColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: '队列为空' }}
            />
          </div>
        </Card>
      </motion.div>

      <Modal
        title={
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-orange-500" />
            <span className="text-white">离线应急安全指引</span>
          </div>
        }
        open={guidanceVisible}
        onCancel={() => setGuidanceVisible(false)}
        footer={[
          <Button key="close" onClick={() => setGuidanceVisible(false)}>
            我已知晓
          </Button>,
        ]}
        width={600}
        styles={{
          mask: { background: 'rgba(0,0,0,0.8)' },
          content: { background: '#0f141f', border: '1px solid #1f2937' },
          header: { background: '#0f141f' },
        }}
      >
        <div className="space-y-6 mt-4">
          <div>
            <h4 className="text-white font-medium mb-3">应急操作步骤</h4>
            <List
              dataSource={guidance.steps}
              renderItem={(item, idx) => (
                <List.Item className="border-0 bg-transparent py-2">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#1B998B] flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                      {idx + 1}
                    </div>
                    <span className="text-gray-300">{item}</span>
                  </div>
                </List.Item>
              )}
            />
          </div>

          <div>
            <h4 className="text-white font-medium mb-3">备降着陆点</h4>
            <div className="flex flex-wrap gap-2">
              {guidance.fallbackLanding.map((landing, idx) => (
                <Tag key={idx} color="blue" className="py-1 px-3">
                  {landing}
                </Tag>
              ))}
            </div>
          </div>

          <Alert
            type="warning"
            showIcon
            message="安全提示"
            description="极端海况下，请优先保障人员安全，随时准备启动应急撤离程序。"
            className="bg-orange-900/20 border-orange-800/50"
          />
        </div>
      </Modal>
    </motion.div>
  );
}
