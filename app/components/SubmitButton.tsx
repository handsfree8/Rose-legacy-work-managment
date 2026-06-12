'use client'

import { useFormStatus } from 'react-dom'
import type { CSSProperties, ReactNode } from 'react'

type SubmitButtonProps = {
  children: ReactNode
  style?: CSSProperties
  pendingText?: string
}

export default function SubmitButton({ children, style, pendingText }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      style={{
        ...style,
        opacity: pending ? 0.7 : 1,
        cursor: pending ? 'not-allowed' : style?.cursor || 'pointer',
      }}
    >
      {pending ? pendingText || 'Saving...' : children}
    </button>
  )
}
