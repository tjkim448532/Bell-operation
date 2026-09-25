"use client";

import React from 'react';
import { Moon, Sparkles, Clock, ShieldCheck, Database } from 'lucide-react';

interface ServerSleepNoticeProps {
  details?: string;
  className?: string;
  compact?: boolean;
}

export default function ServerSleepNotice({
  details = "🌙 현재 벨포레 데이터베이스는 심야 절전 운영 시간(20:00 ~ 08:00)입니다. 매일 아침 08:00에 정상 가동됩니다.",
  className = "",
  compact = false
}: ServerSleepNoticeProps) {
  if (compact) {
    return (
      <div className={`flex items-center justify-between p-3.5 bg-indigo-950/90 text-indigo-100 rounded-xl border border-indigo-700/60 shadow-lg backdrop-blur-md ${className}`}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl animate-pulse">🌙</span>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>현재 서버가 자고 있습니다</span>
              <span className="text-3xs px-1.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 font-semibold">
                심야 절전 모드
              </span>
            </div>
            <p className="text-3xs text-indigo-200/80 mt-0.5">매일 20:00 ~ 익일 08:00 자동 절전 가동 (아침 08:00 정상 복구)</p>
          </div>
        </div>
        <div className="text-right text-3xs text-indigo-300 font-mono flex items-center gap-1">
          <Clock size={12} className="text-indigo-400" />
          <span>08:00 가동 예정</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 sm:p-7 shadow-2xl text-white ${className}`}>
      {/* Decorative Night Sky Glow Background */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <span className="text-3xl filter drop-shadow-[0_0_12px_rgba(165,180,252,0.6)] animate-pulse">
              🌙
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                현재 서버가 자고 있습니다
                <Sparkles size={16} className="text-indigo-300 animate-spin" style={{ animationDuration: '6s' }} />
              </h3>
              <span className="px-2.5 py-0.5 text-2xs font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
                <Moon size={11} /> 심야 절전 운영 중
              </span>
            </div>

            <p className="text-xs text-indigo-200/90 leading-relaxed max-w-2xl">
              야간 클라우드 인프라 비용 절감을 위해 매일 <strong className="text-white font-semibold">20:00 ~ 익일 08:00</strong>에는 원천 데이터베이스(RDS)가 안전하게 수면 모드에 들어갑니다.
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-indigo-300/80">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck size={13} /> 지출 전표 및 구글시트 내보내기 정상 이용 가능
              </span>
              <span className="flex items-center gap-1 text-indigo-300 font-medium">
                <Clock size={13} /> 매일 아침 08:00 자동 정상 재가동
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0 w-full sm:w-auto p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-center sm:text-right">
          <div className="text-3xs uppercase tracking-wider text-indigo-300 font-semibold mb-1 flex items-center justify-center sm:justify-end gap-1">
            <Database size={12} className="text-indigo-400" /> Database Status
          </div>
          <div className="text-sm font-bold text-indigo-100 font-mono">
            SLEEPING (20:00 ~ 08:00)
          </div>
          <div className="text-3xs text-indigo-300/70 mt-0.5">
            오전 08시 정산 데이터 자동 갱신
          </div>
        </div>
      </div>
    </div>
  );
}
