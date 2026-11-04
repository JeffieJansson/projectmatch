import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  NOTIFICATIONS_CHANGED,
  getSeenMatchIds,
  markMatchesSeen,
  getChatLastRead,
} from '../lib/notificationStore';

export function useNotifications() {
  const [requestCount, setRequestCount] = useState(0);
  const [newMatchCount, setNewMatchCount] = useState(0);
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

      const [{ data: interests }, { data: existingMatches }] = await Promise.all([
        supabase
          .from('interests')
          .select('project_id, user_id')
          .in('project_id', projectIds),
        supabase
          .from('matches')
          .select('project_id, requester_id')
          .in('project_id', projectIds),
      ]);

      // Exclude interests that already resulted in a match (same project + same user)
      const matched = new Set(
        (existingMatches || []).map((m) => `${m.project_id}:${m.requester_id}`)
      );
      const pending = (interests || []).filter(
        (i) => !matched.has(`${i.project_id}:${i.user_id}`)
      );

      if (!cancelled) setRequestCount(pending.length);
    }

    async function fetchMatchIds() {
      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .or(`owner_id.eq.${userId},requester_id.eq.${userId}`);
      matchIds = (matches || []).map((m) => m.id);
    }

    // Count matches the user hasn't clicked into yet
    function computeNewMatchCount() {
      let seen = getSeenMatchIds();
      if (seen === null) {
        // First run on this device: treat existing matches as already seen
        markMatchesSeen(matchIds);
        seen = new Set(matchIds);
      }
      if (!cancelled) setNewMatchCount(matchIds.filter((id) => !seen.has(id)).length);
    }

    // Count unread messages across all the user's matches
    async function fetchUnreadCount() {
      if (!matchIds.length) {
        if (!cancelled) setUnreadCount(0);
        return;
      }
      const counts = await Promise.all(
        matchIds.map(async (matchId) => {
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('match_id', matchId)
            .neq('sender_id', userId)
            .gt('created_at', getChatLastRead(matchId));
          return count || 0;
        })
      );
      if (!cancelled) setUnreadCount(counts.reduce((a, b) => a + b, 0));
    }

    async function onMatchesChanged() {
      await fetchMatchIds();
      computeNewMatchCount();
      await Promise.all([fetchRequestCount(), fetchUnreadCount()]);
    }

    function onLocalChange() {
      if (!userId) return;
      computeNewMatchCount();
      fetchUnreadCount();
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      userId = user.id;
      await fetchMatchIds();
      computeNewMatchCount();
      await Promise.all([fetchRequestCount(), fetchUnreadCount()]);
      if (cancelled) return;

      const interestsCh = supabase
        .channel('nav:interests')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'interests' }, fetchRequestCount)
        .subscribe();

      const messagesCh = supabase
        .channel('nav:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchUnreadCount)
        .subscribe();

      const matchesCh = supabase
        .channel('nav:matches')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, onMatchesChanged)
        .subscribe();

      channels = [interestsCh, messagesCh, matchesCh];
    }

    window.addEventListener(NOTIFICATIONS_CHANGED, onLocalChange);
    init();

    return () => {
      cancelled = true;
      window.removeEventListener(NOTIFICATIONS_CHANGED, onLocalChange);
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, []);

  return { requestCount, newMatchCount, unreadCount };
}
