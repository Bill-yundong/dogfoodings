import { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Switch, Tag, Space, message, Row, Col, Divider, Alert } from 'antd';
import { motion } from 'framer-motion';
import { Settings, Users, Shield, Database, Activity, Edit2, Plus, Trash2, Save, User, Lock, Eye } from 'lucide-react';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import type { User as UserType, UserRole } from '@/types';
import { mockUsers, rolePermissions } from '@/mock/data';
import { SectionHeader } from '@/components/SectionHeader';

const { Option } = Select;

const roleNames: Record<UserRole, string> = {
  admin: '系统管理员',
  fleet_commander: '机队指挥官',
  meteorologist: '气象分析师',
  platform_safety: '平台安全员',
};

const permissionNames: Record<string, string> = {
  '*': '全部权限',
  'monitor:read': '监控查看',
  'route:create': '航线创建',
  'route:update': '航线更新',
  'offline:access': '离线访问',
  'alert:acknowledge': '告警确认',
  'history:read': '历史查看',
  'dwa:configure': 'DWA配置',
  'sync:configure': '同步配置',
  'weather:calibrate': '气象校准',
};

export default function SystemManagement() {
  const { user, hasPermission } = useAuthStore();
  const [users, setUsers] = useState<UserType[]>(mockUsers);
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'system'>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [form] = Form.useForm();

  const handleEditUser = (user: UserType) => {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      username: user.username,
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      const values = await form.validateFields();

      if (editingUser) {
        setUsers(users.map(u =>
          u.id === editingUser.id
            ? { ...u, ...values, permissions: rolePermissions[values.role as UserRole] }
            : u
        ));
        message.success('用户信息已更新');
      } else {
        const newUser: UserType = {
          id: `user-${Date.now()}`,
          ...values,
          permissions: rolePermissions[values.role as UserRole],
        };
        setUsers([...users, newUser]);
        message.success('用户已创建');
      }

      setIsModalOpen(false);
      setEditingUser(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = (userId: string) => {
    Modal.confirm({
      title: '确认删除用户',
      content: '此操作不可恢复，确认继续？',
      okText: '确认删除',
      okType: 'danger',
      onOk: () => {
        setUsers(users.filter(u => u.id !== userId));
        message.success('用户已删除');
      },
    });
  };

  const userColumns = [
    {
      title: '用户',
      key: 'user',
      render: (_: unknown, record: UserType) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1B998B] to-[#0d5c53] flex items-center justify-center">
            <User size={18} className="text-white" />
          </div>
          <div>
            <div className="text-white font-medium">{record.name}</div>
            <div className="text-gray-500 text-sm">@{record.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (val: UserRole) => {
        const colors: Record<UserRole, string> = {
          admin: 'red',
          fleet_commander: 'blue',
          meteorologist: 'cyan',
          platform_safety: 'green',
        };
        return <Tag color={colors[val]}>{roleNames[val]}</Tag>;
      },
    },
    {
      title: '权限数量',
      key: 'permissions',
      render: (_: unknown, record: UserType) => (
        <span className="text-gray-300">{record.permissions.length} 项</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: UserType) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<Edit2 size={14} />}
            onClick={() => handleEditUser(record)}
            className="text-[#1B998B]"
          >
            编辑
          </Button>
          <Button
            type="text"
            size="small"
            danger
            icon={<Trash2 size={14} />}
            onClick={() => handleDeleteUser(record.id)}
            disabled={record.id === 'user-001'}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const rolesList = Object.entries(roleNames).map(([key, name]) => ({
    role: key as UserRole,
    name,
    permissions: rolePermissions[key as UserRole],
  }));

  const systemInfo = [
    { label: '系统名称', value: 'HeliLink 海上直升机应急通航路由系统' },
    { label: '系统版本', value: 'v1.0.0' },
    { label: '构建时间', value: dayjs().format('YYYY-MM-DD HH:mm:ss') },
    { label: '运行环境', value: '生产环境' },
    { label: '数据引擎', value: 'DWA 动态窗算法 v2.0' },
    { label: '缓存机制', value: 'IndexedDB + 内存缓存' },
    { label: '同步协议', value: '语义同步引擎 v1.0' },
    { label: '最后备份', value: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss') },
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

  if (!hasPermission('*')) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <Shield size={40} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">权限不足</h2>
          <p className="text-gray-400">系统管理仅对系统管理员开放</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-white">系统管理</h1>
            <p className="text-gray-400 text-sm mt-1">
              管理用户、角色权限与系统配置
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card
          className="bg-[#0f141f] border-[#1f2937] rounded-xl"
          styles={{ body: { padding: '24px' } }}
          tabList={[
            { key: 'users', tab: <span><Users size={14} className="inline mr-2" />用户管理</span> },
            { key: 'roles', tab: <span><Shield size={14} className="inline mr-2" />角色权限</span> },
            { key: 'system', tab: <span><Settings size={14} className="inline mr-2" />系统信息</span> },
          ]}
          activeTabKey={activeTab}
          onTabChange={(key) => setActiveTab(key as 'users' | 'roles' | 'system')}
          tabBarExtraContent={
            activeTab === 'users' ? (
              <Button
                type="primary"
                icon={<Plus size={14} />}
                onClick={handleAddUser}
                className="bg-[#1B998B] border-[#1B998B]"
              >
                添加用户
              </Button>
            ) : null
          }
        >
          {activeTab === 'users' && (
            <div>
              <Table
                dataSource={users}
                columns={userColumns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-4">
              {rolesList.map((role) => (
                <Card
                  key={role.role}
                  className="bg-[#1f2937]/30 border-[#1f2937]"
                  styles={{ body: { padding: '20px' } }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1B998B]/20 flex items-center justify-center">
                        <Shield size={20} className="text-[#1B998B]" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{role.name}</h3>
                        <p className="text-gray-500 text-sm">{role.role}</p>
                      </div>
                    </div>
                    <Tag color={role.role === 'admin' ? 'red' : 'blue'}>
                      {role.permissions.length} 项权限
                    </Tag>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((perm, idx) => (
                      <Tag key={idx} color="cyan">
                        <Eye size={12} className="inline mr-1" />
                        {permissionNames[perm] || perm}
                      </Tag>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'system' && (
            <div>
              <Row gutter={[16, 16]}>
                {systemInfo.map((item, idx) => (
                  <Col xs={24} sm={12} key={idx}>
                    <div className="p-4 bg-[#1f2937]/30 rounded-lg">
                      <div className="text-gray-500 text-sm mb-1">{item.label}</div>
                      <div className="text-white font-medium">{item.value}</div>
                    </div>
                  </Col>
                ))}
              </Row>

              <Divider className="border-[#1f2937] my-6" />

              <Alert
                type="info"
                showIcon
                icon={<Activity size={16} />}
                message="系统运行状态"
                description={
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-gray-300">核心服务：正常运行</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-gray-300">数据库连接：正常</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-gray-300">WebSocket 服务：已连接</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-gray-300">DWA 算法引擎：正常</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-gray-300">语义同步引擎：正常</span>
                    </div>
                  </div>
                }
                className="bg-blue-900/20 border-blue-800/50"
              />
            </div>
          )}
        </Card>
      </motion.div>

      <Modal
        title={
          <div className="flex items-center gap-3">
            <User size={18} className="text-[#1B998B]" />
            <span className="text-white">{editingUser ? '编辑用户' : '添加用户'}</span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSaveUser}
        okText="保存"
        cancelText="取消"
        width={500}
        styles={{
          mask: { background: 'rgba(0,0,0,0.8)' },
          content: { background: '#0f141f', border: '1px solid #1f2937' },
          header: { background: '#0f141f' },
        }}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label={<span className="text-gray-300">姓名</span>}
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input className="bg-[#1f2937] border-[#374151] text-white" placeholder="输入用户姓名" />
          </Form.Item>

          <Form.Item
            name="username"
            label={<span className="text-gray-300">用户名</span>}
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input className="bg-[#1f2937] border-[#374151] text-white" placeholder="输入登录用户名" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label={<span className="text-gray-300">初始密码</span>}
              rules={[{ required: true, message: '请输入初始密码' }]}
            >
              <Input.Password
                className="bg-[#1f2937] border-[#374151] text-white"
                placeholder="输入初始密码"
                iconRender={(visible) => (visible ? <Lock size={14} /> : <Lock size={14} />)}
              />
            </Form.Item>
          )}

          <Form.Item
            name="role"
            label={<span className="text-gray-300">角色</span>}
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select className="bg-[#1f2937] border-[#374151]">
              {Object.entries(roleNames).map(([key, name]) => (
                <Option key={key} value={key}>{name}</Option>
              ))}
            </Select>
          </Form.Item>

          {form.getFieldValue('role') && (
            <div className="p-4 bg-[#1f2937]/50 rounded-lg">
              <div className="text-gray-400 text-sm mb-2">该角色拥有以下权限：</div>
              <div className="flex flex-wrap gap-2">
                {rolePermissions[form.getFieldValue('role') as UserRole]?.map((perm, idx) => (
                  <Tag key={idx} color="cyan">
                    {permissionNames[perm] || perm}
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </Form>
      </Modal>
    </motion.div>
  );
}
