import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useNotifications() {
  const [requestCount, setRequestCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let channels = [];
    let cancelled = false;
    let userId = null;
    let matchIds = [];

    // Count pending interest requests on the user's own projects
    async function fetchRequestCount() {
      if (!userId) return;
      const { data: myProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('creator_id', userId);

      const projectIds = (myProjects || []).map((p) => p.id);
      if (!projectIds.length) {
        if (!cancelled) setRequestCount(0);
        return;
      }

      const { count } = await supabase
        .from('interests')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds);

      if (!cancelled) setRequestCount(count || 0);
    }

    // Count unread messages across all the user's matches
    async function fetchUnreadCount() {
      if (!matchIds.length) {
        if (!cancelled) setUnreadCount(0);
        return;
      }
      let total = 0;
      for (const matchId of matchIds) {
        const lastRead =
          localStorage.getItem(`chat_last_read_${matchId}`) ||
          '1970-01-01T00:00:00.000Z';
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('match_id', matchId)
          .neq('sender_id', userId)
          .gt('created_at', lastRead);
        total += count || 0;
      }
      if (!cancelled) setUnreadCount(total);
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      userId = user.id;

      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .or(`owner_id.eq.${userId},requester_id.eq.${userId}`);
      matchIds = (matches || []).map((m) => m.id);

      await Promise.all([fetchRequestCount(), fetchUnreadCount()]);

      const interestsCh = supabase
        .channel('nav:interests')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'interests' }, fetchRequestCount)
        .subscribe();

      const messagesCh = supabase
        .channel('nav:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchUnreadCount)
        .subscribe();

      channels = [interestsCh, messagesCh];
    }

    init();

    return () => {
      cancelled = true;
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, []);

  return { requestCount, unreadCount };
}
