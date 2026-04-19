import React from 'react'

export interface FailedItemsUploadProps {
    failedCount: number
    failedFilesList: { path: string; reason: string }[]
    MAX_FAILED_FILES_TO_SHOW: number
    skipFailed: () => void
    retryFailed: () => void
}

export function FailedItemsUpload({
    failedCount,
    failedFilesList,
    MAX_FAILED_FILES_TO_SHOW,
    skipFailed,
    retryFailed
}: FailedItemsUploadProps): React.JSX.Element {

    return (
        <>
            <div
                className="info-box"
                style={{
                    borderColor: 'var(--accent-red)',
                    background: 'rgba(239, 68, 68, 0.05)',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    marginBottom: '1.5rem',
                    textAlign: 'left',
                    position: 'relative'
                }}
            >
                <h4
                    style={{
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--accent-red)'
                    }}
                >
                    ⚠️ לא ניתן היה להעתיק {failedCount} קבצים
                </h4>
                <div
                    style={{
                        maxHeight: '400px',
                        overflowY: 'auto',
                        fontSize: '0.82rem',
                        width: '100%'
                    }}
                >
                    <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                        {failedFilesList.slice(0, MAX_FAILED_FILES_TO_SHOW).map((f, i) => (
                            <li key={i} style={{ marginBottom: '0.5rem', wordBreak: 'break-all' }}>
                                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                    {f.path}
                                </div>
                                <div
                                    style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--accent-red)',
                                        opacity: 0.85
                                    }}
                                >
                                    סיבה: {f.reason}
                                </div>
                            </li>
                        ))}
                    </ul>
                    {failedCount > MAX_FAILED_FILES_TO_SHOW && (
                        <div
                            style={{
                                fontStyle: 'italic',
                                color: 'var(--text-secondary)',
                                marginTop: '0.3rem',
                                direction: 'rtl'
                            }}
                        >
                            ...ועוד {failedCount - MAX_FAILED_FILES_TO_SHOW} (רק {MAX_FAILED_FILES_TO_SHOW} הכשלונות הראשונים מוצגים).
                        </div>
                    )}
                </div>

                <div
                    style={{
                        display: 'flex',
                        gap: '0.75rem',
                        marginTop: '0.75rem',
                        width: '100%',
                        justifyItems: 'flex-end',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between'
                    }}
                >
                    <button className="btn" style={{ background: 'hsl(142, 71%, 45%, .8)' }} onClick={skipFailed}>
                        דלג על פריטים שנכשלו
                    </button>
                    <button className="btn btn-primary" onClick={retryFailed}>
                        🔄 נסה שוב פריטים שנכשלו
                    </button>
                </div>
            </div>


        </>
    )
}
