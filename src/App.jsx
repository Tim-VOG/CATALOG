// EquipLend - Main Application
import { useState, useEffect } from 'react'
import { useAuth } from './lib/auth'
import * as db from './lib/supabase'

// ============================================
// ICONS
// ============================================
const Icon = ({ name, size = 20 }) => {
  const icons = {
    box: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>,
    cart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/></svg>,
    list: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>,
    calendar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
    inbox: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
    refresh: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>,
    arrowLeft: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
    minus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    mail: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
    phone: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    logOut: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>,
    wifiOff: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" x2="22" y1="2" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><line x1="12" x2="12.01" y1="20" y2="20"/></svg>,
    alertTriangle: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  }
  return icons[name] || null
}

// ============================================
// UTILITIES
// ============================================
const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const formatDateShort = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
const getDaysUntil = (d) => { const today = new Date(); today.setHours(0,0,0,0); const target = new Date(d); target.setHours(0,0,0,0); return Math.ceil((target - today) / 86400000) }

// ============================================
// TOAST
// ============================================
const Toast = ({ message, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return <div className={`toast ${type}`}><span>{type === 'success' ? '✓' : '✕'} {message}</span><button onClick={onClose}><Icon name="x" size={16} /></button></div>
}

// ============================================
// LOGIN VIEW
// ============================================
const LoginView = () => {
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSignUp) {
        await signUp(email, password, { first_name: firstName, last_name: lastName })
        setError('Check your email to confirm your account!')
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🔐 {isSignUp ? 'Sign Up' : 'Sign In'}</h1>
          <p>{isSignUp ? 'Create your account' : 'Access EquipLend'}</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          {isSignUp && (
            <>
              <div className="form-group"><label>First Name</label><input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
              <div className="form-group"><label>Last Name</label><input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
            </>
          )}
          <div className="form-group"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="form-group"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
          <button type="submit" className="login-btn" disabled={loading}>{loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}</button>
        </form>
        <button className="login-toggle" onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  )
}

// ============================================
// NAVIGATION
// ============================================
const Navigation = ({ view, setView, cartCount }) => {
  const { user, profile, isAdmin, signOut } = useAuth()
  
  return (
    <nav className="navigation">
      <div className="nav-brand"><Icon name="box" size={28} /><span>EquipLend</span></div>
      <div className="nav-links">
        <button className={`nav-link ${view === 'catalog' ? 'active' : ''}`} onClick={() => setView('catalog')}><Icon name="box" size={18} /><span>Catalog</span></button>
        <button className={`nav-link ${view === 'cart' ? 'active' : ''}`} onClick={() => setView('cart')}><Icon name="cart" size={18} /><span>Cart</span>{cartCount > 0 && <span className="cart-badge">{cartCount}</span>}</button>
        {isAdmin && (
          <>
            <div className="nav-divider" />
            <button className={`nav-link admin ${view.startsWith('admin') ? 'active' : ''}`} onClick={() => setView('admin-products')}><Icon name="settings" size={18} /><span>Admin</span></button>
          </>
        )}
        <div className="nav-divider" />
        <span className="user-info">{profile?.first_name || user?.email}</span>
        <button className="nav-link" onClick={signOut}><Icon name="logOut" size={18} /></button>
      </div>
    </nav>
  )
}

// ============================================
// ADMIN SIDEBAR
// ============================================
const AdminSidebar = ({ view, setView, pendingCount }) => {
  const { signOut } = useAuth()
  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header"><Icon name="settings" size={20} />Administration</div>
      <div className="sidebar-nav">
        <button className={`sidebar-link ${view === 'admin-products' ? 'active' : ''}`} onClick={() => setView('admin-products')}><Icon name="list" size={18} />Products</button>
        <button className={`sidebar-link ${view === 'admin-requests' ? 'active' : ''}`} onClick={() => setView('admin-requests')}><Icon name="inbox" size={18} />Requests{pendingCount > 0 && <span className="pending-badge">{pendingCount}</span>}</button>
        <button className={`sidebar-link ${view === 'admin-returns' ? 'active' : ''}`} onClick={() => setView('admin-returns')}><Icon name="refresh" size={18} />Returns</button>
      </div>
      <button className="sidebar-back" onClick={() => setView('catalog')}><Icon name="arrowLeft" size={16} />Back to catalog</button>
      <button className="sidebar-logout" onClick={signOut}><Icon name="logOut" size={16} />Sign out</button>
    </aside>
  )
}

