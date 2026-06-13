// Base44 -> self-hosted Supabase compatibility shim.
// Implements the Base44 SDK surface the app uses (entities / auth / integrations /
// functions / appLogs) backed by a generic jsonb record store on our VPS Supabase.
// Swap-in replacement: the rest of the app keeps calling base44.* unchanged.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const APP = import.meta.env.VITE_APP_NAME || 'microtech-os';
const TABLE = 'base44_records';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// DB row -> flat Base44-style record (fields at top level + id/created_date)
function toRecord(row) {
  if (!row) return row;
  const { id, data, created_at, updated_at, created_by } = row;
  return {
    id,
    ...(data || {}),
    created_by: created_by ?? (data ? data.created_by : undefined),
    created_date: created_at,
    updated_date: updated_at,
    created_at,
    updated_at,
  };
}

function stripMeta(obj = {}) {
  const { id, created_date, updated_date, created_at, updated_at, ...rest } = obj;
  return rest;
}

function applySort(q, sort) {
  if (!sort) return q.order('created_at', { ascending: false });
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  if (['created_date', 'created_at'].includes(field)) return q.order('created_at', { ascending: !desc });
  if (['updated_date', 'updated_at'].includes(field)) return q.order('updated_at', { ascending: !desc });
  // best-effort sort on a jsonb field
  return q.order(`data->>${field}`, { ascending: !desc });
}

function entityApi(entity) {
  const sel = () => supabase.from(TABLE).select('*').eq('app', APP).eq('entity', entity);
  return {
    async list(sort, limit) {
      let q = applySort(sel(), sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(toRecord);
    },
    async filter(query = {}, sort, limit) {
      let q = sel();
      for (const [k, v] of Object.entries(query || {})) {
        if (k === 'id') q = q.eq('id', v);
        else if (k === 'created_by') q = q.eq('created_by', v);
        else q = q.eq(`data->>${k}`, typeof v === 'string' ? v : String(v));
      }
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(toRecord);
    },
    async get(id) {
      const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
      if (error) throw error;
      return toRecord(data);
    },
    async create(obj = {}) {
      const payload = stripMeta(obj);
      const created_by = obj.created_by ?? null;
      const { data, error } = await supabase
        .from(TABLE)
        .insert({ app: APP, entity, data: payload, created_by })
        .select('*')
        .single();
      if (error) throw error;
      return toRecord(data);
    },
    async bulkCreate(arr = []) {
      const rows = (arr || []).map((o) => ({ app: APP, entity, data: stripMeta(o), created_by: o.created_by ?? null }));
      const { data, error } = await supabase.from(TABLE).insert(rows).select('*');
      if (error) throw error;
      return (data || []).map(toRecord);
    },
    async update(id, obj = {}) {
      const patch = stripMeta(obj);
      const { data: cur } = await supabase.from(TABLE).select('data').eq('id', id).single();
      const merged = { ...((cur && cur.data) || {}), ...patch };
      const { data, error } = await supabase.from(TABLE).update({ data: merged }).eq('id', id).select('*').single();
      if (error) throw error;
      return toRecord(data);
    },
    async delete(id) {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
  };
}

const entities = new Proxy({}, {
  get(_t, name) {
    if (typeof name !== 'string') return undefined;
    return entityApi(name);
  },
});

const auth = {
  async me() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return { id: user.id, email: user.email, role: user.role, ...(user.user_metadata || {}) };
  },
  async updateMe(obj = {}) {
    const { data, error } = await supabase.auth.updateUser({ data: obj });
    if (error) throw error;
    return data.user;
  },
  async logout(redirectUrl) {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    if (typeof window !== 'undefined' && redirectUrl) window.location.href = redirectUrl;
  },
  redirectToLogin() {
    // Send unauthenticated users to our Supabase-backed /login page.
    // Guard prevents a redirect loop when already on the login page.
    if (typeof window !== 'undefined' && !/\/login$/i.test(window.location.pathname)) {
      window.location.href = '/login';
    }
  },
};

// ---- integrations (Core) ----
async function UploadFile({ file } = {}) {
  if (!file) return { file_url: '' };
  const ext = (file.name && file.name.includes('.')) ? file.name.split('.').pop() : 'bin';
  const path = `${APP}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('uploads').upload(path, file, {
    cacheControl: '3600', upsert: false, contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('uploads').getPublicUrl(path);
  return { file_url: data.publicUrl };
}

const notWired = (name) => async (...args) => {
  console.warn(`[shim] integrations.${name} not wired to a backend yet`, args);
  return { };
};

const FN_URL = import.meta.env.VITE_FUNCTIONS_URL || 'https://fn.aimicrotechlink.cloud';
async function callIntegration(name, payload = {}) {
  try {
    const res = await fetch(`${FN_URL}/integrations/${name}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app: APP, ...payload }),
    });
    return await res.json();
  } catch (e) { console.warn(`[integration ${name}] failed`, e.message); return {}; }
}

const integrations = {
  Core: {
    UploadFile,
    InvokeLLM: (payload = {}) => callIntegration('InvokeLLM', payload),
    GenerateImage: (payload = {}) => callIntegration('GenerateImage', payload),
    SendEmail: (payload = {}) => callIntegration('SendEmail', payload),
    SendSMS: (payload = {}) => callIntegration('SendSMS', payload),
    ExtractDataFromUploadedFile: notWired('ExtractDataFromUploadedFile'),
  },
};

// ---- backend functions (Stripe checkout, tickets, emails) â€” stubbed ----
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || 'https://fn.aimicrotechlink.cloud';
const functions = {
  async invoke(name, payload = {}) {
    try {
      const res = await fetch(`${FUNCTIONS_URL}/fn/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app: APP, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) console.warn(`[fn ${name}]`, data.error);
      return data;
    } catch (e) {
      console.warn(`[fn ${name}] failed`, e.message);
      return { data: {} };
    }
  },
};

// ---- appLogs (no-op) ----
const appLogs = {
  create: async () => ({}),
  list: async () => [],
  filter: async () => [],
  logUserInApp: async () => ({}),
};

export const base44 = { entities, auth, integrations, functions, appLogs, supabase };
export default base44;
