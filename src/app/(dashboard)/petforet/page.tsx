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
  Users,
  UserPlus,
  Trash2,
  Edit3,
  MessageSquare,
  Sparkles,
  Zap,
  BellRing,
  Plus,
  Play,
  Pause,
  ArrowRight,
  ShieldCheck,
  Check
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

export default function PetforetPage() {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [filterType, setFilterType] = useState<'ALL' | 'UNNOTIFIED' | 'PAID' | 'UNPAID'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [unmaskPhone, setUnmaskPhone] = useState<boolean>(false);

  // 로딩 및 데이터 상태
  const [loading, setLoading] = useState<boolean>(true);
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

  // UI 모달 및 편집 폼 상태
  const [newStaffName, setNewStaffName] = useState<string>('');
  const [newStaffPhone, setNewStaffPhone] = useState<string>('');
  const [newStaffRole, setNewStaffRole] = useState<string>('현장 데스크');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [templateEditMode, setTemplateEditMode] = useState<'purchase' | 'summary'>('purchase');
  const [editingTemplateText, setEditingTemplateText] = useState<string>('');
  
  // 솔라피 발송 계정 설정 모달
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [accountForm, setAccountForm] = useState({
    senderNumber: '',
    apiKey: '',
    apiSecret: '',
  });

  const [isSending, setIsSending] = useState<boolean>(false);
  const [alertBanner, setAlertBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 폰 미리보기 탭: 'purchase' | 'summary'
  const [previewTab, setPreviewTab] = useState<'purchase' | 'summary'>('purchase');

  // 자동 폴링 카운트다운 타이머 (초 단위)
  const [countdown, setCountdown] = useState<number>(30);

  // 1. 예약 데이터 로드 (V6 백엔드 + Firestore 발송 기억 대조)
  const fetchReservations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/petforet/reservations?date=${selectedDate}&paymentStatus=ALL`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setSummary(json.data.summary || {});
          setReservations(json.data.reservations || []);
        }
      }
    } catch (err) {
      console.error('Failed to load petforet reservations:', err);
    } finally {
      if (!silent) setLoading(false);
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
          setAccountForm({
            senderNumber: cfg.senderNumber || '',
            apiKey: cfg.apiKey || '',
            apiSecret: '',
          });
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

  // 활성 직원 목록 (현재 문자 수신 대상)
  const activeStaffList = useMemo(() => {
    return (config.staffRecipients || []).filter((s) => s.active && s.phone);
  }, [config.staffRecipients]);

  // 미발송 신규 결제 완료 목록
  const unnotifiedPaidReservations = useMemo(() => {
    return reservations.filter((r) => r.paymentStatus === 'PAID' && !r.staffNotified);
  }, [reservations]);

  // 미결제 목록
  const unpaidReservations = useMemo(() => {
    return reservations.filter((r) => r.paymentStatus === 'UNPAID');
  }, [reservations]);

  // 3. 신규 결제 자동 감지 & 발송 실행기 (30초 주기 엔진)
  const isAutoDispatchingRef = useRef(false);

  const runAutoDispatchCheck = useCallback(async () => {
    if (!config.autoDispatchEnabled || activeStaffList.length === 0 || isAutoDispatchingRef.current) {
      return;
    }

    try {
      isAutoDispatchingRef.current = true;
      const res = await fetch(`/api/petforet/reservations?date=${todayStr}&paymentStatus=PAID`);
      if (!res.ok) return;

      const json = await res.json();
      const paidItems: ReservationItem[] = json.data?.reservations || [];
      const unnotified = paidItems.filter((r) => !r.staffNotified);

      if (unnotified.length > 0) {
        // 새 결제건 감지 -> 즉시 발송
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
            setAlertBanner({
              type: 'success',
              message: `🚀 [자동 발송 완료] 신규 결제 ${dJson.notified}건이 실시간 감지되어 현장 직원(${activeStaffList.length}명)에게 즉시 문자가 전송되었습니다!`,
            });
            fetchReservations(true);
          }
        }
      }
    } catch (err) {
      console.warn('Auto dispatch check error:', err);
    } finally {
      isAutoDispatchingRef.current = false;
    }
  }, [config.autoDispatchEnabled, activeStaffList, todayStr, fetchReservations]);

  // 30초 타이머 & 카운트다운
  useEffect(() => {
    if (!config.autoDispatchEnabled) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          runAutoDispatchCheck();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [config.autoDispatchEnabled, runAutoDispatchCheck]);

  // 자동 발송 스위치 토글 (ON/OFF)
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
        setCountdown(30);
        setAlertBanner({
          type: 'success',
          message: `신규 결제 자동 발송 엔진이 [${nextVal ? '가동 (30초 주기 실시간 감지)' : '일시정지 (수동 모드)'}]되었습니다.`,
        });
      }
    } catch (err: any) {
      alert('설정 변경 오류: ' + err.message);
    }
  };

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
        setAlertBanner({
          type: 'success',
          message: `펫포레 판매 상태가 [${nextState ? '정상 판매 중' : '판매 일시 중단'}]으로 변경되었습니다.`,
        });
      }
    } catch (err: any) {
      alert('상태 변경 실패: ' + err.message);
    }
  };

  // 직원 빠른 추가
  const handleQuickAddStaff = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!newStaffName.trim() || !newStaffPhone.trim()) {
      alert('직원 성명과 휴대폰 번호를 입력해 주세요.');
      return;
    }
    const cleanPhone = newStaffPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      alert('유효한 휴대폰 번호 10~11자리를 입력해 주세요.');
      return;
    }

    const newStaffItem: StaffRecipient = {
      id: `staff_${Date.now()}`,
      name: newStaffName.trim(),
      phone: cleanPhone,
      role: newStaffRole.trim() || '현장 담당',
      active: true,
    };

    const nextStaffList = [...(config.staffRecipients || []), newStaffItem];
    setConfig((prev) => ({ ...prev, staffRecipients: nextStaffList }));
    setNewStaffName('');
    setNewStaffPhone('');

    try {
      await fetch('/api/petforet/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffRecipients: nextStaffList }),
      });
      setAlertBanner({
        type: 'success',
        message: `직원 [${newStaffItem.name} (${newStaffItem.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')})] 님이 등록되었습니다.`,
      });
    } catch (err) {
      console.error('Save staff error:', err);
    }
  };

  // 직원 삭제
  const handleDeleteStaff = async (id: string) => {
    const target = config.staffRecipients?.find((s) => s.id === id);
    if (!window.confirm(`[${target?.name || '해당 직원'}] 님을 수신 명단에서 완전히 삭제하시겠습니까?`)) {
      return;
    }
    const nextStaffList = (config.staffRecipients || []).filter((s) => s.id !== id);
    setConfig((prev) => ({ ...prev, staffRecipients: nextStaffList }));

    try {
      await fetch('/api/petforet/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffRecipients: nextStaffList }),
      });
      setAlertBanner({
        type: 'success',
        message: '직원이 삭제되었습니다.',
      });
    } catch (err) {
      console.error('Delete staff error:', err);
    }
  };

  // 직원 활성/제외 토글 (출근/휴무 스위치)
  const handleToggleStaffActive = async (id: string) => {
    const nextStaffList = (config.staffRecipients || []).map((s) =>
      s.id === id ? { ...s, active: !s.active } : s
    );
    setConfig((prev) => ({ ...prev, staffRecipients: nextStaffList }));

    try {
      await fetch('/api/petforet/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffRecipients: nextStaffList }),
      });
    } catch (err) {
      console.error('Toggle staff error:', err);
    }
  };

  // 솔라피 발송 계정 저장
  const handleSaveAccountSettings = async () => {
    if (!accountForm.apiKey.trim() || !accountForm.senderNumber.trim()) {
      alert('솔라피 API Key와 발신번호는 필수입니다.');
      return;
    }

    const payload: any = {
      apiKey: accountForm.apiKey.trim(),
      senderNumber: accountForm.senderNumber.trim(),
    };
    if (accountForm.apiSecret.trim()) {
      payload.apiSecret = accountForm.apiSecret.trim();
    }

    try {
      const res = await fetch('/api/petforet/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsAccountModalOpen(false);
        await fetchSettings();
        setAlertBanner({
          type: 'success',
          message: '솔라피 문자 발송 계정 정보가 성공적으로 저장되었습니다!',
        });
      } else {
        alert('저장에 실패했습니다.');
      }
    } catch (err: any) {
      alert('설정 저장 오류: ' + err.message);
    }
  };

  // 개별 직원 테스트 문자 전송 (실제 직원 폰 수신 화면 문구로 발송)
  const handleSendTestToStaff = async (staff: StaffRecipient) => {
    if (!config.apiKey || !config.hasApiSecret) {
      if (window.confirm('⚠️ 솔라피 API Key 또는 Secret이 등록되지 않아 문자를 발송할 수 없습니다.\n지금 [발송 계정 설정] 창을 열어 API Key와 발신번호를 등록하시겠습니까?')) {
        setIsAccountModalOpen(true);
      }
      return;
    }

    if (!window.confirm(`[${staff.name} (${staff.phone})] 님에게 실제 화면에 표시되는 구매 알림 TEST 문자를 즉시 전송하시겠습니까?`)) {
      return;
    }

    try {
      // 실제 직원 폰 수신 화면(renderedPurchaseMessage)과 100% 동일한 형태의 TEST 문구 생성
      const basePurchaseText = renderedPurchaseMessage || (
        `[벨포레 펫포레] 신규 결제 완료 알림\n\n새로운 펫포레 이용권 예약/결제가 확인되었습니다.\n\n■ 구매 내역\n- 예약번호: ${samplePurchase.reservationId}\n- 고객명: ${samplePurchase.customerName}\n- 연락처: ${samplePurchase.customerPhone}\n- 상품명: ${samplePurchase.productName}\n- 결제금액: ${(Number(samplePurchase.totalPrice) || 0).toLocaleString()}원\n- 구매일시: ${samplePurchase.orderDate}\n\n※ MS > TICKET&PARK > 타임테이블 > 타임티켓 조회 메뉴로 들어가신 후, 업장을 펫포레로 선택하고 조회 바랍니다.`
      );

      const testMessageText = basePurchaseText.includes('[벨포레 펫포레] 신규 결제 완료 알림')
        ? basePurchaseText.replace(
            '[벨포레 펫포레] 신규 결제 완료 알림',
            `[벨포레 펫포레] 신규 결제 알림 (수신 TEST - ${staff.name}님)`
          )
        : `[벨포레 펫포레] 신규 결제 알림 (수신 TEST - ${staff.name}님)\n\n` + basePurchaseText;

      const res = await fetch('/api/petforet/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: [{ name: staff.name, phone: staff.phone }],
          messageText: testMessageText,
        }),
      });

      const json = await res.json();
      if (json.success || json.status === 'success' || json.succeeded > 0) {
        setAlertBanner({
          type: 'success',
          message: json.message || `[${staff.name}] 님에게 실제 구매 알림 형식의 TEST 문자가 성공적으로 전송되었습니다!`,
        });
      } else {
        // 실패 시: 솔라피의 상세 에러 원인을 그대로 프론트엔드 팝업창으로 전달
        alert(`❌ 테스트 발송 실패:\n\n${json.error || json.message || '오류가 발생했습니다.'}`);
      }
    } catch (err: any) {
      alert('통신 오류: ' + err.message);
    }
  };

  // 현재 스마트폰 미리보기 화면 문구 그대로 전원 TEST 발송
  const handleSendPreviewTest = async () => {
    if (!config.apiKey || !config.hasApiSecret) {
      setIsAccountModalOpen(true);
      return;
    }

    if (activeStaffList.length === 0) {
      alert('문자를 수신할 활성 직원이 없습니다. 좌측에서 직원을 등록하고 수신 ON 해주세요.');
      return;
    }

    const currentScreenText = previewTab === 'purchase' ? renderedPurchaseMessage : renderedSummaryMessage;
    const tabName = previewTab === 'purchase' ? '신규 구매 알림' : '당일 현황 종합';

    if (!window.confirm(`스마트폰 미리보기에 보이는 [${tabName}] 화면 문구 그대로 등록된 직원(${activeStaffList.length}명)에게 TEST 문자를 발송하시겠습니까?`)) {
      return;
    }

    try {
      const testMessageText = currentScreenText.includes('[벨포레 펫포레]')
        ? currentScreenText.replace('[벨포레 펫포레]', '[벨포레 펫포레] (수신 TEST)')
        : `[벨포레 펫포레] (수신 TEST)\n\n` + currentScreenText;

      const res = await fetch('/api/petforet/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: activeStaffList.map((s) => ({ name: s.name, phone: s.phone })),
          messageText: testMessageText,
        }),
      });

      const json = await res.json();
      if (json.success || json.status === 'success' || json.succeeded > 0) {
        setAlertBanner({
          type: 'success',
          message: `직원 ${activeStaffList.length}명에게 스마트폰 수신 화면 TEST 문자가 성공적으로 전송되었습니다!`,
        });
      } else {
        alert(`❌ 발송 실패:\n\n${json.error || json.message || '오류가 발생했습니다.'}`);
      }
    } catch (err: any) {
      alert('통신 오류: ' + err.message);
    }
  };

  // 단일 구매건 직원 발송 (최초 1회 보장)
  const handleSendSinglePurchase = async (item: ReservationItem) => {
    if (activeStaffList.length === 0) {
      alert('문자를 수신할 직원이 없습니다. 좌측에서 직원을 등록하고 [수신 ON] 해주세요.');
      return;
    }

    if (!window.confirm(`[${item.customerName} - ${formatNumber(item.totalPrice)}원] 결제 알림을 직원(${activeStaffList.length}명)에게 전송하시겠습니까?`)) {
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
      if (json.success || json.status === 'success') {
        setAlertBanner({
          type: 'success',
          message: json.message || '직원에게 결제 알림이 성공적으로 발송되었습니다.',
        });
        fetchReservations(true);
      } else {
        // 실패 시: 솔라피 상세 에러 원인 표출
        alert(`❌ 발송 실패:\n\n${json.error || json.message || '알 수 없는 오류'}`);
      }
    } catch (err: any) {
      alert('오류: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // 미발송 신규 구매건 전체 일괄 발송
  const handleSendAllUnnotified = async () => {
    if (activeStaffList.length === 0) {
      alert('문자를 수신할 직원이 없습니다. 좌측에서 직원을 추가해 주세요.');
      return;
    }

    if (!window.confirm(`아직 알림을 받지 못한 신규 구매건(총 ${unnotifiedPaidReservations.length}건)을 직원(${activeStaffList.length}명)에게 일괄 발송하시겠습니까?\n(이미 발송된 건은 100% 자동 제외됩니다)`)) {
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
      if (json.success || json.status === 'success') {
        setAlertBanner({
          type: 'success',
          message: json.message || '미발송 구매건 발송이 완료되었습니다.',
        });
        fetchReservations(true);
      } else {
        alert(`❌ 일괄 발송 실패:\n\n${json.error || json.message || '알 수 없는 오류'}`);
      }
    } catch (err: any) {
      alert('오류: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // 템플릿 편집 모달 열기
  const openTemplateModal = (mode: 'purchase' | 'summary') => {
    setTemplateEditMode(mode);
    setEditingTemplateText(
      mode === 'purchase'
        ? config.purchaseMessageTemplate
        : config.staffMessageTemplate
    );
    setIsTemplateModalOpen(true);
  };

  // 템플릿 저장
  const handleSaveTemplate = async () => {
    const payload: any = {};
    if (templateEditMode === 'purchase') {
      payload.purchaseMessageTemplate = editingTemplateText;
    } else {
      payload.staffMessageTemplate = editingTemplateText;
    }

    try {
      const res = await fetch('/api/petforet/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setConfig((prev) => ({ ...prev, ...payload }));
        setIsTemplateModalOpen(false);
        setAlertBanner({
          type: 'success',
          message: '알림 문자 템플릿이 성공적으로 저장되었습니다.',
        });
      }
    } catch (err: any) {
      alert('템플릿 저장 실패: ' + err.message);
    }
  };

  // 실시간 스마트폰 화면에 찍힐 신규 구매 알림 텍스트 렌더링
  const samplePurchase = reservations.find((r) => r.paymentStatus === 'PAID') || {
    reservationId: 'BF00083620',
    orderId: 'S000331174',
    customerName: '채희정',
    customerPhone: '010-4452-8816',
    productName: '펫포레 오전(10:00~14:00)',
    totalPrice: 100000,
    orderDate: `${selectedDate} 14:25:30`,
    visitDate: selectedDate,
  };

  const renderedPurchaseMessage = useMemo(() => {
    let text = config.purchaseMessageTemplate || '';
    text = text.replace(/#\{예약번호\}/g, samplePurchase.reservationId || '-');
    text = text.replace(/#\{주문번호\}/g, samplePurchase.orderId || '-');
    text = text.replace(/#\{고객명\}/g, samplePurchase.customerName || '고객');
    text = text.replace(/#\{고객연락처\}/g, samplePurchase.customerPhone || '-');
    text = text.replace(/#\{상품명\}/g, samplePurchase.productName || '펫포레 이용권');
    text = text.replace(/#\{결제금액\}/g, (Number(samplePurchase.totalPrice) || 0).toLocaleString());
    text = text.replace(/#\{구매일시\}/g, samplePurchase.orderDate || samplePurchase.visitDate || '-');
    return text.trim();
  }, [config.purchaseMessageTemplate, samplePurchase]);

  // 실시간 스마트폰 화면에 찍힐 당일 종합 요약 텍스트 렌더링
  const renderedSummaryMessage = useMemo(() => {
    let text = config.staffMessageTemplate || '';
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
  }, [config.staffMessageTemplate, selectedDate, summary, unpaidReservations]);

  // 필터링된 예약 목록
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (filterType === 'UNNOTIFIED') {
        if (!(r.paymentStatus === 'PAID' && !r.staffNotified)) return false;
      } else if (filterType !== 'ALL' && r.paymentStatus !== filterType) {
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
  }, [reservations, filterType, searchQuery]);

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
    <div className="min-h-screen bg-[#F4F6F9] pb-20 text-slate-800 font-sans">
      
      {/* 1. TOP MASTER CONTROL COCKPIT */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-lg border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Title & Facility Switch */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#00AE95] to-emerald-400 text-white flex items-center justify-center shadow-md shrink-0">
                <Dog size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                    <span>펫포레 신규 구매 자동 알림 관제 센터</span>
                  </h1>
                  <button
                    type="button"
                    onClick={handleToggleSales}
                    className={`px-2.5 py-0.5 rounded-full text-3xs font-extrabold border transition-all cursor-pointer ${
                      config.salesActive
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                    }`}
                  >
                    {config.salesActive ? '● 정상 판매 중' : '■ 판매 일시 중단'}
                  </button>
                </div>
                <p className="text-3xs text-slate-400 mt-0.5">
                  온라인 구매 확인 시 현장 직원 자동 문자 전송 (최초 1회 엄수) & 수신 명단 통합 제어
                </p>
              </div>
            </div>

            {/* MASTER AUTOMATION TOGGLE & METRICS */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Date Selector */}
              <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300">
                <Calendar size={13} className="text-slate-400" />
                <span className="text-3xs text-slate-400 font-semibold">조회일:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent font-black text-white outline-none cursor-pointer text-xs"
                />
              </div>

              {/* Master Auto-Dispatch Switch (The Heart of the Control Board) */}
              <button
                type="button"
                onClick={handleToggleAutoDispatch}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer border ${
                  config.autoDispatchEnabled
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/30 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
                }`}
                title="클릭하여 실시간 자동 발송 가동/정지 전환"
              >
                {config.autoDispatchEnabled ? <Play size={14} fill="currentColor" /> : <Pause size={14} />}
                <span>{config.autoDispatchEnabled ? '자동 발송 가동 중 (ON)' : '자동 발송 정지됨 (OFF)'}</span>
                {config.autoDispatchEnabled && (
                  <span className="text-3xs font-mono bg-black/30 px-1.5 py-0.5 rounded-md text-emerald-200">
                    {countdown}s
                  </span>
                )}
              </button>

              {/* Manual Refresh */}
              <button
                type="button"
                onClick={() => fetchReservations()}
                disabled={loading}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors shadow-xs cursor-pointer"
                title="즉시 새로고침"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-400' : ''} />
              </button>

              {/* Solapi Account Settings Button */}
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer border ${
                  config.hasApiSecret && config.apiKey
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/60 hover:bg-amber-500/30 ring-2 ring-amber-400/30 animate-pulse'
                }`}
                title="솔라피 API Key, Secret, 발신번호 설정"
              >
                <Settings size={13} className={config.hasApiSecret && config.apiKey ? 'text-[#00AE95]' : 'text-amber-400'} />
                <span>{config.hasApiSecret && config.apiKey ? '발송 계정 설정' : '발송 계정 등록 필요 ⚙️'}</span>
              </button>

            </div>

          </div>

          {/* Quick Metrics Ticker */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-3 border-t border-slate-800 text-xs">
            <div className="bg-slate-800/60 rounded-xl p-2 px-3 border border-slate-700/60 flex items-center justify-between">
              <span className="text-3xs text-slate-400 font-bold">당일 결제 완료</span>
              <strong className="text-white font-mono text-sm">{summary.paidCount}건</strong>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-2 px-3 border border-slate-700/60 flex items-center justify-between">
              <span className="text-3xs text-emerald-400 font-bold">직원 발송 완료</span>
              <strong className="text-emerald-400 font-mono text-sm">{summary.notifiedPaidCount || 0}건</strong>
            </div>

            <div className={`rounded-xl p-2 px-3 border flex items-center justify-between transition-all ${
              unnotifiedPaidReservations.length > 0 
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300' 
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
            }`}>
              <span className="text-3xs font-bold flex items-center gap-1">
                {unnotifiedPaidReservations.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
                <span>미발송 신규 구매</span>
              </span>
              <strong className="font-mono text-sm text-white font-black">{unnotifiedPaidReservations.length}건</strong>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-2 px-3 border border-slate-700/60 flex items-center justify-between">
              <span className="text-3xs text-slate-400 font-bold">문자 수신 직원</span>
              <strong className="text-white font-mono text-sm">{activeStaffList.length}명 대기</strong>
            </div>
          </div>

        </div>
      </header>

      {/* Main Grid: 3-Column Cockpit Layout (No Tab Switching Required!) */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-5 space-y-4">

        {/* Global Floating Alert */}
        {alertBanner && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-md animate-fadeIn ${
            alertBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span className="text-xs font-bold leading-relaxed">{alertBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setAlertBanner(null)}
              className="text-2xs font-extrabold px-2.5 py-1 rounded-lg bg-black/5 hover:bg-black/10 cursor-pointer"
            >
              닫기
            </button>
          </div>
        )}

        {/* Urgent Action Callout (If unnotified purchases exist) */}
        {unnotifiedPaidReservations.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-slate-950 rounded-2xl p-4 px-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                <BellRing size={20} className="text-white animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  새로운 펫포레 결제가 {unnotifiedPaidReservations.length}건 확인되었습니다!
                </h3>
                <p className="text-2xs text-amber-100 font-medium">
                  아직 직원들에게 알림이 가지 않았습니다. 30초 엔진이 자동 발송하거나, 아래 버튼을 눌러 즉시 쏠 수 있습니다.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendAllUnnotified}
              disabled={isSending}
              className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Send size={13} />
              <span>미발송 {unnotifiedPaidReservations.length}건 즉시 발송하기</span>
            </button>
          </div>
        )}

        {/* 3-COLUMN INTEGRATED COCKPIT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* ============================================================== */}
          {/* COLUMN 1 (4 cols): 👥 수신 직원 컨트롤러 (누가 받는가?) */}
          {/* ============================================================== */}
          <div className="lg:col-span-4 space-y-4">
            
            <section className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Users size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900">
                      문자 수신 직원 명단 ({config.staffRecipients?.length || 0}명)
                    </h2>
                    <p className="text-3xs text-slate-500">구매 발생 시 이 직원들의 폰으로 문자가 갑니다.</p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-3xs font-extrabold">
                  {activeStaffList.length}명 수신 활성
                </span>
              </div>

              {/* Instant Add Form */}
              <form onSubmit={handleQuickAddStaff} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="text-3xs font-extrabold text-slate-700 flex items-center gap-1">
                  <UserPlus size={12} className="text-[#00AE95]" />
                  <span>새 직원 번호 추가 (무제한)</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="직원 이름 (예: 김민수)"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="p-2 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-[#00AE95]"
                  />
                  <input
                    type="text"
                    placeholder="휴대폰 (010...)"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    className="p-2 rounded-xl border border-slate-200 text-xs font-mono bg-white outline-none focus:border-[#00AE95]"
                  />
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="역할 (예: 현장 데스크)"
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="p-2 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-[#00AE95] flex-1"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus size={13} />
                    <span>추가</span>
                  </button>
                </div>
              </form>

              {/* Staff List Rows */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                {(config.staffRecipients || []).length > 0 ? (
                  config.staffRecipients.map((staff, idx) => (
                    <div 
                      key={staff.id || idx}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                        staff.active
                          ? 'bg-white border-slate-200 shadow-2xs'
                          : 'bg-slate-50/80 border-slate-200/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Active Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleStaffActive(staff.id)}
                          className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            staff.active
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                          title={staff.active ? '클릭 시 수신 제외' : '클릭 시 수신 활성'}
                        >
                          <Check size={14} />
                        </button>

                        <div>
                          <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
                            <span>{staff.name}</span>
                            <span className="text-4xs font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {staff.role || '담당'}
                            </span>
                          </div>
                          <div className="text-3xs font-mono text-slate-500">
                            {staff.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendTestToStaff(staff)}
                          className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-4xs font-bold cursor-pointer"
                          title="테스트 문자 1건 발송"
                        >
                          테스트
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    등록된 직원이 없습니다. 위 입력창에 직원의 이름과 휴대폰 번호를 입력해 주세요.
                  </div>
                )}
              </div>

            </section>

          </div>

          {/* ============================================================== */}
          {/* COLUMN 2 (5 cols): 🔔 실시간 구매 감지 & 발송 관제 (무슨 일이 일어났는가?) */}
          {/* ============================================================== */}
          <div className="lg:col-span-5 space-y-4">
            
            <section className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
              
              {/* Header & Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Receipt size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900">
                      구매 발생 & 직원 알림 상태 관제
                    </h2>
                    <p className="text-3xs text-slate-500">결제 완료 건당 최초 1회만 정확히 발송됩니다.</p>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center bg-slate-100 rounded-xl p-0.5 text-3xs font-extrabold">
                  <button
                    type="button"
                    onClick={() => setFilterType('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      filterType === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500'
                    }`}
                  >
                    전체 ({summary.totalReservations})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('UNNOTIFIED')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      filterType === 'UNNOTIFIED' ? 'bg-amber-500 text-white shadow-2xs font-black' : 'text-slate-500'
                    }`}
                  >
                    ⚡ 미발송 ({unnotifiedPaidReservations.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('PAID')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      filterType === 'PAID' ? 'bg-emerald-600 text-white shadow-2xs font-black' : 'text-slate-500'
                    }`}
                  >
                    결제 완료 ({summary.paidCount})
                  </button>
                </div>
              </div>

              {/* Search Bar & Phone Masking */}
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="고객명, 연락처, 예약번호..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50/50 outline-none focus:border-[#00AE95]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setUnmaskPhone(!unmaskPhone)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-3xs font-bold text-slate-600 cursor-pointer flex items-center gap-1 shrink-0"
                >
                  {unmaskPhone ? <EyeOff size={11} /> : <Eye size={11} />}
                  <span>{unmaskPhone ? '마스킹' : '번호 해제'}</span>
                </button>
              </div>

              {/* Purchase Cards Stream */}
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                {filteredReservations.length > 0 ? (
                  filteredReservations.map((item, idx) => {
                    const isPaid = item.paymentStatus === 'PAID';
                    const isNotified = item.staffNotified;

                    return (
                      <div 
                        key={item.reservationId || idx}
                        className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                          !isPaid 
                            ? 'bg-slate-50/60 border-slate-200/60'
                            : isNotified
                            ? 'bg-white border-slate-200 hover:border-emerald-300'
                            : 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
                        }`}
                      >
                        {/* Top Line: Customer & Timestamp */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-sm">
                              {item.customerName}
                            </span>
                            <span className="text-3xs font-mono text-slate-500">
                              {formatPhone(item.customerPhone)}
                            </span>
                            <span className="text-4xs font-mono text-slate-400">
                              #{item.reservationId}
                            </span>
                          </div>

                          <span className="text-3xs font-mono text-slate-400">
                            {item.orderDate?.slice(11, 19) || item.orderDate || '-'}
                          </span>
                        </div>

                        {/* Middle Line: Product & Amount */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                          <span className="text-3xs text-slate-600 font-medium truncate max-w-[200px]" title={item.productName}>
                            {item.productName}
                          </span>
                          <strong className="text-sm font-black text-slate-900 font-mono">
                            {formatNumber(item.totalPrice)}원
                          </strong>
                        </div>

                        {/* Bottom Line: Staff Notification Status Badge */}
                        <div className="flex items-center justify-between pt-1 text-3xs">
                          <div>
                            {isPaid ? (
                              isNotified ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  <CheckCircle2 size={11} className="text-emerald-600" />
                                  <span>직원 발송 완료 ({item.staffNotifiedAt?.slice(11, 16) || '완료'})</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-800 font-black bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 animate-pulse">
                                  <AlertCircle size={11} className="text-amber-600" />
                                  <span>직원 미발송 건 (새 구매)</span>
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 font-medium">
                                {item.paymentStatus === 'UNPAID' ? '가예약 (미결제)' : '취소된 예약'}
                              </span>
                            )}
                          </div>

                          {/* Action Button */}
                          {isPaid && !isNotified && (
                            <button
                              type="button"
                              onClick={() => handleSendSinglePurchase(item)}
                              disabled={isSending}
                              className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-black shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Send size={10} />
                              <span>직원에게 전송</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    {loading ? '구매 데이터를 불러오는 중입니다...' : '해당 조건에 일치하는 구매 내역이 없습니다.'}
                  </div>
                )}
              </div>

            </section>

          </div>

          {/* ============================================================== */}
          {/* COLUMN 3 (3 cols): 📱 발송 문자 실시간 미리보기 & 편집 */}
          {/* ============================================================== */}
          <div className="lg:col-span-3 space-y-4">
            
            <section className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4 flex flex-col items-center">
              
              {/* Header */}
              <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5">
                  <Smartphone size={16} className="text-[#00AE95]" />
                  <h2 className="text-sm font-black text-slate-900">
                    직원 폰 수신 화면
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => openTemplateModal(previewTab)}
                  className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-3xs font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 size={11} />
                  <span>문구 수정</span>
                </button>
              </div>

              {/* Preview Toggle Tabs */}
              <div className="w-full grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl text-3xs font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewTab('purchase')}
                  className={`py-1 rounded-lg transition-all cursor-pointer ${
                    previewTab === 'purchase' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500'
                  }`}
                >
                  1. 신규 구매 알림
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('summary')}
                  className={`py-1 rounded-lg transition-all cursor-pointer ${
                    previewTab === 'summary' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500'
                  }`}
                >
                  2. 당일 현황 종합
                </button>
              </div>

              {/* Smartphone Frame Mockup */}
              <div className="w-full max-w-[270px] bg-slate-900 rounded-[36px] p-2.5 shadow-xl border-4 border-slate-800">
                <div className="bg-[#E9ECEF] rounded-[26px] p-3 min-h-[380px] flex flex-col justify-start space-y-2">
                  <div className="text-center text-4xs font-bold text-slate-400 pb-1 border-b border-slate-300">
                    발신번호: {config.senderNumber || '043-123-4567'}
                  </div>
                  
                  {/* SMS Bubble */}
                  <div className="bg-white text-slate-900 p-3 rounded-2xl rounded-tl-xs shadow-xs text-3xs space-y-1.5 leading-relaxed whitespace-pre-wrap font-mono">
                    {previewTab === 'purchase' ? renderedPurchaseMessage : renderedSummaryMessage}
                  </div>
                </div>
              </div>

              {/* Direct Test Send Button from Preview */}
              <button
                type="button"
                onClick={handleSendPreviewTest}
                disabled={activeStaffList.length === 0}
                className="w-full py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700 disabled:opacity-50"
                title="위 미리보기 화면 문구 그대로 활성 직원 전원에게 모의 테스트 문자를 발송합니다."
              >
                <Send size={13} className="text-[#00AE95]" />
                <span>위 화면 그대로 직원 전원({activeStaffList.length}명) TEST 발송</span>
              </button>

              <p className="text-4xs text-slate-400 text-center leading-tight">
                ※ 온라인 결제 발생 시 즉시 위 형태의 문자가 등록된 모든 직원 폰으로 발송됩니다.
              </p>

            </section>

          </div>

        </div>

      </main>

      {/* MODAL: 템플릿 문구 편집 모달 */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleIn">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-[#00AE95]" />
                <h3 className="text-sm font-black text-slate-900">
                  {templateEditMode === 'purchase' ? '신규 구매 알림 문자 문구 수정' : '당일 현황 종합 문자 문구 수정'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-2xs font-extrabold text-slate-700 block">
                메시지 템플릿 본문
              </label>
              <textarea
                rows={12}
                value={editingTemplateText}
                onChange={(e) => setEditingTemplateText(e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-mono text-slate-900 bg-slate-50/50 outline-none focus:border-[#00AE95] leading-relaxed resize-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200/80 text-3xs text-slate-600 space-y-1">
              <div className="font-extrabold text-slate-800">💡 사용 가능한 자동 치환 변수:</div>
              <div className="flex flex-wrap gap-1 pt-1 font-mono">
                {templateEditMode === 'purchase' ? (
                  <>
                    <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{예약번호}'}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{주문번호}'}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{고객명}'}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{고객연락처}'}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{상품명}'}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{결제금액}'}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{구매일시}'}</span>
                  </>
                ) : (
                  <>
                    <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{날짜}'}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{총예약건수}'}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{총예약금액}'}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{결제완료건수}'}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{결제완료금액}'}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{미결제건수}'}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{미결제금액}'}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white border">#{'{미결제고객명단}'}</span>
                  </>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="px-5 py-2 rounded-xl bg-[#00AE95] hover:bg-[#008A77] text-white text-xs font-black shadow-xs cursor-pointer"
              >
                저장하기
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: 솔라피 발송 계정 설정 모달 */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleIn">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#00AE95]/10 text-[#00AE95] flex items-center justify-center">
                  <Settings size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">솔라피(Solapi) 문자 발송 계정 설정</h3>
                  <p className="text-3xs text-slate-500">문자를 발송할 발신번호와 솔라피 API 인증키를 설정합니다.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-3xs font-extrabold text-slate-700 block mb-1">
                  사전 등록된 발신번호 * (솔라피에 등록된 전화번호)
                </label>
                <input
                  type="text"
                  placeholder="예: 043-123-4567 또는 01012345678"
                  value={accountForm.senderNumber}
                  onChange={(e) => setAccountForm({ ...accountForm, senderNumber: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-[#00AE95]"
                />
              </div>

              <div>
                <label className="text-3xs font-extrabold text-slate-700 block mb-1">
                  솔라피 API Key * (NCS...)
                </label>
                <input
                  type="text"
                  placeholder="NCS..."
                  value={accountForm.apiKey}
                  onChange={(e) => setAccountForm({ ...accountForm, apiKey: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-[#00AE95]"
                />
              </div>

              <div>
                <label className="text-3xs font-extrabold text-slate-700 block mb-1">
                  솔라피 API Secret *
                </label>
                <input
                  type="password"
                  placeholder={config.hasApiSecret ? `현재 등록됨 (${config.apiSecretMasked}) - 변경 시에만 입력` : '솔라피 API Secret 입력'}
                  value={accountForm.apiSecret}
                  onChange={(e) => setAccountForm({ ...accountForm, apiSecret: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-[#00AE95]"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-3xs text-slate-600 leading-relaxed">
                💡 <strong>안내:</strong> 솔라피 콘솔(<a href="https://console.solapi.com" target="_blank" rel="noreferrer" className="text-[#00AE95] underline font-bold">console.solapi.com</a>)에서 발급받은 API 키와 솔라피에 사전 등록된 대표 발신번호를 입력해 주시면 신규 구매 알림 문자가 정상 전송됩니다.
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveAccountSettings}
                className="px-5 py-2 rounded-xl bg-[#00AE95] hover:bg-[#008A77] text-white text-xs font-black shadow-xs cursor-pointer"
              >
                저장하기
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
