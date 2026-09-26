'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
const VideoEditor = dynamic(() => import('../../../components/VideoEditor'), { ssr: false });
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { composeVideo } from '../../../lib/compose-video';
import { uploadVideo } from '../../../lib/upload-video';

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

function completeness(business) {
  const fields = [
    !!business?.description,
    !!business?.category,
    !!business?.start_date,
    business?.annual_revenue != null,
    business?.annual_profit != null,
    business?.default_asking_price != null,
    !!business?.city,
    !!business?.state,
    !!business?.country,
    !!business?.county,
    Array.isArray(business?.keywords) && business.keywords.length > 0,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

function requiredProfileFields(business) {
  if (!business) return [];
  const missing = [];
  if (!business.description?.trim()) missing.push('business description');
  if (!business.category) missing.push('business type');
  if (!business.start_date) missing.push('start date');
  if (business.annual_revenue == null) missing.push('annual revenue');
  if (business.annual_profit == null) missing.push('annual profit');
  if (!business.city || !business.state || !business.country) missing.push('city, state, and country');
  if (!Array.isArray(business.keywords) || business.keywords.length === 0) missing.push('search keywords');
  return missing;
}

export default function NewListingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ business_id: '', title: '', description: '', lister_role: 'Owner', asking_price: '' });
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [approvedBusinesses, setApprovedBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [useDefaultAskingPrice, setUseDefaultAskingPrice] = useState(true);
  const [missingFields, setMissingFields] = useState([]);
  const [businessesWithPosts, setBusinessesWithPosts] = useState([]);
  const [profileCheckReady, setProfileCheckReady] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errors, setErrors] = useState({});
  const [editorState, setEditorState] = useState({ clips: [], manifest: null, thumbnailDataUrl: '', overlayText: '', textPosition: { x: 50, y: 50 }, textSize: 23 });
  const [loadingAccess, setLoadingAccess] = useState(true);
  const titleRef = useRef(null);

  useEffect(() => {
    async function checkAuth() {
      setLoadingAccess(true);
      if (!supabase) return;
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        setIsAuthed(!!user);
        if (!user) return;

        const requestedBusiness = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('business') : '';

        const { data: memberships, error } = await supabase
          .from('business_memberships')
          .select('business_id,role,businesses(id,name,status,description,industry,category,start_date,annual_revenue,annual_profit,default_asking_price,city,state,country,county,keywords)')
          .eq('user_id', user.id)
          .eq('status', 'approved');

        if (error) {
          if (error.message?.includes("public.business_memberships")) {
            setMsg('Business tables are not created yet in Supabase. Apply the latest Supabase migration, then refresh.');
          } else {
            setMsg(error.message);
          }
          return;
        }

        const options = (memberships || [])
          .filter((m) => m.businesses?.status === 'approved')
          .map((m) => ({
            id: m.business_id,
            name: m.businesses?.name || 'Business',
            role: m.role || 'Authorized Representative',
            business: m.businesses,
          }));

        setApprovedBusinesses(options);
        if (options.length) {
          const { data: existingPosts, error: postsError } = await supabase.from('listings').select('business_id').in('business_id', options.map((option) => option.id));
          if (postsError) setMsg(postsError.message);
          setBusinessesWithPosts((existingPosts || []).map((post) => post.business_id));
        }
        setProfileCheckReady(true);

        if (options.length) {
          const picked = options.find((o) => o.id === requestedBusiness) || options[0];
          setForm((prev) => ({
            ...prev,
            business_id: picked.id,
            lister_role: picked.role,
            asking_price: picked.business?.default_asking_price ? formatCurrency(picked.business.default_asking_price) : prev.asking_price,
          }));
          setSelectedBusiness(picked.business || null);
        }
      } finally {
        setLoadingAccess(false);
      }
    }
    checkAuth();
  }, []);

  function update(key, value) {
    setForm((s) => {
      if (key === 'business_id') {
        const selected = approvedBusinesses.find((b) => b.id === value);
        setSelectedBusiness(selected?.business || null);
        return {
          ...s,
          business_id: value,
          lister_role: selected?.role || s.lister_role,
          asking_price: useDefaultAskingPrice && selected?.business?.default_asking_price
            ? formatCurrency(selected.business.default_asking_price)
            : s.asking_price,
        };
      }
      return { ...s, [key]: value };
    });
  }

  const computedAge = useMemo(() => yearsSince(selectedBusiness?.start_date), [selectedBusiness]);
  const completenessPct = useMemo(() => completeness(selectedBusiness || {}), [selectedBusiness]);
  const profileMissingFields = useMemo(() => selectedBusiness && !businessesWithPosts.includes(selectedBusiness.id) ? requiredProfileFields(selectedBusiness) : [], [selectedBusiness, businessesWithPosts]);

  useEffect(() => {
    if (useDefaultAskingPrice && selectedBusiness?.default_asking_price) {
      setForm((prev) => ({ ...prev, asking_price: formatCurrency(selectedBusiness.default_asking_price) }));
    }
  }, [useDefaultAskingPrice, selectedBusiness]);

  async function submit(e) {
    e.preventDefault();
    setErrors({});
    setMissingFields([]);
    const showTitleError = () => {
      setErrors((p) => ({ ...p, title: 'Title is required.' }));
      requestAnimationFrame(() => {
        titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        titleRef.current?.focus?.();
      });
    };
    if (!form.business_id) return setErrors((p) => ({ ...p, business_id: 'Choose an approved business first.' }));
    if (profileMissingFields.length) return setMissingFields(profileMissingFields);
    if (!form.title.trim()) return showTitleError();
    const parsedAskingPrice = Number(parseCurrencyInput(form.asking_price));
    if (!form.asking_price || !Number.isFinite(parsedAskingPrice) || parsedAskingPrice <= 0) return setErrors((p) => ({ ...p, asking_price: 'Enter a valid asking price.' }));
    if (!supabase) return setMsg('Supabase env vars missing.');

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return setMsg('Please log in first.');

    const { data: membership, error: membershipErr } = await supabase
      .from('business_memberships')
      .select('role,status,businesses(id,name,description,industry,category,start_date,annual_revenue,annual_profit,city,state,country,county,keywords)')
      .eq('user_id', user.id)
      .eq('business_id', form.business_id)
      .eq('status', 'approved')
      .maybeSingle();

    if (membershipErr) return setMsg(membershipErr.message);
    if (!membership) return setMsg('You are not approved to post for this business.');

    const business = membership.businesses || {};

    const { count: existingListingsCount } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', form.business_id);

    const isFirstPostForBusiness = !existingListingsCount;
    if (isFirstPostForBusiness) {
      const missing = requiredProfileFields(business);

      if (missing.length) {
        setMissingFields(missing);
        return setMsg(`Before first post, complete business profile fields in My Businesses.`);
      }
    }

    setPublishing(true);
    let finishedVideo = null;
    try {
      if (editorState.clips.length) finishedVideo = await composeVideo(editorState.clips, setMsg);
    } catch (error) {
      setPublishing(false);
      return setMsg(error?.message || 'Could not prepare this video. Please try again.');
    }
    if (finishedVideo?.video.size > 48 * 1024 * 1024) {
      setPublishing(false);
      return setMsg('The finished video is over this account’s 50 MB upload limit. Please shorten the clips and try again.');
    }

    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        seller_id: user.id,
        business_id: form.business_id,
        title: form.title,
        description: form.description.trim() || business.description || null,
        category: business.category || 'established',
        industry: business.industry || null,
        lister_role: membership.role || form.lister_role,
        business_age_years: yearsSince(business.start_date),
        asking_price: parsedAskingPrice,
        annual_revenue: business.annual_revenue ?? null,
        annual_profit: business.annual_profit ?? null,
        city: business.city || null,
        state: business.state || null,
        country: business.country || null,
        county: business.county || null,
        keywords: Array.isArray(business.keywords) ? business.keywords : [],
        is_active: !finishedVideo,
      })
      .select('id')
      .single();

    if (error) { setPublishing(false); return setMsg(error.message); }

    if (finishedVideo) {
      setMsg('Uploading your finished video…');
      const basePath = `${user.id}/${listing.id}/${Date.now()}`;
      const videoPath = `${basePath}-post.mp4`;
      const coverPath = `${basePath}-cover.jpg`;
      try {
        const videoUrl = await uploadVideo(videoPath, finishedVideo.video, (percent) => setMsg(`Uploading your video… ${percent}%`));
        const coverUpload = await supabase.storage.from('listing-media').upload(coverPath, finishedVideo.cover, { contentType: 'image/jpeg' });
        if (coverUpload.error) throw coverUpload.error;
        const coverUrl = supabase.storage.from('listing-media').getPublicUrl(coverPath).data.publicUrl;
        const { error: mediaError } = await supabase.from('listing_media').insert({ listing_id: listing.id, media_type: 'video', url: videoUrl, thumbnail_url: coverUrl, overlay_text: editorState.overlayText || null, overlay_x: editorState.textPosition.x, overlay_y: editorState.textPosition.y, overlay_size: editorState.textSize, sort_order: 0 });
        if (mediaError) throw mediaError;
        const { error: publishError } = await supabase.from('listings').update({ is_active: true }).eq('id', listing.id);
        if (publishError) throw publishError;
      } catch (uploadError) {
        await supabase.from('listings').delete().eq('id', listing.id);
        await supabase.storage.from('listing-media').remove([videoPath, coverPath]);
        setPublishing(false);
        return setMsg(uploadError?.message || 'Video upload failed. Your post was not published; please retry.');
      }
    }

    setPublishing(false);
    setMsg('Business post published. Redirecting…');
    setTimeout(() => router.push('/listings'), 450);
  }

  const withError = (key) => ({ ...input, border: errors[key] ? '1px solid #ef5350' : input.border });

  if (loadingAccess) {
    return (
      <main style={wrap}>
        <div style={card}><h1>Create a business post</h1><p>Checking your account and approved businesses…</p></div>
      </main>
    );
  }

  if (!isAuthed) {
    return (
      <main style={wrap}><div style={card}><h1>Create a business post</h1><p>You need an account to post.</p><a href='/signup' style={{ color: '#b9ff5a' }}>Create account</a></div></main>
    );
  }

  if (isAuthed && approvedBusinesses.length === 0) {
    return (
      <main style={wrap}>
        <div style={{ ...card, ...emptyStateCard }}>
          <div style={emptyStateContent}>
            <p style={emptyStateKicker}>Before you publish</p>
            <h1 style={emptyStateTitle}>Set up the business <em style={emptyStateEmphasis}>behind the opportunity.</em></h1>
            <p style={emptyStateCopy}>Add the business once. Its key details will carry into every post you publish.</p>
          </div>
          <div style={emptyStateVisual} aria-hidden='true'>
            <span style={{ ...visualBadge, top: '18%', left: '16%' }}>⌂</span>
            <span style={{ ...visualBadge, top: '36%', right: '14%' }}>▥</span>
            <span style={{ ...visualBadge, right: '17%', bottom: '17%' }}>▤</span>
            <span style={visualLabel}>BUSINESS<br />FOR SALE</span>
          </div>
          <div style={emptyStateActions}>
            <a href='/businesses?create=1' style={emptyStatePrimary}>Create a business</a>
            <a href='/businesses' style={emptyStateSecondary}>My businesses</a>
          </div>
          {msg ? <p>{msg}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main style={wrap}>
      <form onSubmit={submit} style={card}>
        <h1>Create a business post</h1>
        <p style={{ opacity: 0.82, marginTop: -4 }}>Business profile fields are pulled from My Businesses so you only fill them once.</p>

        <label style={label}>Business (approved)</label>
        <select style={withError('business_id')} value={form.business_id} onChange={(e) => update('business_id', e.target.value)} required>
          <option value=''>Select your business</option>
          {approvedBusinesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <a href='/businesses?create=1' style={{ color: '#b9ff5a', fontSize: 13, fontWeight: 800, width: 'fit-content' }}>+ Create a new business</a>

        {!profileCheckReady ? <p style={small}>Checking this business profile…</p> : null}
        {profileCheckReady && profileMissingFields.length ? <div style={readinessCard} role='status'>
          <strong>Finish your business profile before creating a post</strong>
          <p style={{ margin: 0, color: '#b9c4b9' }}>Add {profileMissingFields.join(', ')}. Your post editor will open as soon as those details are complete.</p>
          <a href={`/businesses?business=${form.business_id}`} style={readyLink}>Complete business profile →</a>
        </div> : null}

        {profileCheckReady && !profileMissingFields.length ? <>

        <div style={{ display: 'grid', gap: 6 }}>
          <input
            ref={titleRef}
            style={withError('title')}
            placeholder='e.g. Profitable Miami car dealership for sale'
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            required
          />
          {errors.title ? <div style={{ color: '#ff8b94', fontSize: 13 }}>{errors.title}</div> : null}
        </div>
        <label style={label} htmlFor='listing-description'>Post details</label>
        <textarea
          id='listing-description'
          style={{ ...input, minHeight: 118, resize: 'vertical' }}
          placeholder='e.g. Established laundromat with loyal customers, newer machines, and room to grow. Owner is ready to discuss a smooth handover.'
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
        />
        <label style={label}>Posting as role</label>
        <input style={input} value={form.lister_role} readOnly />

        <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type='checkbox' checked={useDefaultAskingPrice} onChange={(e) => setUseDefaultAskingPrice(e.target.checked)} />
          Use business default asking price
        </label>
        <input
          style={withError('asking_price')}
          placeholder='e.g. $450,000'
          value={form.asking_price}
          onChange={(e) => update('asking_price', e.target.value)}
          onBlur={() => {
            const raw = parseCurrencyInput(form.asking_price);
            if (raw) update('asking_price', formatCurrency(raw));
          }}
          disabled={useDefaultAskingPrice && !!selectedBusiness?.default_asking_price}
          required
        />

        {selectedBusiness ? (
          <div style={infoBox}>
            <strong>Business details used in this post</strong>
            <div style={small}>Industry: {selectedBusiness.industry || '—'}</div>
            <div style={small}>Business age: {computedAge !== null ? `${computedAge} years (from start date)` : '—'}</div>
            <div style={small}>Revenue: {selectedBusiness.annual_revenue != null ? formatCurrency(selectedBusiness.annual_revenue) : '—'} · Profit: {selectedBusiness.annual_profit != null ? formatCurrency(selectedBusiness.annual_profit) : '—'}</div>
            <div style={small}>Location: {[selectedBusiness.city, selectedBusiness.state, selectedBusiness.country].filter(Boolean).join(', ') || '—'}</div>
            <div style={small}>Profile completeness: {completenessPct}%</div>
          </div>
        ) : null}

        {/* Compose one video in the browser before uploading it. */}
        <VideoEditor onChange={({ clips, manifest, thumbnailDataUrl, overlayText, textPosition, textSize }) => {
          setEditorState({ clips: Array.isArray(clips) ? clips : [], manifest: manifest || null, thumbnailDataUrl: thumbnailDataUrl || '', overlayText: overlayText || '', textPosition: textPosition || { x: 50, y: 50 }, textSize: textSize || 23 });
          setFiles(Array.isArray(clips) ? clips : []);
        }} />

        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ color: '#b9ff5a', fontSize: 13 }}>{files.length ? `${files.length} clip${files.length === 1 ? '' : 's'} ready to merge into one video` : 'A video is optional'}</div>
          <button style={btn} type='submit' disabled={publishing}>{publishing ? 'Preparing your post…' : 'Publish business post'}</button>
        </div>
        {msg ? <p>{msg}</p> : null}
        {missingFields.length ? (
          <div style={infoBox}>
            <strong>Missing before first post</strong>
            <div style={small}>{missingFields.join(', ')}</div>
            <a href={`/businesses?business=${form.business_id}`} style={{ color: '#b9ff5a' }}>Open this business and fill missing fields</a>
          </div>
        ) : null}
        </> : null}
      </form>
    </main>
  );
}