// ============================================
// PRODUCT CARD
// ============================================
const ProductCard = ({ product, loans, cart, onAddToCart, subscriptionPlans }) => {
  const [showConfig, setShowConfig] = useState(false)
  const activeLoans = loans.filter(l => l.product_id === product.id && (l.status === 'active' || l.status === 'pending'))
  const borrowed = activeLoans.reduce((sum, l) => sum + l.quantity, 0)
  const inCart = cart.find(c => c.product.id === product.id)?.quantity || 0
  const available = product.total_stock - borrowed - inCart
  const needsConfig = product.has_accessories || product.has_software || product.has_subscription || product.has_apps

  const handleAdd = () => { if (needsConfig) setShowConfig(true); else onAddToCart(product, 1, {}) }
  const handleConfirm = (opts) => { onAddToCart(product, 1, opts); setShowConfig(false) }

  return (
    <>
      <div className="product-card">
        <div className="product-image">
          <img src={product.image_url || 'https://via.placeholder.com/400x250?text=No+Image'} alt={product.name} />
          <span className="product-category-tag" style={{background: product.category_color || '#6b7280'}}>{product.category_name}{product.sub_type && ` - ${product.sub_type}`}</span>
        </div>
        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          <p className="product-description">{product.description}</p>
          {product.includes?.length > 0 && <div className="product-includes">{product.includes.map((item, i) => <span key={i} className="include-tag"><Icon name="check" size={12} />{item}</span>)}</div>}
          {product.wifi_only && <div className="product-includes"><span className="wifi-only-badge"><Icon name="wifiOff" size={12} />WiFi only - No 4G/5G</span></div>}
          {product.printer_info && <div className="product-includes"><span className="wifi-only-badge" style={{background:'rgba(245,158,11,0.2)',color:'var(--color-warning)',borderColor:'var(--color-warning)'}}><Icon name="alertTriangle" size={12} />B&W Laser - Print only</span></div>}
          <div className="product-footer">
            <div className="stock-info"><span className={`stock-count ${available > 3 ? 'available' : available > 0 ? 'low' : 'out'}`}>{available}</span> / {product.total_stock} available</div>
            <button className="add-to-cart-btn" onClick={handleAdd} disabled={available <= 0}><Icon name="plus" size={16} />{needsConfig ? 'Configure' : 'Add'}</button>
          </div>
        </div>
      </div>
      {showConfig && <ProductConfigModal product={product} subscriptionPlans={subscriptionPlans} onConfirm={handleConfirm} onClose={() => setShowConfig(false)} />}
    </>
  )
}

