import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { fetchSystemNotifications } from "@/services/systemNotificationsData";

const DISMISSED_IDS_KEY = "fx_system_notifications_dismissed_ids";

function getStoredDismissedIds() {
	try {
		const raw = localStorage.getItem(DISMISSED_IDS_KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed.map((item) => Number(item)).filter(Number.isFinite) : [];
	} catch {
		return [];
	}
}

function setStoredDismissedIds(values) {
	try {
		if (!Array.isArray(values) || values.length === 0) {
			localStorage.removeItem(DISMISSED_IDS_KEY);
			return;
		}
		localStorage.setItem(DISMISSED_IDS_KEY, JSON.stringify(values));
	} catch {
		// no-op
	}
}

function playNotificationTone() {
	if (typeof window === "undefined") return;

	const AudioContextClass = window.AudioContext || window.webkitAudioContext;
	if (!AudioContextClass) return;

	try {
		const context = new AudioContextClass();
		const oscillator = context.createOscillator();
		const gain = context.createGain();

		oscillator.type = "sine";
		oscillator.frequency.value = 880;
		gain.gain.value = 0.0001;

		oscillator.connect(gain);
		gain.connect(context.destination);
		oscillator.start();
		gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.25);
		oscillator.stop(context.currentTime + 0.28);

		setTimeout(() => {
			context.close().catch(() => {});
		}, 400);
	} catch {
		// no-op
	}
}

function formatNotificationTime(isoDate) {
	if (!isoDate) return "Agora";
	const date = new Date(isoDate);
	if (Number.isNaN(date.getTime())) return "Agora";
	return date.toLocaleString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function SystemNotificationsBell() {
	const [open, setOpen] = useState(false);
	const [notifications, setNotifications] = useState([]);
	const [dismissedIds, setDismissedIds] = useState(() => getStoredDismissedIds());
	const initializedRef = useRef(false);
	const dismissedIdsRef = useRef(dismissedIds);
	const notifiedMaxIdRef = useRef(0);

	useEffect(() => {
		dismissedIdsRef.current = dismissedIds;
		setStoredDismissedIds(dismissedIds);
	}, [dismissedIds]);

	useEffect(() => {
		let mounted = true;
		let timerId = null;

		const refresh = async ({ beep = false } = {}) => {
			try {
				const data = await fetchSystemNotifications(8);
				if (!mounted) return;

				setNotifications(data);

				const topId = data[0]?.id || 0;
				if (!initializedRef.current) {
					initializedRef.current = true;
					notifiedMaxIdRef.current = Math.max(notifiedMaxIdRef.current, topId || 0);
					return;
				}

				if (topId > notifiedMaxIdRef.current) {
					notifiedMaxIdRef.current = topId;
					if (beep) {
						playNotificationTone();
					}
				}
			} catch {
				// no-op
			}
		};

		refresh({ beep: false });
		timerId = window.setInterval(() => refresh({ beep: true }), 15000);

		return () => {
			mounted = false;
			if (timerId) window.clearInterval(timerId);
		};
	}, []);

	const visibleNotifications = useMemo(() => {
		const dismissedSet = new Set(dismissedIds);
		return notifications.filter((notification) => !dismissedSet.has(Number(notification.id)));
	}, [dismissedIds, notifications]);

	const hasUnread = useMemo(() => visibleNotifications.length > 0, [visibleNotifications.length]);

	const dismissNotification = (notificationId) => {
		const normalizedId = Number(notificationId);
		if (!Number.isFinite(normalizedId)) return;

		setDismissedIds((current) => {
			if (current.includes(normalizedId)) return current;
			return [...current, normalizedId].sort((a, b) => a - b);
		});
	};

	const handleToggle = () => {
		setOpen((prev) => {
			const next = !prev;
			if (next && notifications[0]?.id) {
				notifiedMaxIdRef.current = Math.max(notifiedMaxIdRef.current, notifications[0].id);
			}
			return next;
		});
	};

	return (
		<div className="relative">
			<button
				type="button"
				onClick={handleToggle}
				className="relative flex items-center justify-center w-10 h-10 rounded-full text-[#b8891f] hover:text-[#a67917] hover:bg-amber-50 transition-colors"
				aria-label="Abrir notificações do sistema"
			>
				<Bell className="w-5 h-5 fill-current" fill="currentColor" strokeWidth={1.7} />
				{hasUnread && (
					<span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white shadow-sm" />
				)}
			</button>

			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: -6, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -6, scale: 0.98 }}
						transition={{ duration: 0.15, ease: "easeOut" }}
						className="absolute right-0 mt-3 w-[min(92vw,360px)] rounded-2xl border border-amber-200 bg-white shadow-2xl shadow-[#1e1608]/15 z-50 overflow-hidden"
					>
						<div className="px-4 py-3 bg-gradient-to-r from-[#1e1608] to-[#2b2010] text-amber-50 flex items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								<Bell className="w-4 h-4 text-[#d6ab4a]" />
								<p className="font-semibold text-sm">Notificações do sistema</p>
							</div>
							<button type="button" onClick={() => setOpen(false)} className="text-xs text-amber-100/80 hover:text-white">
								Fechar
							</button>
						</div>

						<div className="max-h-96 overflow-y-auto">
							{visibleNotifications.length === 0 ? (
								<div className="p-4 text-sm text-gray-500">Nenhuma notificação recente.</div>
							) : (
								visibleNotifications.map((notification) => {
									return (
										<div
											key={notification.id}
											className="px-4 py-3 border-b border-amber-100 last:border-b-0 bg-white"
										>
											<div className="flex items-start gap-3">
												<div className="min-w-0 flex-1">
													<div className="flex items-start justify-between gap-3">
													<p className="text-sm font-semibold text-gray-900">{notification.title}</p>
													<button
														type="button"
														onClick={() => dismissNotification(notification.id)}
														className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
														aria-label="Marcar notificação como lida"
													>
														<X className="w-4 h-4" />
													</button>
													</div>
													<p className="text-xs text-gray-600 mt-0.5 pr-8">{notification.message}</p>
													<p className="text-[11px] text-gray-400 mt-1">{formatNotificationTime(notification.createdAt)}</p>
												</div>
											</div>
										</div>
									);
								})
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}