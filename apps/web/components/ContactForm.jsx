'use client'
import {useState,useEffect} from 'react'
import { supabase } from '../lib/supabase'

export default function ContactForm(){
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [role,setRole]=useState('')
  const [message,setMessage]=useState('')
  const [status,setStatus]=useState(null)

  useEffect(()=>{
    try{
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
      const r = params.get('role')
      if(r) setRole(r)
    }catch(e){/* ignore */}
  },[])

  async function handleSubmit(e){
    e.preventDefault()
    setStatus('sending')
    try{
      if(!supabase) throw new Error('Contact service is unavailable.')
      const { error } = await supabase.from('contact_submissions').insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role || null,
        message: message.trim(),
      })
      if(!error){
        setStatus('sent')
        setName('');setEmail('');setRole('');setMessage('')
      } else {
        throw error
      }
    }catch(err){
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="field">
        <label className="label">Name</label>
        <input className="input" value={name} onChange={e=>setName(e.target.value)} required />
      </div>

      <div className="field">
        <label className="label">Email</label>
        <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
      </div>

      <div className="field">
        <label className="label">Role</label>
        <select className="input" value={role} onChange={e=>setRole(e.target.value)}>
          <option value="">Select role</option>
          <option value="owner">Owner</option>
          <option value="buyer">Buyer</option>
          <option value="broker">Broker</option>
        </select>
      </div>

      <div className="field">
        <label className="label">Message</label>
        <textarea className="input textarea" value={message} onChange={e=>setMessage(e.target.value)} rows={6} required />
      </div>

      <div style={{display:'flex',gap:12,alignItems:'center'}}>
        <button type="submit" className="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send message'}</button>
        {status === 'sent' ? <p className="success" role="status">Message received. We’ll be in touch.</p> : null}
        {status === 'error' ? <p className="error" role="alert">Couldn’t send that message. Please try again.</p> : null}
      </div>

      <style jsx>{`
        .form{display:flex;flex-direction:column;gap:14px;max-width:680px}
        .field{display:flex;flex-direction:column;gap:8px}
        .label{font-size:14px;color:rgba(230,238,248,0.85);font-weight:700}
        .input{padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);color:#e6eef8}
        .input:focus{outline:none;box-shadow:0 0 0 3px rgba(185,255,90,.1);border-color:#b9ff5a}
        .textarea{min-height:140px}
        .submit{background:#b9ff5a;color:#0a1205;border:0;padding:11px 18px;border-radius:10px;font-weight:800;cursor:pointer}
        .submit:disabled{opacity:.6;cursor:wait}
        .submit:hover{transform:translateY(-2px)}
        .success{color:#b9ff5a;margin:0}.error{color:#ff8b94;margin:0}
      `}</style>
    </form>
  )
}
