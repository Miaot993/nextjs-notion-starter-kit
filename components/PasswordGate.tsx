import { useState, useEffect } from 'react'

interface PasswordGateProps {
  children: React.ReactNode
}

export const PasswordGate = ({ children }: PasswordGateProps) => {
  // 这里设置你的密码！(比如设置成 'vip888')
  const CORRECT_PASSWORD = 'ai888vip' 
  
  // 这里设置 LocalStorage 的钥匙名，防止用户刷新页面就要重输
  const STORAGE_KEY = 'aippt_vip_access'

  const [input, setInput] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [error, setError] = useState(false)

  // 检查是否之前输对过
  useEffect(() => {
    const hasAccess = localStorage.getItem(STORAGE_KEY)
    if (hasAccess === 'true') {
      setIsUnlocked(true)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input === CORRECT_PASSWORD) {
      setIsUnlocked(true)
      localStorage.setItem(STORAGE_KEY, 'true')
      setError(false)
    } else {
      setError(true)
      setInput('')
    }
  }

  // 如果解锁了，直接展示原本的内容 (children)
  if (isUnlocked) {
    return <>{children}</>
  }

  // 如果没解锁，展示漂亮的锁屏界面
  return (
    <div className="password-gate-container">
      <style jsx>{`
        .password-gate-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 1rem;
          min-height: 60vh;
          text-align: center;
        }
        .lock-icon {
          font-size: 3rem;
          margin-bottom: 1.5rem;
        }
        h2 {
          font-family: var(--font-serif);
          margin-bottom: 1rem;
        }
        p {
          color: var(--fg-color-2);
          margin-bottom: 2rem;
          max-width: 400px;
        }
        input {
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid var(--accents-2);
          background: var(--bg-color);
          color: var(--fg-color);
          font-size: 1rem;
          margin-right: 8px;
          outline: none;
          transition: all 0.2s;
        }
        input:focus {
          border-color: var(--notion-blue);
          box-shadow: 0 0 0 2px rgba(43, 108, 176, 0.2);
        }
        button {
          padding: 12px 24px;
          background: var(--fg-color);
          color: var(--bg-color);
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        button:hover {
          opacity: 0.9;
        }
        .error {
          color: #e53e3e;
          margin-top: 1rem;
          font-size: 0.9rem;
          animation: shake 0.5s;
        }
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
          100% { transform: translateX(0); }
        }
      `}</style>

      <div className="lock-icon">🔒</div>
      <h2>VIP 专属内容</h2>
      <p>此页面包含高阶 AI 实战教程，仅对购买进阶版的用户开放。请输入您的专属密钥。</p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center' }}>
        <input 
          type="password" 
          placeholder="输入密钥..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit">解锁</button>
      </form>
      
      {error && <div className="error">密钥错误，请检查后重试</div>}
    </div>
  )
}
