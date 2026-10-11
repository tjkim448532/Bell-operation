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
  MessageSquare, 
  Power, 
  Smartphone, 
  Search, 
  ShieldCheck, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

interface ReservationItem {
  id?: string;
  reservationId: string;
  orderDate?: string;
  visitDate: string;
  visitTime?: string;
  customerName: string;
  customerPhone: string;
  petType?: string;
  petCount?: number;
  productName: string;
  quantity?: number;
  totalPrice: number;
  paymentStatus: 'UNPAID' | 'PAID' | 'CANCELLED';
  paymentDueDate?: string;
  paymentUrl?: string;
  lastNotifiedAt?: string | null;
  lastNotifyType?: string | null;
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
  messageTemplate: string;
  salesActive: boolean;
  salesNotice: string;
}

interface NotificationLog {
  id: string;
  timestamp: string;
  reservationId: string;
  customerName: string;
  customerPhone: string;
  sendType: string;
  success: boolean;
  productName?: string;
  totalPrice?: number;
  error?: string;
}

export default function PetforetPage() {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('UNPAID');
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
    messageTemplate: '',
    salesActive: true,
    salesNotice: '',
  });
  const [logs, setLogs] = useState<NotificationLog[]>([]);

  // 모달 상태
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'template' | 'config' | 'logs'>('template');
  const [editableConfig, setEditableConfig] = useState<Partial<PetforetConfig>>({});
  const [newSecretInput, setNewSecretInput] = useState<string>('');
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // 단건 발송 모달
  const [sendTargetItem, setSendTargetItem] = useState<ReservationItem | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendResultAlert, setSendResultAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 일괄 발송 확인 모달
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState<boolean>(false);

  // 수동 테스트 예약 추가 모달
  const [isAddTestOpen, setIsAddTestOpen] = useState<boolean>(false);
  const [testForm, setTestForm] = useState({
    customerName: '',
    customerPhone: '',
    productName: '펫포레 그라운드 입장권 + 쉼터',
    totalPrice: 45000,
    visitTime: '11:00',
    paymentUrl: 'https://booking.belleforet.com/pay/test',
  });

  // 예약 데이터 로드
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

  // 설정 및 로그 로드
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/petforet/settings');
      if (res.ok) {
        const json = await res.json();
        if (json.data?.config) {
          setConfig(json.data.config);
          setEditableConfig(json.data.config);
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

  // 펫포레 판매 On/Off 토글
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
        setEditableConfig((prev) => ({ ...prev, salesActive: nextState }));
        setSendResultAlert({
          type: 'success',
          message: `펫포레 판매 상태가 [${nextState ? '정상 판매 중' : '판매 일시 중단'}]으로 변경되었습니다.`,
        });
      }
    } catch (err: any) {
      alert('상태 변경 실패: ' + err.message);
    }
  };

  // 설정 저장
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const payload: any = { ...editableConfig };
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
        setNewSecretInput('');
        setIsSettingsOpen(false);
        setSendResultAlert({
          type: 'success',
          message: '운영 설정 및 문자 템플릿이 성공적으로 저장되었습니다.',
        });
      } else {
        const json = await res.json();
        alert('저장 실패: ' + json.message);
      }
    } catch (err: any) {
      alert('오류 발생: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // 단건 발송 실행
  const handleSendSingle = async () => {
    if (!sendTargetItem) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/petforet/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: sendTargetItem.customerPhone,
          customerName: sendTargetItem.customerName,
          reservationId: sendTargetItem.reservationId,
          visitDate: sendTargetItem.visitDate,
          visitTime: sendTargetItem.visitTime,
          productName: sendTargetItem.productName,
          totalPrice: sendTargetItem.totalPrice,
          paymentDueDate: sendTargetItem.paymentDueDate,
          paymentUrl: sendTargetItem.paymentUrl,
        }),
      });
      const json = await res.json();
      if (json.status === 'success' || json.succeeded > 0) {
        setSendResultAlert({
          type: 'success',
          message: `${sendTargetItem.customerName} 고객님께 ${config.useKakaoAlimtalk ? '카카오 알림톡' : '안내 문자(LMS)'}가 성공적으로 발송되었습니다.`,
        });
        setSendTargetItem(null);
        fetchReservations();
        fetchSettings();
      } else {
        const errDetail = json.results?.[0]?.error || json.message;
        alert('발송 실패: ' + errDetail);
      }
    } catch (err: any) {
      alert('발송 통신 오류: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // 미결제 전체 일괄 발송
  const handleSendBatch = async () => {
    const unpaidList = reservations.filter((r) => r.paymentStatus === 'UNPAID');
    if (unpaidList.length === 0) return;

    setIsSending(true);
    try {
      const items = unpaidList.map((r) => ({
        phone: r.customerPhone,
        customerName: r.customerName,
        reservationId: r.reservationId,
        visitDate: r.visitDate,
        visitTime: r.visitTime,
        productName: r.productName,
        totalPrice: r.totalPrice,
        paymentDueDate: r.paymentDueDate,
        paymentUrl: r.paymentUrl,
      }));

      const res = await fetch('/api/petforet/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      setIsBatchConfirmOpen(false);

      if (json.succeeded > 0) {
        setSendResultAlert({
          type: 'success',
          message: `당일 미결제 예약 총 ${json.total}건 중 ${json.succeeded}건 발송 완료 (실패 ${json.failed}건)`,
        });
        fetchReservations();
        fetchSettings();
      } else {
        alert('일괄 발송 실패: ' + json.message);
      }
    } catch (err: any) {
      alert('일괄 발송 오류: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // 테스트용 수동 예약 등록
  const handleAddTestReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testForm.customerName || !testForm.customerPhone) {
      alert('고객명과 전화번호는 필수입니다.');
      return;
    }

    try {
      const newId = `PET-${selectedDate.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await fetch('/api/petforet/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: newId,
          visitDate: selectedDate,
          visitTime: testForm.visitTime,
          customerName: testForm.customerName,
          customerPhone: testForm.customerPhone,
          productName: testForm.productName,
          totalPrice: Number(testForm.totalPrice),
          paymentStatus: 'UNPAID',
          paymentDueDate: `${selectedDate} 09:30:00`,
          paymentUrl: testForm.paymentUrl,
        }),
      });

      // 만약 POST 라우트가 별도로 없으면 직접 클라이언트 state에 임시 반영
      const newItem: ReservationItem = {
        reservationId: newId,
        visitDate: selectedDate,
        visitTime: testForm.visitTime,
        customerName: testForm.customerName,
        customerPhone: testForm.customerPhone,
        productName: testForm.productName,
        totalPrice: Number(testForm.totalPrice),
        paymentStatus: 'UNPAID',
        paymentDueDate: `${selectedDate} 09:30:00`,
        paymentUrl: testForm.paymentUrl,
        lastNotifiedAt: null,
      };

      setReservations((prev) => [newItem, ...prev]);
      setSummary((prev) => ({
        ...prev,
        totalReservations: prev.totalReservations + 1,
        unpaidCount: prev.unpaidCount + 1,
        unpaidAmount: prev.unpaidAmount + newItem.totalPrice,
        totalAmount: prev.totalAmount + newItem.totalPrice,
      }));

      setIsAddTestOpen(false);
      setTestForm({
        customerName: '',
        customerPhone: '',
        productName: '펫포레 그라운드 입장권 + 쉼터',
        totalPrice: 45000,
        visitTime: '11:00',
        paymentUrl: 'https://booking.belleforet.com/pay/test',
      });
      setSendResultAlert({
        type: 'success',
        message: '테스트용 미결제 예약이 추가되었습니다. [문자 보내기]로 즉시 테스트 발송할 수 있습니다.',
      });
    } catch (err: any) {
      alert('등록 오류: ' + err.message);
    }
  };

  // 필터링된 예약 목록
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      // 결제 상태 필터
      if (paymentStatusFilter !== 'ALL' && r.paymentStatus !== paymentStatusFilter) {
        return false;
      }
      // 검색어 필터
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

  // 전화번호 마스킹 함수
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

  // 실시간 템플릿 프리뷰 텍스트 생성
  const previewSampleText = useMemo(() => {
    let t = editableConfig.messageTemplate || config.messageTemplate || '';
    t = t.replace(/#\{고객명\}/g, '홍길동');
    t = t.replace(/#\{예약번호\}/g, 'PET-20261011-0042');
    t = t.replace(/#\{이용일자\}/g, selectedDate);
    t = t.replace(/#\{이용시간\}/g, '11:00');
    t = t.replace(/#\{예약상품\}/g, '펫포레 그라운드 종일권 + 쉼터 1개소');
    t = t.replace(/#\{결제금액\}/g, '65,000');
    t = t.replace(/#\{결제기한\}/g, '당일 오전 10:00');
    t = t.replace(/#\{결제링크\}/g, 'https://booking.belleforet.com/pay/PET-SAMPLE');
    return t;
  }, [editableConfig.messageTemplate, config.messageTemplate, selectedDate]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-slate-800">
      {/* 1. Top Header */}
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
                    펫포레(Petforet) 운영 관리 및 알림 센터
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
                  당일 아침 미결제 예약 실시간 식별, 카카오 알림톡/LMS 1-클릭 전송 및 시설 판매 온·오프 통제
                </p>
              </div>
            </div>

            {/* Controls (Date, Refresh, Settings) */}
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

              {/* Settings Button */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Settings size={13} />
                <span>문자 템플릿 & 발송 설정</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* Global Alert Notification */}
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
                    펫포레 시설 판매 제어 (현재: {config.salesActive ? '정상 판매 중' : '판매 중단'})
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

        {/* Backend Ready / Waiting Notification Banner */}
        {!isBackendReady && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200/90 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-2xs">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-amber-600 shrink-0" />
              <div>
                <strong className="font-extrabold">백엔드 V6 실측 API 대기 상태:</strong>{' '}
                <span>
                  백엔드 공식 API (`/api/v6/petforet/reservations`)가 배포되면 자동으로 라이브 연동됩니다. (가짜 숫자 영구 차단 원칙 준수)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAddTestOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold shrink-0 shadow-2xs cursor-pointer"
            >
              + 테스트 예약 직접 추가하기
            </button>
          </div>
        )}

        {/* 3. 4 Key Summary KPI Cards */}
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
              <span>결제 완료 건수</span>
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

          {/* Card 3: 미결제 집중 관리 (Core Focus) */}
          <div className="bg-white rounded-3xl p-5 border-2 border-amber-400/80 bg-gradient-to-br from-amber-50/40 to-white shadow-xs space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between text-2xs text-amber-900 font-black">
              <span className="flex items-center gap-1">
                <span>⚠️ 미결제 예약 (문자 발송 대상)</span>
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

          {/* Card 4: 당일 결제 완료율 */}
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

        {/* 4. Reservations Management & Notification Action Section */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Title & Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200 text-xs font-bold">
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
              </div>

              {/* Phone Mask Toggle */}
              <button
                type="button"
                onClick={() => setUnmaskPhone(!unmaskPhone)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-2xs font-bold text-slate-600 cursor-pointer"
                title="전화번호 전체 보기/마스킹 토글"
              >
                {unmaskPhone ? <EyeOff size={12} /> : <Eye size={12} />}
                <span>{unmaskPhone ? '번호 마스킹' : '번호 마스킹 해제'}</span>
              </button>
            </div>

            {/* Actions: Search & Batch Send */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Box */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="고객명, 연락처, 예약번호..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white outline-none focus:border-[#00AE95] w-48 sm:w-56"
                />
              </div>

              {/* Batch Send Button */}
              <button
                type="button"
                onClick={() => setIsBatchConfirmOpen(true)}
                disabled={summary.unpaidCount === 0 || isSending}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send size={13} />
                <span>당일 미결제 전체 일괄 발송 ({summary.unpaidCount}명)</span>
              </button>
            </div>

          </div>

          {/* Reservations Table */}
          <div className="overflow-x-auto custom-scrollbar border border-slate-100 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-3xs font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">예약번호</th>
                  <th className="py-2.5 px-3">예약자명</th>
                  <th className="py-2.5 px-3">연락처</th>
                  <th className="py-2.5 px-3">방문 시간</th>
                  <th className="py-2.5 px-3">예약 상품</th>
                  <th className="py-2.5 px-3 text-right">결제 금액</th>
                  <th className="py-2.5 px-3 text-center">결제 상태</th>
                  <th className="py-2.5 px-3 text-center">최근 발송 이력</th>
                  <th className="py-2.5 px-3 text-center">알림 발송</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredReservations.length > 0 ? (
                  filteredReservations.map((item, idx) => {
                    const isUnpaid = item.paymentStatus === 'UNPAID';
                    const hasNotified = !!item.lastNotifiedAt;

                    return (
                      <tr key={item.reservationId || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-3xs font-extrabold text-slate-600 whitespace-nowrap">
                          {item.reservationId}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                          {item.customerName}
                          {item.petType && (
                            <span className="text-3xs font-medium text-slate-400 block">
                              {item.petType} ({item.petCount || 1}두)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-2xs text-slate-700 whitespace-nowrap">
                          {formatPhone(item.customerPhone)}
                        </td>
                        <td className="py-2.5 px-3 text-2xs text-slate-600 whitespace-nowrap font-medium">
                          {item.visitTime || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-2xs text-slate-800 max-w-[200px] truncate" title={item.productName}>
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
                        <td className="py-2.5 px-3 text-center whitespace-nowrap text-3xs">
                          {hasNotified ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-extrabold">
                                <CheckCircle2 size={11} />
                                <span>{item.lastNotifyType || '발송완료'}</span>
                              </span>
                              <span className="text-slate-400 block font-mono">
                                {item.lastNotifiedAt?.slice(11, 16)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-medium">미발송</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSendTargetItem(item)}
                            className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-3xs font-extrabold transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Send size={10} />
                            <span>문자 보내기</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                      {loading ? '예약 내역을 불러오는 중입니다...' : '해당 일자 및 조건에 부합하는 예약 데이터가 없습니다.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {/* 5. Settings & Template Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-scaleIn">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-[#00AE95]" />
                <h3 className="text-sm font-black text-slate-900">
                  펫포레 운영 설정 및 알림톡 템플릿 관리
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
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
                1. 문자·알림톡 템플릿 편집
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
                2. 솔라피 & 카카오 발송 엔진 설정
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
                3. 최근 발송 감사 로그 ({logs.length}건)
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
              
              {/* Tab 1: Template Editor with Mobile Preview */}
              {activeSettingsTab === 'template' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Left: Textarea Editor */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-2xs font-extrabold text-slate-700 block mb-1">
                        안내 문자 / 알림톡 본문 템플릿
                      </label>
                      <textarea
                        rows={14}
                        value={editableConfig.messageTemplate || ''}
                        onChange={(e) => setEditableConfig({ ...editableConfig, messageTemplate: e.target.value })}
                        className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-mono text-slate-900 bg-slate-50/50 outline-none focus:border-[#00AE95] leading-relaxed resize-none"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200/80 text-3xs text-slate-600 space-y-1">
                      <div className="font-extrabold text-slate-800">💡 사용 가능한 치환 변수 태그:</div>
                      <div className="flex flex-wrap gap-1 pt-1 font-mono">
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{고객명}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{예약번호}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{이용일자}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{이용시간}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{예약상품}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{결제금액}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{결제기한}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{결제링크}'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: KakaoTalk Smartphone Mockup Preview */}
                  <div className="flex flex-col items-center">
                    <div className="text-2xs font-extrabold text-slate-500 mb-2 flex items-center gap-1">
                      <Smartphone size={12} />
                      <span>수신 고객 스마트폰 실시간 미리보기</span>
                    </div>

                    <div className="w-[280px] bg-slate-900 rounded-[36px] p-3 shadow-xl border-4 border-slate-800">
                      <div className="bg-[#B2C7D9] rounded-[24px] p-3 min-h-[380px] flex flex-col justify-start space-y-2">
                        {/* Channel Header */}
                        <div className="text-center text-3xs font-bold text-slate-700 pb-1">
                          벨포레 리조트 펫포레
                        </div>

                        {/* Yellow Kakao Bubble */}
                        <div className="bg-[#FEE500] text-slate-900 p-3 rounded-2xl rounded-tl-xs shadow-xs text-3xs space-y-2 leading-relaxed whitespace-pre-wrap font-sans">
                          {previewSampleText}
                        </div>

                        {/* Action Button */}
                        <div className="bg-white rounded-xl py-2 text-center text-3xs font-extrabold text-slate-900 shadow-xs border border-slate-200">
                          모바일 결제하기
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Config & Keys */}
              {activeSettingsTab === 'config' && (
                <div className="space-y-4 max-w-xl mx-auto text-xs">
                  {/* Mode Switch (Kakao vs LMS) */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={16} className="text-amber-800" />
                        <span className="font-extrabold text-amber-950">카카오 알림톡 정규 모드 스위치</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editableConfig.useKakaoAlimtalk || false}
                          onChange={(e) => setEditableConfig({ ...editableConfig, useKakaoAlimtalk: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00AE95]"></div>
                      </label>
                    </div>
                    <p className="text-3xs text-amber-800 leading-relaxed">
                      {editableConfig.useKakaoAlimtalk 
                        ? '🟢 [카카오 알림톡 모드]: 카카오 사전 심사 템플릿으로 발송되며, 카카오 미설치/차단 시 솔라피가 자동으로 일반 문자로 대체 발송합니다.' 
                        : '🟡 [일반 장문 문자(LMS) 모드]: 카카오 템플릿 심사 전에도 즉시 장문 문자로 전송됩니다.'}
                    </p>
                  </div>

                  {/* Sender Number */}
                  <div>
                    <label className="text-2xs font-extrabold text-slate-700 block mb-1">
                      사전 등록된 솔라피 발신번호 (필수)
                    </label>
                    <input
                      type="text"
                      placeholder="예: 043-123-4567 또는 01012345678"
                      value={editableConfig.senderNumber || ''}
                      onChange={(e) => setEditableConfig({ ...editableConfig, senderNumber: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-[#00AE95]"
                    />
                  </div>

                  {/* Solapi API Key */}
                  <div>
                    <label className="text-2xs font-extrabold text-slate-700 block mb-1">
                      솔라피 API Key
                    </label>
                    <input
                      type="text"
                      placeholder="NCS..."
                      value={editableConfig.apiKey || ''}
                      onChange={(e) => setEditableConfig({ ...editableConfig, apiKey: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-[#00AE95]"
                    />
                  </div>

                  {/* Solapi API Secret */}
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

                  {/* Kakao PFID & Template ID */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-2xs font-extrabold text-slate-700 block mb-1">
                        카카오 채널 PFID
                      </label>
                      <input
                        type="text"
                        placeholder="KA01PF..."
                        value={editableConfig.pfId || ''}
                        onChange={(e) => setEditableConfig({ ...editableConfig, pfId: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-[#00AE95]"
                      />
                    </div>
                    <div>
                      <label className="text-2xs font-extrabold text-slate-700 block mb-1">
                        승인된 템플릿 ID
                      </label>
                      <input
                        type="text"
                        placeholder="KA01TP..."
                        value={editableConfig.templateId || ''}
                        onChange={(e) => setEditableConfig({ ...editableConfig, templateId: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-[#00AE95]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Logs */}
              {activeSettingsTab === 'logs' && (
                <div className="space-y-3">
                  <div className="text-2xs font-extrabold text-slate-500">
                    최근 발송 감사 이력 (최근 50건)
                  </div>
                  <div className="overflow-x-auto custom-scrollbar border border-slate-100 rounded-2xl">
                    <table className="w-full text-left border-collapse text-3xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-extrabold">
                          <th className="p-2">발송 시각</th>
                          <th className="p-2">고객명</th>
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
                              <td className="p-2 font-bold text-slate-900 font-sans">{log.customerName}</td>
                              <td className="p-2 text-slate-700">{log.customerPhone}</td>
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

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-5 py-2 rounded-xl bg-[#00AE95] hover:bg-[#008A77] text-white text-xs font-black shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {savingSettings ? '저장 중...' : '설정 저장하기'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. Single Message Confirmation Modal */}
      {sendTargetItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleIn">
            <div className="flex items-center gap-2 text-slate-900">
              <Send size={18} className="text-[#00AE95]" />
              <h3 className="text-sm font-black">
                {sendTargetItem.customerName} 고객님께 결제 안내 발송
              </h3>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-2xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">수신 번호:</span>
                <strong className="font-mono text-slate-900">{sendTargetItem.customerPhone}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">예약 상품:</span>
                <span className="text-slate-800 font-bold">{sendTargetItem.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">결제 금액:</span>
                <strong className="text-slate-900 font-black">{formatNumber(sendTargetItem.totalPrice)}원</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">발송 방식:</span>
                <span className="font-bold text-[#00AE95]">
                  {config.useKakaoAlimtalk ? '카카오 알림톡 (실패 시 LMS 자동 대체)' : '일반 장문 문자 (LMS)'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSendTargetItem(null)}
                disabled={isSending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSendSingle}
                disabled={isSending}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Send size={13} />
                <span>{isSending ? '발송 중...' : '즉시 발송하기'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Batch Send Confirmation Modal */}
      {isBatchConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleIn">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle size={20} />
              <h3 className="text-sm font-black text-slate-900">
                당일 미결제 전체 일괄 발송 확인
              </h3>
            </div>

            <p className="text-2xs text-slate-600 leading-relaxed">
              오늘(<strong>{selectedDate}</strong>) 기준 미결제 예약 총 <strong>{summary.unpaidCount}명</strong>의 고객에게 
              결제 안내 {config.useKakaoAlimtalk ? '카카오 알림톡' : '문자(LMS)'}를 순차 일괄 발송합니다.
            </p>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-3xs text-amber-900 font-bold space-y-1">
              <div>• 발송 총 대상: {summary.unpaidCount}건</div>
              <div>• 미결제 총액: {formatNumber(summary.unpaidAmount)}원</div>
              <div>• 솔라피 설정 발신번호: {config.senderNumber || '미설정'}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchConfirmOpen(false)}
                disabled={isSending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSendBatch}
                disabled={isSending}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white text-xs font-black shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Send size={13} />
                <span>{isSending ? '일괄 발송 중...' : '확인 및 일괄 발송 실행'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Add Test Reservation Modal */}
      {isAddTestOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                + 테스트용 미결제 가예약 추가
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTestOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTestReservation} className="space-y-3 text-xs">
              <div>
                <label className="text-2xs font-extrabold text-slate-700 block mb-1">고객명</label>
                <input
                  type="text"
                  required
                  placeholder="예: 홍길동"
                  value={testForm.customerName}
                  onChange={(e) => setTestForm({ ...testForm, customerName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#00AE95]"
                />
              </div>

              <div>
                <label className="text-2xs font-extrabold text-slate-700 block mb-1">전화번호 (실제 수신 테스트용)</label>
                <input
                  type="text"
                  required
                  placeholder="예: 01012345678"
                  value={testForm.customerPhone}
                  onChange={(e) => setTestForm({ ...testForm, customerPhone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono outline-none focus:border-[#00AE95]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-2xs font-extrabold text-slate-700 block mb-1">방문 시간</label>
                  <input
                    type="text"
                    value={testForm.visitTime}
                    onChange={(e) => setTestForm({ ...testForm, visitTime: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#00AE95]"
                  />
                </div>
                <div>
                  <label className="text-2xs font-extrabold text-slate-700 block mb-1">금액 (원)</label>
                  <input
                    type="number"
                    value={testForm.totalPrice}
                    onChange={(e) => setTestForm({ ...testForm, totalPrice: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#00AE95]"
                  />
                </div>
              </div>

              <div>
                <label className="text-2xs font-extrabold text-slate-700 block mb-1">상품명</label>
                <input
                  type="text"
                  value={testForm.productName}
                  onChange={(e) => setTestForm({ ...testForm, productName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#00AE95]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTestOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00AE95] hover:bg-[#008A77] text-white text-xs font-black shadow-xs cursor-pointer"
                >
                  예약 추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
