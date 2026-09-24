'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const MIN_TRIM_SECONDS = 0.25;

function clipId(file, index) {
  return `${file.name}-${file.size}-${file.lastModified}-${index}-${Date.now()}`;
}

function formatTime(value = 0) {
  const seconds = Math.max(0, Number(value) || 0);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function frameAt(video, time) {
  return new Promise((resolve) => {
    const done = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(1, 240 / Math.max(video.videoWidth, 1));
      canvas.width = Math.max(1, Math.round(video.videoWidth * ratio));
      canvas.height = Math.max(1, Math.round(video.videoHeight * ratio));
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.68));
    };
    video.addEventListener('seeked', done, { once: true });
    video.currentTime = Math.min(Math.max(time, 0), Math.max(0, video.duration - 0.04));
  });
}

async function inspectClip(clip) {
  const probe = document.createElement('video');
  probe.preload = 'metadata';
  probe.muted = true;
  probe.playsInline = true;
  probe.src = clip.url;
  await new Promise((resolve, reject) => {
    probe.addEventListener('loadedmetadata', resolve, { once: true });
    probe.addEventListener('error', reject, { once: true });
  });
  const duration = Number.isFinite(probe.duration) ? probe.duration : 0;
  const frames = [];
  for (let index = 0; index < 9; index += 1) frames.push(await frameAt(probe, duration * ((index + 0.5) / 9)));
  probe.removeAttribute('src');
  probe.load();
  return { duration, frames };
}