// ============================================
// PRODUCT CONFIG MODAL
// ============================================
const ProductConfigModal = ({ product, subscriptionPlans, onConfirm, onClose }) => {
  const [options, setOptions] = useState({ accessories: [], software: [], otherSoftware: '', subscription: '', subscriptionType: 'call', apps: '' })
  const toggleArray = (field, value) => setOptions(prev => ({ ...prev, [field]: prev[field].includes(value) ? prev[field].filter(v => v !== value) : [...prev[field], value] }))
  const filteredPlans = subscriptionPlans.filter(p => p.type === options.subscriptionType || p.type === 'both')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal large" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Configure: {product.name}</h2><button className="modal-close" onClick={onClose}><Icon name="x" /></button></div>
        <div className="modal-body">
          {product.has_accessories && (
            <div className="config-section">
              <div className="config-section-title">Accessories</div>
              <div className="checkbox-group">
                <label className="checkbox-item"><input type="checkbox" checked={options.accessories.includes('keyboard')} onChange={() => toggleArray('accessories', 'keyboard')} /><span className="checkbox-label">Keyboard</span></label>
                <label className="checkbox-item"><input type="checkbox" checked={options.accessories.includes('mouse')} onChange={() => toggleArray('accessories', 'mouse')} /><span className="checkbox-label">Mouse</span></label>
              </div>
            </div>
          )}
          {product.has_software && (
            <div className="config-section">
              <div className="config-section-title">Software</div>
              <div className="checkbox-group">
                <label className="checkbox-item"><input type="checkbox" checked={options.software.includes('office')} onChange={() => toggleArray('software', 'office')} /><span className="checkbox-label">Microsoft Office Suite</span></label>
                <label className="checkbox-item"><input type="checkbox" checked={options.software.includes('other')} onChange={() => toggleArray('software', 'other')} /><span className="checkbox-label">Other software</span></label>
              </div>
              {options.software.includes('other') && <div className="form-group" style={{marginTop:'0.5rem'}}><input type="text" value={options.otherSoftware} onChange={(e) => setOptions({...options, otherSoftware: e.target.value})} placeholder="Specify software..." /></div>}
            </div>
          )}
          {product.has_subscription && (
            <div className="config-section">
              <div className="config-section-title">Subscription Plan</div>
              <div className="form-group"><label>Type</label>
                <div className="radio-group">
                  <label className="radio-item"><input type="radio" name="subType" checked={options.subscriptionType === 'call'} onChange={() => setOptions({...options, subscriptionType: 'call', subscription: ''})} /><span>Call only</span></label>
                  <label className="radio-item"><input type="radio" name="subType" checked={options.subscriptionType === 'data'} onChange={() => setOptions({...options, subscriptionType: 'data', subscription: ''})} /><span>Data only</span></label>
                  <label className="radio-item"><input type="radio" name="subType" checked={options.subscriptionType === 'both'} onChange={() => setOptions({...options, subscriptionType: 'both', subscription: ''})} /><span>Call + Data</span></label>
                </div>
              </div>
              <div className="form-group"><label>Select Plan</label>
                <div className="checkbox-group">{filteredPlans.map(plan => (<label key={plan.id} className="checkbox-item"><input type="radio" name="sub" checked={options.subscription === plan.id} onChange={() => setOptions({...options, subscription: plan.id})} /><span className="checkbox-label">{plan.name}</span><span className="checkbox-price">{plan.price}</span></label>))}</div>
              </div>
            </div>
          )}
          {product.has_apps && (
            <div className="config-section">
              <div className="config-section-title">Apps to Pre-install</div>
              <div className="form-group"><textarea value={options.apps} onChange={(e) => setOptions({...options, apps: e.target.value})} placeholder="List apps..." rows="2" /></div>
            </div>
          )}
          {product.includes?.length > 0 && (
            <div className="config-section">
              <div className="config-section-title">Included</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'0.5rem'}}>{product.includes.map((item, i) => <span key={i} className="include-tag"><Icon name="check" size={12} />{item}</span>)}</div>
            </div>
          )}
          {product.wifi_only && <div className="config-section"><div className="wifi-only-badge" style={{display:'inline-flex'}}><Icon name="wifiOff" size={14} />WiFi only</div></div>}
        </div>
        <div className="modal-footer"><button className="modal-btn secondary" onClick={onClose}>Cancel</button><button className="modal-btn primary" onClick={() => onConfirm(options)}>Add to Cart</button></div>
      </div>
    </div>
  )
}

