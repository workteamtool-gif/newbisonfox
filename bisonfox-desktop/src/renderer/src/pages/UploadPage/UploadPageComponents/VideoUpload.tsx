import React, { JSX } from 'react'
import '@renderer/pages/UploadPage/UploadPage.css'

export interface VideoUploadProps {
  loadingVideo: string
  phaseLabel: JSX.Element
}

export function VideoUpload({ loadingVideo, phaseLabel }: VideoUploadProps): React.JSX.Element {
  return (
    <div className="video-container">
      <video className="background-video" src={loadingVideo} autoPlay loop muted playsInline />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(10,16,20,0.9) 0%, transparent 60%)',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '1rem 1.4rem',
          direction: 'ltr'
        }}
      >
        <span
          style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#f8fafc',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)'
          }}
        >
          <span
            className="spin"
            style={{
              display: 'inline-block',
              marginRight: '10px',
              color: 'var(--accent-cyan)'
            }}
          >
            ⟳
          </span>
          {phaseLabel}
        </span>
      </div>
    </div>
  )
}
