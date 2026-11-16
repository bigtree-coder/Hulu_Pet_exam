import { go, useHash } from './hooks'
import Parent from './pages/Parent'
import Practice from './pages/Practice'
import Speaking from './pages/Speaking'
import Stickers from './pages/Stickers'
import Today from './pages/Today'
import Writing from './pages/Writing'

const NAV = [
  { page: 'today', icon: '☀️', label: 'Today' },
  { page: 'speak', icon: '🎙️', label: 'Speak' },
  { page: 'write', icon: '✏️', label: 'Write' },
  { page: 'stickers', icon: '🌟', label: 'Stickers' },
]

export default function App() {
  const page = useHash()
  if (page === 'practice') return <div className="app"><Practice /></div>
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Hulu PET</div>
        <button className="btn quiet" onClick={() => go(page === 'parent' ? 'today' : 'parent')}>
          {page === 'parent' ? '← 返回' : '🔒 家长'}
        </button>
      </header>
      {page === 'speak' ? <Speaking />
        : page === 'write' ? <Writing />
        : page === 'stickers' ? <Stickers />
        : page === 'parent' ? <Parent />
        : <Today />}
      {page !== 'parent' && (
        <nav className="nav">
          <div className="nav-inner">
            {NAV.map((n) => (
              <a key={n.page} href={`#/${n.page}`} className={page === n.page ? 'on' : ''}>
                <span>{n.icon}</span>{n.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
