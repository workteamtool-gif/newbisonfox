
import { clientLogger } from '@renderer/utils/logger'
import React, { useEffect } from 'react'

export interface ReadyUploadProps {
    countingComplete: boolean
    startUpload: () => void
    preCalcTotal: number | null
}

export function CountingUpload({
    countingComplete,
    startUpload,
    preCalcTotal
}: ReadyUploadProps): React.JSX.Element {

    useEffect(() => {
        if (countingComplete) {
            clientLogger.info('ReadyUpload', 'Counting complete, auto-starting upload');
            startUpload();
        }
    }, [countingComplete, startUpload]);

    return (
        <div style={{ textAlign: 'center' }}>
            <p className="page-title">מוכן להעתקה
            </p>
            <div
                className="info-box"
                style={{
                    margin: '2rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    alignItems: 'center'
                }}
            >
                <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</span>
                <span style={{ color: 'var(--text-primary)' }}>
                    <span className="spin">⟳</span>
                    {preCalcTotal !== null && preCalcTotal > 0
                        ? ` נמצאו ${preCalcTotal.toLocaleString()} קבצים עד כה...`
                        : ' סופרים קבצים...'}
                </span>
            </div>
        </div>

    )
}
