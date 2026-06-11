'use client'

export default function DeletePropertyButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (
          !confirm(
            'Delete this property? Its tickets and call history will also be deleted. This cannot be undone.'
          )
        ) {
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
      Delete Property
    </button>
  )
}
