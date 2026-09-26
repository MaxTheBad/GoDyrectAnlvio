'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { INDUSTRIES } from '../../lib/industries';

export function FeedPost({
  listing,
  businessName,
  businessLocation,
  businessIndustry,
  sellerName,
  media = [],
  activeIndex = 0,
  onPrev,
  onNext,
  onPick,
  onOpen,
  isFavorite = false,
  onToggleFavorite,
  onToggleSellerFollow,
  onToggleBusinessFollow,
  onEdit,
}) {
  const activeMedia = media[activeIndex] || media[0];
  const mediaCount = media.length;
  const videoRef = useRef(null);
  const [showActions, setShowActions] = useState(false);
  const [mediaProgress, setMediaProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const poster = activeMedia?.thumbnail_url || listing?.thumbnail_url || '';

  useEffect(() => {
    setShowActions(false);
    setMediaProgress(0);
    setIsPlaying(false);
    setIsMuted(false);
  }, [activeMedia?.url]);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  }

  function openFullscreen() {
    const frame = videoRef.current?.parentElement;
    if (frame?.requestFullscreen) void frame.requestFullscreen().catch(() => {});
    else if (videoRef.current?.webkitEnterFullscreen) videoRef.current.webkitEnterFullscreen();
  }

  async function shareListing() {
    const url = `${window.location.origin}${onOpen}`;
    try {
      if (navigator.share) await navigator.share({ title: listing.title, text: listing.description || 'Business opportunity on GoDyrect', url });
      else await navigator.clipboard?.writeText(url);
    } catch { /* A dismissed native share sheet is not an error state. */ }
  }

  return (
    <article className='feed-post' style={postShell}>
      <div style={postTopRow}>
        <a href={`/profile/view?id=${listing.seller_id}`} style={{ ...avatar, textDecoration: 'none', flex: '0 0 auto' }} aria-label={`View ${sellerName || 'seller'} profile`}>{(sellerName || listing.title || 'B').slice(0, 1).toUpperCase()}</a>
        <a href={`/profile/view?id=${listing.seller_id}`} style={{ minWidth: 0, color: 'inherit', textDecoration: 'none' }}>
          <div style={postBusiness}>{sellerName || 'User'}</div>
          <div style={postMeta}><span>Posted by {sellerName || 'User'}</span><span>·</span><span>{listing.lister_role || 'Owner'}</span></div>
          <div style={postLocation}>{[listing.city, listing.state].filter(Boolean).join(', ') || businessLocation || 'Location not set'}</div>
        </a>
        <div style={postActions}>
          <button type='button' aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'} onClick={onToggleFavorite} style={bookmarkBtn(isFavorite)}>
            <span style={bookmarkIcon(isFavorite)}>
              {isFavorite ? (
                <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false' style={{ width: 20, height: 20, display: 'block', fill: 'currentColor' }}>
                  <path d='M6 3.75h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.75a1 1 0 0 1 1-1Z' />
                </svg>
              ) : (
                <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false' style={{ width: 20, height: 20, display: 'block', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d='M6 3.75h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.75a1 1 0 0 1 1-1Z' />
                </svg>
              )}
            </span>
          </button>
          <div style={{ position: 'relative' }}>
            <button type='button' style={menuBtn} aria-label='Open actions' onClick={() => setShowActions((v) => !v)}>⋯</button>
            {showActions ? (
              <div style={menuPanel}>
                <button type='button' onClick={() => { onToggleFavorite?.(); setShowActions(false); }} style={menuItem}>{isFavorite ? '★ Saved' : '☆ Favorite'}</button>
                {onToggleSellerFollow ? <button type='button' onClick={() => { onToggleSellerFollow(); setShowActions(false); }} style={menuItem}>Follow Seller</button> : null}
                {onToggleBusinessFollow ? <button type='button' onClick={() => { onToggleBusinessFollow(); setShowActions(false); }} style={menuItem}>Follow Business</button> : null}
                <a href={onOpen} style={menuLink}>View</a>
                {onEdit ? <button type='button' onClick={() => { onEdit(); setShowActions(false); }} style={menuItem}>Edit</button> : <a href={`/messages?seller=${listing.seller_id}&listing=${listing.id}`} style={menuLink}>Message</a>}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {activeMedia ? (
        <div className='feed-post__media' style={heroMediaFrame}>
          {activeMedia.overlay_text ? <div style={{ ...videoTextOverlay, left: `${activeMedia.overlay_x ?? 50}%`, top: `${activeMedia.overlay_y ?? 50}%`, fontSize: activeMedia.overlay_size ?? 23 }}>{activeMedia.overlay_text}</div> : null}
          {activeMedia.media_type === 'video' ? (
            <>
              <video
                ref={videoRef}
                src={activeMedia.url}
                poster={poster || undefined}
                playsInline
                controls={false}
                preload='metadata'
                muted={isMuted}
                onTimeUpdate={() => {
                  const video = videoRef.current;
                  if (!video?.duration) return;
                  setMediaProgress((video.currentTime / video.duration) * 100);
                }}
                onLoadedMetadata={() => {
                  const video = videoRef.current;
                  if (!video?.duration) return;
                  setMediaProgress((video.currentTime / video.duration) * 100);
                }}
                onPlay={() => {
                  setIsPlaying(true);
                }}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                style={{
                  ...heroMediaAsset,
                  pointerEvents: 'none',
                }}
              />
            </>
          ) : (
            <img src={activeMedia.thumbnail_url || activeMedia.url} alt='listing media' style={heroMediaAsset} />
          )}
          {activeMedia.media_type === 'video' ? (
            <input
              type='range'
              min='0'
              max='100'
              step='0.1'
              value={mediaProgress}
              onChange={(e) => {
                const video = videoRef.current;
                if (!video?.duration) return;
                const next = Number(e.target.value);
                video.currentTime = (next / 100) * video.duration;
                setMediaProgress(next);
              }}
              style={videoProgress}
            />
          ) : null}
          {activeMedia.media_type === 'video' ? <div style={videoControls}>
            <button type='button' aria-label={isPlaying ? 'Pause video' : 'Play video'} onClick={togglePlayback} style={videoControlButton}>
              {isPlaying ? <svg viewBox='0 0 24 24' aria-hidden='true' width='18' height='18' fill='currentColor'><rect x='5' y='4' width='5' height='16' rx='1' /><rect x='14' y='4' width='5' height='16' rx='1' /></svg> : <svg viewBox='0 0 24 24' aria-hidden='true' width='18' height='18' fill='currentColor'><path d='M7 4.5v15l12-7.5L7 4.5Z' /></svg>}
            </button>
            <button type='button' aria-label={isMuted ? 'Unmute video' : 'Mute video'} onClick={() => setIsMuted((value) => !value)} style={videoControlButton}>
              <svg viewBox='0 0 24 24' aria-hidden='true' width='18' height='18' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M4 9v6h4l5 4V5L8 9H4Z' />{isMuted ? <path d='m17 9 5 6m0-6-5 6' /> : <><path d='M17 9a4 4 0 0 1 0 6' /><path d='M20 6a8 8 0 0 1 0 12' /></>}</svg>
            </button>
            <button type='button' aria-label='Full screen' onClick={openFullscreen} style={videoControlButton}><svg viewBox='0 0 24 24' aria-hidden='true' width='18' height='18' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><path d='M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5' /></svg></button>
          </div> : null}
          {mediaCount > 1 ? (
            <>
              <button type='button' aria-label='Previous media' style={carouselArrowLeft} onClick={onPrev}>‹</button>
              <button type='button' aria-label='Next media' style={carouselArrowRight} onClick={onNext}>›</button>
              <div style={carouselDots}>
                {media.map((m, idx) => (
                  <button
                    key={m.url + idx}
                    type='button'
                    aria-label={`Show media ${idx + 1} of ${mediaCount}`}
                    style={idx === activeIndex ? activeDot : dot}
                    onClick={() => onPick(idx)}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      <div style={postDetails}>
        <div style={postDetailsTop}><h3 style={postTitle}>{listing.title}</h3><strong style={postPrice}>${Number(listing.asking_price || 0).toLocaleString()}</strong></div>
        {listing.description ? <p style={postDescription}>{listing.description}</p> : null}
        <div style={postInfoRow}><span style={postLocationChip}><LocationIcon />{[listing.city, listing.state].filter(Boolean).join(', ') || businessLocation || 'Location available'}</span><span style={metaDivider}>|</span><span style={postTypeChip}>{prettyCategory(listing.category)}</span><span style={metaDivider}>|</span><span style={postIndustryChip}><IndustryIcon />{listing.industry || businessIndustry || 'Industry'}</span></div>
        <div style={postFooter}>
          <div style={postSocialActions}>
            <button type='button' onClick={onToggleFavorite} style={socialButton(isFavorite)} aria-label={isFavorite ? 'Remove from favorites' : 'Save opportunity'}><HeartIcon filled={isFavorite} /><span>{isFavorite ? 'Saved' : 'Save'}</span></button>
            <a href={`/messages?seller=${listing.seller_id}&listing=${listing.id}`} style={messageButton}><MessageIcon /><span>Message</span></a>
            <button type='button' onClick={shareListing} style={socialButton(false)} aria-label='Share opportunity'><ShareIcon /><span>Share</span></button>
          </div>
          <span style={postTime}>{relativeTime(listing.created_at)}</span>
        </div>
      </div>
    </article>
  );
}

function MessageIcon() { return <svg viewBox='0 0 24 24' aria-hidden='true' width='17' height='17' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M20 15a4 4 0 0 1-4 4H8l-4 3v-7a4 4 0 0 1-1-2.65V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4v8Z' /></svg>; }
function HeartIcon({ filled }) { return <svg viewBox='0 0 24 24' aria-hidden='true' width='19' height='19' fill={filled ? 'currentColor' : 'none'} stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z' /></svg>; }
function ShareIcon() { return <svg viewBox='0 0 24 24' aria-hidden='true' width='18' height='18' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M12 16V3m0 0-4 4m4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6' /></svg>; }
function LocationIcon() { return <svg viewBox='0 0 24 24' aria-hidden='true' width='17' height='17' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z' /><circle cx='12' cy='10' r='2.5' /></svg>; }
function IndustryIcon() { return <svg viewBox='0 0 24 24' aria-hidden='true' width='16' height='16' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M4 20V7l8-4 8 4v13' /><path d='M9 20v-5h6v5M8 10h.01M16 10h.01' /></svg>; }
function prettyCategory(value) { if (value === 'asset_sale') return 'Asset sale'; if (value === 'real_estate') return 'Real estate'; if (value === 'startup') return 'Start-up'; return 'Established business'; }
function relativeTime(value) { const seconds = Math.max(0, (Date.now() - new Date(value || Date.now()).getTime()) / 1000); if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m ago`; if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`; return `${Math.floor(seconds / 86400)}d ago`; }

export function FeedEmptyState({ loading, msg, hasFollows, hasSearch = false, exploreHref = '/explore' }) {
  if (loading || msg) return null;

  if (!hasFollows) {
    return (
      <div style={emptyState}>
        <div>
          <h3 style={emptyTitle}>Your feed is empty</h3>
          <p style={emptyCopy}>Follow people or businesses to start seeing posts here, or jump into Explore to browse the marketplace.</p>
        </div>
        <div style={emptyActions}>
          <a href={exploreHref} style={primaryAction}>Explore listings</a>
          <a href='/businesses' style={secondaryAction}>Create business</a>
        </div>
      </div>
    );
  }

  return (
    <div style={emptyState}>
      <div>
        <h3 style={emptyTitle}>{hasSearch ? 'No posts match your search' : 'No posts to show yet'}</h3>
        <p style={emptyCopy}>
          {hasSearch
            ? 'Try a different search term or open Explore for more listings and businesses.'
            : 'Your businesses and the people you follow have not posted anything yet. Check Explore for more opportunities.'}
        </p>
      </div>
      <div style={emptyActions}>
        <a href={exploreHref} style={primaryAction}>Explore more</a>
      </div>
    </div>
  );
}

export function FeedHero({
  searchDraft,
  setSearchDraft,
  industry,
  setIndustry,
  onSearch,
  rowsCount,
  businessCount,
  peopleCount,
  compact = false,
}) {
  return (
    <section className={`market-hero${compact ? ' market-hero--compact' : ''}`}>
      <div className='market-hero__glow' />
      <div className='market-hero__inner'>
        <div className='market-hero__eyebrow'><span /> Private-market discovery, made direct</div>
        <h1>Find the deal.<br /><em>Skip the runaround.</em></h1>
        <p className='market-hero__copy'>Search businesses, assets, and opportunities from owners and representatives ready to talk.</p>
        <div className='market-search'>
          <label className='market-search__field' htmlFor='feed-search'>
            <span>What are you looking for?</span>
            <input id='feed-search' value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSearch()} placeholder='Coffee shop, Miami, 33101…' />
          </label>
          <button type='button' onClick={onSearch}>Explore deals <span>↗</span></button>
        </div>
        <p className='market-hero__filter-note'>Choose one or more industries in the filters below.</p>
      </div>
    </section>
  );
}

export const heroShell = {
  position: 'relative',
  minHeight: '100vh',
  backgroundImage: "url('/bg.jpg')",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  overflow: 'hidden',
};
export const compactHeroShell = {
  ...heroShell,
  minHeight: 'auto',
  paddingBottom: 12,
};
export const heroOverlay = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(180deg, rgba(6,10,24,0.35) 0%, rgba(11,16,32,0.8) 52%, rgba(11,16,32,0.98) 100%)',
};
export const heroContent = { position: 'relative', zIndex: 1, minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '32px 16px 24px' };
export const compactHeroContent = { ...heroContent, minHeight: 'auto', padding: '14px 12px 8px' };
export const heroPanel = { width: 'min(1080px, 100%)', display: 'grid', gap: 16, justifyItems: 'center', textAlign: 'center', padding: '20px 0 8px', border: 0, background: 'transparent', boxShadow: 'none' };
export const heroTopline = { fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: '#9fc0ff' };
export const heroToplineMobile = { ...heroTopline, fontSize: 11 };
export const heroTitle = { margin: 0, fontSize: 'clamp(40px, 7vw, 78px)', lineHeight: 0.95, fontWeight: 800, color: '#fff', textShadow: '0 8px 24px rgba(0,0,0,0.35)' };
export const heroTitleMobile = { ...heroTitle, fontSize: 'clamp(28px, 8vw, 42px)', lineHeight: 1.02 };
export const heroSubtitle = { margin: 0, maxWidth: 760, fontSize: 18, lineHeight: 1.5, color: 'rgba(235,241,255,0.88)' };
export const heroSubtitleMobile = { ...heroSubtitle, fontSize: 14, maxWidth: 560, lineHeight: 1.45 };
export const heroSearchWrap = { width: 'min(100%, 980px)', display: 'grid', gap: 14, justifyItems: 'center' };
export const heroTabs = { display: 'inline-flex', gap: 8, padding: 6, borderRadius: 999, background: 'rgba(12,18,39,0.72)', border: '1px solid rgba(94,128,202,0.34)' };
export const tabButton = { border: 0, borderRadius: 999, background: 'transparent', color: 'rgba(255,255,255,0.85)', padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
export const activeTab = { ...tabButton, background: '#ffffff', color: '#1457d6', boxShadow: '0 6px 16px rgba(0,0,0,0.18)' };
export const searchBar = { width: 'min(100%, 980px)', display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) 1px minmax(220px, 0.95fr) auto', alignItems: 'stretch', borderRadius: 18, overflow: 'hidden', background: '#fff', boxShadow: '0 18px 40px rgba(4, 10, 28, 0.24)' };
export const searchBarMobile = { width: 'min(100%, 980px)', display: 'grid', gridTemplateColumns: '1fr', alignItems: 'stretch', borderRadius: 18, overflow: 'hidden', background: '#fff', boxShadow: '0 18px 40px rgba(4, 10, 28, 0.24)' };
export const searchFieldWrap = { display: 'grid' };
export const divider = { width: 1, background: '#e1e7f2' };
export const searchInput = { width: '100%', border: 0, padding: '22px 20px', fontSize: 18, outline: 'none', color: '#0f172a' };
export const searchInputMobile = { ...searchInput, minHeight: 56, padding: '18px 18px', fontSize: 16 };
export const searchSelect = { width: '100%', border: 0, padding: '22px 18px', fontSize: 18, outline: 'none', color: '#334155', background: 'transparent' };
export const searchSelectMobile = { ...searchSelect, minHeight: 52, padding: '16px 18px', fontSize: 16, borderTop: '1px solid #e1e7f2' };
export const searchBtn = { border: '1px solid rgba(229,255,242,0.11)', background: '#2e7dff', color: '#fff', padding: '0 34px', fontSize: 18, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 20px rgba(46,125,255,0.28)' };
export const searchBtnMobile = { ...searchBtn, minHeight: 54, padding: '0 18px', fontSize: 16, borderRadius: 0 };
export const statsRow = { width: 'min(100%, 980px)', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 14 };
export const statsRowMobile = { width: 'min(100%, 980px)', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 10 };
export const statCard = { borderRadius: 18, padding: '14px 16px', background: 'rgba(12,18,39,0.66)', border: '1px solid rgba(94,128,202,0.28)', textAlign: 'left' };
export const statLabel = { display: 'block', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(159,192,255,0.92)' };
export const statValue = { display: 'block', marginTop: 8, fontSize: 24, color: '#fff' };
export const srOnly = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 };

const postShell = { width: 'min(100%, 640px)', margin: '0 auto', color: '#fff', padding: 0, overflow: 'hidden', background: '#101413', border: '1px solid rgba(229,255,242,.12)', borderRadius: 22, boxShadow: '0 18px 50px rgba(0,0,0,.24)' };
const postTopRow = { display: 'grid', gridTemplateColumns: '40px minmax(0, 1fr) auto', gap: 10, alignItems: 'center', padding: '12px 14px' };
const postActions = { display: 'flex', alignItems: 'center', gap: 6, position: 'relative' };
const avatar = { width: 40, height: 40, borderRadius: 999, display: 'grid', placeItems: 'center', background: '#b9ff5a', color: '#0a1205', fontWeight: 850, fontSize: 17 };
const postMeta = { display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: 12, color: '#98a39e', alignItems: 'center' };
const postBusiness = { fontWeight: 700, color: '#fff' };
const postLocation = { marginTop: 3, fontSize: 12, color: '#98a39e' };
const bookmarkBtn = (active) => ({
  width: 36,
  height: 36,
  borderRadius: 999,
  border: '1px solid rgba(229,255,242,.16)',
  background: active ? 'rgba(185,255,90,.16)' : '#1a1f1d',
  color: active ? '#b9ff5a' : '#f4f7f5',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
});
const bookmarkIcon = (active) => ({ display: 'grid', placeItems: 'center', color: active ? '#b9ff5a' : '#f4f7f5' });
const menuBtn = { border: '1px solid rgba(229,255,242,.16)', borderRadius: 999, background: '#1a1f1d', color: '#f4f7f5', width: 36, height: 36, fontSize: 22, lineHeight: 1, cursor: 'pointer' };
const menuPanel = { position: 'absolute', right: 0, top: 42, background: '#101413', border: '1px solid rgba(229,255,242,.14)', borderRadius: 12, minWidth: 180, display: 'grid', zIndex: 5, boxShadow: '0 10px 24px rgba(0,0,0,0.3)' };
const menuItem = { border: 0, borderBottom: '1px solid rgba(229,255,242,.1)', background: '#101413', textAlign: 'left', padding: '10px 12px', cursor: 'pointer', color: '#fff' };
const menuLink = { padding: '10px 12px', textDecoration: 'none', color: '#fff', borderBottom: '1px solid rgba(229,255,242,.1)' };
const heroMediaFrame = {
  position: 'relative',
  width: '100%',
  height: 'min(72svh, 760px)',
  minHeight: 380,
  margin: '0 auto',
  overflow: 'hidden',
  background: '#070909',
};
const heroMediaAsset = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#070909' };
const videoTextOverlay = { position: 'absolute', maxWidth: '76%', transform: 'translate(-50%,-50%)', zIndex: 3, pointerEvents: 'none', textAlign: 'center', color: '#fff', lineHeight: 1.15, fontWeight: 800, textShadow: '0 2px 12px rgba(0,0,0,.85)', overflowWrap: 'anywhere' };
const carouselArrowBase = { position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: 999, border: 0, background: 'rgba(255,255,255,0.88)', color: '#111827', fontSize: 24, lineHeight: '30px', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' };
const carouselArrowLeft = { ...carouselArrowBase, left: 10 };
const carouselArrowRight = { ...carouselArrowBase, right: 10 };
const carouselDots = { position: 'absolute', left: '50%', bottom: 10, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 999, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)' };
const dot = { width: 7, height: 7, borderRadius: 999, border: 0, background: 'rgba(255,255,255,0.45)', padding: 0, cursor: 'pointer' };
const activeDot = { ...dot, background: '#fff', width: 8, height: 8 };
const videoProgress = { position: 'absolute', left: 14, right: 14, bottom: 8, width: 'calc(100% - 28px)', accentColor: '#b9ff5a', zIndex: 3 };
const videoControls = { position: 'absolute', right: 12, bottom: 34, zIndex: 4, display: 'flex', gap: 6 };
const videoControlButton = { width: 38, height: 38, borderRadius: 999, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(8,12,10,.76)', color: '#fff', display: 'grid', placeItems: 'center', padding: 0, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' };
const postDetails = { display: 'grid', gap: 10, padding: '16px 16px 15px', background: '#101413' };
const postDetailsTop = { display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 14 };
const postType = { color: '#b9ff5a', fontSize: 11, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' };
const postPrice = { fontSize: 19, color: '#b9ff5a', whiteSpace: 'nowrap', paddingTop: 1 };
const postTitle = { margin: 0, color: '#fff', fontSize: 'clamp(19px,4vw,24px)', lineHeight: 1.15 };
const postDescription = { margin: 0, color: '#b9c4be', fontSize: 14, lineHeight: 1.45, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden', whiteSpace: 'pre-wrap' };
const postInfoRow = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, color: '#aeb9b2', fontSize: 13 };
const postLocationChip = { display: 'inline-flex', alignItems: 'center', gap: 5 };
const metaDivider = { color: 'rgba(229,255,242,.25)', fontSize: 16, lineHeight: 1 };
const postTypeChip = { display: 'inline-flex', alignItems: 'center', color: '#b9ff5a', textTransform: 'capitalize' };
const postIndustryChip = { display: 'inline-flex', alignItems: 'center', gap: 5, color: '#b9ff5a', textTransform: 'capitalize' };
const postFooter = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 12, borderTop: '1px solid rgba(229,255,242,.1)' };
const postSocialActions = { display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 };
const socialButton = (active) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, border: 0, padding: 0, background: 'transparent', color: active ? '#ff4d73' : '#e9efeb', fontSize: 13, fontWeight: 700, cursor: 'pointer' });
const messageButton = { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#e9efeb', textDecoration: 'none', fontSize: 13, fontWeight: 700 };
const postTime = { color: '#98a39e', fontSize: 12, whiteSpace: 'nowrap' };
const postViewLink = { display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', color: '#b9ff5a', textDecoration: 'none', fontSize: 13, fontWeight: 800, marginTop: 3 };

const emptyState = { marginTop: 18, padding: 'clamp(22px, 5vw, 42px)', borderRadius: 20, border: '1px solid rgba(229,255,242,.11)', background: 'radial-gradient(circle at 90% 10%, rgba(185,255,90,.1), transparent 35%), #0d1010', display: 'grid', gap: 18, color: '#f4f7f5' };
const emptyTitle = { margin: 0, fontSize: 18 };
const emptyCopy = { margin: '6px 0 0', color: 'rgba(255,255,255,0.82)', lineHeight: 1.5 };
const emptyActions = { display: 'flex', gap: 10, flexWrap: 'wrap' };
const primaryAction = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '11px 15px', borderRadius: 11, background: '#b9ff5a', color: '#0a1205', textDecoration: 'none', fontWeight: 800 };
const secondaryAction = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px', borderRadius: 10, background: '#141817', color: '#fff', textDecoration: 'none', fontWeight: 700, border: '1px solid rgba(229,255,242,0.14)' };
