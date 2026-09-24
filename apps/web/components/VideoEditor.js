'use client';

import { useEffect, useRef, useState } from 'react';

function clipId(file, index) {
  return `${file.name}-${file.size}-${file.lastModified}-${index}`;
}

export default function VideoEditor({ onChange }) {
  const [clips, setClips] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState('');
  const [overlayText, setOverlayText] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });
  const [textSize, setTextSize] = useState(23);
  const inputRef = useRef(null);
  const previewRef = useRef(null);
  const dragRef = useRef(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => {
    onChangeRef.current?.({ clips: clips.map((clip) => clip.file), thumbnailDataUrl, overlayText, textPosition, textSize, manifest: { clips: clips.map((clip, index) => ({ name: clip.file.name, index })), overlayText, textPosition, textSize } });
  }, [clips, thumbnailDataUrl, overlayText, textPosition, textSize]);

  function moveText(event) {
    if (!dragRef.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(12, Math.min(88, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(12, Math.min(88, ((event.clientY - rect.top) / rect.height) * 100));
    setTextPosition({ x: Math.round(x), y: Math.round(y) });
  }

  function addClips(fileList) {
    const next = Array.from(fileList || []).filter((file) => file.type.startsWith('video/')).map((file, index) => ({ id: clipId(file, index), file, url: URL.createObjectURL(file) }));
    if (!next.length) return;
    setClips((current) => current.concat(next));
    setActiveId((current) => current || next[0].id);
  }

  function removeClip(id) {
    setClips((current) => {
      const removed = current.find((clip) => clip.id === id);
      if (removed?.url) URL.revokeObjectURL(removed.url);
      const next = current.filter((clip) => clip.id !== id);
      if (activeId === id) setActiveId(next[0]?.id || '');
      return next;
    });
  }

  function moveClip(index, direction) {
    setClips((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = current.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function captureThumbnail(event) {
    const video = event.currentTarget;
    if (!video.videoWidth || thumbnailDataUrl) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      setThumbnailDataUrl(canvas.toDataURL('image/jpeg', 0.84));
    } catch {}
  }

  const activeClip = clips.find((clip) => clip.id === activeId) || clips[0];
  return <section style={shell}>
    <div style={heading}>
      <div><span style={eyebrow}>Media</span><h2 style={title}>Add your clips.</h2><p style={copy}>Select as many clips as you want. They publish in this order—use the arrows to arrange them.</p></div>
      <input ref={inputRef} type='file' accept='video/*' multiple hidden onChange={(event) => { addClips(event.target.files); event.target.value = ''; }} />
      <button type='button' style={addButton} onClick={() => inputRef.current?.click()}>+ Add clips</button>
    </div>
    {activeClip ? <div ref={previewRef} style={preview}><video key={activeClip.id} src={activeClip.url} controls playsInline preload='metadata' onLoadedData={captureThumbnail} style={video} />{overlayText ? <span role='button' tabIndex={0} aria-label='Drag text to reposition' onPointerDown={(event) => { event.preventDefault(); dragRef.current = true; event.currentTarget.setPointerCapture(event.pointerId); moveText(event); }} onPointerMove={moveText} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} style={{ ...previewText, left: `${textPosition.x}%`, top: `${textPosition.y}%`, fontSize: textSize }}>{overlayText}</span> : null}</div> : <button type='button' onClick={() => inputRef.current?.click()} style={empty}><strong>Drop in your first clip</strong><span>Videos only · you can add more anytime</span></button>}
    {clips.length ? <div style={clipRail} aria-label='Uploaded clips'>
      {clips.map((clip, index) => <article key={clip.id} style={{ ...clipCard, ...(clip.id === activeClip?.id ? activeCard : {}) }}>
        <button type='button' style={clipSelect} onClick={() => setActiveId(clip.id)}><span style={clipNumber}>{index + 1}</span><span style={clipName}>{clip.file.name}</span></button>
        <div style={clipActions}><button type='button' aria-label='Move clip earlier' disabled={index === 0} onClick={() => moveClip(index, -1)} style={miniButton}>←</button><button type='button' aria-label='Move clip later' disabled={index === clips.length - 1} onClick={() => moveClip(index, 1)} style={miniButton}>→</button><button type='button' onClick={() => removeClip(clip.id)} style={removeButton}>Remove</button></div>
      </article>)}
    </div> : null}
    <label style={captionLabel}>Text on video<input value={overlayText} maxLength={100} onChange={(event) => setOverlayText(event.target.value)} placeholder='e.g. Established Miami laundromat' style={captionInput} /></label>
    {overlayText ? <label style={captionLabel}>Text size <input type='range' min='16' max='48' step='1' value={textSize} onChange={(event) => setTextSize(Number(event.target.value))} style={sizeSlider} /></label> : null}
    <p style={note}>Drag the text on the preview to position it. Use the slider to shrink or enlarge it. Add the full story in <strong>Post details</strong> above.</p>
  </section>;
}

const shell = { display: 'grid', gap: 14, padding: 16, borderRadius: 18, border: '1px solid rgba(229,255,242,.12)', background: '#101413' };
const heading = { display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12, flexWrap: 'wrap' };
const eyebrow = { display: 'block', color: '#b9ff5a', fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase' };
const title = { margin: '4px 0', fontSize: 22, color: '#fff' };
const copy = { margin: 0, maxWidth: 480, color: '#98a39e', lineHeight: 1.45, fontSize: 14 };
const addButton = { border: 0, borderRadius: 11, padding: '11px 14px', background: '#b9ff5a', color: '#0a1205', cursor: 'pointer', fontWeight: 800 };
const preview = { position: 'relative', overflow: 'hidden', borderRadius: 14, background: '#050606', border: '1px solid rgba(229,255,242,.1)' };
const video = { display: 'block', width: '100%', maxHeight: 440, background: '#050606' };
const previewText = { position: 'absolute', maxWidth: '76%', transform: 'translate(-50%,-50%)', color: '#fff', fontWeight: 800, textAlign: 'center', textShadow: '0 2px 12px rgba(0,0,0,.85)', overflowWrap: 'anywhere', cursor: 'grab', touchAction: 'none', userSelect: 'none', lineHeight: 1.1 };
const empty = { minHeight: 160, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 7, border: '1px dashed rgba(185,255,90,.4)', borderRadius: 14, color: '#f4f7f5', background: 'rgba(185,255,90,.04)', cursor: 'pointer', fontSize: 15 };
const clipRail = { display: 'flex', gap: 9, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' };
const clipCard = { flex: '0 0 min(250px, 78vw)', display: 'grid', gap: 8, padding: 10, border: '1px solid rgba(229,255,242,.12)', borderRadius: 13, background: '#0a0c0c' };
const activeCard = { borderColor: 'rgba(185,255,90,.7)', boxShadow: '0 0 0 1px rgba(185,255,90,.2)' };
const clipSelect = { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, background: 'transparent', color: '#fff', border: 0, cursor: 'pointer', textAlign: 'left', padding: 0 };
const clipNumber = { flex: '0 0 auto', width: 23, height: 23, display: 'grid', placeItems: 'center', borderRadius: 999, background: '#b9ff5a', color: '#0a1205', fontSize: 12, fontWeight: 800 };
const clipName = { overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: 13 };
const clipActions = { display: 'flex', gap: 6 };
const miniButton = { width: 31, height: 29, border: '1px solid rgba(229,255,242,.16)', borderRadius: 8, background: '#161a19', color: '#fff', cursor: 'pointer' };
const removeButton = { marginLeft: 'auto', border: 0, background: 'transparent', color: '#ffabb1', cursor: 'pointer', fontSize: 12 };
const note = { margin: 0, color: '#98a39e', fontSize: 13, lineHeight: 1.45 };
const captionLabel = { display: 'grid', gap: 6, color: '#f4f7f5', fontSize: 13, fontWeight: 700 };
const captionInput = { width: '100%', border: '1px solid rgba(229,255,242,.16)', borderRadius: 10, background: '#090b0b', color: '#fff', padding: '10px 12px', font: 'inherit' };
const sizeSlider = { width: '100%', accentColor: '#b9ff5a' };
