'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { US_STATES } from '../../lib/us-states';
import IndustryPicker from '../../components/IndustryPicker';

function formatCurrency(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return `$${num.toLocaleString()}`;
}

function parseCurrencyInput(value) {
  if (!value) return '';
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  if (!cleaned) return '';
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return '';
  return String(num);
}

function yearsSince(startDate) {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const m = now.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < start.getDate())) years -= 1;
  return Math.max(0, years);
}

function completeness(details) {
  const fields = [
    !!details.description,
  !!details.category,
    !!details.industry,
    !!details.start_date,
    details.annual_revenue !== '' && details.annual_revenue !== null,
    details.annual_profit !== '' && details.annual_profit !== null,
    details.default_asking_price !== '' && details.default_asking_price !== null,
    !!details.city,
    !!details.state,
    !!details.zip,
    !!details.country,
    !!details.county,
    !!details.keywords,
  ];
  const done = fields.filter(Boolean).length;
  return Math.round((done / fields.length) * 100);
}

const countries = [
  'United States','Canada','United Kingdom','Australia','Germany','France','Spain','Italy','Netherlands','Sweden',
  'Norway','Denmark','Switzerland','India','Mexico','Brazil','United Arab Emirates','Singapore','Japan','South Africa'
];

const emptyDetails = {
  description: '',
  category: 'established',
  start_date: '',
  annual_revenue: '',
  annual_profit: '',
  default_asking_price: '',
  city: '',
  state: '',
  zip: '',
  country: 'United States',
  county: '',
  keywords: '',
  industry: '',
};