// ============================================
// CATALOG VIEW
// ============================================
const CatalogView = ({ products, loans, cart, onAddToCart, categories, subscriptionPlans }) => {
  const [search, setSearch] = useState('')
  const [selCat, setSelCat] = useState('All')
  const filtered = products.filter(p => (p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase())) && (selCat === 'All' || p.category_name === selCat))
  
  return (
    <div className="catalog-view">
      <div className="catalog-header"><h1>Equipment Catalog</h1><p>Browse and reserve equipment</p></div>
      <div className="catalog-filters">
        <div className="search-box"><Icon name="search" size={18} /><input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="category-filters">
          <button className={`category-btn ${selCat === 'All' ? 'active' : ''}`} onClick={() => setSelCat('All')}>All</button>
          {categories.map(c => <button key={c.id} className={`category-btn ${selCat === c.name ? 'active' : ''}`} onClick={() => setSelCat(c.name)}>{c.name}</button>)}
        </div>
      </div>
      <div className="products-grid">{filtered.map(p => <ProductCard key={p.id} product={p} loans={loans} cart={cart} onAddToCart={onAddToCart} subscriptionPlans={subscriptionPlans} />)}</div>
      {filtered.length === 0 && <div className="cart-empty"><Icon name="search" size={64} /><h2>No equipment found</h2></div>}
    </div>
  )
}

// ============================================
// CART VIEW
// ============================================
const CartView = ({ cart, loans, updateCartItem, removeFromCart, onSubmitRequest, products, subscriptionPlans }) => {
  const { user, profile } = useAuth()
  const [pickupDate, setPickupDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const checkAvail = (productId, qty) => {
    if (!pickupDate || !returnDate) return true
    const overlaps = loans.filter(l => l.product_id === productId && (l.status === 'active' || l.status === 'pending') && !(returnDate < l.pickup_date || pickupDate > l.return_date))
    const borrowed = overlaps.reduce((s, l) => s + l.quantity, 0)
    const product = products.find(p => p.id === productId)
    return product && (product.total_stock - borrowed >= qty)
  }

  const allAvail = cart.every(i => checkAvail(i.product.id, i.quantity))
  const canSubmit = cart.length > 0 && pickupDate && returnDate && allAvail

  const handleSubmit = async () => {
    setLoading(true)
    await onSubmitRequest({ pickupDate, returnDate, notes, items: cart })
    setLoading(false)
  }

  if (cart.length === 0) return <div className="cart-view"><div className="cart-empty"><Icon name="cart" size={64} /><h2>Your cart is empty</h2></div></div>

  return (
    <div className="cart-view">
      <div className="cart-header"><h1>Your Cart</h1></div>
      <div className="cart-section">
        <h3 className="cart-section-title"><Icon name="box" size={18} />Selected Items</h3>
        {cart.map(i => (
          <div key={i.product.id} className="cart-item">
            <div className="cart-item-image"><img src={i.product.image_url} alt={i.product.name} /></div>
            <div className="cart-item-info"><div className="cart-item-name">{i.product.name}</div><div className="cart-item-category">{i.product.category_name}</div></div>
            <div className="quantity-control">
              <button className="quantity-btn" onClick={() => updateCartItem(i.product.id, i.quantity - 1)}><Icon name="minus" size={16} /></button>
              <span className="quantity-value">{i.quantity}</span>
              <button className="quantity-btn" onClick={() => updateCartItem(i.product.id, i.quantity + 1)}><Icon name="plus" size={16} /></button>
            </div>
            <button className="remove-btn" onClick={() => removeFromCart(i.product.id)}><Icon name="trash" size={18} /></button>
          </div>
        ))}
      </div>
      <div className="cart-section">
        <h3 className="cart-section-title"><Icon name="calendar" size={18} />Loan Period</h3>
        <div className="date-inputs">
          <div className="form-group"><label>Pickup Date</label><input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} min={new Date().toISOString().split('T')[0]} /></div>
          <div className="form-group"><label>Return Date</label><input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} min={pickupDate || new Date().toISOString().split('T')[0]} /></div>
        </div>
        {pickupDate && returnDate && !allAvail && <div className="availability-warning"><Icon name="x" size={18} />Some items not available</div>}
      </div>
      <div className="cart-section">
        <h3 className="cart-section-title"><Icon name="user" size={18} />Your Information</h3>
        <p style={{marginBottom:'1rem',color:'var(--color-text-secondary)'}}>Requesting as: <strong>{profile?.first_name} {profile?.last_name}</strong> ({user?.email})</p>
        <div className="form-group"><label>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Purpose of loan..." rows="2" /></div>
      </div>
      <div className="submit-section"><button className="submit-btn" onClick={handleSubmit} disabled={!canSubmit || loading}><Icon name="check" size={20} />{loading ? 'Submitting...' : 'Submit Request'}</button></div>
    </div>
  )
}

