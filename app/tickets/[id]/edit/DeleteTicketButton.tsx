'use client'

export default function DeleteTicketButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm('Delete this ticket? This cannot be undone.')) {
          e.preventDefault()
        }
      }}
      style={{
        background: '#b91c1c',
        color: '#fff',
        border: 'none',
        padding: '14px 18px',
        borderRadius: '10px',
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      Delete Ticket
    </button>
  )
}
