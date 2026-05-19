'use client'

type Props = {
  type: 'success' | 'error'
  message: string
  onClose: () => void
}

export default function Modal({ type, message, onClose }: Props) {
  const isSuccess = type === 'success'
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
         onClick={onClose}>
      <div
        className="bg-[#111318] border border-[#252c3a] rounded-2xl p-8 max-w-sm w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4
          ${isSuccess ? 'bg-[#00d17a]/10' : 'bg-[#ff4d6d]/10'}`}>
          {isSuccess ? (
            <svg className="w-7 h-7 text-[#00d17a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-7 h-7 text-[#ff4d6d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          )}
        </div>
        <h3 className={`text-center font-bold text-lg mb-2 ${isSuccess ? 'text-[#00d17a]' : 'text-[#ff4d6d]'}`}>
          {isSuccess ? 'Success' : 'Error'}
        </h3>
        <p className="text-center text-gray-300 text-sm leading-relaxed mb-6">{message}</p>
        <button onClick={onClose} className="btn-primary w-full">
          {isSuccess ? 'Awesome!' : 'Got it'}
        </button>
      </div>
    </div>
  )
}