// ============================================
// ADMIN PRODUCTS VIEW
// ============================================
const AdminProductsView = ({ products, categories, onRefresh }) => {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const handleSave = async (data) => {
    try {
      if (editing) {
        await db.updateProduct(editing.id, data)
      } else {
        await db.createProduct(data)
      }
      onRefresh()
      setShowForm(false)
      setEditing(null)
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this product?')) {
      await db.deleteProduct(id)
      onRefresh()
    }
  }

  return (
    <div className="admin-view">
      <div className="admin-header">
        <h1>Product Management</h1>
        <button className="add-product-btn" onClick={() => { setEditing(null); setShowForm(true) }}><Icon name="plus" size={18} />Add Product</button>
      </div>
      <table className="admin-table">
        <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Actions</th></tr></thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td><div className="table-product"><div className="table-product-image"><img src={p.image_url || 'https://via.placeholder.com/50'} alt={p.name} /></div><div><div style={{fontWeight:600}}>{p.name}</div><div style={{fontSize:'0.8rem',color:'var(--color-text-muted)'}}>{p.description}</div></div></div></td>
              <td><span className="table-category" style={{background: p.category_color || '#6b7280'}}>{p.category_name}</span></td>
              <td>{p.total_stock}</td>
              <td><div className="table-actions"><button className="table-action-btn edit" onClick={() => { setEditing(p); setShowForm(true) }}><Icon name="edit" size={14} />Edit</button><button className="table-action-btn delete" onClick={() => handleDelete(p.id)}><Icon name="trash" size={14} /></button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
      {showForm && <ProductFormModal product={editing} categories={categories} onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null) }} />}
    </div>
  )
}

