import React, { JSX } from 'react'

export interface VideoUploadProps {
    loadingVideo: string
    phaseLabel: JSX.Element
}

export function VideoUpload({
    loadingVideo,
    phaseLabel
}: VideoUploadProps): React.JSX.Element {

    return (
        <>
            <div
                style={{
                    borderRadius: 'var(--r-lg)',
                    overflow: 'hidden',
                    marginBottom: '1.5rem',
                    position: 'relative',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    border: '1px solid var(--border-glass)',
                    height: '60%'
                }}
            >
                <video
                    src={loadingVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        filter: 'brightness(0.8) contrast(1.1)'
                    }}
                />
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
        </>
    )
}
