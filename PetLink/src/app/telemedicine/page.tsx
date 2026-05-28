'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import {
  Stethoscope,
  Video,
  MessageCircle,
  Calendar,
  Clock,
  Star,
  Search,
  Filter,
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

export default function TelemedicinePage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setDoctors(mockDoctors);
  }, []);

  const filteredDoctors = doctors.filter(
    (doc) =>
      doc.name.includes(searchQuery) ||
      doc.specialty.includes(searchQuery) ||
      doc.hospital.includes(searchQuery)
  );

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
            <div className="card p-6 card-hover">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">视频问诊</h3>
              <p className="text-sm text-slate-500">
                与兽医进行实时视频交流，获得面对面诊断
              </p>
            </div>
            <div className="card p-6 card-hover">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">图文咨询</h3>
              <p className="text-sm text-slate-500">
                发送症状描述和图片，获取专业解答
              </p>
            </div>
            <div className="card p-6 card-hover">
              <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-accent-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">预约挂号</h3>
              <p className="text-sm text-slate-500">
                预约线下门诊，优先就诊无需等待
              </p>
            </div>
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
    </div>
  );
}
