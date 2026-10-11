"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Dog, 
  Send, 
  Settings, 
  RefreshCw, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Phone, 
  Receipt, 
  Eye, 
  EyeOff, 
  Power, 
  Smartphone, 
  Search, 
  ShieldCheck, 
  Users,
  UserPlus,
  Trash2,
  Edit3,
  MessageSquare,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

interface StaffRecipient {
  id: string;
  name: string;
  phone: string;
  role?: string;
  active: boolean;
}

interface ReservationItem {
  id?: string;
  reservationId: string;
  orderId?: string;
  orderDate?: string;
  visitDate?: string | null;
  visitTime?: string | null;
  customerName: string;
  customerPhone: string;
  petType?: string | null;
  petCount?: number;
  productName: string;
  quantity?: number;
  totalPrice: number;
  paymentStatus: 'UNPAID' | 'PAID' | 'CANCELLED';
  paymentDueDate?: string | null;
  paymentUrl?: string | null;
  channelName?: string;
}

interface PetforetSummary {
  targetDate: string;
  totalReservations: number;
  paidCount: number;
  unpaidCount: number;
  cancelledCount: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  paymentRate: number;
}

interface PetforetConfig {
  apiKey: string;
  apiSecretMasked?: string;
  hasApiSecret?: boolean;
  senderNumber: string;
  useKakaoAlimtalk: boolean;
  pfId: string;
  templateId: string;
  staffMessageTemplate: string;
  staffRecipients: StaffRecipient[];
  salesActive: boolean;
  salesNotice: string;
}

interface NotificationLog {
  id: string;
  timestamp: string;
  target?: string;
  staffName?: string;
  staffPhone?: string;
  sendType: string;
  success: boolean;
  messagePreview?: string;
  error?: string;
}

