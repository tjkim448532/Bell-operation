'use client';

import { motion } from 'framer-motion';
import { Users, Activity, Coffee, Monitor, Key, TreePine } from 'lucide-react';

const teams = [
  {
    name: '레저본부',
    role: '총괄',
    icon: <TreePine size={48} className="text-mint-500" />,
    color: 'bg-gradient-to-br from-mint-500 to-mint-700',
    colSpan: 'col-span-full',
    children: [
      {
        name: '액티비티',
        icon: <Activity size={32} className="text-blue-500" />,
        color: 'bg-blue-50 border-blue-200 text-blue-800',
        facilities: ['마운틴카트', '사계절썰매장', '마리나 클럽', '원더풀', '썸머랜드']
      },
      {
        name: '목장',
        icon: <TreePine size={32} className="text-green-500" />,
        color: 'bg-green-50 border-green-200 text-green-800',
        facilities: ['벨포레 목장', '얼룩말 카페', '목장 체험']
      },
      {
        name: '미디어아트센터',
        icon: <Monitor size={32} className="text-purple-500" />,
        color: 'bg-purple-50 border-purple-200 text-purple-800',
        facilities: ['미디어아트 전시관', '벨폴레홀 공연']
      },
      {
        name: '디지털지원팀',
        icon: <Monitor size={32} className="text-indigo-500" />,
        color: 'bg-indigo-50 border-indigo-200 text-indigo-800',
        facilities: ['키오스크', 'POS', '홈페이지 및 앱 기술 사항', '레져본부 마케팅', '네트워크 & BGM 유지보수']
      },
      {
        name: '본부팀',
        icon: <Key size={32} className="text-orange-500" />,
        color: 'bg-orange-50 border-orange-200 text-orange-800',
        facilities: ['레져본부 신규 영업', '레져본부 마케팅', '관리업무']
      }
    ]
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100 }
  }
};

export default function OrganizationPage() {
  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">레져본부 조직도</h1>
        <p className="text-gray-500 mt-2">레져본부 산하의 각 팀과 주요 영업장을 시각적으로 확인합니다.</p>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-12"
      >
        {teams.map((hq, idx) => (
          <div key={idx} className="flex flex-col items-center">
            {/* HQ Card */}
            <motion.div 
              variants={itemVariants}
              className={`w-96 rounded-2xl shadow-xl overflow-hidden ${hq.color} p-8 text-white flex flex-col items-center justify-center transform transition-transform hover:scale-105 cursor-pointer z-10`}
            >
              <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm mb-4">
                {hq.icon}
              </div>
              <h2 className="text-4xl font-black tracking-widest">{hq.name}</h2>
              <p className="text-mint-100 mt-2 font-medium">{hq.role}</p>
            </motion.div>

            {/* Connecting Lines */}
            <div className="w-px h-16 bg-gray-300"></div>
            <div className="w-[80%] h-px bg-gray-300"></div>
            <div className="w-[80%] flex justify-between">
              {hq.children.map((_, i) => (
                <div key={i} className="w-px h-8 bg-gray-300"></div>
              ))}
            </div>

            {/* Child Teams Grid */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-4">
              {hq.children.map((team, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className={`relative rounded-xl border-2 p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow bg-white ${team.color.replace('bg-', 'hover:bg-opacity-50 ')}`}
                >
                  <div className={`p-3 rounded-full mb-4 bg-white border-2 ${team.color.split(' ')[1]} shadow-sm`}>
                    {team.icon}
                  </div>
                  <h3 className={`text-xl font-bold mb-4 ${team.color.split(' ')[2]}`}>{team.name}</h3>
                  <div className="w-full space-y-2">
                    {team.facilities.map((fac, fIdx) => (
                      <div key={fIdx} className="bg-white/60 backdrop-blur-sm rounded-lg py-2 px-3 text-sm font-medium border border-black/5 shadow-sm">
                        {fac}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
