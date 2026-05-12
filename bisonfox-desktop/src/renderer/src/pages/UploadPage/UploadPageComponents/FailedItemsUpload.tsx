import React from 'react'

export interface FailedItemsUploadProps {
    failedCount: number
    failedFilesList: { path: string; reason: string }[]
    MAX_FAILED_FILES_TO_SHOW: number
    skipFailed: () => void
    retryFailed: () => void
    retryAll: () => void
}

const MAX_TRACKED_FAILURES = Number(import.meta.env.VITE_MAX_REPORTED_FAILURES) || 100_000
console.log("lalal " + import.meta.env.VITE_MAX_REPORTED_FAILURES)
export function FailedItemsUpload({
    failedCount,
    failedFilesList,
    skipFailed,
    retryFailed,
    retryAll
}: FailedItemsUploadProps): React.JSX.Element {

    const exceedsTrackingLimit = failedCount > MAX_TRACKED_FAILURES

    return (
        <>
            <div
                className="info-box"
                style={{
                    borderColor: 'var(--accent-red)',
                    background: 'rgba(239, 68, 68, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: 0,
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
                        color: 'var(--accent-red)',
                        fontSize: '2rem',
                    }}
                >
                    ⚠️ לא ניתן היה להעתיק {failedCount.toLocaleString()} קבצים
                </h4>
                <div
                    style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        fontSize: '1.5rem',
                        width: '100%'
                    }}
                >
                    <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                        {failedFilesList.slice(0, MAX_TRACKED_FAILURES).map((f, i) => (
                            <li key={i} style={{ marginBottom: '0.5rem', wordBreak: 'break-all' }}>
                                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                    {f.path}
                                </div>
                                <div
                                    style={{
                                        color: 'var(--accent-red)',
                                        opacity: 0.85
                                    }}
                                >
                                    REASON: {f.reason}
                                </div>
                            </li>
                        ))}
                    </ul>
                    {failedCount > MAX_TRACKED_FAILURES && (
                        <div
                            style={{
                                fontStyle: 'italic',
                                color: 'var(--text-secondary)',
                                marginTop: '0.3rem',
                                direction: 'ltr'
                            }}
                        >
                            Only {MAX_TRACKED_FAILURES} first failed files are shown. There are more {failedCount - MAX_TRACKED_FAILURES} failed files
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
                        justifyContent: 'space-between',
                        fontSize: '1.7rem'
                    }}
                >
                    <button className="btn" style={{ background: 'hsl(142, 71%, 45%, .8)' }} onClick={skipFailed}>
                        דלג על פריטים שנכשלו
                    </button>
                    {exceedsTrackingLimit ? (<>
                        <button className="btn btn-primary" onClick={retryAll}>
                            🔄 נסה שוב את כל הקבצים
                        </button>
                        <div
                            style={{
                                marginTop: '0.5rem',
                                padding: '0.6rem 0.8rem',
                                background: 'rgba(251, 191, 36, 0.08)',
                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                borderRadius: 'var(--r-md)',
                                fontSize: '1.8rem',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            ⚠️ נכשלו יותר מ-{MAX_TRACKED_FAILURES.toLocaleString()} קבצים. המערכת לא שמרה את כל הכשלונות. לחיצה על "נסה שוב את כל הקבצים" תעלה מחדש את כל הקבצים שנבחרו.
                        </div>
                    </>
                    ) : (
                        <button className="btn btn-primary" onClick={retryFailed}>
                            🔄 נסה שוב פריטים שנכשלו
                        </button>
                    )}
                </div>
            </div>


        </>
    )
}