export default function PetforetPage() {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [unmaskPhone, setUnmaskPhone] = useState<boolean>(false);

  // 데이터 상태
  const [loading, setLoading] = useState<boolean>(true);
  const [isBackendReady, setIsBackendReady] = useState<boolean>(false);
  const [backendMessage, setBackendMessage] = useState<string>('');
  const [summary, setSummary] = useState<PetforetSummary>({
    targetDate: todayStr,
    totalReservations: 0,
    paidCount: 0,
    unpaidCount: 0,
    cancelledCount: 0,
    totalAmount: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    paymentRate: 0,
  });
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [config, setConfig] = useState<PetforetConfig>({
    apiKey: '',
    senderNumber: '',
    useKakaoAlimtalk: false,
    pfId: '',
    templateId: '',
    staffMessageTemplate: '',
    staffRecipients: [],
    salesActive: true,
    salesNotice: '',
  });
  const [logs, setLogs] = useState<NotificationLog[]>([]);

  // 모달 상태
  const [isStaffManagerOpen, setIsStaffManagerOpen] = useState<boolean>(false);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState<boolean>(false);
  const [isSendStaffModalOpen, setIsSendStaffModalOpen] = useState<boolean>(false);

  // 직원 편집 폼
  const [newStaff, setNewStaff] = useState({ name: '', phone: '', role: '현장 담당자' });
  const [editableRecipients, setEditableRecipients] = useState<StaffRecipient[]>([]);
  const [editableTemplate, setEditableTemplate] = useState<string>('');
  const [newSecretInput, setNewSecretInput] = useState<string>('');
  const [activeSettingsTab, setActiveSettingsTab] = useState<'template' | 'config' | 'logs'>('template');

  // 발송 진행 상태
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendResultAlert, setSendResultAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. 예약 데이터 로드 (V6 실측 API)
  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/petforet/reservations?date=${selectedDate}&paymentStatus=ALL`);
      if (res.ok) {
        const json = await res.json();
        setIsBackendReady(json.isBackendReady || false);
        setBackendMessage(json.message || '');
        if (json.data) {
          setSummary(json.data.summary);
          setReservations(json.data.reservations || []);
        }
      }
    } catch (err) {
      console.error('Failed to load petforet reservations:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // 2. 설정 및 직원 목록 로드
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/petforet/settings');
      if (res.ok) {
        const json = await res.json();
        if (json.data?.config) {
          setConfig(json.data.config);
          setEditableRecipients(json.data.config.staffRecipients || []);
          setEditableTemplate(json.data.config.staffMessageTemplate || '');
        }
        if (json.data?.logs) {
          setLogs(json.data.logs);
        }
      }
    } catch (err) {
      console.error('Failed to load petforet settings:', err);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // 펫포레 시설 판매 On/Off 토글
  const handleToggleSales = async () => {
    const nextState = !config.salesActive;
    const confirmMsg = nextState 
      ? '펫포레 시설 판매를 [정상 판매 중]으로 전환하시겠습니까?' 
      : '펫포레 시설 판매를 [일시 중단]하시겠습니까?';
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/petforet/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesActive: nextState }),
      });
      if (res.ok) {
        setConfig((prev) => ({ ...prev, salesActive: nextState }));
        setSendResultAlert({
          type: 'success',
          message: `펫포레 판매 상태가 [${nextState ? '정상 판매 중' : '판매 일시 중단'}]으로 변경되었습니다.`,
        });
      }
    } catch (err: any) {
      alert('상태 변경 실패: ' + err.message);
    }
  };

  // 직원 추가 핸들러
  const handleAddStaff = () => {
    if (!newStaff.name.trim() || !newStaff.phone.trim()) {
      alert('직원 이름과 연락처는 필수입니다.');
      return;
    }
    const cleanPhone = newStaff.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      alert('유효한 휴대폰 번호 10~11자리를 입력해 주세요.');
      return;
    }

    const item: StaffRecipient = {
      id: `staff_${Date.now()}`,
      name: newStaff.name.trim(),
      phone: cleanPhone,
      role: newStaff.role.trim() || '현장 담당',
      active: true,
    };

    const nextList = [...editableRecipients, item];
    setEditableRecipients(nextList);
    setNewStaff({ name: '', phone: '', role: '현장 담당자' });
  };

  // 직원 삭제 핸들러
  const handleDeleteStaff = (id: string) => {
    setEditableRecipients((prev) => prev.filter((s) => s.id !== id));
  };

  // 직원 활성 상태 토글
  const handleToggleStaffActive = (id: string) => {
    setEditableRecipients((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  };

  // 직원 연락처 목록 최종 저장
  const handleSaveStaffList = async () => {
    try {
      const res = await fetch('/api/petforet/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffRecipients: editableRecipients }),
      });
      if (res.ok) {
        await fetchSettings();
        setIsStaffManagerOpen(false);
        setSendResultAlert({
          type: 'success',
          message: `수신 직원 연락처 총 ${editableRecipients.length}명이 성공적으로 저장되었습니다.`,
        });
      } else {
        alert('저장에 실패했습니다.');
      }
    } catch (err: any) {
      alert('오류 발생: ' + err.message);
    }
  };

  // 문자 템플릿 및 솔라피 설정 저장
  const handleSaveTemplateSettings = async () => {
    try {
      const payload: any = { staffMessageTemplate: editableTemplate };
      if (newSecretInput) {
        payload.apiSecret = newSecretInput;
      }
      const res = await fetch('/api/petforet/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchSettings();
        setIsTemplateEditorOpen(false);
        setNewSecretInput('');
        setSendResultAlert({
          type: 'success',
          message: '직원 발송용 문자 템플릿 및 설정이 성공적으로 저장되었습니다.',
        });
      } else {
        alert('저장 실패');
      }
    } catch (err: any) {
      alert('오류: ' + err.message);
    }
  };

  // 활성 직원 목록
  const activeStaffList = useMemo(() => {
    return (config.staffRecipients || []).filter((s) => s.active && s.phone);
  }, [config.staffRecipients]);

  // 미결제 목록 추출
  const unpaidReservations = useMemo(() => {
    return reservations.filter((r) => r.paymentStatus === 'UNPAID');
  }, [reservations]);

  // 실시간 직원 발송용 완성 메시지 텍스트 생성
  const renderedStaffMessage = useMemo(() => {
    let text = editableTemplate || config.staffMessageTemplate || '';
    text = text.replace(/#\{날짜\}/g, selectedDate);
    text = text.replace(/#\{총예약건수\}/g, String(summary.totalReservations || 0));
    text = text.replace(/#\{총예약금액\}/g, (Number(summary.totalAmount) || 0).toLocaleString());
    text = text.replace(/#\{결제완료건수\}/g, String(summary.paidCount || 0));
    text = text.replace(/#\{결제완료금액\}/g, (Number(summary.paidAmount) || 0).toLocaleString());
    text = text.replace(/#\{미결제건수\}/g, String(summary.unpaidCount || 0));
    text = text.replace(/#\{미결제금액\}/g, (Number(summary.unpaidAmount) || 0).toLocaleString());

    let unpaidListStr = '';
    if (unpaidReservations.length === 0) {
      unpaidListStr = '(당일 미결제 예약 없음 - 전원 결제 완료)';
    } else {
      unpaidListStr = unpaidReservations
        .map((r, i) => `${i + 1}. ${r.customerName} | ${r.productName} (${(Number(r.totalPrice) || 0).toLocaleString()}원)`)
        .join('\n');
    }
    text = text.replace(/#\{미결제고객명단\}/g, unpaidListStr);
    return text.trim();
  }, [editableTemplate, config.staffMessageTemplate, selectedDate, summary, unpaidReservations]);

  // 직원에게 문자 발송 실행
  const handleSendToStaff = async () => {
    if (activeStaffList.length === 0) {
      alert('문자를 수신할 활성 직원이 없습니다. [수신 직원 관리]에서 직원을 등록해 주세요.');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/petforet/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: activeStaffList.map((s) => ({ name: s.name, phone: s.phone })),
          messageText: renderedStaffMessage,
        }),
      });

      const json = await res.json();
      setIsSendStaffModalOpen(false);

      if (json.status === 'success' || json.succeeded > 0) {
        setSendResultAlert({
          type: 'success',
          message: `현장 담당 직원 총 ${json.total}명 중 ${json.succeeded}명에게 예약 확인 문자가 성공적으로 발송되었습니다.`,
        });
        fetchSettings();
      } else {
        alert('발송 실패: ' + (json.message || '오류가 발생했습니다.'));
      }
    } catch (err: any) {
      alert('발송 통신 오류: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // 필터링된 예약 목록 (직원 검토용)
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (paymentStatusFilter !== 'ALL' && r.paymentStatus !== paymentStatusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const nameMatch = (r.customerName || '').toLowerCase().includes(query);
        const phoneMatch = (r.customerPhone || '').includes(query);
        const idMatch = (r.reservationId || '').toLowerCase().includes(query);
        const prodMatch = (r.productName || '').toLowerCase().includes(query);
        if (!nameMatch && !phoneMatch && !idMatch && !prodMatch) return false;
      }
      return true;
    });
  }, [reservations, paymentStatusFilter, searchQuery]);

  const formatPhone = (phone?: string) => {
    if (!phone) return '-';
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 11) {
      if (unmaskPhone) {
        return clean.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
      }
      return clean.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3');
    }
    return phone;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-slate-800">
      {/* 1. Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Title & Badge */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00AE95] to-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Dog size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    펫포레(Petforet) 운영 및 직원 예약 알림 센터
                  </h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-2xs font-extrabold border ${
                    config.salesActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-rose-50 text-rose-700 border-rose-300'
                  }`}>
                    {config.salesActive ? '● 정상 판매 중' : '■ 판매 일시 중단'}
                  </span>
                </div>
                <p className="text-2xs text-slate-500 mt-0.5">
                  당일 예약·결제 실측 현황 모니터링, 시설 판매 On/Off 제어 및 현장 담당 직원 예약 확인 문자 발송
                </p>
              </div>
            </div>

            {/* Top Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Date Selector */}
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                <Calendar size={13} className="text-slate-500" />
                <span>예약 일자:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent font-extrabold text-slate-900 outline-none cursor-pointer"
                />
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => fetchReservations()}
                disabled={loading}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                title="새로고침"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin text-[#00AE95]' : ''} />
              </button>

              {/* Staff Recipient Manager Button */}
              <button
                type="button"
                onClick={() => setIsStaffManagerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Users size={13} className="text-[#00AE95]" />
                <span>수신 직원 관리 ({config.staffRecipients?.length || 0}명)</span>
              </button>

              {/* Template Editor Button */}
              <button
                type="button"
                onClick={() => setIsTemplateEditorOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Edit3 size={13} />
                <span>발송 문자 내용 수정</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* Global Result Alert */}
        {sendResultAlert && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-fadeIn ${
            sendResultAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center gap-2.5">
              {sendResultAlert.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-rose-600 shrink-0" />
              )}
              <span className="text-xs font-bold leading-relaxed">{sendResultAlert.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSendResultAlert(null)}
              className="text-2xs font-extrabold px-2 py-1 rounded-lg bg-black/5 hover:bg-black/10 cursor-pointer"
            >
              닫기
            </button>
          </div>
        )}

        {/* 2. Facility Operational Status & Sales On/Off Control Banner */}
        <section className={`rounded-3xl p-5 border shadow-xs transition-all ${
          config.salesActive
            ? 'bg-gradient-to-r from-emerald-500/10 via-white to-white border-emerald-200'
            : 'bg-gradient-to-r from-rose-500/10 via-white to-white border-rose-300'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                config.salesActive ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}>
                <Power size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">
                    펫포레 시설 판매 제어 (현재: {config.salesActive ? '정상 판매 중' : '판매 일시 중단'})
                  </h3>
                  <span className={`text-3xs font-extrabold px-2 py-0.5 rounded-full ${
                    config.salesActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {config.salesActive ? '온라인/현장 예약 오픈' : '현장/온라인 예약 차단'}
                  </span>
                </div>
                <p className="text-2xs text-slate-600 mt-1">
                  {config.salesActive 
                    ? '오늘 펫포레는 정상 운영 중이며, 온라인 예약 및 현장 발권이 정상 수신되고 있습니다.' 
                    : `⚠️ 판매 중단 사유: ${config.salesNotice || '시설 긴급 점검 및 기상 상황으로 인한 일시 판매 중단'}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleSales}
                className={`px-4 py-2 rounded-2xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  config.salesActive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Power size={13} />
                <span>{config.salesActive ? '판매 일시 중단하기' : '판매 재개 (정상 오픈)'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* 3. STAFF NOTIFICATION ACTION BAR (Our Core Feature) */}
        <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-md border border-slate-700">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            
            {/* Left: Staff Recipients Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs">
                  📢 현장 담당 직원 알림
                </span>
                <h3 className="text-sm font-black text-white">
                  오늘({selectedDate}) 예약 및 미결제 현황 직원 문자 발송
                </h3>
              </div>
              <p className="text-2xs text-slate-300 leading-relaxed max-w-2xl">
                고객이 아닌 <strong>우리 현장 직원(데스크/운영팀)</strong>에게 오늘 방문 예정 예약 및 미결제 건수를 문자로 전송하여, 
                현장 내장 시 사전 결제 여부를 확실하게 확인하도록 알립니다.
              </p>

              {/* Staff Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-3xs text-slate-400 font-bold">수신 직원 ({activeStaffList.length}명):</span>
                {activeStaffList.length > 0 ? (
                  activeStaffList.map((s) => (
                    <span 
                      key={s.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 text-white text-3xs font-semibold border border-white/15"
                    >
                      <span>👤</span>
                      <strong>{s.name}</strong>
                      <span className="text-slate-300 font-mono">({s.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')})</span>
                      <span className="text-emerald-400 text-4xs">[{s.role || '담당'}]</span>
                    </span>
                  ))
                ) : (
                  <span className="text-amber-300 text-3xs font-bold">
                    ⚠️ 등록된 수신 직원이 없습니다. 우측 버튼을 눌러 직원을 추가해 주세요.
                  </span>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsTemplateEditorOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 size={13} />
                <span>문자 내용 수정</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSendStaffModalOpen(true)}
                disabled={activeStaffList.length === 0 || isSending}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-[#00AE95] hover:from-emerald-600 hover:to-[#008A77] text-white text-xs font-black shadow-md flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send size={14} />
                <span>담당 직원에게 지금 바로 발송 ({activeStaffList.length}명)</span>
              </button>
            </div>

          </div>
        </section>

        {/* 4. 4 Key Summary KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: 총 예약 */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-2xs text-slate-500 font-bold">
              <span>당일 총 예약 건수</span>
              <Receipt size={16} className="text-slate-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {summary.totalReservations.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-500">건</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-500 font-medium">
              <span>총 예약 금액</span>
              <strong className="text-slate-800 font-bold">{formatNumber(summary.totalAmount)}원</strong>
            </div>
          </div>

          {/* Card 2: 결제 완료 */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-2xs text-slate-500 font-bold">
              <span>결제 완료 (확정)</span>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-800 tracking-tight">
                {summary.paidCount.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-500">건</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-500 font-medium">
              <span>결제 완료 금액</span>
              <strong className="text-emerald-800 font-bold">{formatNumber(summary.paidAmount)}원</strong>
            </div>
          </div>

          {/* Card 3: 미결제 집중 확인 대상 */}
          <div className="bg-white rounded-3xl p-5 border-2 border-amber-400/80 bg-gradient-to-br from-amber-50/40 to-white shadow-xs space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between text-2xs text-amber-900 font-black">
              <span className="flex items-center gap-1">
                <span>⚠️ 미결제 예약 (현장 결제 확인 대상)</span>
              </span>
              <Clock size={16} className="text-amber-600 animate-pulse" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-950 tracking-tight">
                {summary.unpaidCount.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-amber-700">건</span>
            </div>
            <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-3xs text-amber-900 font-bold">
              <span>미결제 총 금액</span>
              <strong className="text-rose-700 font-black">{formatNumber(summary.unpaidAmount)}원</strong>
            </div>
          </div>

          {/* Card 4: 결제율 */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-2xs text-slate-500 font-bold">
              <span>당일 결제 완료율</span>
              <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                목표 95%
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-indigo-950 tracking-tight">
                {summary.paymentRate.toFixed(1)}
              </span>
              <span className="text-xs font-bold text-slate-500">%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                style={{ width: `${Math.min(Math.max(summary.paymentRate, 0), 100)}%` }}
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
              />
            </div>
          </div>
        </section>

        {/* 5. Reservations Inspection Table (Read-Only for Staff) */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPaymentStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    paymentStatusFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  전체 ({summary.totalReservations}건)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatusFilter('UNPAID')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    paymentStatusFilter === 'UNPAID'
                      ? 'bg-amber-500 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  미결제만 보기 ({summary.unpaidCount}건)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatusFilter('PAID')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    paymentStatusFilter === 'PAID'
                      ? 'bg-emerald-600 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  결제 완료 ({summary.paidCount}건)
                </button>
              </div>

              {/* Phone Mask Toggle */}
              <button
                type="button"
                onClick={() => setUnmaskPhone(!unmaskPhone)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-2xs font-bold text-slate-600 cursor-pointer"
                title="현장 확인용 고객 번호 마스킹 해제"
              >
                {unmaskPhone ? <EyeOff size={12} /> : <Eye size={12} />}
                <span>{unmaskPhone ? '번호 마스킹' : '번호 마스킹 해제'}</span>
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="고객명, 연락처, 예약번호..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white outline-none focus:border-[#00AE95] w-56 sm:w-64"
              />
            </div>

          </div>

          {/* Table */}
          <div className="overflow-x-auto custom-scrollbar border border-slate-100 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-3xs font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">예약번호</th>
                  <th className="py-2.5 px-3">주문번호</th>
                  <th className="py-2.5 px-3">구매/예약 일시</th>
                  <th className="py-2.5 px-3">예약자 성명</th>
                  <th className="py-2.5 px-3">고객 연락처 (현장 확인용)</th>
                  <th className="py-2.5 px-3">예약 상품</th>
                  <th className="py-2.5 px-3 text-right">결제 금액</th>
                  <th className="py-2.5 px-3 text-center">결제 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredReservations.length > 0 ? (
                  filteredReservations.map((item, idx) => {
                    const isUnpaid = item.paymentStatus === 'UNPAID';

                    return (
                      <tr key={item.reservationId || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-3xs font-black text-slate-700 whitespace-nowrap">
                          {item.reservationId}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-3xs text-slate-500 whitespace-nowrap">
                          {item.orderId || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-3xs text-slate-600 whitespace-nowrap">
                          {item.orderDate || item.visitDate || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                          {item.customerName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-2xs text-slate-700 whitespace-nowrap">
                          {formatPhone(item.customerPhone)}
                        </td>
                        <td className="py-2.5 px-3 text-2xs text-slate-800 max-w-[240px] truncate" title={item.productName}>
                          {item.productName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                          {formatNumber(item.totalPrice)}원
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-extrabold ${
                            isUnpaid
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : item.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isUnpaid ? '미결제 (가예약)' : item.paymentStatus === 'PAID' ? '결제 완료' : '예약 취소'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                      {loading ? '예약 내역을 불러오는 중입니다...' : '해당 일자 및 조건에 부합하는 예약 데이터가 없습니다.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {/* MODAL 1: 수신 직원 연락처 관리 모달 */}
      {isStaffManagerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleIn">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#00AE95]" />
                <h3 className="text-sm font-black text-slate-900">
                  문자 수신 직원 연락처 관리
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStaffManagerOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Add Staff Form */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="text-2xs font-extrabold text-slate-700 flex items-center gap-1">
                <UserPlus size={13} className="text-[#00AE95]" />
                <span>신규 수신 직원 추가</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="직원 이름 (예: 김팀장)"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="p-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#00AE95] bg-white"
                />
                <input
                  type="text"
                  placeholder="휴대폰 번호 (010...)"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  className="p-2 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-[#00AE95] bg-white"
                />
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="담당/직책"
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                    className="p-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#00AE95] bg-white flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddStaff}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shrink-0 cursor-pointer"
                  >
                    추가
                  </button>
                </div>
              </div>
            </div>

            {/* Registered Staff List */}
            <div className="space-y-2">
              <div className="text-2xs font-extrabold text-slate-500">
                등록된 수신 직원 목록 ({editableRecipients.length}명)
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar">
                {editableRecipients.length > 0 ? (
                  editableRecipients.map((staff) => (
                    <div 
                      key={staff.id}
                      className="p-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={staff.active}
                          onChange={() => handleToggleStaffActive(staff.id)}
                          className="w-4 h-4 rounded text-[#00AE95] cursor-pointer"
                          title="발송 대상 포함 여부"
                        />
                        <div>
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span>{staff.name}</span>
                            <span className="text-3xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {staff.role || '담당'}
                            </span>
                          </div>
                          <span className="text-2xs font-mono text-slate-500">
                            {staff.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-3xs font-extrabold px-2 py-0.5 rounded-full ${
                          staff.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {staff.active ? '발송 활성' : '발송 제외'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    등록된 직원이 없습니다. 위 폼에서 직원을 추가해 주세요.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsStaffManagerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={handleSaveStaffList}
                className="px-5 py-2 rounded-xl bg-[#00AE95] hover:bg-[#008A77] text-white text-xs font-black shadow-xs cursor-pointer"
              >
                직원 목록 저장하기
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: 발송 문자 내용 편집 & 미리보기 모달 */}
      {isTemplateEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-scaleIn">
            
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-[#00AE95]" />
                <h3 className="text-sm font-black text-slate-900">
                  직원 발송용 알림 문자 내용 편집 및 설정
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateEditorOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center px-5 pt-3 border-b border-slate-100 gap-2 shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setActiveSettingsTab('template')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeSettingsTab === 'template'
                    ? 'border-[#00AE95] text-[#00AE95]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                1. 직원용 문자 템플릿 편집
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab('config')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeSettingsTab === 'config'
                    ? 'border-[#00AE95] text-[#00AE95]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                2. 솔라피 발송 인증키 설정
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab('logs')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeSettingsTab === 'logs'
                    ? 'border-[#00AE95] text-[#00AE95]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                3. 최근 발송 이력 ({logs.length}건)
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
              {activeSettingsTab === 'template' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <div>
                      <label className="text-2xs font-extrabold text-slate-700 block mb-1">
                        직원 발송용 메시지 본문
                      </label>
                      <textarea
                        rows={14}
                        value={editableTemplate}
                        onChange={(e) => setEditableTemplate(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-mono text-slate-900 bg-slate-50/50 outline-none focus:border-[#00AE95] leading-relaxed resize-none"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200/80 text-3xs text-slate-600 space-y-1">
                      <div className="font-extrabold text-slate-800">💡 사용 가능한 자동 치환 변수:</div>
                      <div className="flex flex-wrap gap-1 pt-1 font-mono">
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{날짜}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{총예약건수}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{총예약금액}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{결제완료건수}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{결제완료금액}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{미결제건수}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{미결제금액}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{미결제고객명단}'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Smartphone Preview */}
                  <div className="flex flex-col items-center">
                    <div className="text-2xs font-extrabold text-slate-500 mb-2 flex items-center gap-1">
                      <Smartphone size={12} />
                      <span>수신 직원 휴대폰 실시간 미리보기</span>
                    </div>

                    <div className="w-[280px] bg-slate-900 rounded-[36px] p-3 shadow-xl border-4 border-slate-800">
                      <div className="bg-[#E9ECEF] rounded-[24px] p-3 min-h-[380px] flex flex-col justify-start space-y-2">
                        <div className="text-center text-3xs font-bold text-slate-500 pb-1">
                          수신 문자 (LMS)
                        </div>
                        <div className="bg-white text-slate-900 p-3 rounded-2xl rounded-tl-xs shadow-xs text-3xs space-y-2 leading-relaxed whitespace-pre-wrap font-mono">
                          {renderedStaffMessage}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'config' && (
                <div className="space-y-4 max-w-xl mx-auto text-xs">
                  <div>
                    <label className="text-2xs font-extrabold text-slate-700 block mb-1">
                      사전 등록된 솔라피 발신번호 (필수)
                    </label>
                    <input
                      type="text"
                      placeholder="043-123-4567 또는 01012345678"
                      value={config.senderNumber || ''}
                      onChange={(e) => setConfig({ ...config, senderNumber: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-[#00AE95]"
                    />
                  </div>

                  <div>
                    <label className="text-2xs font-extrabold text-slate-700 block mb-1">
                      솔라피 API Key
                    </label>
                    <input
                      type="text"
                      placeholder="NCS..."
                      value={config.apiKey || ''}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-[#00AE95]"
                    />
                  </div>

                  <div>
                    <label className="text-2xs font-extrabold text-slate-700 block mb-1">
                      솔라피 API Secret
                    </label>
                    <input
                      type="password"
                      placeholder={config.hasApiSecret ? `현재 등록됨 (${config.apiSecretMasked}) - 변경 시에만 입력` : '솔라피 API Secret 입력'}
                      value={newSecretInput}
                      onChange={(e) => setNewSecretInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-[#00AE95]"
                    />
                  </div>
                </div>
              )}

              {activeSettingsTab === 'logs' && (
                <div className="space-y-3">
                  <div className="overflow-x-auto custom-scrollbar border border-slate-100 rounded-2xl">
                    <table className="w-full text-left border-collapse text-3xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-extrabold">
                          <th className="p-2">발송 시각</th>
                          <th className="p-2">수신 직원</th>
                          <th className="p-2">수신 번호</th>
                          <th className="p-2">발송 유형</th>
                          <th className="p-2 text-center">결과</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {logs.length > 0 ? (
                          logs.map((log, i) => (
                            <tr key={log.id || i} className="hover:bg-slate-50">
                              <td className="p-2 text-slate-500">{log.timestamp?.replace('T', ' ').slice(0, 19)}</td>
                              <td className="p-2 font-bold text-slate-900 font-sans">{log.staffName || '직원'}</td>
                              <td className="p-2 text-slate-700">{log.staffPhone}</td>
                              <td className="p-2 text-slate-600 font-sans">{log.sendType}</td>
                              <td className="p-2 text-center">
                                <span className={`px-1.5 py-0.5 rounded-full font-bold font-sans ${
                                  log.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {log.success ? '성공' : '실패'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400 font-sans">
                              아직 발송 이력이 없습니다.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsTemplateEditorOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={handleSaveTemplateSettings}
                className="px-5 py-2 rounded-xl bg-[#00AE95] hover:bg-[#008A77] text-white text-xs font-black shadow-xs cursor-pointer"
              >
                저장하기
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: 직원 알림 문자 즉시 발송 확인 모달 */}
      {isSendStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleIn">
            
            <div className="flex items-center gap-2 text-slate-900">
              <Send size={18} className="text-[#00AE95]" />
              <h3 className="text-sm font-black">
                현장 직원 예약 현황 문자 발송 확인
              </h3>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-2xs space-y-2">
              <div>
                <span className="text-slate-500 font-bold block mb-1">수신 대상 직원 ({activeStaffList.length}명):</span>
                <div className="flex flex-wrap gap-1">
                  {activeStaffList.map((s) => (
                    <span key={s.id} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-800">
                      {s.name} ({s.phone.slice(-4)})
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1">실제 전송 내용 미리보기:</span>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 font-mono text-3xs text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  {renderedStaffMessage}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSendStaffModalOpen(false)}
                disabled={isSending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSendToStaff}
                disabled={isSending}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Send size={13} />
                <span>{isSending ? '직원에게 발송 중...' : '직원에게 지금 전송하기'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
