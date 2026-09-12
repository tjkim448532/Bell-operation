"use client";

import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Server, 
  Database, 
  Zap, 
  Sparkles, 
  ArrowRight, 
  FileSpreadsheet, 
  BarChart3, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Activity
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function DashboardHome() {
  const { user } = useAuth();
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;
    const checkBackend = async () => {
      const start = Date.now();
      try {
        const res = await fetch('https://belleforet-data.vercel.app/api/health', {
          headers: { 'x-m2m-token': 'belleforet-m2m-secret' }
        });
        const elapsed = Date.now() - start;
        if (!ignore) {
          if (res.ok) {
            setApiStatus('connected');
            setLatency(elapsed);
          } else {
            setApiStatus('error');
          }
        }
      } catch (err) {
        if (!ignore) setApiStatus('error');
      }
    };

    checkBackend();
    return () => { ignore = true; };
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950 p-8 text-white shadow-lg border border-slate-800">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            <Sparkles size={14} className="text-emerald-400" />
            <span>Clean Slate Architecture V2</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            벨포레 레저사업본부 통합 통제 시스템
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            복잡하게 엉켰던 레거시 코드를 전면 정리하고, 가장 가볍고 견고한 새 출발 베이스캠프를 구축했습니다. 
            대표님께서 원하시는 핵심 기능부터 군더더기 없이 한 단계씩 깨끗하게 쌓아 올리겠습니다.
          </p>
          <div className="pt-2 flex items-center gap-4 text-xs text-slate-400">
            <span>접속 계정: <strong className="text-slate-200">{user?.email || '인증 완료'}</strong></span>
            <span>•</span>
            <span>시스템 상태: <strong className="text-emerald-400">새 기능 구축 대기 중</strong></span>
          </div>
        </div>
      </div>

      {/* Core Infrastructure Health Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. App Engine */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">코어 엔진</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap size={16} />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900">Next.js 16</div>
          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 size={13} />
            Turbopack 가동 중
          </p>
        </div>

        {/* 2. Firebase Database & Auth */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">인증 & DB</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database size={16} />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900">Firebase Cloud</div>
          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 size={13} />
            Firestore & Auth 정상
          </p>
        </div>

        {/* 3. Backend API Connectivity */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">백엔드 API (SSOT)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Server size={16} />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900">V6 Live API</div>
          <div className="text-xs font-medium flex items-center gap-1">
            {apiStatus === 'checking' && (
              <span className="text-amber-500 flex items-center gap-1">
                <Clock size={13} /> 연결 확인 중...
              </span>
            )}
            {apiStatus === 'connected' && (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={13} /> 응답 정상 ({latency}ms)
              </span>
            )}
            {apiStatus === 'error' && (
              <span className="text-rose-500 flex items-center gap-1">
                <Activity size={13} /> 연결 점검 필요
              </span>
            )}
          </div>
        </div>

        {/* 4. Git Archive Security */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">과거 자산 보존</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900">Zero-Loss Tag</div>
          <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
            <CheckCircle2 size={13} />
            archive-v1 영구 박제
          </p>
        </div>
      </div>

      {/* Next Step Action Guide */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers size={18} className="text-emerald-600" />
            새로운 앱 구축 순서 제안
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            어떤 기능부터 시작하시겠습니까? 대표님께서 원하시는 첫 번째 기능 하나를 지시해 주시면 바로 착수하겠습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option A: Excel & P&L */}
          <div className="p-5 rounded-xl border-2 border-slate-100 hover:border-emerald-500/50 bg-slate-50/50 hover:bg-emerald-50/20 transition-all group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  1순위 추천: 엑셀 비용 업로드 & 월별 손익계산서
                </h3>
                <p className="text-2xs text-slate-500">순수 엑셀 기반 비용 계산 및 부서별 정합성</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              대표님께서 가장 중요하게 생각하시는 엑셀 업로드와 원본 손익 계산 로직을 가장 정직하고 단순하게 1순위로 구축합니다.
            </p>
          </div>

          {/* Option B: Leisure Revenue Dashboard */}
          <div className="p-5 rounded-xl border-2 border-slate-100 hover:border-emerald-500/50 bg-slate-50/50 hover:bg-emerald-50/20 transition-all group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  2순위 추천: 레저본부 전용 실시간 매출 대시보드
                </h3>
                <p className="text-2xs text-slate-500">골프/객실 등 타 본부 배제, 순수 레저 매출만</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              V6 백엔드에서 오직 레저본부 영업장들만 깨끗하게 발라내어, 당일 매출/전년 대비 성장률/방문객을 1초 만에 확인하는 화면을 구축합니다.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-100 text-slate-700 text-xs flex items-center justify-between">
          <span className="font-medium">
            💬 채팅창에 <strong>"엑셀 업로드와 손익계산서부터 만들자"</strong> 또는 <strong>"원하시는 기능"</strong>을 말씀해 주세요.
          </span>
          <ArrowRight size={16} className="text-slate-400" />
        </div>
      </div>
    </div>
  );
}
