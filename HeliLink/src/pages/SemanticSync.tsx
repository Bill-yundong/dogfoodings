import { useEffect, useState } from 'react';
import { Card, Row, Col, Table, Button, Modal, Form, Input, Select, Slider, Tag, Space, Switch, message, Tooltip, Divider } from 'antd';
import { motion } from 'framer-motion';
import { Tags, Activity, AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw, Edit2, Save } from 'lucide-react';
import dayjs from 'dayjs';
import { useSyncStore } from '@/store/syncStore';
import { useAuthStore } from '@/store/authStore';
import type { SemanticTag, SyncLogEntry, SourceSystem } from '@/types';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { SyncStatusPanel } from '@/components/SyncStatusPanel';

const { Option } = Select;

export default function SemanticSync() {
  const {
    syncStatus,
    semanticTags,
    syncLogs,
    isLoading,
    isSyncing,
    lastSyncTime,
    conflictCount,
    init,
    loadSyncStatus,
    loadTags,
    loadSyncLogs,
    updateTag,
    resolveConflict,
  } = useSyncStore();

  const { hasPermission } = useAuthStore();
  const [editingTag, setEditingTag] = useState<SemanticTag | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'tags' | 'logs'>('tags');

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadSyncStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadSyncStatus]);

  const handleEditTag = (tag: SemanticTag) => {
    setEditingTag(tag);
    form.setFieldsValue({
      businessLabel: tag.businessLabel,
      severity: tag.severity,
      colorCode: tag.colorCode,
      thresholdMin: tag.thresholdMin,
      thresholdMax: tag.thresholdMax,
    });
    setIsModalOpen(true);
  };

  const handleSaveTag = async () => {
    if (!editingTag) return;

    try {
      const values = await form.validateFields();
      await updateTag({
        ...editingTag,
        ...values,
      });
      message.success('标签配置已更新');
      setIsModalOpen(false);
      setEditingTag(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveConflict = async (dataId: string) => {
    await resolveConflict(dataId);
    message.success('冲突已解决');
    await loadSyncLogs();
  };

  const handleRefresh = () => {
    loadSyncStatus();
    loadTags();
    loadSyncLogs();
    message.info('数据已刷新');
  };

  const systemNames: Record<SourceSystem, string> = {
    meteorology: '气象系统',
    fleet: '机队指挥',
    platform: '平台终端',
  };

  const tagColumns = [
    {
      title: '业务标签',
      dataIndex: 'businessLabel',
      key: 'businessLabel',
      render: (text: string, record: SemanticTag) => (
        <div className="flex items-center gap-2">
          <Tags size={14} style={{ color: record.colorCode }} />
          <span className="text-white">{text}</span>
        </div>
      ),
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      render: (val: string) => (
        <Tag color="blue">{val}</Tag>
      ),
    },
    {
      title: '指标名称',
      dataIndex: 'metricName',
      key: 'metricName',
      render: (val: string) => <span className="text-gray-300">{val}</span>,
    },
    {
      title: '阈值范围',
      key: 'threshold',
      render: (_: unknown, record: SemanticTag) => {
        if (record.thresholdMin !== undefined && record.thresholdMax !== undefined) {
          return <span className="text-gray-300">{record.thresholdMin} - {record.thresholdMax}</span>;
        }
        if (record.thresholdMin !== undefined) {
          return <span className="text-gray-300">≥ {record.thresholdMin}</span>;
        }
        if (record.thresholdMax !== undefined) {
          return <span className="text-gray-300">≤ {record.thresholdMax}</span>;
        }
        return <span className="text-gray-500">无阈值</span>;
      },
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (val: string) => {
        const colors: Record<string, string> = {
          info: 'green',
          warning: 'orange',
          danger: 'red',
        };
        return <Tag color={colors[val]}>{val}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: SemanticTag) => (
        <Button
          type="text"
          size="small"
          icon={<Edit2 size={14} />}
          onClick={() => handleEditTag(record)}
          disabled={!hasPermission('sync:configure')}
          className="text-[#1B998B] hover:text-[#1B998B]/80"
        >
          编辑
        </Button>
      ),
    },
  ];

  const logColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (val: number) => (
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-gray-500" />
          <span className="text-gray-300 font-mono text-sm">
            {dayjs(val).format('MM-DD HH:mm:ss')}
          </span>
        </div>
      ),
    },
    {
      title: '源系统',
      dataIndex: 'sourceSystem',
      key: 'sourceSystem',
      render: (val: SourceSystem) => (
        <Tag color="blue">{systemNames[val]}</Tag>
      ),
    },
    {
      title: '目标系统',
      dataIndex: 'targetSystem',
      key: 'targetSystem',
      render: (val: SourceSystem) => (
        <Tag color="purple">{systemNames[val]}</Tag>
      ),
    },
    {
      title: '同步状态',
      dataIndex: 'syncStatus',
      key: 'syncStatus',
      render: (val: string) => <StatusBadge type="sync" value={val} />,
    },
    {
      title: '延迟',
      dataIndex: 'latency',
      key: 'latency',
      render: (val?: number) => (
        val ? <span className="text-gray-300">{val}ms</span> : <span className="text-gray-500">-</span>
      ),
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      render: (val: number) => <span className="text-gray-400 font-mono">v{val}</span>,
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      render: (val?: string) => (
        <Tooltip title={val}>
          <span className="text-gray-400 text-sm truncate max-w-[200px] block">
            {val || '同步成功'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: SyncLogEntry) => (
        record.syncStatus === 'conflict' ? (
          <Button
            type="text"
            size="small"
            danger
            onClick={() => handleResolveConflict(record.id)}
            disabled={!hasPermission('sync:configure')}
          >
            解决冲突
          </Button>
        ) : null
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
            <h1 className="text-2xl font-bold text-white">语义同步管理</h1>
            <p className="text-gray-400 text-sm mt-1">
              管理气象系统、机队指挥、平台终端三端数据的语义映射与同步
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefresh}
              icon={<RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />}
            >
              刷新
            </Button>
            <Button
              type="primary"
              onClick={loadSyncStatus}
              loading={isSyncing}
              icon={<RefreshCw size={16} />}
              className="bg-[#1B998B] border-[#1B998B]"
            >
              立即同步
            </Button>
          </div>
        </div>
      </motion.div>

      {conflictCount > 0 && (
        <motion.div variants={itemVariants}>
          <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
            <div>
              <div className="text-red-400 font-medium">检测到 {conflictCount} 个同步冲突</div>
              <div className="text-red-300/70 text-sm">请查看同步日志并手动解决冲突</div>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <div className="p-6 bg-[#0f141f] border border-[#1f2937] rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-green-900/30 flex items-center justify-center">
                  <CheckCircle size={24} className="text-emerald-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">
                    {syncStatus.filter(s => s.status === 'online').length}
                  </div>
                  <div className="text-gray-500 text-sm">在线系统</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">总计 {syncStatus.length} 个系统</span>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div className="p-6 bg-[#0f141f] border border-[#1f2937] rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-orange-900/30 flex items-center justify-center">
                  <Activity size={24} className="text-orange-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">
                    {semanticTags.length}
                  </div>
                  <div className="text-gray-500 text-sm">语义标签</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Tag color="green">info {semanticTags.filter(t => t.severity === 'info').length}</Tag>
                <Tag color="orange">warning {semanticTags.filter(t => t.severity === 'warning').length}</Tag>
                <Tag color="red">danger {semanticTags.filter(t => t.severity === 'danger').length}</Tag>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div className="p-6 bg-[#0f141f] border border-[#1f2937] rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-blue-900/30 flex items-center justify-center">
                  <Clock size={24} className="text-blue-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">
                    {lastSyncTime ? dayjs(lastSyncTime).format('HH:mm:ss') : '--:--:--'}
                  </div>
                  <div className="text-gray-500 text-sm">最后同步</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {lastSyncTime ? `${dayjs().diff(lastSyncTime, 'second')}s 前` : '尚未同步'}
                </span>
              </div>
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
            title="三端同步状态"
            subtitle="实时监控各系统同步状态"
            icon={<RefreshCw size={18} className="text-[#1B998B]" />}
          />
          <div className="mt-6">
            <SyncStatusPanel statuses={syncStatus} />
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card
          className="bg-[#0f141f] border-[#1f2937] rounded-xl"
          styles={{ body: { padding: '24px' } }}
          tabList={[
            { key: 'tags', tab: '语义标签配置' },
            { key: 'logs', tab: '同步日志' },
          ]}
          activeTabKey={activeTab}
          onTabChange={(key) => setActiveTab(key as 'tags' | 'logs')}
        >
          {activeTab === 'tags' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-400 text-sm">
                  配置技术指标到业务语义的映射关系，用于三端数据的一致性校验
                </p>
              </div>
              <Table
                dataSource={semanticTags}
                columns={tagColumns}
                rowKey="id"
                loading={isLoading}
                pagination={{ pageSize: 10 }}
              />
            </div>
          )}

          {activeTab === 'logs' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-400 text-sm">
                  查看所有同步操作记录，包括成功、失败和冲突状态
                </p>
              </div>
              <Table
                dataSource={syncLogs}
                columns={logColumns}
                rowKey="id"
                loading={isLoading}
                pagination={{ pageSize: 20 }}
              />
            </div>
          )}
        </Card>
      </motion.div>

      <Modal
        title="编辑语义标签"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSaveTag}
        okText="保存"
        cancelText="取消"
        width={600}
        styles={{
          mask: { background: 'rgba(0,0,0,0.8)' },
          content: { background: '#0f141f', border: '1px solid #1f2937' },
          header: { background: '#0f141f' },
        }}
      >
        {editingTag && (
          <Form form={form} layout="vertical" className="mt-4">
            <Row gutter={[16, 0]}>
              <Col span={12}>
                <Form.Item
                  label={<span className="text-gray-300">数据类型</span>}
                >
                  <Input value={editingTag.dataType} disabled className="bg-[#1f2937] border-[#374151] text-white" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<span className="text-gray-300">指标名称</span>}
                >
                  <Input value={editingTag.metricName} disabled className="bg-[#1f2937] border-[#374151] text-white" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="businessLabel"
              label={<span className="text-gray-300">业务标签</span>}
              rules={[{ required: true, message: '请输入业务标签' }]}
            >
              <Input className="bg-[#1f2937] border-[#374151] text-white" placeholder="输入业务语义标签" />
            </Form.Item>

            <Row gutter={[16, 0]}>
              <Col span={12}>
                <Form.Item
                  name="severity"
                  label={<span className="text-gray-300">严重程度</span>}
                  rules={[{ required: true, message: '请选择严重程度' }]}
                >
                  <Select className="bg-[#1f2937] border-[#374151]">
                    <Option value="info">信息 (info)</Option>
                    <Option value="warning">警告 (warning)</Option>
                    <Option value="danger">危险 (danger)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="colorCode"
                  label={<span className="text-gray-300">颜色代码</span>}
                  rules={[{ required: true, message: '请输入颜色代码' }]}
                >
                  <Input className="bg-[#1f2937] border-[#374151] text-white" placeholder="#RRGGBB" />
                </Form.Item>
              </Col>
            </Row>

            <Divider className="border-[#1f2937] my-4" />

            <Row gutter={[16, 0]}>
              <Col span={12}>
                <Form.Item
                  name="thresholdMin"
                  label={<span className="text-gray-300">最小阈值</span>}
                >
                  <Input type="number" className="bg-[#1f2937] border-[#374151] text-white" placeholder="留空表示无限制" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="thresholdMax"
                  label={<span className="text-gray-300">最大阈值</span>}
                >
                  <Input type="number" className="bg-[#1f2937] border-[#374151] text-white" placeholder="留空表示无限制" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Modal>
    </motion.div>
  );
}
