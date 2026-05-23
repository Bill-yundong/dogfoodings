import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Alert, Select } from 'antd';
import { motion } from 'framer-motion';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { User, Lock, Shield, Plane, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { mockUsers } from '@/mock/data';

const { Option } = Select;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, error } = useAuthStore();
  const [form] = Form.useForm();
  const [showTips, setShowTips] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  const handleSubmit = async (values: { username: string; password: string }) => {
    const success = await login(values.username, values.password);
    if (success) {
      const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  };

  const handleQuickSelect = (username: string) => {
    form.setFieldsValue({ username, password: '123456' });
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#1B998B]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#F46036]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-[#1f2937] rounded-full opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-[#1f2937] rounded-full opacity-20" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1B998B] to-[#0d5c53] mb-4 shadow-lg shadow-[#1B998B]/30"
          >
            <Plane size={40} className="text-white" />
          </motion.div>
          <h1
            className="text-4xl font-bold text-white mb-2 tracking-wider"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            HELILINK
          </h1>
          <p className="text-[#1B998B] text-lg">海上钻井平台直升机应急通航路由系统</p>
        </div>

        <Card
          className="bg-[#0f141f]/90 backdrop-blur-xl border border-[#1f2937] rounded-2xl shadow-2xl"
          styles={{ body: { padding: '32px' } }}
        >
          {showTips && (
            <Alert
              type="info"
              showIcon
              icon={<Shield size={16} />}
              message="演示账号"
              description={
                <div className="flex flex-wrap gap-2 mt-2">
                  {mockUsers.map((user) => (
                    <Button
                      key={user.id}
                      size="small"
                      type="default"
                      onClick={() => handleQuickSelect(user.username)}
                      className="bg-[#1f2937] border-[#374151] text-gray-300 hover:border-[#1B998B] hover:text-[#1B998B]"
                    >
                      {user.name}
                    </Button>
                  ))}
                </div>
              }
              closable
              onClose={() => setShowTips(false)}
              className="mb-6 bg-[#1B998B]/10 border-[#1B998B]/30"
            />
          )}

          {error && (
            <Alert
              type="error"
              showIcon
              icon={<AlertTriangle size={16} />}
              message={error}
              className="mb-6 bg-red-900/20 border-red-800/50"
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ username: 'admin', password: '123456' }}
          >
            <Form.Item
              name="username"
              label={<span className="text-gray-300">用户名</span>}
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<User size={18} className="text-gray-500" />}
                placeholder="请输入用户名"
                size="large"
                className="bg-[#1f2937] border-[#374151] text-white placeholder-gray-500 h-12"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-gray-300">密码</span>}
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<Lock size={18} className="text-gray-500" />}
                placeholder="请输入密码（演示密码：123456）"
                size="large"
                className="bg-[#1f2937] border-[#374151] text-white placeholder-gray-500 h-12"
              />
            </Form.Item>

            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={isLoading}
                className="w-full h-12 bg-gradient-to-r from-[#1B998B] to-[#0d5c53] border-0 hover:opacity-90 text-white font-medium text-base"
              >
                {isLoading ? '登录中...' : '登 录'}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-6 pt-6 border-t border-[#1f2937]">
            <p className="text-gray-500 text-xs text-center">
              © 2024 HeliLink 海上通航应急系统 | 版本 v1.0.0
            </p>
            <p className="text-gray-600 text-xs text-center mt-1">
              基于异步多目标动态窗算法（DWA）的边缘计算解决方案
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
