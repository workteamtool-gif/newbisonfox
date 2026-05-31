import { JSX } from 'react'

interface UserNameInputProps {
  name: string;
  setName: (v: string) => void;
  nameError: string;
  maxNameLength: number;
  validateName: (v: string) => void;
  setActiveInput: (input: 'name') => void;
}

export function UserNameInput({
  name,
  setName,
  nameError,
  maxNameLength,
  validateName,
  setActiveInput
}: UserNameInputProps): JSX.Element {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor="name-input">
        שם המשתמש:
      </label>
      <input
        id="name-input"
        className={`form-input ${nameError ? 'error' : ''}`}
        type="text"
        maxLength={maxNameLength}
        value={name}
        style={{ direction: 'ltr' }}
        onFocus={() => setActiveInput('name')}
        placeholder="t_lightning_fox"
        onChange={(e) => {
          validateName(e.target.value)
          setName(e.target.value)
        }}
        autoFocus
      />
      <span
        className="form-msg"
        style={{
          minHeight: '1.4em',
          display: 'block',
          visibility: nameError || name.length >= maxNameLength ? 'visible' : 'hidden',
          color: nameError ? 'var(--accent-red)' : 'var(--accent-orange)'
        }}
      >
        ⚠{' '}
        {nameError ||
          (name.length >= maxNameLength
            ? `הגעת למגבלת התווים המקסימלית (${maxNameLength} תווים).`
            : '')}
      </span>
    </div>
  )
}

interface SubfolderInputProps {
  subfolder: string;
  setSubfolder: (v: string) => void;
  subfolderError: string;
  maxSubfolderLength: number;
  validateSubfolder: (v: string) => void;
  setActiveInput: (input: 'subfolder') => void;
}

export function SubfolderInput({
  subfolder,
  setSubfolder,
  subfolderError,
  maxSubfolderLength,
  validateSubfolder,
  setActiveInput
}: SubfolderInputProps): JSX.Element {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor="subfolder-input">
        בחר שם להעברה שלך (אופציונלי):
      </label>
      <input
        id="subfolder-input"
        className={`form-input ${subfolderError ? 'error' : ''}`}
        type="text"
        maxLength={maxSubfolderLength}
        value={subfolder}
        style={{ direction: 'ltr' }}
        onFocus={() => setActiveInput('subfolder')}
        onChange={(e) => {
          validateSubfolder(e.target.value)
          setSubfolder(e.target.value)
        }}
      />
      <span
        className="form-msg"
        style={{
          minHeight: '1.4em',
          display: 'block',
          visibility:
            subfolderError || subfolder.length >= maxSubfolderLength
              ? 'visible'
              : 'hidden',
          color: subfolderError ? 'var(--accent-red)' : 'var(--accent-orange)'
        }}
      >
        ⚠{' '}
        {subfolderError ||
          (subfolder.length >= maxSubfolderLength
            ? `הגעת למגבלת התווים המקסימלית (${maxSubfolderLength} תווים).`
            : '')}
      </span>
    </div>
  )
}
