'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

type Phase = 'animating' | 'choice' | 'resident-input' | 'done'

export default function OpeningScreen() {
  const [phase, setPhase] = useState<Phase | null>(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('rl-opening-shown')) return 'done'
    } catch {}
    return null
  })
  const [token, setToken] = useState('')
  const [tokenError, setTokenError] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const fallbackRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Never show on landlord/tenant portals or login
  const isPortalRoute = pathname?.startsWith('/landlord') || pathname?.startsWith('/tenant') || pathname === '/login'

  // On any app route other than root, the user is authenticated — always hide the overlay
  useEffect(() => {
    if (!pathname || isPortalRoute) return
    if (pathname !== '/') {
      try { sessionStorage.setItem('rl-opening-shown', '1') } catch {}
      setPhase('done')
      return
    }
    try {
      if (sessionStorage.getItem('rl-opening-shown')) setPhase('done')
    } catch {}
  }, [pathname, isPortalRoute])

  const INACTIVITY_MS = 15 * 60 * 1000 // 15 minutes

  function resetInactivity() {
    if (inactivityRef.current) clearTimeout(inactivityRef.current)
    inactivityRef.current = setTimeout(() => {
      try { sessionStorage.removeItem('rl-opening-shown') } catch {}
      setToken('')
      setTokenError('')
      router.push('/')
    }, INACTIVITY_MS)
  }

  useEffect(() => {
    try {
      if (sessionStorage.getItem('rl-opening-shown')) {
        setPhase('done')
      } else {
        setPhase('animating')
        fallbackRef.current = setTimeout(() => setPhase('choice'), 4000)
      }
    } catch {
      setPhase('animating')
      fallbackRef.current = setTimeout(() => setPhase('choice'), 4000)
    }

    // Track inactivity
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    const handler = () => resetInactivity()
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    resetInactivity()

    return () => {
      if (fallbackRef.current) clearTimeout(fallbackRef.current)
      if (inactivityRef.current) clearTimeout(inactivityRef.current)
      events.forEach(e => window.removeEventListener(e, handler))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleAnimationEnd() {
    if (fallbackRef.current) clearTimeout(fallbackRef.current)
    setPhase('choice')
  }

  function goManager() {
    try { sessionStorage.setItem('rl-opening-shown', '1') } catch {}
    router.push('/login')
    // Keep overlay visible during navigation — it hides automatically when pathname === '/login'
  }

  function goResidentInput() {
    setPhase('resident-input')
  }

  function goResidentPortal() {
    setTokenError('')
    let tok = token.trim()

    // Detect landlord link → navigate directly
    const landlordMatch = tok.match(/\/landlord\/([^/?#\s]+)/)
    if (landlordMatch) {
      try { sessionStorage.setItem('rl-opening-shown', '1') } catch {}
      setPhase('done')
      router.push(`/landlord/${landlordMatch[1]}`)
      return
    }

    // Detect tenant link or bare token
    const tenantUrlMatch = tok.match(/\/tenant\/([0-9a-f]{48})/)
    if (tenantUrlMatch) tok = tenantUrlMatch[1]
    if (!/^[0-9a-f]{48}$/.test(tok)) {
      setTokenError('Pega tu enlace de portal (landlord o residente) o tu código de acceso.')
      return
    }
    try { sessionStorage.setItem('rl-opening-shown', '1') } catch {}
    setPhase('done')
    router.push(`/tenant/${tok}`)
  }

  if (phase === 'done' || isPortalRoute) return <></>
  // phase === null: render solid dark overlay instantly to prevent flash of content
  if (phase === null) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'linear-gradient(160deg,#0d0618 0%,#1a0a2e 45%,#2d1060 100%)' }} />
  )

  const reducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  return (
    <>
      <style>{`
        @keyframes rl-gridFade  { from{opacity:0} to{opacity:0.18} }
        @keyframes rl-glowPulse { 0%,100%{transform:scale(1);opacity:.55} 50%{transform:scale(1.18);opacity:.8} }
        @keyframes rl-orbitA    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes rl-orbitB    { from{transform:rotate(180deg)} to{transform:rotate(540deg)} }
        @keyframes rl-riseUp    { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes rl-logoReveal{ from{filter:blur(8px);transform:scale(.92);opacity:0} to{filter:blur(0);transform:scale(1);opacity:1} }
        @keyframes rl-textFade  { from{transform:translateY(12px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes rl-choiceFade{ from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        .rl-grid      { animation:${reducedMotion?'rl-gridFade .4s ease forwards':'rl-gridFade .6s .1s ease forwards'}; opacity:0; }
        .rl-glow      { animation:${reducedMotion?'none':'rl-glowPulse 3s ease-in-out infinite'}; }
        .rl-sil       { animation:${reducedMotion?'none':'rl-riseUp .8s .4s ease forwards'}; opacity:${reducedMotion?1:0}; }
        .rl-orbit-a   { animation:${reducedMotion?'none':'rl-orbitA 3s .7s linear infinite'}; transform-origin:center; }
        .rl-orbit-b   { animation:${reducedMotion?'none':'rl-orbitB 4s .7s linear infinite'}; transform-origin:center; }
        .rl-logo      { animation:${reducedMotion?'rl-logoReveal .4s .1s ease forwards':'rl-logoReveal .9s .7s ease forwards'}; opacity:0; }
        .rl-name      { animation:${reducedMotion?'rl-textFade .3s .3s ease forwards':'rl-textFade .7s 1.1s ease forwards'}; opacity:0; }
        .rl-desc      { animation:${reducedMotion?'rl-textFade .3s .4s ease forwards':'rl-textFade .7s 1.4s ease forwards'}; opacity:0; }
        .rl-choice    { animation:rl-choiceFade .5s ease forwards; }
        .rl-btn:hover { opacity:.85; }
      `}</style>

      <div
        style={{
          position:'fixed', inset:0, zIndex:9999,
          background:'linear-gradient(160deg,#0d0618 0%,#1a0a2e 45%,#2d1060 100%)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          overflow:'hidden',
        }}
      >
        {/* Blueprint grid */}
        <svg className="rl-grid" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="rl-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#a78bfa" strokeWidth=".5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#rl-grid)"/>
        </svg>

        {/* Property silhouettes */}
        <svg className="rl-sil" style={{position:'absolute',bottom:0,left:0,right:0,width:'100%',pointerEvents:'none'}}
          viewBox="0 0 800 200" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">
          <g stroke="#a78bfa" strokeWidth="1.2" fill="none" opacity=".3">
            <polyline points="80,180 80,120 120,90 160,120 160,180"/>
            <line x1="100" y1="180" x2="100" y2="145"/><line x1="100" y1="145" x2="140" y2="145"/><line x1="140" y1="145" x2="140" y2="180"/>
            <polyline points="200,180 200,100 260,65 320,100 320,180"/>
            <rect x="225" y="135" width="30" height="45"/>
            <polyline points="360,180 360,130 390,108 420,130 420,180"/>
            <polyline points="460,180 460,110 510,75 560,110 560,180"/>
            <rect x="485" y="140" width="25" height="40"/>
            <polyline points="590,180 590,120 630,92 670,120 670,180"/>
            <rect x="607" y="148" width="22" height="32"/>
            <polyline points="700,180 700,95 750,58 800,95 800,180"/>
            <rect x="722" y="128" width="28" height="52"/>
          </g>
        </svg>

        {/* Radial glow */}
        <div className="rl-glow" style={{
          position:'absolute', width:340, height:340, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(167,139,250,.38) 0%,rgba(107,33,168,.18) 50%,transparent 70%)',
          pointerEvents:'none',
        }}/>

        {/* Center composition */}
        <div style={{position:'relative',display:'flex',flexDirection:'column',alignItems:'center',gap:20,zIndex:1,padding:'0 24px',width:'100%',maxWidth:380}}>

          {/* Orbits + Logo */}
          <div style={{position:'relative',width:140,height:140,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg className="rl-orbit-a" style={{position:'absolute',inset:0,width:'100%',height:'100%'}} viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="70" cy="70" rx="65" ry="26" stroke="#a78bfa" strokeWidth="1" fill="none" opacity=".6"/>
              <circle cx="135" cy="70" r="4" fill="#a78bfa" opacity=".9"/>
            </svg>
            <svg className="rl-orbit-b" style={{position:'absolute',inset:0,width:'100%',height:'100%',transform:'rotate(58deg)'}} viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="70" cy="70" rx="65" ry="20" stroke="#c4b5fd" strokeWidth=".8" fill="none" opacity=".4"/>
              <circle cx="135" cy="70" r="3" fill="#d4af37" opacity=".85"/>
            </svg>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="rl-logo"
              src="/logo.png"
              alt="Rose Legacy"
              style={{width:80,height:80,borderRadius:18,objectFit:'cover',position:'relative',zIndex:1,boxShadow:'0 0 28px rgba(167,139,250,.55)'}}
              onError={e => {(e.target as HTMLImageElement).style.display='none'}}
            />
          </div>

          {/* Brand text */}
          <div style={{textAlign:'center'}}>
            <div className="rl-name" style={{fontSize:'clamp(26px,6vw,38px)',fontWeight:800,color:'#fff',letterSpacing:'.02em',lineHeight:1.1}}>
              Rose Legacy
            </div>
            <div
              className="rl-desc"
              style={{fontSize:'clamp(11px,2vw,13px)',fontWeight:500,color:'#a78bfa',letterSpacing:'.2em',textTransform:'uppercase',marginTop:7}}
              onAnimationEnd={!reducedMotion ? handleAnimationEnd : undefined}
            >
              Property Management
            </div>
          </div>

          {/* Buttons */}
          {(phase === 'choice' || phase === 'resident-input') && (
            <div className="rl-choice" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12,marginTop:8,width:'100%'}}>
              {phase === 'choice' && (
                <>
                  <button className="rl-btn" onClick={goManager} style={{
                    width:'100%',padding:'14px',borderRadius:14,border:'1.5px solid #6b21a8',
                    background:'rgba(107,33,168,.3)',color:'#fff',fontSize:16,fontWeight:700,
                    cursor:'pointer',backdropFilter:'blur(10px)',letterSpacing:'.02em',transition:'opacity .15s',
                  }}>
                    Manager
                  </button>
                  <button className="rl-btn" onClick={goResidentInput} style={{
                    width:'100%',padding:'14px',borderRadius:14,border:'1.5px solid #a78bfa',
                    background:'rgba(167,139,250,.12)',color:'#a78bfa',fontSize:16,fontWeight:700,
                    cursor:'pointer',backdropFilter:'blur(10px)',letterSpacing:'.02em',transition:'opacity .15s',
                  }}>
                    Resident
                  </button>
                </>
              )}
              {phase === 'resident-input' && (
                <div style={{width:'100%',display:'flex',flexDirection:'column',gap:10}}>
                  <p style={{color:'#c4b5fd',fontSize:13,margin:0,textAlign:'center',lineHeight:1.5}}>
                    Pega el enlace de tu portal (landlord o residente)
                  </p>
                  <input
                    autoFocus
                    value={token}
                    onChange={e => { setToken(e.target.value); setTokenError('') }}
                    onKeyDown={e => { if (e.key==='Enter') goResidentPortal() }}
                    placeholder="https://…/landlord/… o /tenant/… o tu código"
                    style={{
                      width:'100%',padding:'12px 14px',borderRadius:10,border:'1.5px solid #6b21a8',
                      background:'rgba(255,255,255,.08)',color:'#fff',fontSize:14,
                      outline:'none',boxSizing:'border-box',
                    }}
                  />
                  {tokenError && <p style={{color:'#f87171',fontSize:12,margin:0}}>{tokenError}</p>}
                  <button onClick={goResidentPortal} style={{
                    width:'100%',padding:'13px',borderRadius:12,border:'none',
                    background:'#6b21a8',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',
                  }}>
                    Acceder
                  </button>
                  <button onClick={() => setPhase('choice')} style={{
                    background:'none',border:'none',color:'#a78bfa',fontSize:13,cursor:'pointer',padding:4,
                  }}>
                    ← Volver
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