// ============================================
// PRODUCT FORM MODAL
// ============================================
const ProductFormModal = ({ product, categories, onSave, onClose }) => {
  const [form, setForm] = useState(product ? {
    name: product.name,
    description: product.description || '',
    category_id: product.category_id,
    sub_type: product.sub_type || '',
    image_url: product.image_url || '',
    total_stock: product.total_stock,
    includes: product.includes || [],
    has_accessories: product.has_accessories,
    has_software: product.has_software,
    has_subscription: product.has_subscription,
    has_apps: product.has_apps,
    wifi_only: product.wifi_only,
    printer_info: product.printer_info
  } : {
    name: '', description: '', category_id: categories[0]?.id, sub_type: '', image_url: '', total_stock: 1,
    includes: [], has_accessories: false, has_software: false, has_subscription: false, has_apps: false, wifi_only: false, printer_info: false
  })

  const handleIncludes = (v) => setForm({ ...form, includes: v.split(',').map(i => i.trim()).filter(Boolean) })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal large" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>{product ? 'Edit Product' : 'Add Product'}</h2><button className="modal-close" onClick={onClose}><Icon name="x" /></button></div>
        <div className="modal-body">
          <div className="form-group"><label>Name *</label><input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
            <div className="form-group"><label>Category</label><select value={form.category_id} onChange={(e) => setForm({...form, category_id: e.target.value})}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="form-group"><label>Sub-type</label><input type="text" value={form.sub_type} onChange={(e) => setForm({...form, sub_type: e.target.value})} /></div>
          </div>
          <div className="form-group"><label>Image URL</label><input type="text" value={form.image_url} onChange={(e) => setForm({...form, image_url: e.target.value})} /></div>
          <div className="form-group"><label>Stock *</label><input type="number" min="1" value={form.total_stock} onChange={(e) => setForm({...form, total_stock: parseInt(e.target.value) || 1})} /></div>
          <div className="form-group"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows="2" /></div>
          <div className="form-group"><label>Included Items (comma-separated)</label><input type="text" value={form.includes.join(', ')} onChange={(e) => handleIncludes(e.target.value)} /></div>
          <div className="form-group"><label>Options</label>
            <div className="checkbox-group">
              <label className="checkbox-item"><input type="checkbox" checked={form.has_accessories} onChange={(e) => setForm({...form, has_accessories: e.target.checked})} /><span>Accessories</span></label>
              <label className="checkbox-item"><input type="checkbox" checked={form.has_software} onChange={(e) => setForm({...form, has_software: e.target.checked})} /><span>Software</span></label>
              <label className="checkbox-item"><input type="checkbox" checked={form.has_subscription} onChange={(e) => setForm({...form, has_subscription: e.target.checked})} /><span>Subscription</span></label>
              <label className="checkbox-item"><input type="checkbox" checked={form.has_apps} onChange={(e) => setForm({...form, has_apps: e.target.checked})} /><span>Apps</span></label>
              <label className="checkbox-item"><input type="checkbox" checked={form.wifi_only} onChange={(e) => setForm({...form, wifi_only: e.target.checked})} /><span>WiFi only</span></label>
              <label className="checkbox-item"><input type="checkbox" checked={form.printer_info} onChange={(e) => setForm({...form, printer_info: e.target.checked})} /><span>Printer</span></label>
            </div>
          </div>
        </div>
        <div className="modal-footer"><button className="modal-btn secondary" onClick={onClose}>Cancel</button><button className="modal-btn primary" onClick={() => onSave(form)}>Save</button></div>
      </div>
    </div>
  )
}