export default function MyBusinessesPage() {
  const [userId, setUserId] = useState('');
  const [rows, setRows] = useState([]);
  const [membersByBusiness, setMembersByBusiness] = useState({});
  const [detailsByBusiness, setDetailsByBusiness] = useState({});
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newBusinessRole, setNewBusinessRole] = useState('Owner');
  const [newBusinessCity, setNewBusinessCity] = useState('');
  const [newBusinessState, setNewBusinessState] = useState('Florida');
  const [newBusinessZip, setNewBusinessZip] = useState('');
  const [newBusinessCountry, setNewBusinessCountry] = useState('United States');
  const [newBusinessIndustry, setNewBusinessIndustry] = useState('');
  const [newBusinessStartDate, setNewBusinessStartDate] = useState('');
  const [newBusinessAskingPrice, setNewBusinessAskingPrice] = useState('');
  const [focusBusinessId, setFocusBusinessId] = useState('');
  const [savedBusinessId, setSavedBusinessId] = useState('');
  const [editingByBusiness, setEditingByBusiness] = useState({});
  const [msg, setMsg] = useState('');

  async function loadAll() {
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return setMsg('Please sign in to manage businesses.');
    setUserId(uid);

    const { data: memberships, error: membershipsErr } = await supabase
      .from('business_memberships')
      .select('id,business_id,user_id,role,is_admin,status,businesses(id,name,status,created_by,description,category,industry,start_date,annual_revenue,annual_profit,default_asking_price,city,state,zip,country,county,keywords)')
      .eq('user_id', uid)
      .eq('status', 'approved');

    if (membershipsErr) {
      if (membershipsErr.message?.includes("businesses_1.zip") || membershipsErr.message?.includes('zip does not exist')) {
        setMsg('Your Supabase database is missing the businesses.zip column. Apply the latest Supabase migration, then refresh.');
      } else if (membershipsErr.message?.includes("public.business_memberships")) {
        setMsg('Business tables are not created yet in Supabase. Apply the latest Supabase migration, then refresh.');
      } else {
        setMsg(membershipsErr.message);
      }
      return;
    }

    const businessRows = (memberships || []).map((m) => ({
      membershipId: m.id,
      business_id: m.business_id,
      role: m.role,
      is_admin: m.is_admin,
      business: m.businesses,
    }));

    setRows(businessRows);
    const details = {};
    businessRows.forEach((row) => {
      const b = row.business || {};
      details[row.business_id] = {
        description: b.description || '',
        category: b.category || 'established',
        start_date: b.start_date || '',
        annual_revenue: b.annual_revenue != null ? formatCurrency(b.annual_revenue) : '',
        annual_profit: b.annual_profit != null ? formatCurrency(b.annual_profit) : '',
        default_asking_price: b.default_asking_price != null ? formatCurrency(b.default_asking_price) : '',
        city: b.city || '',
        state: b.state || '',
        zip: b.zip || '',
        country: b.country || 'United States',
        county: b.county || '',
        keywords: Array.isArray(b.keywords) ? b.keywords.join(', ') : '',
        industry: b.industry || '',
      };
    });
    setDetailsByBusiness(details);

    const ids = businessRows.map((r) => r.business_id);
    if (ids.length) {
      const { data: memberRows } = await supabase
        .from('business_memberships')
        .select('id,business_id,user_id,role,is_admin,status,profiles(id,full_name,handle)')
        .in('business_id', ids)
        .order('created_at', { ascending: true });

      const grouped = {};
      (memberRows || []).forEach((m) => {
        if (!grouped[m.business_id]) grouped[m.business_id] = [];
        grouped[m.business_id].push(m);
      });
      setMembersByBusiness(grouped);
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const target = new URLSearchParams(window.location.search).get('business') || '';
      setFocusBusinessId(target);
    }
    loadAll();
  }, []);

  useEffect(() => {
    if (!focusBusinessId) return;
    const el = document.getElementById(`business-card-${focusBusinessId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusBusinessId, rows.length]);

  async function createBusiness(e) {
    e.preventDefault();
    setMsg('');
    if (!supabase || !userId || !newBusinessName.trim()) return;
    const price = parseCurrencyInput(newBusinessAskingPrice);
    if (!newBusinessStartDate) return setMsg('Add the date the business started.');
    if (!price || Number(price) <= 0) return setMsg('Add a valid asking price.');

    const { data: created, error: createErr } = await supabase
      .from('businesses')
      .insert({
        name: newBusinessName.trim(),
        city: newBusinessCity || null,
        state: newBusinessState || null,
        zip: newBusinessZip || null,
        country: newBusinessCountry || null,
        industry: newBusinessIndustry.trim() || null,
        category: 'established',
        start_date: newBusinessStartDate,
        default_asking_price: Number(price),
        created_by: userId,
        status: 'approved',
      })
      .select('id')
      .single();

    if (createErr) return setMsg(createErr.message);

    const { error: membershipErr } = await supabase.from('business_memberships').upsert({
      business_id: created.id,
      user_id: userId,
      role: newBusinessRole || 'Owner',
      is_admin: true,
      status: 'approved',
    }, { onConflict: 'business_id,user_id' });

    if (membershipErr) return setMsg(membershipErr.message);

    setNewBusinessName('');
    setNewBusinessCity('');
    setNewBusinessZip('');
    setNewBusinessIndustry('');
    setNewBusinessStartDate('');
    setNewBusinessAskingPrice('');
    setMsg('Business created. Fill out details below once, then post without retyping.');
    loadAll();
  }

  async function saveDetails(businessId) {
    const details = detailsByBusiness[businessId] || emptyDetails;
    const payload = {
      description: details.description || null,
      category: details.category || null,
      start_date: details.start_date || null,
      annual_revenue: parseCurrencyInput(details.annual_revenue) ? Number(parseCurrencyInput(details.annual_revenue)) : null,
      annual_profit: parseCurrencyInput(details.annual_profit) ? Number(parseCurrencyInput(details.annual_profit)) : null,
      default_asking_price: parseCurrencyInput(details.default_asking_price) ? Number(parseCurrencyInput(details.default_asking_price)) : null,
      city: details.city || null,
      state: details.state || null,
      zip: details.zip || null,
      country: details.country || null,
      county: details.county || null,
      keywords: (details.keywords || '').split(',').map((k) => k.trim()).filter(Boolean),
      industry: details.industry || null,
    };

    const { error } = await supabase.from('businesses').update(payload).eq('id', businessId);
    if (error) {
      setMsg(error.message);
      setSavedBusinessId('');
      return;
    }

    setSavedBusinessId(businessId);
    setMsg('Business saved.');
    setBusinessEditing(businessId, false);
    setTimeout(() => {
      const el = document.getElementById(`members-${businessId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function setBusinessEditing(businessId, editing) {
    setEditingByBusiness((prev) => ({ ...prev, [businessId]: editing }));
  }

  async function setAdmin(memberId, makeAdmin) {
    const { error } = await supabase.from('business_memberships').update({ is_admin: makeAdmin }).eq('id', memberId);
    if (error) return setMsg(error.message);
    loadAll();
  }

  const businessCount = useMemo(() => rows.length, [rows]);

  return (
    <main style={wrap}>
      <div style={card}>
        <p style={eyebrow}>Business studio</p><h1 style={{ marginTop: 0 }}>Your businesses</h1>
        <p style={{ opacity: 0.8 }}>Keep the profile, team, and every opportunity in one professional workspace ({businessCount}).</p>

        <form onSubmit={createBusiness} style={createWrap}>
          <label style={fieldLabel}>Business name<input style={input} placeholder='e.g. Sunrise Auto Sales' value={newBusinessName} onChange={(e) => setNewBusinessName(e.target.value)} required /></label>
          <label style={fieldLabel}>Industry<IndustryPicker id='new-business-industry' value={newBusinessIndustry} onChange={setNewBusinessIndustry} /></label>
          <label style={fieldLabel}>Business started<input style={input} type='date' value={newBusinessStartDate} onChange={(e) => setNewBusinessStartDate(e.target.value)} required /></label>
          <label style={fieldLabel}>Asking price<input style={input} inputMode='decimal' placeholder='e.g. $450,000' value={newBusinessAskingPrice} onChange={(e) => setNewBusinessAskingPrice(e.target.value)} onBlur={() => { const raw = parseCurrencyInput(newBusinessAskingPrice); setNewBusinessAskingPrice(raw ? formatCurrency(raw) : ''); }} required /></label>
          <label style={fieldLabel}>Your role<select style={input} value={newBusinessRole} onChange={(e) => setNewBusinessRole(e.target.value)}>
            <option>Owner</option><option>CEO</option><option>Founder</option><option>Broker</option><option>Managing Partner</option><option>Authorized Representative</option>
          </select></label>
          <label style={fieldLabel}>City<input style={input} placeholder='e.g. Miami' value={newBusinessCity} onChange={(e) => setNewBusinessCity(e.target.value)} /></label>
          <label style={fieldLabel}>State<select style={input} value={newBusinessState} onChange={(e) => setNewBusinessState(e.target.value)}>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select></label>
          <label style={fieldLabel}>ZIP code<input style={input} placeholder='e.g. 33101' value={newBusinessZip} onChange={(e) => setNewBusinessZip(e.target.value)} /></label>
          <label style={fieldLabel}>Country<select style={input} value={newBusinessCountry} onChange={(e) => setNewBusinessCountry(e.target.value)}>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></label>
          <button style={{ ...btnPrimary, alignSelf: 'end', minHeight: 44 }} type='submit'>Create Business</button>
        </form>

        {msg ? <p>{msg}</p> : null}

        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map((row) => {
            const members = membersByBusiness[row.business_id] || [];
            const canManage = row.is_admin;
            const details = detailsByBusiness[row.business_id] || emptyDetails;
            const age = yearsSince(details.start_date);
            const completePct = completeness(details);
            const roleTone = row.is_admin ? 'Owned / controlled by you' : 'You are a member';
            const isEditing = !!editingByBusiness[row.business_id];
            const summaryRows = [
              ['Description', details.description || 'Not set'],
              ['Industry', details.industry || 'Not set'],
              ['Start date', details.start_date || 'Not set'],
              ['Annual revenue', details.annual_revenue || 'Not set'],
              ['Annual profit', details.annual_profit || 'Not set'],
              ['Asking price', details.default_asking_price || 'Not set'],
              ['City', details.city || 'Not set'],
              ['State', details.state || 'Not set'],
              ['ZIP', details.zip || 'Not set'],
              ['Country', details.country || 'Not set'],
              ['County', details.county || 'Not set'],
              ['Keywords', details.keywords || 'Not set'],
            ];

            return (
              <section id={`business-card-${row.business_id}`} key={row.business_id} style={row.business_id === focusBusinessId ? { ...bizCard, ...bizCardFocused } : bizCard}>
                <div style={bizHead}>
                  <div style={{ minWidth: 0 }}>
                    <div style={bizTopLine}>
                      <strong style={bizName}>{row.business?.name || 'Business'}</strong>
                      <span style={bizPill(row.is_admin)}>{row.is_admin ? 'Owner' : 'Member'}</span>
                    </div>
                    <div style={bizSubline}>{roleTone} · Your role: {row.role}{row.is_admin ? ' · Admin' : ''}</div>
                    <div style={bizStats}>
                      <span>{age !== null ? `Age: ${age} year${age === 1 ? '' : 's'}` : 'Set start date to auto-calculate age'}</span>
                      <span>Completeness: {completePct}%</span>
                    </div>
                  </div>
                  <a href={`/listings/new?business=${row.business_id}`} style={postAsBtn}>
                    Post as this business
                  </a>
                </div>

                <div style={bizDivider} />

                {!isEditing ? (
                  <div style={summaryWrap}>
                    <div style={summaryGrid}>
                      {summaryRows.map(([labelText, value]) => (
                        <div key={`${row.business_id}-${labelText}`} style={summaryItem}>
                          <div style={summaryLabel}>{labelText}</div>
                          <div style={summaryValue}>{value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={summaryActions}>
                      <button type='button' style={btn} onClick={() => setBusinessEditing(row.business_id, true)}>
                        Edit details
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={detailsGrid}>
                    <textarea style={{ ...input, gridColumn: '1 / -1' }} rows={3} placeholder='e.g. Family-run car dealership serving Miami for 12 years, or a neighborhood laundromat with 25 machines and steady repeat customers.' value={details.description} onChange={(e) => setDetailsByBusiness((prev) => ({ ...prev, [row.business_id]: { ...details, description: e.target.value } }))} />
                    <IndustryPicker id={`industry-${row.business_id}`} value={details.industry} onChange={(industry) => setDetailsByBusiness((prev) => ({ ...prev, [row.business_id]: { ...details, industry } }))} />
                    <input style={input} type='date' value={details.start_date} onChange={(e) => setDetailsByBusiness((prev) => ({ ...prev, [row.business_id]: { ...details, start_date: e.target.value } }))} />
                    <input
                      style={input}
                      placeholder='e.g. $1,000,000 annual revenue'
                      value={details.annual_revenue}
                      onChange={(e) => setDetailsByBusiness((prev) => ({ ...prev, [row.business_id]: { ...details, annual_revenue: e.target.value } }))}
                      onBlur={() => setDetailsByBusiness((prev) => {
                        const raw = parseCurrencyInput(details.annual_revenue);
                        return { ...prev, [row.business_id]: { ...details, annual_revenue: raw ? formatCurrency(raw) : '' } };
                      })}
                    />
                    <input
                      style={input}
                      placeholder='e.g. $180,000 annual profit'
                      value={details.annual_profit}
                      onChange={(e) => setDetailsByBusiness((prev) => ({ ...prev, [row.business_id]: { ...details, annual_profit: e.target.value } }))}
                      onBlur={() => setDetailsByBusiness((prev) => {
                        const raw = parseCurrencyInput(details.annual_profit);
                        return { ...prev, [row.business_id]: { ...details, annual_profit: raw ? formatCurrency(raw) : '' } };
                      })}
                    />
                    <input
                      style={input}
                      placeholder='e.g. $450,000 asking price'
                      value={details.default_asking_price}
                      onChange={(e) => setDetailsByBusiness((prev) => ({ ...prev, [row.business_id]: { ...details, default_asking_price: e.target.value } }))}
                      onBlur={() => setDetailsByBusiness((prev) => {
                        const raw = parseCurrencyInput(details.default_asking_price);
                        return { ...prev, [row.business_id]: { ...details, default_asking_price: raw ? formatCurrency(raw) : '' } };
                      })}
                    />
                    <input style={input} placeholder='e.g. Miami' value={details.city} onChange={(e) => setDetailsByBusiness((prev) => ({ ...prev, [row.business_id]: { ...details, city: e.target.value } }))} />
                    <select style={input} value={details.state} onChange={(e) => setDetailsByBusiness((prev) => ({ ...prev, [row.business_id]: { ...details, state: e.target.value } }))}>
                      <option value=''>State</option>
                      {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input style={input} placeholder='e.g. 33101' value={details.zip} onChange={(e) => setDetailsByBusiness((prev) => ({ ...prev, [row.business_id]: { ...details, zip: e.target.value } }))} />
                    <select style={input} value={details.country} onChange={(e) => setDetailsByBusiness((prev) => ({ ...prev, [row.business_id]: { ...details, country: e.target.value } }))}>
                      <option value=''>Country</option>
                      {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input style={input} placeholder='e.g. Miami-Dade' value={details.county} onChange={(e) => setDetailsByBusiness((prev) => ({ ...prev, [row.business_id]: { ...details, county: e.target.value } }))} />
                    <input style={{ ...input, gridColumn: '1 / -1' }} placeholder='e.g. car dealership, used cars, service center' value={details.keywords} onChange={(e) => setDetailsByBusiness((prev) => ({ ...prev, [row.business_id]: { ...details, keywords: e.target.value } }))} />
                    <div style={editActions}>
                      <button style={{ ...btnPrimary, flex: 1 }} type='button' onClick={() => saveDetails(row.business_id)}>Save details</button>
                      <button type='button' style={btn} onClick={() => setBusinessEditing(row.business_id, false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {savedBusinessId === row.business_id ? (
                  <div style={savedBanner}>
                    <strong>✅ Business saved</strong>
                    <span style={{ opacity: 0.9 }}>Now manage people/members below.</span>
                    <button type='button' style={savedManageBtn} onClick={() => document.getElementById(`members-${row.business_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Manage Members</button>
                  </div>
                ) : null}

                <div id={`members-${row.business_id}`} style={{ marginTop: 8 }}>
                  <strong style={{ fontSize: 13 }}>People</strong>
                  <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    {members.map((m) => (
                      <div key={m.id} style={memberRow}>
                        <div>
                          <div>{m.profiles?.full_name || m.profiles?.handle || m.user_id}</div>
                          <small style={{ opacity: 0.75 }}>{m.role} {m.is_admin ? '· Admin' : ''}</small>
                        </div>
                        {canManage ? (
                          <button style={btn} onClick={() => setAdmin(m.id, !m.is_admin)} type='button'>
                            {m.is_admin ? 'Remove admin' : 'Make admin'}
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {canManage ? (
                  <div style={inviteBanner}>
                    <strong>Invite members later</strong>
                    <span style={{ opacity: 0.85 }}>Email invites will replace this user picker in v2 so people can accept access by email.</span>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

const wrap = { minHeight: '100vh', padding: '16px 12px 96px', background: '#070909', color: '#fff', overflowX: 'hidden' };
const card = { maxWidth: 980, margin: '0 auto', width: '100%', background: '#0d1010', border: '1px solid rgba(229,255,242,0.11)', borderRadius: 12, padding: 16, display: 'grid', gap: 12, boxSizing: 'border-box' };
const createWrap = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 };
const fieldLabel = { display: 'grid', gap: 6, color: '#bdc7c1', fontSize: 12, fontWeight: 700 };
const bizCard = {
  border: '1px solid rgba(229,255,242,0.14)',
  borderRadius: 18,
  background: 'linear-gradient(180deg, rgba(20,24,23,.98) 0%, rgba(10,12,12,.98) 100%)',
  padding: 16,
  display: 'grid',
  gap: 12,
  boxShadow: '0 14px 34px rgba(0,0,0,0.24)',
  position: 'relative',
  overflow: 'hidden',
};
const bizCardFocused = { border: '1px solid #b9ff5a', boxShadow: '0 0 0 2px rgba(185,255,90,0.18), 0 14px 34px rgba(0,0,0,0.24)' };
const bizHead = { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' };
const bizTopLine = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 };
const bizName = { fontSize: 20, lineHeight: 1.15 };
const bizSubline = { marginTop: 6, opacity: 0.82, fontSize: 13 };
const bizStats = { marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: '#a9b4ae' };
const bizDivider = { height: 1, background: 'linear-gradient(90deg, rgba(185,255,90,.25), rgba(185,255,90,.02))' };
const memberRow = { border: '1px solid rgba(229,255,242,0.14)', borderRadius: 8, padding: 8, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' };
const input = { borderRadius: 8, border: '1px solid rgba(229,255,242,0.14)', background: '#090b0b', color: '#fff', padding: '10px 12px' };
const btn = { border: '1px solid rgba(229,255,242,0.14)', borderRadius: 8, background: '#141817', color: '#fff', padding: '8px 10px', textDecoration: 'none', cursor: 'pointer' };
const btnPrimary = { border: 0, borderRadius: 8, background: '#b9ff5a', color: '#0a1205', padding: '10px 12px', cursor: 'pointer', fontWeight: 800 };
const postAsBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 220,
  padding: '14px 18px',
  borderRadius: 14,
  border: '1px solid #b9ff5a',
  background: '#b9ff5a',
  color: '#0a1205',
  textDecoration: 'none',
  fontWeight: 800,
  boxShadow: '0 12px 24px rgba(185,255,90,0.15)',
};
const label = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 };
const savedBanner = { marginTop: 10, border: '1px solid #2f8f5b', borderRadius: 10, background: '#123825', color: '#d8ffe9', padding: '10px 12px', display: 'grid', gap: 6 };
const savedManageBtn = { width: 'fit-content', border: '1px solid #57b987', borderRadius: 999, background: '#16472f', color: '#e9fff3', padding: '6px 10px', cursor: 'pointer', fontWeight: 600 };
const detailsGrid = { marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 };
const summaryWrap = { marginTop: 10, display: 'grid', gap: 12 };
const summaryGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 };
const summaryItem = {
  border: '1px solid rgba(143,183,255,0.14)',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.03)',
  padding: '10px 12px',
  display: 'grid',
  gap: 6,
};
const summaryLabel = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b9ff5a', opacity: 0.9 };
const summaryValue = { fontSize: 14, lineHeight: 1.45, color: '#fff', whiteSpace: 'pre-wrap', wordBreak: 'break-word' };
const summaryActions = { display: 'flex', justifyContent: 'flex-end' };
const editActions = { gridColumn: '1 / -1', display: 'flex', gap: 8, flexWrap: 'wrap' };
const inviteBanner = { marginTop: 10, border: '1px dashed rgba(229,255,242,0.14)', borderRadius: 10, background: 'rgba(255,255,255,0.03)', padding: '10px 12px', display: 'grid', gap: 4 };
const bizPill = (active) => ({
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  padding: '5px 10px',
  fontSize: 12,
  fontWeight: 700,
  background: active ? 'rgba(185,255,90,.12)' : 'rgba(255,255,255,0.06)',
  color: active ? '#dfffc0' : '#d7e1d9',
  border: active ? '1px solid rgba(185,255,90,.42)' : '1px solid rgba(255,255,255,0.08)',
});
const eyebrow = { margin: '0 0 10px', color: '#b9ff5a', letterSpacing: '.16em', textTransform: 'uppercase', fontSize: 11, fontWeight: 800 };
