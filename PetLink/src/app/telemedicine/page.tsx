'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import {
  Stethoscope,
  Video,
  MessageCircle,
  Calendar,
  Star,
  Search,
  Filter,
  Send,
  Phone,
  X,
  CheckCircle,
  Clock,
} from 'lucide-react';
import Image from 'next/image';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  avatar: string;
  rating: number;
  online: boolean;
  experience: number;
  price: number;
}

const mockDoctors: Doctor[] = [
  {
    id: 'doc-001',
    name: '张医生',
    specialty: '骨科专家',
    hospital: '宠物健康中心',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20veterinarian%20doctor%20portrait%20friendly%20smile&image_size=square',
    rating: 4.9,
    online: true,
    experience: 15,
    price: 199,
  },
  {
    id: 'doc-002',
    name: '李医生',
    specialty: '内科专家',
    hospital: '爱心宠物医院',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20female%20veterinarian%20portrait%20kind&image_size=square',
    rating: 4.8,
    online: true,
    experience: 10,
    price: 149,
  },
  {
    id: 'doc-003',
    name: '王医生',
    specialty: '皮肤科专家',
    hospital: '阳光宠物诊所',
    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20asian%20veterinarian%20portrait%20confident&image_size=square',
    rating: 4.7,
    online: false,
    experience: 8,
    price: 129,
  },
];

type ConsultType = 'video' | 'message' | 'appointment' | null;

