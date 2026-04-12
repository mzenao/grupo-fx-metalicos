import { apiRequest } from "@/services/apiClient";

function mapNotificationFromApi(item) {
  return {
    id: item.id,
    eventType: item.event_type,
    title: item.title,
    message: item.message,
    entityType: item.entity_type,
    entityId: item.entity_id,
    actorUser: item.actor_user || null,
    details: item.details || {},
    createdAt: item.created_at,
  };
}

export async function fetchSystemNotifications(limit = 10) {
  const payload = await apiRequest(`system-notifications?limit=${encodeURIComponent(String(limit))}`, {
    method: "GET",
  });

  return (payload?.data || []).map(mapNotificationFromApi);
}