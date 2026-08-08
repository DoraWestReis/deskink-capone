import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, CheckCircle2, Loader2 } from 'lucide-react';

const CONNECTOR_ID = '6a1f13da85129a0225942902';

const DETAIL_PT = {
  no_active_connection: 'Google Agenda ainda não conectado neste dispositivo. Toque no botão acima para conectar.',
  no_token: 'A autorização expirou. Conecte novamente para renovar o acesso.',
  not_logged_in: 'Faça login no app antes de conectar a agenda.',
  invalid_token: 'A autorização não é mais válida. Conecte novamente.',
};

const translateDetail = (detail) => {
  if (!detail) return '';
  const key = String(detail).toLowerCase();
  if (DETAIL_PT[key]) return DETAIL_PT[key];
  if (key.includes('no active connection')) return DETAIL_PT.no_active_connection;
  if (key.includes('token')) return DETAIL_PT.no_token;
  if (key.includes('not logged in') || key.includes('unauthorized')) return DETAIL_PT.not_logged_in;
  return 'Não foi possível confirmar a conexão com o Google Agenda. Toque no botão acima para conectar.';
};

export default function GoogleCalendarConnect() {
  const [authed, setAuthed] = useState(false);
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [statusDetail, setStatusDetail] = useState('');

  // Rule 2: reusable fetch — doubles as connection check
  const fetchStatus = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('getMyCalendarStatus', {});
      setConnected(!!res.data?.connected);
      setEmail(res.data?.email || null);
      setStatusDetail(res.data?.connected ? '' : translateDetail(res.data?.detail || res.data?.reason || ''));
    } catch (err) {
      setConnected(false);
      setStatusDetail(err?.message || 'Falha ao verificar a conexão.');
    }
  }, []);

  // Rule 1 + 2: auth gate, then status check
  useEffect(() => {
    base44.auth.isAuthenticated().then(async (isAuthed) => {
      setAuthed(isAuthed);
      if (isAuthed) {
        await fetchStatus();
      }
      setLoading(false);
    });
  }, [fetchStatus]);

  // iPad/iPhone (and mobile Safari in general) block pop-ups opened after an await,
  // so on these devices we do the OAuth in the same tab.
  const isMobileSafariLike = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    || window.matchMedia('(max-width: 1024px)').matches;

  const handleConnect = async () => {
    setConnecting(true);
    setPopupBlocked(false);
    setConnectionError('');

    if (isMobileSafariLike) {
      try {
        const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
        window.location.assign(url);
      } catch (error) {
        setConnectionError(error?.message || 'Não foi possível abrir a conexão com o Google. Tente novamente.');
        setConnecting(false);
      }
      return;
    }

    const popup = window.open('about:blank', '_blank');

    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        setPopupBlocked(true);
        window.location.assign(url);
        return;
      }

      popup.location.href = url;
      const timer = setInterval(async () => {
        if (popup.closed) {
          clearInterval(timer);
          await fetchStatus();
          // the token can be saved a moment after the tab closes — re-check once
          setTimeout(fetchStatus, 2000);
          setConnecting(false);
        }
      }, 500);
    } catch (error) {
      popup?.close();
      setConnectionError(error?.message || 'Não foi possível abrir a conexão com o Google. Tente novamente.');
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-2.5 text-sm text-white/60">
        <Loader2 className="h-4 w-4 animate-spin" /> Verificando...
      </div>
    );
  }

  if (!authed) {
    return (
      <Button
        size="sm"
        onClick={() => base44.auth.redirectToLogin()}
        className="rounded-2xl bg-[#B89A66] text-white hover:bg-[#A88959]"
      >
        Entrar para conectar
      </Button>
    );
  }

  if (connected) {
    return (
      <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-300">
        <CheckCircle2 className="h-4 w-4" />
        <span className="truncate max-w-[180px]">{email ? `Conectado: ${email}` : 'Google Agenda conectado'}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col gap-2">
      <Button
        size="sm"
        onClick={handleConnect}
        disabled={connecting}
        className="w-fit rounded-2xl bg-[#B89A66] text-white hover:bg-[#A88959]"
      >
        {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarIcon className="h-4 w-4" />}
        Reconectar Google Agenda
      </Button>
      {connectionError && (
        <p className="max-w-[260px] text-xs text-red-300">{connectionError}</p>
      )}
      {!connectionError && statusDetail && (
        <p className="max-w-[260px] break-words text-[11px] text-white/50">{statusDetail}</p>
      )}
      {popupBlocked && (
        <p className="max-w-[260px] text-xs text-amber-300">
          Seu navegador bloqueou a janela de conexão. Permita pop-ups para este site (no celular/iPad: ative em Ajustes → Safari/Chrome) e toque em "Conectar" novamente.
        </p>
      )}
    </div>
  );
}