export default function TelemedicinePage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDoctorSelect, setShowDoctorSelect] = useState(false);
  const [pendingConsultType, setPendingConsultType] = useState<ConsultType>(null);
  const [consultModal, setConsultModal] = useState<{ type: ConsultType; doctor: Doctor | null }>({ type: null, doctor: null });
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'doctor'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentSuccess, setAppointmentSuccess] = useState(false);

  useEffect(() => {
    setDoctors(mockDoctors);
  }, []);

  const filteredDoctors = doctors.filter(
    (doc) =>
      doc.name.includes(searchQuery) ||
      doc.specialty.includes(searchQuery) ||
      doc.hospital.includes(searchQuery)
  );

  const handleQuickAction = (type: ConsultType) => {
    setPendingConsultType(type);
    setShowDoctorSelect(true);
  };

  const handleSelectDoctor = (doctor: Doctor) => {
    if (!doctor.online) return;
    setShowDoctorSelect(false);
    handleDoctorAction(pendingConsultType, doctor);
  };

  const handleDoctorAction = (type: ConsultType, doctor: Doctor) => {
    if (!doctor.online) return;
    setConsultModal({ type, doctor });
    setChatMessages([]);
    setChatInput('');
    setAppointmentDate('');
    setAppointmentTime('');
    setAppointmentSuccess(false);
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const newMessages = [...chatMessages, { role: 'user' as const, text: chatInput }];
    setChatMessages(newMessages);
    setChatInput('');
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        { role: 'doctor', text: '您好，我已收到您的咨询，请详细描述一下宠物的症状，我来为您分析。' },
      ]);
    }, 1000);
  };

  const handleAppointmentConfirm = () => {
    if (!appointmentDate || !appointmentTime) return;
    setAppointmentSuccess(true);
  };

  const getConsultTypeLabel = (type: ConsultType) => {
    switch (type) {
      case 'video':
        return '视频问诊';
      case 'message':
        return '图文咨询';
      case 'appointment':
        return '预约挂号';
      default:
        return '';
    }
  };

  const getConsultTypeIcon = (type: ConsultType) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'message':
        return <MessageCircle className="w-5 h-5" />;
      case 'appointment':
        return <Calendar className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-poppins text-3xl font-bold text-slate-800">
              远程医疗
            </h1>
            <p className="text-slate-500 mt-1">
              在线咨询专业兽医，获取健康建议
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-6 mb-8"
          >
            <button
              onClick={() => handleQuickAction('video')}
              className="card p-6 card-hover text-left"
            >
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">视频问诊</h3>
              <p className="text-sm text-slate-500">
                与兽医进行实时视频交流，获得面对面诊断
              </p>
            </button>
            <button
              onClick={() => handleQuickAction('message')}
              className="card p-6 card-hover text-left"
            >
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">图文咨询</h3>
              <p className="text-sm text-slate-500">
                发送症状描述和图片，获取专业解答
              </p>
            </button>
            <button
              onClick={() => handleQuickAction('appointment')}
              className="card p-6 card-hover text-left"
            >
              <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-accent-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">预约挂号</h3>
              <p className="text-sm text-slate-500">
                预约线下门诊，优先就诊无需等待
              </p>
            </button>
          </motion.div>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索医生姓名、科室..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all"
              />
            </div>
            <button className="btn-secondary flex items-center gap-2">
              <Filter className="w-4 h-4" />
              筛选
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {filteredDoctors.map((doctor, index) => (
              <motion.div
                key={doctor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                className="card p-6 card-hover"
              >
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Image
                      src={doctor.avatar}
                      alt={doctor.name}
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-2xl object-cover"
                    />
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                      doctor.online ? 'bg-green-500' : 'bg-slate-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-poppins font-semibold text-lg text-slate-800">
                        {doctor.name}
                      </h3>
                      <span className="text-primary-600 font-semibold">
                        ¥{doctor.price}
                      </span>
                    </div>
                    <p className="text-sm text-primary-600 font-medium mt-1">
                      {doctor.specialty}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {doctor.hospital} · {doctor.experience}年经验
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium text-slate-700">
                        {doctor.rating}
                      </span>
                      <span className="text-sm text-slate-400">
                        ({Math.floor(Math.random() * 500) + 100}条评价)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => handleDoctorAction('video', doctor)}
                    className={`flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      doctor.online
                        ? 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                    disabled={!doctor.online}
                  >
                    <Video className="w-4 h-4" />
                    视频问诊
                  </button>
                  <button
                    onClick={() => handleDoctorAction('message', doctor)}
                    className={`flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      doctor.online
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                    disabled={!doctor.online}
                  >
                    <MessageCircle className="w-4 h-4" />
                    在线咨询
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <Modal
        isOpen={consultModal.type === 'video' && consultModal.doctor !== null}
        onClose={() => setConsultModal({ type: null, doctor: null })}
        title="视频问诊"
        maxWidth="max-w-md"
      >
        <div className="text-center py-6">
          <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-10 h-10 text-primary-600" />
          </div>
          <h3 className="font-poppins font-semibold text-lg text-slate-800 mb-2">
            正在呼叫 {consultModal.doctor?.name}
          </h3>
          <p className="text-slate-500 mb-2">{consultModal.doctor?.specialty}</p>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-6">
            <Clock className="w-4 h-4" />
            <span>等待接听中...</span>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setConsultModal({ type: null, doctor: null })}
              className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              取消呼叫
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={consultModal.type === 'message' && consultModal.doctor !== null}
        onClose={() => setConsultModal({ type: null, doctor: null })}
        title={`图文咨询 - ${consultModal.doctor?.name || ''}`}
        maxWidth="max-w-xl"
      >
        <div>
          <div className="h-64 border border-slate-200 rounded-xl p-4 mb-4 overflow-auto bg-slate-50 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center text-slate-400 text-sm py-8">
                请描述宠物的症状或健康问题，医生将为您解答
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="输入消息..."
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
            />
            <button
              onClick={sendMessage}
              className="btn-primary px-4 py-2.5"
              disabled={!chatInput.trim()}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={consultModal.type === 'appointment' && consultModal.doctor !== null}
        onClose={() => {
          setConsultModal({ type: null, doctor: null });
          setAppointmentSuccess(false);
        }}
        title="预约挂号"
        maxWidth="max-w-md"
      >
        {appointmentSuccess ? (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="font-poppins font-semibold text-lg text-slate-800 mb-2">
              预约成功
            </h3>
            <p className="text-slate-500 mb-2">
              已成功预约 {consultModal.doctor?.name}
            </p>
            <p className="text-slate-500 mb-6">
              {appointmentDate} {appointmentTime}
            </p>
            <button
              onClick={() => {
                setConsultModal({ type: null, doctor: null });
                setAppointmentSuccess(false);
              }}
              className="btn-primary"
            >
              完成
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-xl">
              {consultModal.doctor && (
                <Image
                  src={consultModal.doctor.avatar}
                  alt={consultModal.doctor.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-xl object-cover"
                />
              )}
              <div>
                <p className="font-medium text-slate-800">{consultModal.doctor?.name}</p>
                <p className="text-sm text-slate-500">{consultModal.doctor?.specialty}</p>
              </div>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">预约日期</label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">预约时间</label>
                <select
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 bg-white"
                >
                  <option value="">请选择时间</option>
                  <option value="09:00">09:00 - 10:00</option>
                  <option value="10:00">10:00 - 11:00</option>
                  <option value="14:00">14:00 - 15:00</option>
                  <option value="15:00">15:00 - 16:00</option>
                  <option value="16:00">16:00 - 17:00</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConsultModal({ type: null, doctor: null })}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleAppointmentConfirm}
                className="btn-primary flex-1"
                disabled={!appointmentDate || !appointmentTime}
              >
                确认预约
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showDoctorSelect}
        onClose={() => setShowDoctorSelect(false)}
        title={`选择医生 - ${getConsultTypeLabel(pendingConsultType)}`}
        maxWidth="max-w-2xl"
      >
        <div className="flex items-center gap-2 mb-6 p-3 bg-slate-50 rounded-xl">
          <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600">
            {getConsultTypeIcon(pendingConsultType)}
          </div>
          <p className="text-sm text-slate-600">
            请选择一位{getConsultTypeLabel(pendingConsultType)}医生
          </p>
        </div>
        <div className="space-y-3 max-h-[500px] overflow-auto">
          {doctors.filter(d => d.online).length === 0 ? (
            <div className="text-center py-8">
              <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">暂无在线医生</p>
            </div>
          ) : (
            doctors.filter(d => d.online).map((doctor) => (
              <button
                key={doctor.id}
                onClick={() => handleSelectDoctor(doctor)}
                className="w-full p-4 card card-hover flex items-center gap-4 text-left"
              >
                <div className="relative">
                  <Image
                    src={doctor.avatar}
                    alt={doctor.name}
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-800">{doctor.name}</h3>
                    <span className="text-primary-600 font-semibold text-sm">¥{doctor.price}</span>
                  </div>
                  <p className="text-sm text-primary-600 font-medium">{doctor.specialty}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500">{doctor.hospital}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{doctor.experience}年经验</span>
                    <span className="text-xs text-slate-400">·</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs text-slate-600">{doctor.rating}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400 text-center">
            目前只显示在线医生，离线医生暂不支持{getConsultTypeLabel(pendingConsultType)}
          </p>
        </div>
      </Modal>
    </div>
  );
}
