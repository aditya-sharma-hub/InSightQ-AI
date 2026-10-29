/**
 * InsightIQ AI - Shared Realtime Event Broadcast Helper for Deno Edge Functions
 * Inserts completion events into user_activity table, which broadcasts to connected Realtime WS clients.
 */

export async function broadcastRealtimeEvent(
  supabaseClient: any,
  userId: string,
  actionText: string
): Promise<void> {
  try {
    await supabaseClient
      .from('user_activity')
      .insert([{
        user_id: userId,
        action: actionText,
        created_at: new Date().toISOString()
      }]);
  } catch (err) {
    console.error('[Realtime Broadcast Error]', err);
  }
}
