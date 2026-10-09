'use client';

import React, { useState, useMemo } from 'react';
import { useDateFilter } from '@/context/DateFilterContext';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, SlidersHorizontal, RotateCcw } from 'lucide-react';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function GlobalDateSelector() {
  const { startDate, setStartDate, endDate, setEndDate, isMounted } = useDateFilter();
  const [showCustomRange, setShowCustomRange] = useState(false);

  // 현재 선택된 기준 연도 및 월 산출
  const { currentYear, selectedMonth, isSingleMonth, isCumulative, isCustomRange } = useMemo(() => {
    if (!startDate || !endDate || startDate.length < 10 || endDate.length < 10) {
      const now = new Date();
      return { 
        currentYear: now.getFullYear(), 
        selectedMonth: now.getMonth() + 1, 
        isSingleMonth: true, 
        isCumulative: false, 
        isCustomRange: false 
      };
    }

    const sYear = Number(startDate.slice(0, 4)) || 0;
    const sMonth = Number(startDate.slice(5, 7)) || 0;
    const sDay = Number(startDate.slice(8, 10)) || 0;

    const eYear = Number(endDate.slice(0, 4)) || 0;
    const eMonth = Number(endDate.slice(5, 7)) || 0;
    const eDay = Number(endDate.slice(8, 10)) || 0;

    const eLastDay = (eYear > 0 && eMonth > 0) ? new Date(eYear, eMonth, 0).getDate() : 0;

    // 단월 여부 (같은 월 1일 ~ 말일)
    const single = sYear === eYear && sMonth === eMonth && sDay === 1 && eDay === eLastDay;

    // 누계 여부 (1월 1일 ~ N월 말일)
    const cumulative = sYear === eYear && sMonth === 1 && sDay === 1 && eMonth > 1 && eDay === eLastDay;

    // 직접 지정 범위
    const custom = !single && !cumulative;

    return {
      currentYear: eYear > 0 ? eYear : 2026,
      selectedMonth: eMonth > 0 ? eMonth : 9,
      isSingleMonth: single,
      isCumulative: cumulative,
      isCustomRange: custom,
    };
  }, [startDate, endDate]);

  if (!isMounted) return null;

  // 특정 월을 '단월'로 설정 (예: 2026-09-01 ~ 2026-09-30)
  const setMonthSingle = (m: number, year = currentYear) => {
    const lastDay = new Date(year, m, 0).getDate();
    const mStr = String(m).padStart(2, '0');
    setStartDate(`${year}-${mStr}-01`);
    setEndDate(`${year}-${mStr}-${String(lastDay).padStart(2, '0')}`);
  };

  // 특정 월까지 '연간 누계'로 설정 (예: 2026-01-01 ~ 2026-09-30)
  const setMonthYtd = (m: number, year = currentYear) => {
    const lastDay = new Date(year, m, 0).getDate();
    const mStr = String(m).padStart(2, '0');
    setStartDate(`${year}-01-01`);
    setEndDate(`${year}-${mStr}-${String(lastDay).padStart(2, '0')}`);
  };

  // 이전 달 이동
  const handlePrevMonth = () => {
    if (selectedMonth > 1) {
      if (isCumulative) {
        setMonthYtd(selectedMonth - 1);
      } else {
        setMonthSingle(selectedMonth - 1);
      }
    }
  };

  // 다음 달 이동
  const handleNextMonth = () => {
    if (selectedMonth < 12) {
      if (isCumulative) {
        setMonthYtd(selectedMonth + 1);
      } else {
        setMonthSingle(selectedMonth + 1);
      }
    }
  };

  // 드롭다운에서 월 변경 시
  const handleSelectMonth = (m: number) => {
    if (isCumulative) {
      setMonthYtd(m);
    } else {
      setMonthSingle(m);
    }
  };

  // 오늘 (당일) 설정
  const setTodayPreset = () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
    setStartDate(today);
    setEndDate(today);
    setShowCustomRange(true);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 1. 월 네비게이터: [<] [ 2026년 N월 ▼ ] [>] */}
      <div className="flex items-center bg-white rounded-xl shadow-xs border border-white/60 p-0.5">
        <button
          onClick={handlePrevMonth}
          disabled={selectedMonth <= 1}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer transition-colors"
          title="이전 달 이동"
        >
          <ChevronLeft size={15} />
        </button>

        <div className="relative flex items-center px-1.5 py-0.5">
          <Calendar size={13} className="text-[#00AE95] mr-1.5 shrink-0 pointer-events-none" />
          <select
            value={selectedMonth}
            onChange={(e) => handleSelectMonth(Number(e.target.value))}
            className="appearance-none bg-transparent pr-5 py-0.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m} className="text-slate-800 font-semibold">
                {currentYear}년 {m}월
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="text-slate-400 absolute right-1 pointer-events-none" />
        </div>

        <button
          onClick={handleNextMonth}
          disabled={selectedMonth >= 12}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer transition-colors"
          title="다음 달 이동"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* 2. 단월 vs 누계 원클릭 세그먼트 토글 버튼 */}
      <div className="flex items-center bg-black/15 p-0.5 rounded-xl backdrop-blur-xs border border-white/20">
        <button
          onClick={() => {
            setMonthSingle(selectedMonth);
            setShowCustomRange(false);
          }}
          className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
            isSingleMonth && !showCustomRange
              ? 'bg-white text-[#00826F] shadow-xs'
              : 'text-white/90 hover:text-white hover:bg-white/10'
          }`}
          title={`${currentYear}년 ${selectedMonth}월 1개월 실적`}
        >
          {selectedMonth}월 단월
        </button>

        <button
          onClick={() => {
            setMonthYtd(selectedMonth);
            setShowCustomRange(false);
          }}
          className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
            isCumulative && !showCustomRange
              ? 'bg-white text-[#00826F] shadow-xs'
              : 'text-white/90 hover:text-white hover:bg-white/10'
          }`}
          title={`${currentYear}년 1월부터 ${selectedMonth}월까지 누계 실적`}
        >
          1~{selectedMonth}월 누계
        </button>
      </div>

      {/* 3. 직접 기간 설정 토글 버튼 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setShowCustomRange(!showCustomRange)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-2xs font-bold transition-all cursor-pointer ${
            showCustomRange || isCustomRange
              ? 'bg-white text-[#00826F] shadow-xs'
              : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
          }`}
          title="원하는 일자 직접 지정"
        >
          <SlidersHorizontal size={12} />
          <span>{isCustomRange ? `${startDate} ~ ${endDate}` : '직접 지정'}</span>
        </button>

        {isCustomRange && (
          <button
            onClick={() => setMonthSingle(selectedMonth)}
            className="p-1.5 rounded-xl bg-white/20 text-white hover:bg-white/30 text-2xs transition-colors cursor-pointer"
            title="단월 기준으로 복귀"
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>

      {/* 4. 직접 설정 펼침 바 (달력 인풋 및 오늘 버튼) */}
      {showCustomRange && (
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-xl px-2.5 py-1 shadow-md text-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent text-xs outline-none text-slate-800 font-semibold cursor-pointer py-0.5"
          />
          <span className="text-slate-400 font-bold text-xs">~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent text-xs outline-none text-slate-800 font-semibold cursor-pointer py-0.5"
          />
          <button
            onClick={setTodayPreset}
            className="px-2 py-0.5 rounded-md text-3xs font-bold bg-[#E6F7F4] text-[#00826F] hover:bg-[#00AE95] hover:text-white transition-colors cursor-pointer ml-1"
          >
            오늘
          </button>
        </div>
      )}
    </div>
  );
}