export default function VideoEditor({ onChange }) {
  const [clips, setClips] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });
  const [textSize, setTextSize] = useState(23);
  const inputRef = useRef(null);
  const cameraRef = useRef(null);
  const previewRef = useRef(null);
  const timelineRef = useRef(null);
  const textDragRef = useRef(false);
  const timelineDragRef = useRef('');
  const pendingSeekRef = useRef(null);
  const continuePlaybackRef = useRef(false);
  const urlsRef = useRef(new Set());
  const onChangeRef = useRef(onChange);

  const activeClip = clips.find((clip) => clip.id === activeId) || clips[0];
  const activeIndex = clips.findIndex((clip) => clip.id === activeClip?.id);
  const totalTrimmedDuration = useMemo(() => clips.reduce((sum, clip) => sum + Math.max(0, (clip.trimEnd || clip.duration || 0) - (clip.trimStart || 0)), 0), [clips]);
  const rawTotalDuration = useMemo(() => clips.reduce((sum, clip) => sum + (clip.duration || 0), 0), [clips]);
  const activeOffset = useMemo(() => clips.slice(0, Math.max(activeIndex, 0)).reduce((sum, clip) => sum + (clip.duration || 0), 0), [clips, activeIndex]);
  const trimmedElapsed = useMemo(() => clips.slice(0, Math.max(activeIndex, 0)).reduce((sum, clip) => sum + Math.max(0, clip.trimEnd - clip.trimStart), 0) + Math.max(0, playhead - (activeClip?.trimStart || 0)), [clips, activeIndex, activeClip?.trimStart, playhead]);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => {
    const exported = clips.filter((clip) => clip.duration > 0).map((clip) => ({ file: clip.file, trimStart: clip.trimStart, trimEnd: clip.trimEnd }));
    onChangeRef.current?.({ clips: exported, overlayText, textPosition, textSize, manifest: { clips: exported.map((clip, index) => ({ name: clip.file.name, index, trimStart: clip.trimStart, trimEnd: clip.trimEnd })), overlayText, textPosition, textSize } });
  }, [clips, overlayText, textPosition, textSize]);

  useEffect(() => () => { urlsRef.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  useEffect(() => {
    if (!activeClip || !previewRef.current || !activeClip.duration) return;
    const requestedTime = pendingSeekRef.current;
    pendingSeekRef.current = null;
    const nextTime = requestedTime == null ? activeClip.trimStart : Math.max(activeClip.trimStart, Math.min(activeClip.trimEnd, requestedTime));
    previewRef.current.currentTime = nextTime;
    setPlayhead(nextTime);
    setPlaying(false);
    if (continuePlaybackRef.current) {
      continuePlaybackRef.current = false;
      requestAnimationFrame(() => { void previewRef.current?.play(); });
    }
  }, [activeClip?.id]);

  function updateClip(id, patch) {
    setClips((current) => current.map((clip) => clip.id === id ? { ...clip, ...patch } : clip));
  }

  async function addClips(fileList) {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('video/'));
    if (!files.length) return;
    const pending = files.map((file, index) => {
      const url = URL.createObjectURL(file);
      urlsRef.current.add(url);
      return { id: clipId(file, index), file, url, duration: 0, trimStart: 0, trimEnd: 0, frames: [], loading: true };
    });
    setClips((current) => current.concat(pending));
    setActiveId((current) => current || pending[0].id);
    for (const clip of pending) {
      try {
        const { duration, frames } = await inspectClip(clip);
        setClips((current) => current.map((item) => item.id === clip.id ? { ...item, duration, trimStart: 0, trimEnd: duration, frames, loading: false } : item));
      } catch {
        setClips((current) => current.map((item) => item.id === clip.id ? { ...item, loading: false, error: true } : item));
      }
    }
  }

  function removeClip(id) {
    const removedIndex = clips.findIndex((clip) => clip.id === id);
    const removed = clips[removedIndex];
    if (removed?.url) { URL.revokeObjectURL(removed.url); urlsRef.current.delete(removed.url); }
    const next = clips.filter((clip) => clip.id !== id);
    setClips(next);
    if (activeId === id) setActiveId(next[Math.min(removedIndex, next.length - 1)]?.id || '');
  }

  function moveClip(direction) {
    if (activeIndex < 0) return;
    const target = activeIndex + direction;
    if (target < 0 || target >= clips.length) return;
    setClips((current) => {
      const next = current.slice();
      [next[activeIndex], next[target]] = [next[target], next[activeIndex]];
      return next;
    });
  }

  function moveText(event) {
    if (!textDragRef.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    setTextPosition({ x: Math.round(Math.max(12, Math.min(88, ((event.clientX - rect.left) / rect.width) * 100))), y: Math.round(Math.max(12, Math.min(88, ((event.clientY - rect.top) / rect.height) * 100))) });
  }

  function positionFromPointer(event) {
    if (!rawTotalDuration || !timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(rawTotalDuration, ((event.clientX - rect.left) / rect.width) * rawTotalDuration));
  }

  function applyTimelinePointer(event) {
    if (!activeClip || !timelineDragRef.current) return;
    const globalTime = positionFromPointer(event);
    let value = globalTime - activeOffset;
    let canSeekCurrent = true;
    if (timelineDragRef.current === 'start') {
      value = Math.max(0, Math.min(value, activeClip.trimEnd - MIN_TRIM_SECONDS));
      updateClip(activeClip.id, { trimStart: value });
    } else if (timelineDragRef.current === 'end') {
      value = Math.min(activeClip.duration, Math.max(value, activeClip.trimStart + MIN_TRIM_SECONDS));
      updateClip(activeClip.id, { trimEnd: value });
    } else {
      let cursor = 0;
      const target = clips.find((clip) => {
        const inside = globalTime <= cursor + clip.duration;
        if (!inside) cursor += clip.duration;
        return inside;
      }) || clips[clips.length - 1];
      value = Math.max(target.trimStart, Math.min(target.trimEnd, globalTime - cursor));
      if (target.id !== activeClip.id) {
        pendingSeekRef.current = value;
        setActiveId(target.id);
        canSeekCurrent = false;
      }
    }
    if (previewRef.current && canSeekCurrent) previewRef.current.currentTime = value;
    setPlayhead(value);
  }

  function startTimelineDrag(event, mode) {
    event.preventDefault();
    event.stopPropagation();
    timelineDragRef.current = mode;
    continuePlaybackRef.current = false;
    previewRef.current?.pause();
    event.currentTarget.setPointerCapture(event.pointerId);
    applyTimelinePointer(event);
  }

  function stopTimelineDrag(event) {
    timelineDragRef.current = '';
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function togglePlayback() {
    const video = previewRef.current;
    if (!video || !activeClip?.duration) return;
    if (video.paused) {
      if (video.currentTime < activeClip.trimStart || video.currentTime >= activeClip.trimEnd) video.currentTime = activeClip.trimStart;
      void video.play();
    } else { continuePlaybackRef.current = false; video.pause(); }
  }

  const startPct = rawTotalDuration ? ((activeOffset + (activeClip?.trimStart || 0)) / rawTotalDuration) * 100 : 0;
  const endPct = rawTotalDuration ? ((activeOffset + (activeClip?.trimEnd || 0)) / rawTotalDuration) * 100 : 100;
  const playheadPct = rawTotalDuration ? ((activeOffset + playhead) / rawTotalDuration) * 100 : 0;

  return <section style={shell}>
    <header style={heading}>
      <div><span style={eyebrow}>Video studio</span><h2 style={title}>Build your business story</h2><p style={copy}>Tap a clip, drag the timeline to preview, and pull either edge to trim.</p></div>
      <input ref={inputRef} type='file' accept='video/*' multiple hidden onChange={(event) => { void addClips(event.target.files); event.target.value = ''; }} />
      <input ref={cameraRef} type='file' accept='video/*' capture='environment' hidden onChange={(event) => { void addClips(event.target.files); event.target.value = ''; }} />
      <div style={addActions}><button type='button' style={addButton} onClick={() => inputRef.current?.click()}>＋ Add clips</button><button type='button' style={recordButton} onClick={() => cameraRef.current?.click()}>● Record</button></div>
    </header>

    {!activeClip ? <button type='button' onClick={() => inputRef.current?.click()} style={empty}><strong>Add your first clip</strong><span>Choose a video or capture one now</span></button> : <>
      <div style={previewWrap}>
        <video ref={previewRef} key={activeClip.id} src={activeClip.url} playsInline preload='auto' onClick={togglePlayback} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(event) => {
          const current = event.currentTarget;
          if (current.currentTime >= activeClip.trimEnd) {
            current.pause();
            const nextClip = clips[activeIndex + 1];
            if (nextClip) {
              pendingSeekRef.current = nextClip.trimStart;
              continuePlaybackRef.current = true;
              setActiveId(nextClip.id);
            } else current.currentTime = activeClip.trimStart;
          }
          setPlayhead(current.currentTime);
        }} style={video} />
        {activeClip.loading ? <div style={loadingShade}>Preparing timeline…</div> : null}
        {overlayText ? <span role='button' tabIndex={0} aria-label='Drag text to reposition' onPointerDown={(event) => { event.preventDefault(); textDragRef.current = true; event.currentTarget.setPointerCapture(event.pointerId); moveText(event); }} onPointerMove={moveText} onPointerUp={() => { textDragRef.current = false; }} onPointerCancel={() => { textDragRef.current = false; }} style={{ ...previewText, left: `${textPosition.x}%`, top: `${textPosition.y}%`, fontSize: textSize }}>{overlayText}</span> : null}
        <div style={previewControls}><span>{formatTime(trimmedElapsed)} / {formatTime(totalTrimmedDuration)}</span><button type='button' onClick={togglePlayback} style={playButton}>{playing ? 'Ⅱ' : '▶'}</button></div>
      </div>

      <div style={timelineHeader}><span><strong>Timeline</strong> · {clips.length} clip{clips.length === 1 ? '' : 's'}</span><span>{totalTrimmedDuration.toFixed(1)}s final</span></div>
      <div style={timelineHint}>Tap a section to select · drag to scrub · pull its edges to trim</div>
      <div ref={timelineRef} style={timeline} onPointerDown={(event) => startTimelineDrag(event, 'scrub')} onPointerMove={applyTimelinePointer} onPointerUp={stopTimelineDrag} onPointerCancel={stopTimelineDrag}>
        <div style={frames}>{clips.map((clip, clipIndex) => <div key={clip.id} style={{ ...timelineClip, width: `${rawTotalDuration ? (clip.duration / rawTotalDuration) * 100 : 100 / clips.length}%`, ...(clip.id === activeClip.id ? timelineClipActive : {}) }}>
          <div style={clipFrames}>{clip.frames.map((frame, frameIndex) => <img key={frameIndex} src={frame} alt='' draggable='false' style={frameImage} />)}</div>
          <div style={{ ...clipInnerShade, left: 0, width: `${clip.duration ? (clip.trimStart / clip.duration) * 100 : 0}%` }} />
          <div style={{ ...clipInnerShade, right: 0, width: `${clip.duration ? ((clip.duration - clip.trimEnd) / clip.duration) * 100 : 0}%` }} />
          <span style={timelineClipLabel}>{clipIndex + 1}</span>
        </div>)}</div>
        <div style={{ ...trimShade, left: `${rawTotalDuration ? (activeOffset / rawTotalDuration) * 100 : 0}%`, width: `${Math.max(0, startPct - (rawTotalDuration ? (activeOffset / rawTotalDuration) * 100 : 0))}%` }} />
        <div style={{ ...trimShade, left: `${endPct}%`, width: `${rawTotalDuration ? ((activeClip.duration - activeClip.trimEnd) / rawTotalDuration) * 100 : 0}%` }} />
        <div style={{ ...trimSelection, left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }} />
        <div aria-label='Trim start' style={{ ...trimHandle, left: `${startPct}%`, transform: 'none' }} onPointerDown={(event) => startTimelineDrag(event, 'start')} onPointerMove={applyTimelinePointer} onPointerUp={stopTimelineDrag} onPointerCancel={stopTimelineDrag}><span>‹</span></div>
        <div aria-label='Trim end' style={{ ...trimHandle, left: `${endPct}%`, transform: 'translateX(-100%)' }} onPointerDown={(event) => startTimelineDrag(event, 'end')} onPointerMove={applyTimelinePointer} onPointerUp={stopTimelineDrag} onPointerCancel={stopTimelineDrag}><span>›</span></div>
        <div style={{ ...playheadLine, left: `${playheadPct}%` }} />
      </div>

      <div style={clipToolbar}><button type='button' disabled={activeIndex <= 0} onClick={() => moveClip(-1)} style={toolButton}>← Earlier</button><button type='button' onClick={() => removeClip(activeClip.id)} style={{ ...toolButton, color: '#ffabb1' }}>⌫ Delete clip {activeIndex + 1}</button><button type='button' disabled={activeIndex === clips.length - 1} onClick={() => moveClip(1)} style={toolButton}>Later →</button></div>
      <button type='button' onClick={() => inputRef.current?.click()} style={timelineAdd}>＋ Add another clip</button>
    </>}

    <details style={textPanel}><summary style={textSummary}>Text overlay <span>{overlayText ? 'Added' : 'Optional'}</span></summary><div style={textFields}>
      <label style={captionLabel}>Text on video<input value={overlayText} maxLength={100} onChange={(event) => setOverlayText(event.target.value)} placeholder='e.g. Established Miami laundromat' style={captionInput} /></label>
      {overlayText ? <label style={captionLabel}>Text size<input type='range' min='16' max='48' step='1' value={textSize} onChange={(event) => setTextSize(Number(event.target.value))} style={sizeSlider} /></label> : null}
      <p style={note}>Drag the text directly on the preview to position it.</p>
    </div></details>
  </section>;
}

const shell = { display: 'grid', gap: 16, padding: 'clamp(12px,3vw,18px)', borderRadius: 22, border: '1px solid rgba(229,255,242,.12)', background: '#080a09', overflow: 'hidden' };
const heading = { display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12, flexWrap: 'wrap' };
const eyebrow = { display: 'block', color: '#b9ff5a', fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase' };
const title = { margin: '4px 0', fontSize: 22, color: '#fff' };
const copy = { margin: 0, maxWidth: 480, color: '#98a39e', lineHeight: 1.45, fontSize: 14 };
const addButton = { border: 0, borderRadius: 999, padding: '11px 15px', background: '#b9ff5a', color: '#0a1205', cursor: 'pointer', fontWeight: 850 };
const addActions = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const recordButton = { border: '1px solid rgba(229,255,242,.17)', borderRadius: 999, padding: '10px 14px', background: '#171a18', color: '#fff', cursor: 'pointer', fontWeight: 800 };
const empty = { minHeight: 190, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 7, border: '1px dashed rgba(185,255,90,.42)', borderRadius: 18, color: '#f4f7f5', background: 'rgba(185,255,90,.035)', cursor: 'pointer', fontSize: 15 };
const previewWrap = { position: 'relative', width: '100%', minHeight: 300, maxHeight: '60svh', aspectRatio: '9 / 12', overflow: 'hidden', borderRadius: 18, background: '#000', border: '1px solid rgba(229,255,242,.1)' };
const video = { display: 'block', width: '100%', height: '100%', objectFit: 'contain', background: '#000', cursor: 'pointer' };
const loadingShade = { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.42)', color: '#fff', fontWeight: 800 };
const previewControls = { position: 'absolute', left: 12, right: 12, bottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', fontSize: 12, textShadow: '0 1px 5px #000', pointerEvents: 'none' };
const playButton = { pointerEvents: 'auto', width: 42, height: 42, borderRadius: 999, border: '1px solid rgba(255,255,255,.25)', background: 'rgba(0,0,0,.72)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' };
const previewText = { position: 'absolute', maxWidth: '76%', transform: 'translate(-50%,-50%)', color: '#fff', fontWeight: 800, textAlign: 'center', textShadow: '0 2px 12px rgba(0,0,0,.85)', overflowWrap: 'anywhere', cursor: 'grab', touchAction: 'none', userSelect: 'none', lineHeight: 1.1 };
const timelineHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, color: '#f4f7f5', fontSize: 13 };
const timelineHint = { marginTop: -10, color: '#98a39e', fontSize: 11, textAlign: 'center' };
const timeline = { position: 'relative', width: '100%', height: 96, borderRadius: 14, background: '#111', overflow: 'hidden', touchAction: 'none', userSelect: 'none', cursor: 'ew-resize' };
const frames = { position: 'absolute', inset: 0, display: 'flex' };
const timelineClip = { position: 'relative', minWidth: 0, height: '100%', overflow: 'hidden', borderLeft: '2px solid rgba(7,9,9,.9)', boxSizing: 'border-box' };
const timelineClipActive = { boxShadow: 'inset 0 0 0 2px rgba(185,255,90,.72)' };
const clipFrames = { position: 'absolute', inset: 0, display: 'flex' };
const clipInnerShade = { position: 'absolute', top: 0, bottom: 0, background: 'rgba(0,0,0,.58)', pointerEvents: 'none' };
const timelineClipLabel = { position: 'absolute', left: 6, top: 7, width: 22, height: 22, display: 'grid', placeItems: 'center', borderRadius: 999, background: 'rgba(0,0,0,.76)', color: '#fff', fontSize: 11, fontWeight: 850, pointerEvents: 'none' };
const frameImage = { flex: '1 1 0', minWidth: 0, height: '100%', objectFit: 'cover', pointerEvents: 'none' };
const trimShade = { position: 'absolute', top: 0, bottom: 0, background: 'rgba(0,0,0,.68)', pointerEvents: 'none' };
const trimSelection = { position: 'absolute', top: 0, bottom: 0, borderTop: '4px solid #b9ff5a', borderBottom: '4px solid #b9ff5a', pointerEvents: 'none', boxSizing: 'border-box' };
const trimHandle = { position: 'absolute', top: 0, bottom: 0, width: 30, zIndex: 4, display: 'grid', placeItems: 'center', background: '#b9ff5a', color: '#0a1205', fontSize: 26, fontWeight: 900, cursor: 'ew-resize', touchAction: 'none', borderRadius: 6 };
const playheadLine = { position: 'absolute', top: -2, bottom: -2, width: 3, transform: 'translateX(-50%)', zIndex: 5, background: '#fff', boxShadow: '0 0 0 1px rgba(0,0,0,.45)', pointerEvents: 'none' };
const clipToolbar = { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 };
const toolButton = { minHeight: 44, borderRadius: 12, border: '1px solid rgba(229,255,242,.14)', background: '#171a18', color: '#fff', cursor: 'pointer', fontWeight: 750 };
const timelineAdd = { minHeight: 44, borderRadius: 12, border: '1px dashed rgba(185,255,90,.36)', background: 'rgba(185,255,90,.04)', color: '#b9ff5a', cursor: 'pointer', fontWeight: 800 };
const textPanel = { border: '1px solid rgba(229,255,242,.12)', borderRadius: 14, background: '#101311', overflow: 'hidden' };
const textSummary = { padding: '13px 14px', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' };
const textFields = { padding: '0 14px 14px', display: 'grid', gap: 12 };
const captionLabel = { display: 'grid', gap: 6, color: '#f4f7f5', fontSize: 13, fontWeight: 700 };
const captionInput = { width: '100%', border: '1px solid rgba(229,255,242,.16)', borderRadius: 10, background: '#090b0b', color: '#fff', padding: '10px 12px', font: 'inherit' };
const sizeSlider = { width: '100%', accentColor: '#b9ff5a' };
const note = { margin: 0, color: '#98a39e', fontSize: 13, lineHeight: 1.45 };
