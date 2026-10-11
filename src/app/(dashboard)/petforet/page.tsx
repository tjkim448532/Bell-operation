"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  AlertTriangle,
  Zap,
  BellRing,
  Check,
  Plus
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
  // 직원 알림 상태 (Firestore 영구 보존)
  staffNotified?: boolean;
  staffNotifiedAt?: string | null;
  staffNotifiedCount?: number;
  staffNotifiedNames?: string[];
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
  notifiedPaidCount?: number;
  unnotifiedPaidCount?: number;
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
  purchaseMessageTemplate: string;
  staffRecipients: StaffRecipient[];
  autoDispatchEnabled: boolean;
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

  // 메인 탭: reservations(예약/구매) | staff(수신 직원 리스트) | settings(템플릿/설정)
  const [activeMainTab, setActiveMainTab] = useState<'reservations' | 'staff' | 'settings'>('reservations');

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
    notifiedPaidCount: 0,
    unnotifiedPaidCount: 0,
  });
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [config, setConfig] = useState<PetforetConfig>({
    apiKey: '',
    senderNumber: '',
    useKakaoAlimtalk: false,
    pfId: '',
    templateId: '',
    staffMessageTemplate: '',
    purchaseMessageTemplate: '',
    staffRecipients: [],
    autoDispatchEnabled: true,
    salesActive: true,
    salesNotice: '',
  });
  const [logs, setLogs] = useState<NotificationLog[]>([]);

  // 직원 편집 폼 (인라인 리스트 및 모달 공용)
  const [newStaff, setNewStaff] = useState({ name: '', phone: '', role: '현장 데스크' });
  const [editableRecipients, setEditableRecipients] = useState<StaffRecipient[]>([]);
  const [editableStaffTemplate, setEditableStaffTemplate] = useState<string>('');
  const [editablePurchaseTemplate, setEditablePurchaseTemplate] = useState<string>('');
  const [newSecretInput, setNewSecretInput] = useState<string>('');
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState<'purchaseTemplate' | 'summaryTemplate' | 'config' | 'logs'>('purchaseTemplate');

  // 모달 상태
  const [isSendStaffModalOpen, setIsSendStaffModalOpen] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendResultAlert, setSendResultAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. 예약 데이터 로드 (V6 실측 API + Firestore 알림 이력 자동 매핑)
  const fetchReservations = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
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
      if (showLoading) setLoading(false);
    }
  }, [selectedDate]);

  // 2. 설정 및 직원 목록 로드
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/petforet/settings');
      if (res.ok) {
        const json = await res.json();
        if (json.data?.config) {
          const cfg = json.data.config;
          setConfig(cfg);
          setEditableRecipients(cfg.staffRecipients || []);
          setEditableStaffTemplate(cfg.staffMessageTemplate || '');
          setEditablePurchaseTemplate(cfg.purchaseMessageTemplate || '');
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

  // 활성 직원 목록
  const activeStaffList = useMemo(() => {
    return (config.staffRecipients || []).filter((s) => s.active && s.phone);
  }, [config.staffRecipients]);

  // 미결제 목록 추출
  const unpaidReservations = useMemo(() => {
    return reservations.filter((r) => r.paymentStatus === 'UNPAID');
  }, [reservations]);

  // 미발송 결제 완료 목록 (아직 직원에게 알림이 가지 않은 신규 구매건)
  const unnotifiedPaidReservations = useMemo(() => {
    return reservations.filter((r) => r.paymentStatus === 'PAID' && !r.staffNotified);
  }, [reservations]);

  // 3. 신규 구매 자동 감지 및 백그라운드 발송 (Auto Dispatch Engine)
  const isAutoDispatchingRef = useRef(false);

  const checkAndAutoDispatch = useCallback(async () => {
    if (!config.autoDispatchEnabled || activeStaffList.length === 0 || isAutoDispatchingRef.current) {
      return;
    }

    try {
      isAutoDispatchingRef.current = true;
      // 당일 예약 새로고침
      const res = await fetch(`/api/petforet/reservations?date=${todayStr}&paymentStatus=PAID`);
      if (!res.ok) return;

      const json = await res.json();
      const paidItems: ReservationItem[] = json.data?.reservations || [];
      const unnotified = paidItems.filter((r) => !r.staffNotified);

      if (unnotified.length > 0) {
        // 미발송 건이 발견되면 자동으로 직원 알림 발송 실행
        const dispatchRes = await fetch('/api/petforet/notify-purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: todayStr,
            autoAllUnnotified: true,
          }),
        });

        if (dispatchRes.ok) {
          const dJson = await dispatchRes.json();
          if (dJson.notified > 0) {
            setSendResultAlert({
              type: 'success',
              message: `🔔 [자동 발송 완료] 신규 펫포레 결제 ${dJson.notified}건이 감지되어 현장 직원(${activeStaffList.length}명)에게 문자가 즉시 전송되었습니다.`,
            });
            fetchReservations(false);
            fetchSettings();
          }
        }
      }
    } catch (err) {
      console.warn('Auto dispatch error:', err);
    } finally {
      isAutoDispatchingRef.current = false;
    }
  }, [config.autoDispatchEnabled, activeStaffList, todayStr, fetchReservations, fetchSettings]);

  // 30초 주기 자동 폴링 (신규 구매 실시간 감지)
  useEffect(() => {
    if (!config.autoDispatchEnabled) return;

    const interval = setInterval(() => {
      checkAndAutoDispatch();
    }, 30000);

    return () => clearInterval(interval);
  }, [config.autoDispatchEnabled, checkAndAutoDispatch]);

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

  // 자동 발송 스위치 토글
  const handleToggleAutoDispatch = async () => {
    const nextVal = !config.autoDispatchEnabled;
    try {
      const res = await fetch('/api/petforet/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoDispatchEnabled: nextVal }),
      });
      if (res.ok) {
        setConfig((prev) => ({ ...prev, autoDispatchEnabled: nextVal }));
        setSendResultAlert({
          type: 'success',
          message: `신규 구매 자동 감지 및 발송 기능이 [${nextVal ? '활성화 (30초 주기)' : '일시정지'}]되었습니다.`,
        });
      }
    } catch (err: any) {
      alert('설정 변경 오류: ' + err.message);
    }
  };

  // 직원 추가 핸들러 (몇 명이든 무제한 추가)
  const handleAddStaff = async () => {
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
    setNewStaff({ name: '', phone: '', role: '현장 데스크' });

    // DB에 즉시 영구 저장
    try {
      await fetch('/api/petforet/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffRecipients: nextList }),
      });
      setConfig((prev) => ({ ...prev, staffRecipients: nextList }));
      setSendResultAlert({
        type: 'success',
        message: `새로운 직원 [${item.name} (${item.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')})] 님이 수신 리스트에 추가되었습니다.`,
      });
    } catch (err: any) {
      console.error('Failed to auto-save staff:', err);
    }
  };

  // 직원 삭제 핸들러
  const handleDeleteStaff = async (id: string) => {
    const target = editableRecipients.find((s) => s.id === id);
    if (!window.confirm(`[${target?.name || '해당 직원'}] 님을 수신 리스트에서 완전히 삭제하시겠습니까?`)) {
      return;
    }
    const nextList = editableRecipients.filter((s) => s.id !== id);
    setEditableRecipients(nextList);
    try {
      await fetch('/api/petforet/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffRecipients: nextList }),
      });
      setConfig((prev) => ({ ...prev, staffRecipients: nextList }));
      setSendResultAlert({
        type: 'success',
        message: '직원이 수신 리스트에서 삭제되었습니다.',
      });
    } catch (err: any) {
      console.error('Failed to save after delete staff:', err);
    }
  };

  // 직원 활성 상태 토글
  const handleToggleStaffActive = async (id: string) => {
    const nextList = editableRecipients.map((s) =>
      s.id === id ? { ...s, active: !s.active } : s
    );
    setEditableRecipients(nextList);
    try {
      await fetch('/api/petforet/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffRecipients: nextList }),
      });
      setConfig((prev) => ({ ...prev, staffRecipients: nextList }));
    } catch (err: any) {
      console.error('Failed to toggle staff active:', err);
    }
  };

  // 특정 직원에게 단독 테스트 문자 발송
  const handleSendTestToStaff = async (staff: StaffRecipient) => {
    if (!window.confirm(`[${staff.name} (${staff.phone})] 님에게 테스트 문자를 즉시 발송하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch('/api/petforet/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: [{ name: staff.name, phone: staff.phone }],
          messageText: `[벨포레 펫포레] 직원 알림 수신 테스트\n\n${staff.name}님, 펫포레 신규 결제 및 예약 알림이 정상적으로 수신 가능한 상태입니다.`,
        }),
      });

      const json = await res.json();
      if (json.status === 'success' || json.succeeded > 0) {
        setSendResultAlert({
          type: 'success',
          message: `[${staff.name}] 님에게 테스트 문자가 성공적으로 전송되었습니다!`,
        });
        fetchSettings();
      } else {
        alert('테스트 발송 실패: ' + (json.message || '오류 발생'));
      }
    } catch (err: any) {
      alert('통신 오류: ' + err.message);
    }
  };

  // 특정 구매건 단독 직원 발송 (최초 1회 보장)
  const handleSendSinglePurchase = async (item: ReservationItem) => {
    if (activeStaffList.length === 0) {
      alert('문자를 수신할 활성 직원이 없습니다. [직원 관리] 탭에서 직원을 등록해 주세요.');
      return;
    }

    if (!window.confirm(`[${item.customerName} - ${formatNumber(item.totalPrice)}원] 결제 건을 현장 직원(${activeStaffList.length}명)에게 전송하시겠습니까?`)) {
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/petforet/notify-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase: {
            reservationId: item.reservationId,
            orderId: item.orderId,
            customerName: item.customerName,
            customerPhone: item.customerPhone,
            productName: item.productName,
            totalPrice: item.totalPrice,
            orderDate: item.orderDate,
            visitDate: item.visitDate,
          },
        }),
      });

      const json = await res.json();
      if (json.status === 'success') {
        setSendResultAlert({
          type: 'success',
          message: json.message || '직원에게 결제 알림이 성공적으로 발송되었습니다.',
        });
        fetchReservations(false);
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

  // 미발송 구매건 전체 일괄 발송 (최초 1회 보장)
  const handleSendAllUnnotifiedPurchases = async () => {
    if (activeStaffList.length === 0) {
      alert('문자를 수신할 활성 직원이 없습니다. [직원 관리] 탭에서 직원을 등록해 주세요.');
      return;
    }

    if (!window.confirm(`현재 미발송 상태인 결제 완료 건(총 ${unnotifiedPaidReservations.length}건)을 현장 직원(${activeStaffList.length}명)에게 일괄 발송하시겠습니까?\n(이미 발송된 건은 자동으로 제외됩니다)`)) {
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/petforet/notify-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          autoAllUnnotified: true,
        }),
      });

      const json = await res.json();
      if (json.status === 'success') {
        setSendResultAlert({
          type: 'success',
          message: json.message || '미발송 구매건 발송이 완료되었습니다.',
        });
        fetchReservations(false);
        fetchSettings();
      } else {
        alert('발송 실패: ' + (json.message || '오류 발생'));
      }
    } catch (err: any) {
      alert('발송 오류: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // 문자 템플릿 및 설정 저장
  const handleSaveTemplates = async () => {
    try {
      const payload: any = {
        staffMessageTemplate: editableStaffTemplate,
        purchaseMessageTemplate: editablePurchaseTemplate,
      };
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
        setSendResultAlert({
          type: 'success',
          message: '알림 문자 템플릿 및 설정이 성공적으로 저장되었습니다.',
        });
      } else {
        alert('저장 실패');
      }
    } catch (err: any) {
      alert('오류: ' + err.message);
    }
  };

  // 실시간 종합 요약 메시지 텍스트 생성
  const renderedSummaryMessage = useMemo(() => {
    let text = editableStaffTemplate || config.staffMessageTemplate || '';
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
  }, [editableStaffTemplate, config.staffMessageTemplate, selectedDate, summary, unpaidReservations]);

  // 실시간 신규 구매 알림 메시지 텍스트 생성 (미리보기용)
  const renderedPurchasePreview = useMemo(() => {
    const sample = reservations.find((r) => r.paymentStatus === 'PAID') || {
      reservationId: 'BF00083620',
      orderId: 'S000331174',
      customerName: '홍길동',
      customerPhone: '010-1234-5678',
      productName: '펫포레 오전(10:00~14:00)',
      totalPrice: 100000,
      orderDate: `${selectedDate} 14:25:30`,
      visitDate: selectedDate,
    };

    let text = editablePurchaseTemplate || config.purchaseMessageTemplate || '';
    text = text.replace(/#\{예약번호\}/g, sample.reservationId || '-');
    text = text.replace(/#\{주문번호\}/g, sample.orderId || '-');
    text = text.replace(/#\{고객명\}/g, sample.customerName || '고객');
    text = text.replace(/#\{고객연락처\}/g, sample.customerPhone || '-');
    text = text.replace(/#\{상품명\}/g, sample.productName || '펫포레 이용권');
    text = text.replace(/#\{결제금액\}/g, (Number(sample.totalPrice) || 0).toLocaleString());
    text = text.replace(/#\{구매일시\}/g, sample.orderDate || sample.visitDate || '-');
    return text.trim();
  }, [editablePurchaseTemplate, config.purchaseMessageTemplate, selectedDate, reservations]);

  // 당일 종합 요약 발송 실행
  const handleSendSummaryToStaff = async () => {
    if (activeStaffList.length === 0) {
      alert('문자를 수신할 활성 직원이 없습니다. [직원 관리] 탭에서 직원을 등록해 주세요.');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/petforet/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: activeStaffList.map((s) => ({ name: s.name, phone: s.phone })),
          messageText: renderedSummaryMessage,
        }),
      });

      const json = await res.json();
      setIsSendStaffModalOpen(false);

      if (json.status === 'success' || json.succeeded > 0) {
        setSendResultAlert({
          type: 'success',
          message: `현장 담당 직원 총 ${json.total}명 중 ${json.succeeded}명에게 당일 종합 현황 문자가 성공적으로 발송되었습니다.`,
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

  // 필터링된 예약 목록
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (paymentStatusFilter === 'UNNOTIFIED') {
        if (!(r.paymentStatus === 'PAID' && !r.staffNotified)) return false;
      } else if (paymentStatusFilter !== 'ALL' && r.paymentStatus !== paymentStatusFilter) {
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
            
            {/* Title & Facility Badge */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00AE95] to-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Dog size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    펫포레(Petforet) 운영 & 직원 구매 알림 센터
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
                  신규 구매 확인 시 현장 직원 자동 문자 발송 (최초 1회 엄수) & 수신 직원 무제한 등록 관리
                </p>
              </div>
            </div>

            {/* Top Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Date Selector */}
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                <Calendar size={13} className="text-slate-500" />
                <span>조회 일자:</span>
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
                onClick={() => {
                  fetchReservations();
                  fetchSettings();
                }}
                disabled={loading}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                title="새로고침"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin text-[#00AE95]' : ''} />
              </button>

              {/* Auto Dispatch Toggle Button */}
              <button
                type="button"
                onClick={handleToggleAutoDispatch}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  config.autoDispatchEnabled
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                }`}
                title="구매 발생 시 30초마다 자동 감지하여 직원에게 문자를 보냅니다."
              >
                <Zap size={13} className={config.autoDispatchEnabled ? 'text-emerald-600' : 'text-slate-400'} />
                <span>{config.autoDispatchEnabled ? '자동 발송 활성 (30s)' : '자동 발송 정지됨'}</span>
              </button>
            </div>

          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveMainTab('reservations')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === 'reservations'
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Receipt size={14} />
              <span>1. 당일 구매·예약 현황 ({summary.totalReservations}건)</span>
              {unnotifiedPaidReservations.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-3xs font-extrabold animate-pulse">
                  {unnotifiedPaidReservations.length}건 미발송
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('staff')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === 'staff'
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users size={14} />
              <span>2. 문자 수신 직원 리스트 관리 ({editableRecipients.length}명)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-3xs font-extrabold">
                {activeStaffList.length}명 수신 중
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('settings')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === 'settings'
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Settings size={14} />
              <span>3. 알림 문자 템플릿 & 발송 설정</span>
            </button>
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
                    ? '오늘 펫포레는 정상 운영 중이며, 온라인 결제 발생 시 수신 직원들에게 즉시 알림 문자가 발송됩니다.' 
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

        {/* TAB 1: RESERVATIONS & PURCHASES */}
        {activeMainTab === 'reservations' && (
          <div className="space-y-6">

            {/* PURCHASE AUTO-DISPATCH ALERT BAR */}
            <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-md border border-slate-700">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center gap-1">
                      <Zap size={14} />
                      <span>신규 결제 실시간 감지 & 발송 엔진</span>
                    </span>
                    <span className={`text-3xs font-extrabold px-2 py-0.5 rounded-full ${
                      config.autoDispatchEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
                    }`}>
                      {config.autoDispatchEnabled ? '30초 주기 자동 감지 중' : '수동 모드'}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-white">
                    구매 확인 시 현장 직원({activeStaffList.length}명)에게 최초 1회 즉시 자동 통보
                  </h3>

                  <p className="text-2xs text-slate-300 leading-relaxed max-w-2xl">
                    고객이 온라인에서 결제를 완료하면, <strong>수신 직원 명단</strong>으로 결제 내역이 즉시 발송됩니다. 
                    시스템이 발송 여부를 DB에 영구 기억하여, <strong>각 구매건당 최초 한 번만 정확히 발송(중복 발송 원천 차단)</strong>됩니다.
                  </p>

                  {/* Summary Status Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-3xs">
                    <span className="px-2.5 py-1 rounded-xl bg-white/10 text-slate-200 border border-white/10">
                      오늘 결제 완료: <strong className="text-white font-bold">{summary.paidCount}건</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      직원 발송 완료: <strong className="text-emerald-200 font-bold">{summary.notifiedPaidCount || 0}건</strong>
                    </span>
                    {unnotifiedPaidReservations.length > 0 ? (
                      <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        ⚠️ 미발송 신규 구매: <strong className="text-amber-200 font-bold">{unnotifiedPaidReservations.length}건</strong>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl bg-slate-700/50 text-slate-400">
                        전원 발송 완료됨 (미발송 0건)
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {unnotifiedPaidReservations.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSendAllUnnotifiedPurchases}
                      disabled={isSending}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <BellRing size={14} />
                      <span>미발송 구매건 지금 발송 ({unnotifiedPaidReservations.length}건)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsSendStaffModalOpen(true)}
                    disabled={activeStaffList.length === 0 || isSending}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send size={13} />
                    <span>당일 종합 요약 문자 발송</span>
                  </button>
                </div>

              </div>
            </section>

            {/* 4 Key Summary KPI Cards */}
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

              {/* Card 2: 결제 완료 & 직원 알림 상태 */}
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
                  <span>직원 알림 발송됨</span>
                  <strong className="text-emerald-700 font-bold">
                    {summary.notifiedPaidCount || 0} / {summary.paidCount}건 완료
                  </strong>
                </div>
              </div>

              {/* Card 3: 미발송 신규 구매 집중 카드 */}
              <div className={`rounded-3xl p-5 border-2 shadow-xs space-y-2 relative overflow-hidden transition-all ${
                unnotifiedPaidReservations.length > 0
                  ? 'border-amber-400 bg-amber-50/50'
                  : 'border-slate-200 bg-white'
              }`}>
                <div className="flex items-center justify-between text-2xs font-black">
                  <span className={unnotifiedPaidReservations.length > 0 ? 'text-amber-900' : 'text-slate-500'}>
                    직원 미발송 구매건
                  </span>
                  <BellRing size={16} className={unnotifiedPaidReservations.length > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-400'} />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-black tracking-tight ${
                    unnotifiedPaidReservations.length > 0 ? 'text-amber-950' : 'text-slate-900'
                  }`}>
                    {unnotifiedPaidReservations.length.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-500">건</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-3xs font-medium">
                  <span>{unnotifiedPaidReservations.length > 0 ? '지금 발송 필요' : '모두 발송 완료'}</span>
                  {unnotifiedPaidReservations.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSendAllUnnotifiedPurchases}
                      className="text-amber-800 font-black underline cursor-pointer"
                    >
                      즉시 발송하기 →
                    </button>
                  )}
                </div>
              </div>

              {/* Card 4: 미결제 (가예약) 건수 */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-2xs text-slate-500 font-bold">
                  <span>미결제 확인 대상</span>
                  <Clock size={16} className="text-slate-400" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-rose-900 tracking-tight">
                    {summary.unpaidCount.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-500">건</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-500 font-medium">
                  <span>미결제 금액</span>
                  <strong className="text-rose-700 font-bold">{formatNumber(summary.unpaidAmount)}원</strong>
                </div>
              </div>
            </section>

            {/* Reservations Table */}
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
                      onClick={() => setPaymentStatusFilter('UNNOTIFIED')}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        paymentStatusFilter === 'UNNOTIFIED'
                          ? 'bg-amber-500 text-white shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ⚡ 직원 미발송만 ({unnotifiedPaidReservations.length}건)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentStatusFilter('UNPAID')}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        paymentStatusFilter === 'UNPAID'
                          ? 'bg-rose-600 text-white shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      미결제 ({summary.unpaidCount}건)
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
                      <th className="py-2.5 px-3">구매/결제 일시</th>
                      <th className="py-2.5 px-3">예약자 성명</th>
                      <th className="py-2.5 px-3">고객 연락처 (현장 대조)</th>
                      <th className="py-2.5 px-3">예약 상품</th>
                      <th className="py-2.5 px-3 text-right">결제 금액</th>
                      <th className="py-2.5 px-3 text-center">결제 상태</th>
                      <th className="py-2.5 px-3 text-center">직원 알림 발송 상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredReservations.length > 0 ? (
                      filteredReservations.map((item, idx) => {
                        const isPaid = item.paymentStatus === 'PAID';
                        const isUnpaid = item.paymentStatus === 'UNPAID';
                        const isNotified = item.staffNotified;

                        return (
                          <tr key={item.reservationId || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-3xs font-black text-slate-700 whitespace-nowrap">
                              {item.reservationId}
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
                            <td className="py-2.5 px-3 text-2xs text-slate-800 max-w-[220px] truncate" title={item.productName}>
                              {item.productName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                              {formatNumber(item.totalPrice)}원
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-extrabold ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isUnpaid
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {isPaid ? '결제 완료' : isUnpaid ? '미결제 (가예약)' : '예약 취소'}
                              </span>
                            </td>

                            {/* 직원 알림 상태 (영구 기억 컬럼) */}
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {isPaid ? (
                                isNotified ? (
                                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-3xs font-bold" title={`발송 시각: ${item.staffNotifiedAt || '-'}\n수신 직원: ${item.staffNotifiedNames?.join(', ') || '전원'}`}>
                                    <CheckCircle2 size={12} className="text-emerald-600" />
                                    <span>발송 완료</span>
                                    {item.staffNotifiedAt && (
                                      <span className="text-slate-400 font-mono">
                                        ({item.staffNotifiedAt.slice(11, 16)})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                                      미발송 건
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleSendSinglePurchase(item)}
                                      disabled={isSending}
                                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-3xs font-black shadow-2xs cursor-pointer flex items-center gap-0.5"
                                      title="이 구매건을 직원들에게 지금 전송"
                                    >
                                      <Send size={10} />
                                      <span>발송</span>
                                    </button>
                                  </div>
                                )
                              ) : (
                                <span className="text-slate-400 text-3xs">-</span>
                              )}
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

          </div>
        )}

        {/* TAB 2: STAFF DIRECTORY & RECIPIENTS (몇 명이든 무제한 추가 및 리스트 관리) */}
        {activeMainTab === 'staff' && (
          <div className="space-y-6">

            {/* Quick Add Staff Header Card */}
            <section className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      신규 문자 수신 직원 등록 (무제한 추가)
                    </h3>
                    <p className="text-2xs text-slate-500">
                      구매 발생 시 문자를 받을 직원의 이름과 휴대폰 번호를 몇 명이든 제한 없이 등록할 수 있습니다.
                    </p>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
                  등록된 직원: <strong className="text-slate-900 font-extrabold">{editableRecipients.length}명</strong> (수신 활성: <strong className="text-emerald-600 font-extrabold">{activeStaffList.length}명</strong>)
                </div>
              </div>

              {/* Add Input Form */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="text-3xs font-extrabold text-slate-600 block mb-1">직원 성명 *</label>
                  <input
                    type="text"
                    placeholder="예: 김민수"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#00AE95] bg-white"
                  />
                </div>
                <div>
                  <label className="text-3xs font-extrabold text-slate-600 block mb-1">휴대폰 번호 * (010...)</label>
                  <input
                    type="text"
                    placeholder="01012345678"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-[#00AE95] bg-white"
                  />
                </div>
                <div>
                  <label className="text-3xs font-extrabold text-slate-600 block mb-1">담당 부서 / 직책</label>
                  <input
                    type="text"
                    placeholder="예: 현장 데스크, 티켓 검표"
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#00AE95] bg-white"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddStaff}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#00AE95] hover:bg-[#008A77] text-white text-xs font-black shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Plus size={14} />
                    <span>직원 추가하기</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Staff Recipient List Table */}
            <section className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-[#00AE95]" />
                  <h3 className="text-sm font-black text-slate-900">
                    문자 수신 직원 전체 명단 (총 {editableRecipients.length}명)
                  </h3>
                </div>
                <span className="text-2xs text-slate-400">
                  체크박스를 끄면(OFF) 해당 직원은 발송 대상에서 제외됩니다.
                </span>
              </div>

              <div className="overflow-x-auto custom-scrollbar border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-3xs font-extrabold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-center w-12">번호</th>
                      <th className="py-2.5 px-3">직원명</th>
                      <th className="py-2.5 px-3">휴대폰 번호</th>
                      <th className="py-2.5 px-3">부서 / 역할</th>
                      <th className="py-2.5 px-3 text-center">알림 수신 여부</th>
                      <th className="py-2.5 px-3 text-center">테스트 발송</th>
                      <th className="py-2.5 px-3 text-center">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {editableRecipients.length > 0 ? (
                      editableRecipients.map((staff, idx) => (
                        <tr key={staff.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-center font-mono text-3xs text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <span>👤</span>
                              <span>{staff.name}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-2xs text-slate-700 whitespace-nowrap">
                            {staff.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}
                          </td>
                          <td className="py-3 px-3 text-2xs text-slate-600 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
                              {staff.role || '담당자'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleStaffActive(staff.id)}
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-3xs font-extrabold transition-all cursor-pointer ${
                                staff.active
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${staff.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <span>{staff.active ? '수신 활성 (ON)' : '수신 제외 (OFF)'}</span>
                            </button>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleSendTestToStaff(staff)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-3xs font-bold transition-all cursor-pointer"
                            >
                              테스트 문자 전송
                            </button>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(staff.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="직원 삭제"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                          등록된 수신 직원이 없습니다. 상단 폼에서 직원을 추가해 주세요.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        )}

        {/* TAB 3: SETTINGS & TEMPLATES */}
        {activeMainTab === 'settings' && (
          <div className="space-y-6">

            <section className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 size={18} className="text-[#00AE95]" />
                  <h3 className="text-sm font-black text-slate-900">
                    직원 발송 알림 문자 내용 편집 및 솔라피 발송 설정
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleSaveTemplates}
                  className="px-4 py-2 rounded-xl bg-[#00AE95] hover:bg-[#008A77] text-white text-xs font-black shadow-xs cursor-pointer"
                >
                  설정 저장하기
                </button>
              </div>

              {/* Subtabs */}
              <div className="flex items-center border-b border-slate-100 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSettingsSubTab('purchaseTemplate')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeSettingsSubTab === 'purchaseTemplate'
                      ? 'border-[#00AE95] text-[#00AE95]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  1. 신규 결제 발생 알림 템플릿 (개별 건)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSettingsSubTab('summaryTemplate')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeSettingsSubTab === 'summaryTemplate'
                      ? 'border-[#00AE95] text-[#00AE95]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  2. 당일 현황 종합 요약 템플릿
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSettingsSubTab('config')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeSettingsSubTab === 'config'
                      ? 'border-[#00AE95] text-[#00AE95]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  3. 솔라피 발송 계정 설정
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSettingsSubTab('logs')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeSettingsSubTab === 'logs'
                      ? 'border-[#00AE95] text-[#00AE95]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  4. 최근 발송 감사 이력 ({logs.length}건)
                </button>
              </div>

              {/* Subtab 1: Purchase Alert Template */}
              {activeSettingsSubTab === 'purchaseTemplate' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div className="space-y-3">
                    <div>
                      <label className="text-2xs font-extrabold text-slate-700 block mb-1">
                        신규 구매 발생 시 직원 전송 본문
                      </label>
                      <textarea
                        rows={12}
                        value={editablePurchaseTemplate}
                        onChange={(e) => setEditablePurchaseTemplate(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-mono text-slate-900 bg-slate-50/50 outline-none focus:border-[#00AE95] leading-relaxed resize-none"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200/80 text-3xs text-slate-600 space-y-1">
                      <div className="font-extrabold text-slate-800">💡 사용 가능한 자동 치환 변수:</div>
                      <div className="flex flex-wrap gap-1 pt-1 font-mono">
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{예약번호}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{주문번호}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{고객명}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{고객연락처}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{상품명}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{결제금액}'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{구매일시}'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Smartphone Preview */}
                  <div className="flex flex-col items-center">
                    <div className="text-2xs font-extrabold text-slate-500 mb-2 flex items-center gap-1">
                      <Smartphone size={12} />
                      <span>수신 직원 휴대폰 실시간 미리보기 (구매 발생 시)</span>
                    </div>

                    <div className="w-[280px] bg-slate-900 rounded-[36px] p-3 shadow-xl border-4 border-slate-800">
                      <div className="bg-[#E9ECEF] rounded-[24px] p-3 min-h-[380px] flex flex-col justify-start space-y-2">
                        <div className="text-center text-3xs font-bold text-slate-500 pb-1">
                          수신 문자 (LMS)
                        </div>
                        <div className="bg-white text-slate-900 p-3 rounded-2xl rounded-tl-xs shadow-xs text-3xs space-y-2 leading-relaxed whitespace-pre-wrap font-mono">
                          {renderedPurchasePreview}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Subtab 2: Summary Template */}
              {activeSettingsSubTab === 'summaryTemplate' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div className="space-y-3">
                    <div>
                      <label className="text-2xs font-extrabold text-slate-700 block mb-1">
                        당일 종합 예약 현황 본문
                      </label>
                      <textarea
                        rows={12}
                        value={editableStaffTemplate}
                        onChange={(e) => setEditableStaffTemplate(e.target.value)}
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
                      <span>수신 직원 휴대폰 종합 현황 미리보기</span>
                    </div>

                    <div className="w-[280px] bg-slate-900 rounded-[36px] p-3 shadow-xl border-4 border-slate-800">
                      <div className="bg-[#E9ECEF] rounded-[24px] p-3 min-h-[380px] flex flex-col justify-start space-y-2">
                        <div className="text-center text-3xs font-bold text-slate-500 pb-1">
                          수신 문자 (LMS)
                        </div>
                        <div className="bg-white text-slate-900 p-3 rounded-2xl rounded-tl-xs shadow-xs text-3xs space-y-2 leading-relaxed whitespace-pre-wrap font-mono">
                          {renderedSummaryMessage}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Subtab 3: Config */}
              {activeSettingsSubTab === 'config' && (
                <div className="space-y-4 max-w-xl mx-auto text-xs pt-2">
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

              {/* Subtab 4: Logs */}
              {activeSettingsSubTab === 'logs' && (
                <div className="space-y-3 pt-2">
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

            </section>

          </div>
        )}

      </main>

      {/* MODAL: 당일 종합 현황 직원 전송 확인 모달 */}
      {isSendStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleIn">
            
            <div className="flex items-center gap-2 text-slate-900">
              <Send size={18} className="text-[#00AE95]" />
              <h3 className="text-sm font-black">
                현장 직원 예약 현황 종합 문자 발송 확인
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
                  {renderedSummaryMessage}
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
                onClick={handleSendSummaryToStaff}
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
