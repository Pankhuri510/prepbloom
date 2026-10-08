import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './cloud.js';
import { today, weekStart, targetStatus } from './logic.js';

const DEMO_KEY = 'prepbloom-demo-v1';
const blank = () => ({ entries: [], rewards: [] });
function readDemo() {
  try { const data = JSON.parse(localStorage.getItem(DEMO_KEY)); if (Array.isArray(data?.entries) && Array.isArray(data?.rewards)) return data; } catch { /* Start empty if local demo data is damaged. */ }
  return blank();
}
export function useTracker(user, demo) {
  const [data, setData] = useState(blank), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [sync, setSync] = useState('Loading…');
  const active = useRef(true), locked = useRef(false), fetchVersion = useRef(0);
  const uid = user?.id;
  const load = useCallback(async () => {
    const version = ++fetchVersion.current;
    if (demo) { setData(readDemo()); setLoading(false); setSync('Demo · saved on this browser'); return; }
    if (!uid) return;
    try {
      const [entries, rewards] = await Promise.all([
        supabase.from('tracker_entries').select('*').eq('user_id', uid).order('created_at'),
        supabase.from('tracker_rewards').select('*').eq('user_id', uid).order('created_at', { ascending: false })
      ]);
      if (entries.error || rewards.error) throw entries.error || rewards.error;
      // A plan completed in advance becomes eligible when its date arrives.
      for (const [entryKind, rewardKind, period] of [['task','daily',today()], ['weekly','weekly',weekStart(today())]]) {
        if (targetStatus(entries.data, entryKind, period).complete && !rewards.data.some(r => r.kind === rewardKind && r.period === period)) {
          const result = await supabase.rpc('claim_tracker_reward', { reward_kind: rewardKind, reward_period: period });
          if (result.error) throw result.error;
          const refreshed = await supabase.from('tracker_rewards').select('*').eq('user_id', uid).order('created_at', { ascending: false });
          if (refreshed.error) throw refreshed.error;
          rewards.data = refreshed.data;
        }
      }
      if (active.current && version === fetchVersion.current) {
        setData({ entries: entries.data, rewards: rewards.data }); setError(''); setLoading(false); setSync('Cloud synced');
      }
    } catch (e) {
      if (active.current && version === fetchVersion.current) { setLoading(false); setSync('Sync failed'); setError(e.message || 'Could not load your progress.'); }
    }
  }, [uid, demo]);
  useEffect(() => {
    active.current = true; setData(blank()); setLoading(true); load();
    const refresh = () => { if (!locked.current && document.visibilityState !== 'hidden') load(); };
    const timer = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh);
    const channel = !demo && uid ? supabase.channel(`tracker-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracker_entries', filter: `user_id=eq.${uid}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracker_rewards', filter: `user_id=eq.${uid}` }, refresh).subscribe() : null;
    return () => { active.current = false; fetchVersion.current++; clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); if (channel) supabase.removeChannel(channel); };
  }, [load, uid, demo]);
  async function mutate(action, rows) {
    if (locked.current) throw new Error('Please wait for the current save to finish.');
    if (!demo && !navigator.onLine) throw new Error('You are offline. Reconnect before saving; your open draft is kept.');
    // Reuse an existing singleton's ID when importing it from another backup.
    if (action !== 'delete') rows = rows.map(row => {
      if (!['profile','syllabus'].includes(row.kind)) return row;
      const existing = data.entries.find(r => r.kind === row.kind && r.period === row.period);
      return existing ? { ...row, id: existing.id } : row;
    });
    locked.current = true; setBusy(true); setError(''); setSync('Saving…'); fetchVersion.current++;
    try {
      if (demo) {
        const next = readDemo();
        if (action === 'delete') next.entries = next.entries.filter(r => r.id !== rows[0].id);
        else for (const row of rows) {
          const index = next.entries.findIndex(r => r.id === row.id);
          const saved = { ...row, created_at: row.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
          if (index < 0) next.entries.push(saved); else next.entries[index] = saved;
        }
        for (const row of rows) {
          if (!['task', 'weekly'].includes(row.kind)) continue;
          const kind = row.kind === 'task' ? 'daily' : 'weekly';
          if (row.period > (kind === 'daily' ? today() : weekStart(today()))) continue;
          if (targetStatus(next.entries, row.kind, row.period).complete && !next.rewards.some(r => r.kind === kind && r.period === row.period))
            next.rewards.push({ id: crypto.randomUUID(), kind, period: row.period, stars: kind === 'daily' ? 1 : 5, created_at: new Date().toISOString() });
        }
        localStorage.setItem(DEMO_KEY, JSON.stringify(next)); setData(next); setSync('Demo · saved on this browser');
      } else {
        const query = action === 'delete'
          ? supabase.from('tracker_entries').delete().eq('id', rows[0].id).eq('user_id', uid)
          : supabase.from('tracker_entries').upsert(rows.map(r => ({ id: r.id, user_id: uid, kind: r.kind, period: r.period || '', payload: r.payload })), { onConflict: 'id' });
        const result = await query;
        if (result.error) throw result.error;
        const periods = new Map(rows.filter(r => ['task', 'weekly'].includes(r.kind)).map(r => [`${r.kind}:${r.period}`, r]));
        for (const row of periods.values()) {
          const { error: rewardError } = await supabase.rpc('claim_tracker_reward', { reward_kind: row.kind === 'task' ? 'daily' : 'weekly', reward_period: row.period });
          if (rewardError) { setError(`Your changes were saved, but the star could not be checked: ${rewardError.message}`); }
        }
        await load();
      }
    } catch (e) { setSync('Save failed'); setError(e.message || 'Could not save.'); throw e; }
    finally { locked.current = false; setBusy(false); }
  }
  const save = row => mutate('save', [row]);
  const remove = row => mutate('delete', [row]);
  const importRows = rows => mutate('save', rows);
  return { ...data, loading, busy, error, sync, save, remove, importRows, reload: load, clearError: () => setError('') };
}