// ============================================
// ADMIN REQUESTS VIEW
// ============================================
const AdminRequestsView = ({ loans, products, onUpdateStatus }) => {
  const pending = loans.filter(l => l.status === 'pending')
  
  if (pending.length === 0) return <div className="admin-view"><div className="admin-header"><h1>Pending Requests</h1></div><div className="cart-empty"><Icon name="inbox" size={64} /><h2>No pending requests</h2></div></div>

  return (
    <div className="admin-view">
      <div className="admin-header"><h1>Pending Requests ({pending.length})</h1></div>
      <div className="requests-list">
        {pending.map(l => (
          <div key={l.id} className="request-card">
            <div className="request-info">
              <h3>{l.product_name} × {l.quantity}</h3>
              <div className="request-details">
                <span className="request-detail"><Icon name="user" size={16} />{l.borrower_name}</span>
                <span className="request-detail"><Icon name="mail" size={16} />{l.borrower_email}</span>
                <span className="request-detail"><Icon name="calendar" size={16} />{formatDate(l.pickup_date)} → {formatDate(l.return_date)}</span>
              </div>
              {l.notes && <div className="request-notes">"{l.notes}"</div>}
            </div>
            <div className="request-actions">
              <button className="btn-approve" onClick={() => onUpdateStatus(l.id, 'active')}><Icon name="check" size={18} />Approve</button>
              <button className="btn-reject" onClick={() => onUpdateStatus(l.id, 'rejected')}><Icon name="x" size={18} />Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// ADMIN RETURNS VIEW
// ============================================
const AdminReturnsView = ({ loans, products, onReturnLoan }) => {
  const [selected, setSelected] = useState(null)
  const active = loans.filter(l => l.status === 'active').sort((a, b) => new Date(a.return_date) - new Date(b.return_date))
  const today = new Date().toISOString().split('T')[0]
  const overdue = active.filter(l => l.return_date < today)
  const dueSoon = active.filter(l => { const d = getDaysUntil(l.return_date); return d >= 0 && d <= 3 })
  const upcoming = active.filter(l => getDaysUntil(l.return_date) > 3)

  const handleReturn = async (data) => {
    await onReturnLoan(selected.id, data)
    setSelected(null)
  }

  const renderLoan = (loan, status) => {
    const days = getDaysUntil(loan.return_date)
    return (
      <div key={loan.id} className={`loan-card ${status}`}>
        <div className="loan-info">
          <div className="loan-product">{loan.product_name} × {loan.quantity}</div>
          <div className="loan-borrower"><Icon name="user" size={14} /> {loan.borrower_name}</div>
          <div style={{marginTop:'0.5rem'}}><span className={`loan-status ${status}`}>{status === 'overdue' ? `${Math.abs(days)} days overdue` : status === 'due-soon' ? `Due in ${days} days` : `${days} days left`}</span></div>
        </div>
        <button className="return-btn" onClick={() => setSelected(loan)}><Icon name="refresh" size={18} />Process Return</button>
      </div>
    )
  }

  return (
    <div className="admin-view">
      <div className="admin-header"><h1>Returns Management</h1></div>
      <div className="returns-stats">
        <div className="stat-card"><div className="stat-value danger">{overdue.length}</div><div className="stat-label">Overdue</div></div>
        <div className="stat-card"><div className="stat-value warning">{dueSoon.length}</div><div className="stat-label">Due Soon</div></div>
        <div className="stat-card"><div className="stat-value success">{active.length}</div><div className="stat-label">Total Active</div></div>
      </div>
      {overdue.length > 0 && <><h2 style={{color:'var(--color-danger)',marginBottom:'1rem'}}><Icon name="alertTriangle" size={20} /> Overdue</h2>{overdue.map(l => renderLoan(l, 'overdue'))}</>}
      {dueSoon.length > 0 && <><h2 style={{color:'var(--color-warning)',margin:'1.5rem 0 1rem'}}><Icon name="clock" size={20} /> Due Soon</h2>{dueSoon.map(l => renderLoan(l, 'due-soon'))}</>}
      {upcoming.length > 0 && <><h2 style={{color:'var(--color-text-secondary)',margin:'1.5rem 0 1rem'}}>All Active</h2>{upcoming.map(l => renderLoan(l, 'active'))}</>}
      {active.length === 0 && <div className="cart-empty"><Icon name="check" size={64} /><h2>No active loans</h2></div>}
      {selected && <ReturnModal loan={selected} onConfirm={handleReturn} onClose={() => setSelected(null)} />}
    </div>
  )
}

// ============================================
// RETURN MODAL
// ============================================
const ReturnModal = ({ loan, onConfirm, onClose }) => {
  const [condition, setCondition] = useState('good')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    await onConfirm({ condition, notes })
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Confirm Return</h2><button className="modal-close" onClick={onClose}><Icon name="x" /></button></div>
        <div className="modal-body">
          <p><strong>{loan.product_name}</strong> × {loan.quantity}</p>
          <p style={{color:'var(--color-text-secondary)',marginBottom:'1rem'}}>Borrowed by: {loan.borrower_name}</p>
          <div className="form-group"><label>Condition</label><select value={condition} onChange={(e) => setCondition(e.target.value)}><option value="good">Good</option><option value="minor">Minor issues</option><option value="damaged">Damaged</option><option value="lost">Lost</option></select></div>
          <div className="form-group"><label>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows="2" /></div>
        </div>
        <div className="modal-footer"><button className="modal-btn secondary" onClick={onClose}>Cancel</button><button className="modal-btn success" onClick={handleSubmit} disabled={loading}>{loading ? '...' : 'Confirm Return'}</button></div>
      </div>
    </div>
  )
}

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const { user, loading: authLoading, isAdmin } = useAuth()
  const [view, setView] = useState('catalog')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loans, setLoans] = useState([])
  const [subscriptionPlans, setSubscriptionPlans] = useState([])
  const [cart, setCart] = useState([])
  const [toast, setToast] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)

  // Load data
  const loadData = async () => {
    try {
      const [prods, cats, lns, plans] = await Promise.all([
        db.getProducts(),
        db.getCategories(),
        db.getLoans(),
        db.getSubscriptionPlans()
      ])
      setProducts(prods)
      setCategories(cats)
      setLoans(lns)
      setSubscriptionPlans(plans)
    } catch (err) {
      console.error('Load error:', err)
      showToast('Error loading data', 'error')
    }
    setDataLoading(false)
  }

  useEffect(() => {
    if (user) loadData()
  }, [user])

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return
    const loansChannel = db.subscribeToLoans(() => loadData())
    const productsChannel = db.subscribeToProducts(() => loadData())
    return () => {
      loansChannel.unsubscribe()
      productsChannel.unsubscribe()
    }
  }, [user])

  const showToast = (message, type = 'success') => setToast({ message, type })
  const pendingCount = loans.filter(l => l.status === 'pending').length

  // Cart handlers
  const addToCart = (product, qty, options) => {
    const idx = cart.findIndex(c => c.product.id === product.id)
    if (idx >= 0) { const newCart = [...cart]; newCart[idx].quantity += qty; setCart(newCart) }
    else { setCart([...cart, { product, quantity: qty, options }]) }
    showToast(`${product.name} added to cart`)
  }
  const updateCartItem = (pid, qty) => { if (qty <= 0) removeFromCart(pid); else setCart(cart.map(i => i.product.id === pid ? {...i, quantity: qty} : i)) }
  const removeFromCart = (pid) => setCart(cart.filter(c => c.product.id !== pid))

  // Submit request
  const submitRequest = async (data) => {
    try {
      for (const item of data.items) {
        await db.createLoan({
          product_id: item.product.id,
          user_id: user.id,
          quantity: item.quantity,
          borrower_name: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || user.email,
          borrower_email: user.email,
          pickup_date: data.pickupDate,
          return_date: data.returnDate,
          notes: data.notes,
          options: item.options
        })
      }
      setCart([])
      setView('catalog')
      showToast('Request submitted!')
      loadData()
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
  }

  // Admin actions
  const updateLoanStatus = async (id, status) => {
    try {
      await db.updateLoanStatus(id, status)
      showToast(status === 'active' ? 'Approved' : 'Rejected')
      loadData()
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
  }

  const handleReturnLoan = async (id, data) => {
    try {
      await db.returnLoan(id, data)
      showToast('Return processed')
      loadData()
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
  }

  // Auth loading
  if (authLoading) return <div className="loading">Loading...</div>
  if (!user) return <LoginView />
  if (dataLoading) return <div className="loading">Loading data...</div>

  return (
    <div className="app">
      <Navigation view={view} setView={setView} cartCount={cart.length} />
      <main className={`main-content ${view.startsWith('admin') ? 'with-sidebar' : ''}`}>
        {view.startsWith('admin') && isAdmin && <AdminSidebar view={view} setView={setView} pendingCount={pendingCount} />}
        <div className="content-area">
          {view === 'catalog' && <CatalogView products={products} loans={loans} cart={cart} onAddToCart={addToCart} categories={categories} subscriptionPlans={subscriptionPlans} />}
          {view === 'cart' && <CartView cart={cart} loans={loans} products={products} updateCartItem={updateCartItem} removeFromCart={removeFromCart} onSubmitRequest={submitRequest} subscriptionPlans={subscriptionPlans} />}
          {view === 'admin-products' && isAdmin && <AdminProductsView products={products} categories={categories} onRefresh={loadData} />}
          {view === 'admin-requests' && isAdmin && <AdminRequestsView loans={loans} products={products} onUpdateStatus={updateLoanStatus} />}
          {view === 'admin-returns' && isAdmin && <AdminReturnsView loans={loans} products={products} onReturnLoan={handleReturnLoan} />}
        </div>
      </main>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
