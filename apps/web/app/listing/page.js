'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function ListingDetailPage() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [listing, setListing] = useState(null);
  const [media, setMedia] = useState([]);
  const [seller, setSeller] = useState(null);
  const [business, setBusiness] = useState(null);
  const [viewerId, setViewerId] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFollowingSeller, setIsFollowingSeller] = useState(false);
  const [isFollowingBusiness, setIsFollowingBusiness] = useState(false);
  const [sellerFollowerCount, setSellerFollowerCount] = useState(0);
  const [businessFollowerCount, setBusinessFollowerCount] = useState(0);
  const [msg, setMsg] = useState('');
  const [activeMedia, setActiveMedia] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);
  const mediaFrameRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const value = new URLSearchParams(window.location.search).get('id') || '';
    setId(value);
  }, []);

  useEffect(() => {
    async function load() {
      if (!supabase || !id) return;

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id || '';
      setViewerId(uid);

      if (uid) {
        const { data: favoriteRow } = await supabase
          .from('favorites')
          .select('listing_id')
          .eq('user_id', uid)
          .eq('listing_id', id)
          .maybeSingle();
        setIsFavorite(Boolean(favoriteRow));
      }

      const { data: l, error: lErr } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();

      if (lErr) return setMsg(lErr.message);
      setListing(l);

      const { data: sellerFollowers } = await supabase
        .from('user_follows')
        .select('follower_user_id')
        .eq('followed_user_id', l.seller_id);
      setSellerFollowerCount((sellerFollowers || []).length);

      if (uid && uid !== l.seller_id) {
        const { data: sellerFollow } = await supabase
          .from('user_follows')
          .select('followed_user_id')
          .eq('follower_user_id', uid)
          .eq('followed_user_id', l.seller_id)
          .maybeSingle();
        setIsFollowingSeller(Boolean(sellerFollow));
      }

      if (l.business_id) {
        const { data: businessFollowers } = await supabase
          .from('business_follows')
          .select('follower_user_id')
          .eq('business_id', l.business_id);
        setBusinessFollowerCount((businessFollowers || []).length);
      }

      if (uid && l.business_id) {
        const { data: businessFollow } = await supabase
          .from('business_follows')
          .select('business_id')
          .eq('follower_user_id', uid)
          .eq('business_id', l.business_id)
          .maybeSingle();
        setIsFollowingBusiness(Boolean(businessFollow));
      }

      const [{ data: m, error: mErr }, { data: s }, { data: b }] = await Promise.all([
        supabase
          .from('listing_media')
          .select('id,media_type,url,thumbnail_url,overlay_text,overlay_x,overlay_y,overlay_size,sort_order')
          .eq('listing_id', id)
          .order('sort_order', { ascending: true }),
        supabase
          .from('profiles')
          .select('id,full_name,handle,role,avatar_url')
          .eq('id', l.seller_id)
          .maybeSingle(),
        l.business_id
          ? supabase.from('businesses').select('id,industry').eq('id', l.business_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (mErr) return setMsg(mErr.message);
      setMedia(m || []);
      setSeller(s || null);
      setBusiness(b || null);
    }

    load();
  }, [id]);

  if (!id) {
    return <main style={wrap}><div style={card}><p>Missing listing id.</p><a href='/' style={{ color: '#8fb7ff' }}>Back home</a></div></main>;
  }

  if (!listing) {
    return <main style={wrap}><div style={card}><p>Loading listing...</p>{msg ? <p>{msg}</p> : null}</div></main>;
  }

  const isOwner = viewerId && viewerId === listing.seller_id;
  const selectedMedia = media[activeMedia] || null;
  const location = [listing.city, listing.state].filter(Boolean).join(', ') || listing.country || 'Location available on request';
  const sellerRole = humanize(listing.lister_role || seller?.role || 'Authorized representative');

  function selectMedia(index) {
    videoRef.current?.pause();
    setIsPlaying(false);
    setProgress(0);
    setActiveMedia(index);
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      await video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  function seekVideo(event) {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const next = Number(event.target.value);
    video.currentTime = (next / 100) * video.duration;
    setProgress(next);
  }

  function openFullscreen() {
    const frame = mediaFrameRef.current;
    const video = videoRef.current;
    if (frame?.requestFullscreen) frame.requestFullscreen();
    else if (video?.webkitEnterFullscreen) video.webkitEnterFullscreen();
  }

  async function toggleFavorite() {
    if (!supabase) return;
    if (!viewerId) {
      setMsg('Please sign in to save favorites.');
      window.location.href = `/login?returnTo=${encodeURIComponent(`/listing?id=${listing.id}`)}`;
      return;
    }

    if (isFavorite) {
      const { error } = await supabase.from('favorites').delete().eq('user_id', viewerId).eq('listing_id', listing.id);
      if (error) return setMsg(error.message);
      setIsFavorite(false);
      return;
    }

    const { error } = await supabase.from('favorites').insert({ user_id: viewerId, listing_id: listing.id });
    if (error) return setMsg(error.message);
    setIsFavorite(true);
  }

  async function toggleFollowSeller() {
    if (!supabase || !listing) return;
    if (!viewerId) {
      setMsg('Please sign in to follow sellers.');
      window.location.href = `/login?returnTo=${encodeURIComponent(`/listing?id=${listing.id}`)}`;
      return;
    }
    if (viewerId === listing.seller_id) return;
    if (isFollowingSeller) {
      const { error } = await supabase.from('user_follows').delete().eq('follower_user_id', viewerId).eq('followed_user_id', listing.seller_id);
      if (error) return setMsg(error.message);
      setIsFollowingSeller(false);
      setSellerFollowerCount((c) => Math.max(c - 1, 0));
      setMsg('Unfollowed seller');
      return;
    }

    const { error } = await supabase.from('user_follows').insert({ follower_user_id: viewerId, followed_user_id: listing.seller_id });
    if (error) {
      if (error.message?.includes('duplicate key')) {
        setIsFollowingSeller(true);
        return setMsg('Already following this seller');
      }
      return setMsg(error.message);
    }
    setIsFollowingSeller(true);
    setSellerFollowerCount((c) => c + 1);
    setMsg('Following seller');
  }

  async function toggleFollowBusiness() {
    if (!supabase || !listing?.business_id) return;
    if (!viewerId) {
      setMsg('Please sign in to follow businesses.');
      window.location.href = `/login?returnTo=${encodeURIComponent(`/listing?id=${listing.id}`)}`;
      return;
    }
    if (isFollowingBusiness) {
      const { error } = await supabase.from('business_follows').delete().eq('follower_user_id', viewerId).eq('business_id', listing.business_id);
      if (error) return setMsg(error.message);
      setIsFollowingBusiness(false);
      setBusinessFollowerCount((c) => Math.max(c - 1, 0));
      setMsg('Unfollowed business');
      return;
    }

    const { error } = await supabase.from('business_follows').insert({ follower_user_id: viewerId, business_id: listing.business_id });
    if (error) {
      if (error.message?.includes('schema cache') || error.message?.includes("public.business_follows")) {
        return setMsg('Business follows table is missing in Supabase cache. Run latest SQL migration and refresh.');
      }
      if (error.message?.includes('duplicate key')) {
        setIsFollowingBusiness(true);
        return setMsg('Already following this business');
      }
      return setMsg(error.message);
    }
    setIsFollowingBusiness(true);
    setBusinessFollowerCount((c) => c + 1);
    setMsg('Following business');
  }

  return (
    <main className='listingPage'>
      <article className='listingShell'>
        <button className='backLink' type='button' onClick={() => window.history.length > 1 ? router.back() : router.push('/explore')}>← Back</button>

        <div className='heroGrid'>
          <section className='mediaColumn' aria-label='Listing media'>
            <div className='mediaFrame' ref={mediaFrameRef}>
              {selectedMedia?.media_type === 'video' ? (
                <video
                  ref={videoRef}
                  src={selectedMedia.url}
                  poster={selectedMedia.thumbnail_url || undefined}
                  playsInline
                  muted={isMuted}
                  onClick={togglePlayback}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onTimeUpdate={(event) => setProgress(event.currentTarget.duration ? (event.currentTarget.currentTime / event.currentTarget.duration) * 100 : 0)}
                />
              ) : selectedMedia ? (
                <img src={selectedMedia.url} alt={`${listing.title} media ${activeMedia + 1}`} />
              ) : (
                <div className='mediaEmpty'><span>{initial(listing.title)}</span><p>Media coming soon</p></div>
              )}
              {selectedMedia?.overlay_text ? (
                <span className='overlayText' style={{ left: `${selectedMedia.overlay_x ?? 50}%`, top: `${selectedMedia.overlay_y ?? 50}%`, fontSize: selectedMedia.overlay_size ?? 23 }}>{selectedMedia.overlay_text}</span>
              ) : null}
              {selectedMedia?.media_type === 'video' ? (
                <div className='videoControls'>
                  <input aria-label='Video progress' type='range' min='0' max='100' value={progress} onChange={seekVideo} />
                  <button onClick={togglePlayback} aria-label={isPlaying ? 'Pause video' : 'Play video'}>{isPlaying ? 'Ⅱ' : '▶'}</button>
                  <button onClick={() => setIsMuted((value) => !value)} aria-label={isMuted ? 'Unmute video' : 'Mute video'}>{isMuted ? '⌁' : '◖'}</button>
                  <button onClick={openFullscreen} aria-label='Open fullscreen'>↗</button>
                </div>
              ) : null}
            </div>
            {media.length > 1 ? (
              <div className='mediaRail'>
                {media.map((item, index) => (
                  <button key={item.id} className={index === activeMedia ? 'mediaThumb active' : 'mediaThumb'} onClick={() => selectMedia(index)} aria-label={`Show media ${index + 1}`}>
                    {item.thumbnail_url || item.media_type === 'image' ? <img src={item.thumbnail_url || item.url} alt='' /> : <span>▶</span>}
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className='dealPanel'>
            <div className='eyebrow'>Business opportunity</div>
            <h1>{listing.title}</h1>
            <div className='chips'>
              {listing.category ? <span>{listing.category}</span> : null}
              {listing.industry || business?.industry ? <span>{listing.industry || business?.industry}</span> : null}
              <span>{location}</span>
            </div>
            {business?.id ? <div className='businessLink'><span className='businessAvatar'>C</span><span><strong>Confidential business</strong><small>Seller identity shared on request</small></span></div> : null}
            <div className='priceBlock'><small>Asking price</small><strong>{money(listing.asking_price)}</strong></div>
            <div className='primaryActions'>
              <a className='primaryButton' href={isOwner ? `/listings/edit?id=${listing.id}` : `/messages?seller=${listing.seller_id}&listing=${listing.id}`}>{isOwner ? 'Edit opportunity' : 'Message seller'}</a>
              <button className={isFavorite ? 'saveButton saved' : 'saveButton'} onClick={toggleFavorite}>{isFavorite ? '★ Saved' : '☆ Save'}</button>
            </div>
            {msg ? <p className='statusMessage'>{msg}</p> : null}
          </section>
        </div>

        <section className='statGrid' aria-label='Deal snapshot'>
          <div className='stat'><small>Asking price</small><strong>{money(listing.asking_price)}</strong></div>
          <div className='stat'><small>Annual revenue</small><strong>{moneyOrPrivate(listing.annual_revenue)}</strong></div>
          <div className='stat'><small>Annual profit</small><strong>{moneyOrPrivate(listing.annual_profit)}</strong></div>
        </section>

        <div className='contentGrid'>
          <section className='contentCard aboutCard'>
            <div className='sectionLabel'>The opportunity</div>
            <h2>About this business</h2>
            <p>{listing.description || 'The seller has not added a description yet. Message them to learn more about this opportunity.'}</p>
          </section>

          <aside className='contentCard sellerCard'>
            <div className='sectionLabel'>Seller</div>
            <a href={`/profile/view?id=${listing.seller_id}`} className='sellerIdentity'>
              {seller?.avatar_url ? <img src={seller.avatar_url} alt='' /> : <span className='sellerAvatar'>{initial(seller?.full_name)}</span>}
              <span><strong>{seller?.full_name || 'Seller'}</strong><small>{sellerRole}</small></span>
              <b>→</b>
            </a>
            <p className='followerLine'>{sellerFollowerCount} seller follower{sellerFollowerCount === 1 ? '' : 's'}{listing.business_id ? ` · ${businessFollowerCount} business follower${businessFollowerCount === 1 ? '' : 's'}` : ''}</p>
            <div className='followActions'>
              {viewerId !== listing.seller_id ? <button onClick={toggleFollowSeller}>{isFollowingSeller ? 'Following seller' : 'Follow seller'}</button> : null}
              {listing.business_id ? <button onClick={toggleFollowBusiness}>{isFollowingBusiness ? 'Following business' : 'Follow business'}</button> : null}
            </div>
          </aside>
        </div>
      </article>

      <style jsx>{`
        .listingPage { min-height: 100vh; padding: 26px 20px 150px; color: #f7faf8; background: radial-gradient(circle at 75% 6%, rgba(169,255,65,.09), transparent 28rem), #050807; }
        .listingShell { width: min(1120px, 100%); margin: 0 auto; }
        .backLink { display: inline-flex; margin-bottom: 18px; padding: 0; border: 0; color: rgba(247,250,248,.62); background: transparent; text-decoration: none; font-size: 14px; font-weight: 650; cursor: pointer; }
        .backLink:hover { color: #b0ff4b; }
        .heroGrid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(330px, .75fr); gap: 18px; align-items: stretch; }
        .mediaColumn, .dealPanel, .contentCard, .statGrid { border: 1px solid rgba(229,255,242,.11); background: rgba(13,17,15,.92); box-shadow: 0 24px 70px rgba(0,0,0,.28); }
        .mediaColumn { border-radius: 28px; overflow: hidden; }
        .mediaFrame { position: relative; width: 100%; aspect-ratio: 9 / 16; min-height: 0; max-height: 78vh; overflow: hidden; background: #0a0d0c; }
        .mediaFrame video, .mediaFrame > img { width: 100%; height: 100%; display: block; object-fit: contain; background: #050807; }
        .mediaEmpty { height: 100%; display: grid; place-content: center; justify-items: center; gap: 12px; color: rgba(255,255,255,.42); background: radial-gradient(circle at center, rgba(176,255,75,.12), transparent 45%); }
        .mediaEmpty span { width: 76px; height: 76px; display: grid; place-items: center; border-radius: 24px; font-size: 30px; font-weight: 900; color: #0a0d0c; background: #b0ff4b; }
        .mediaEmpty p { margin: 0; }
        .overlayText { position: absolute; z-index: 2; max-width: 78%; transform: translate(-50%,-50%); color: white; font-weight: 850; text-align: center; text-shadow: 0 3px 18px rgba(0,0,0,.9); pointer-events: none; overflow-wrap: anywhere; }
        .videoControls { position: absolute; right: 14px; bottom: 14px; left: 14px; z-index: 3; display: flex; align-items: center; justify-content: flex-end; gap: 8px; pointer-events: none; }
        .videoControls input { min-width: 0; flex: 1; accent-color: #b0ff4b; pointer-events: auto; }
        .videoControls button { width: 40px; height: 40px; border: 1px solid rgba(255,255,255,.18); border-radius: 50%; color: #fff; background: rgba(5,8,7,.72); backdrop-filter: blur(12px); pointer-events: auto; }
        .mediaRail { display: flex; gap: 9px; padding: 12px; overflow-x: auto; }
        .mediaThumb { width: 68px; height: 50px; flex: 0 0 auto; padding: 0; overflow: hidden; border: 2px solid transparent; border-radius: 12px; color: white; background: #171c19; }
        .mediaThumb.active { border-color: #b0ff4b; }
        .mediaThumb img { width: 100%; height: 100%; object-fit: cover; }
        .dealPanel { display: flex; flex-direction: column; border-radius: 28px; padding: clamp(24px, 4vw, 42px); }
        .eyebrow, .sectionLabel { color: #b0ff4b; font-size: 11px; font-weight: 850; letter-spacing: .16em; text-transform: uppercase; }
        .dealPanel h1 { margin: 12px 0 16px; font-size: clamp(34px, 4.5vw, 58px); line-height: .98; letter-spacing: -.045em; overflow-wrap: anywhere; }
        .chips { display: flex; gap: 7px; flex-wrap: wrap; }
        .chips span { padding: 7px 10px; border: 1px solid rgba(229,255,242,.1); border-radius: 999px; color: rgba(247,250,248,.72); background: rgba(255,255,255,.035); font-size: 12px; }
        .businessLink { display: flex; align-items: center; gap: 11px; margin-top: 26px; color: #fff; text-decoration: none; }
        .businessAvatar, .sellerAvatar { display: grid; place-items: center; flex: 0 0 auto; color: #0a0d0c; font-weight: 850; background: #b0ff4b; }
        .businessAvatar { width: 42px; height: 42px; border-radius: 13px; }
        .businessLink span:last-child, .sellerIdentity span:nth-child(2) { display: grid; gap: 2px; }
        .businessLink small, .sellerIdentity small { color: rgba(247,250,248,.55); font-size: 12px; }
        .priceBlock { display: grid; gap: 4px; margin-top: auto; padding-top: 34px; }
        .priceBlock small { color: rgba(247,250,248,.52); font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }
        .priceBlock strong { font-size: clamp(32px, 4vw, 48px); letter-spacing: -.04em; }
        .primaryActions { display: grid; grid-template-columns: 1fr auto; gap: 9px; margin-top: 18px; }
        .primaryButton, .saveButton { min-height: 50px; display: grid; place-items: center; border-radius: 15px; font-weight: 800; text-decoration: none; }
        .primaryButton { color: #071006; background: #b0ff4b; }
        .saveButton { padding: 0 17px; border: 1px solid rgba(229,255,242,.14); color: #fff; background: #171b19; }
        .saveButton.saved { border-color: rgba(176,255,75,.44); color: #b0ff4b; }
        .statusMessage { margin: 12px 0 0; color: #d7f8c1; font-size: 13px; }
        .statGrid { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 18px; border-radius: 22px; overflow: hidden; }
        .stat { display: grid; gap: 6px; min-width: 0; padding: 20px 24px; }
        .stat + .stat { border-left: 1px solid rgba(229,255,242,.1); }
        .stat small { color: rgba(247,250,248,.48); font-size: 11px; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
        .stat strong { overflow-wrap: anywhere; font-size: clamp(18px, 2.4vw, 27px); letter-spacing: -.025em; }
        .contentGrid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(300px, .65fr); gap: 18px; margin-top: 18px; }
        .contentCard { border-radius: 22px; padding: clamp(22px, 3vw, 32px); }
        .contentCard h2 { margin: 9px 0 14px; font-size: clamp(24px, 3vw, 34px); letter-spacing: -.035em; }
        .aboutCard p { margin: 0; color: rgba(247,250,248,.72); font-size: 16px; line-height: 1.72; white-space: pre-wrap; }
        .sellerIdentity { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; margin-top: 17px; color: white; text-decoration: none; }
        .sellerIdentity img, .sellerAvatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
        .sellerIdentity b { color: #b0ff4b; }
        .followerLine { margin: 18px 0 12px; color: rgba(247,250,248,.5); font-size: 12px; line-height: 1.5; }
        .followActions { display: flex; gap: 8px; flex-wrap: wrap; }
        .followActions button { min-height: 40px; padding: 0 13px; border: 1px solid rgba(229,255,242,.13); border-radius: 12px; color: #fff; background: #171b19; }
        button, a { -webkit-tap-highlight-color: transparent; }
        button { cursor: pointer; font: inherit; }
        @media (max-width: 780px) {
          .listingPage { padding: 14px 12px 138px; }
          .backLink { margin: 4px 4px 12px; }
          .heroGrid, .contentGrid { grid-template-columns: 1fr; gap: 12px; }
          .mediaColumn, .dealPanel { border-radius: 20px; }
          .mediaFrame { min-height: 0; aspect-ratio: 4 / 5; }
          .dealPanel { padding: 22px 18px; }
          .dealPanel h1 { font-size: clamp(34px, 11vw, 48px); }
          .priceBlock { margin-top: 24px; padding-top: 0; }
          .statGrid { grid-template-columns: 1fr; border-radius: 18px; }
          .stat { padding: 16px 18px; grid-template-columns: 1fr auto; align-items: center; }
          .stat + .stat { border-left: 0; border-top: 1px solid rgba(229,255,242,.1); }
          .stat strong { text-align: right; font-size: 18px; }
          .contentGrid { margin-top: 12px; }
          .contentCard { border-radius: 18px; padding: 20px 18px; }
        }
        @media (max-width: 390px) {
          .primaryActions { grid-template-columns: 1fr; }
          .saveButton { min-height: 46px; }
        }
      `}</style>
    </main>
  );
}

function initial(name) {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

function money(value) {
  const amount = Number(value || 0);
  return amount ? `$${amount.toLocaleString()}` : 'Contact seller';
}

function moneyOrPrivate(value) {
  const amount = Number(value || 0);
  return amount ? `$${amount.toLocaleString()}` : 'Not shared';
}

function humanize(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const wrap = { minHeight: '100vh', padding: 24, background: '#070909', color: '#fff' };
const card = { maxWidth: 1000, margin: '0 auto', background: '#0d1010', border: '1px solid rgba(229,255,242,0.11)', borderRadius: 24, padding: 18, boxShadow: '0 24px 60px rgba(0,0,0,0.28)' };