const wrap = { minHeight: '100vh', padding: 'clamp(16px, 4vw, 32px)', background: '#070909', color: '#fff' };
const card = { maxWidth: 700, display: 'grid', gap: 10, background: '#0d1010', padding: 20, borderRadius: 12 };
const label = { fontSize: 13, opacity: 0.85 };
const input = { borderRadius: 8, border: '1px solid rgba(229,255,242,0.14)', background: '#090b0b', color: '#fff', padding: '10px 12px' };
const btn = { border: 0, borderRadius: 8, background: '#b9ff5a', color: '#0a1205', padding: '10px 12px', fontWeight: 800 };
const infoBox = { border: '1px solid rgba(229,255,242,0.14)', borderRadius: 10, background: '#141817', padding: 10, display: 'grid', gap: 6 };
const small = { fontSize: 13, opacity: 0.85 };
const readinessCard = { display: 'grid', gap: 12, padding: 18, borderRadius: 16, border: '1px solid rgba(185,255,90,.35)', background: 'rgba(185,255,90,.06)', lineHeight: 1.5 };
const readyLink = { display: 'inline-flex', width: 'fit-content', color: '#0a1205', background: '#b9ff5a', borderRadius: 10, padding: '10px 13px', textDecoration: 'none', fontWeight: 800 };
const emptyStateCard = { maxWidth: 720, minHeight: 560, margin: '7vh auto', border: '1px solid rgba(185,255,90,.38)', borderRadius: 28, padding: 'clamp(27px, 6vw, 40px)', position: 'relative', overflow: 'hidden', background: 'linear-gradient(105deg, #0a1210 0%, #0a1110 53%, #142015 100%)', boxShadow: '0 28px 80px rgba(0,0,0,.42)' };
const emptyStateContent = { position: 'relative', zIndex: 2, display: 'grid', gap: 16, maxWidth: '54%' };
const emptyStateKicker = { margin: 0, color: '#b9ff5a', fontSize: 11, fontWeight: 900, letterSpacing: '.16em', textTransform: 'uppercase' };
const emptyStateTitle = { margin: 0, fontSize: 'clamp(34px, 7vw, 56px)', letterSpacing: '-.05em', lineHeight: .98, maxWidth: 400 };
const emptyStateEmphasis = { display: 'block', color: '#b9ff5a', fontStyle: 'normal' };
const emptyStateCopy = { color: '#c2cac5', lineHeight: 1.54, margin: 0, maxWidth: 305, fontSize: 16 };
const emptyStateVisual = { position: 'absolute', inset: 0, left: '43%', background: "linear-gradient(90deg, rgba(10,18,15,.94) 0%, rgba(10,18,15,.28) 27%, rgba(10,18,15,.04)), url('/business-setup-storefront.jpg') right center/cover", filter: 'saturate(.98) contrast(1.05)' };
const visualBadge = { position: 'absolute', width: 54, height: 54, display: 'grid', placeItems: 'center', borderRadius: 12, color: '#caff86', fontSize: 27, fontWeight: 900, border: '1px solid rgba(202,255,134,.38)', background: 'rgba(8,15,10,.64)', boxShadow: '0 10px 24px rgba(0,0,0,.25)' };
const visualLabel = { position: 'absolute', right: '13%', top: '49%', color: '#e6ffb1', fontWeight: 900, fontSize: 'clamp(18px,3.2vw,31px)', textAlign: 'center', lineHeight: .9, letterSpacing: '.03em', textShadow: '0 3px 18px #000' };
const emptyStateActions = { position: 'absolute', zIndex: 3, left: 'clamp(27px, 6vw, 40px)', bottom: 'clamp(27px, 6vw, 40px)', display: 'flex', gap: 10, flexWrap: 'wrap' };
const emptyStatePrimary = { display: 'inline-flex', padding: '11px 14px', borderRadius: 11, color: '#0a1205', background: '#b9ff5a', textDecoration: 'none', fontWeight: 850 };
const emptyStateSecondary = { display: 'inline-flex', padding: '10px 13px', borderRadius: 11, border: '1px solid rgba(229,255,242,.14)', color: '#f4f7f5', background: '#141817', textDecoration: 'none', fontWeight: 800 };
