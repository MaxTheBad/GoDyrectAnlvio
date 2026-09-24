'use client';
import { useMemo, useState } from 'react';
import { INDUSTRIES } from '../lib/industries';

export default function IndustryPicker({ value, onChange, id = 'industry', required = false }) {
  const [query, setQuery] = useState(value || '');
  const matches = useMemo(() => INDUSTRIES.filter((industry) => industry.toLowerCase().includes(query.toLowerCase())).slice(0, 8), [query]);
  function choose(industry) { setQuery(industry); onChange(industry); }
  return <div className='industry-picker'>
    <input id={id} className='industry-picker__input' value={query} required={required} placeholder='Search an industry — e.g. restaurants' onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); }} onBlur={() => setTimeout(() => document.getElementById(`${id}-choices`)?.classList.remove('is-open'), 160)} onFocus={() => document.getElementById(`${id}-choices`)?.classList.add('is-open')} autoComplete='off' />
    <div id={`${id}-choices`} className='industry-picker__choices'>{matches.map((industry) => <button type='button' key={industry} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(industry)}>{industry}</button>)}{!matches.length && query ? <span>Use “{query}” as a custom industry</span> : null}</div>
  </div>;
}
