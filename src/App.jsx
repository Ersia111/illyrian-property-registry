import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus,
  Search,
  SlidersHorizontal,
  Download,
  Upload,
  Database,
  X,
  RotateCcw
} from 'lucide-react'
import PropertyModal from './components/PropertyModal'
import PropertyCard from './components/PropertyCard'
import {
  db,
  deleteProperty,
  exportDatabase,
  getAllProperties,
  importDatabase
} from './lib/db'
import { parseNaturalQuery, searchProperties } from './lib/search'

const statusFilters = [
  ['all', 'Të gjitha'],
  ['active', 'Aktive'],
  ['reserved', 'Rezervuar'],
  ['negotiation', 'Në negocim'],
  ['inactive', 'Jo aktive']
]

const emptyAdvancedFilters = {
  location: '',
  propertyType: 'all',
  layout: '',
  minPrice: '',
  maxPrice: '',
  minArea: '',
  maxArea: '',
  minFloor: '',
  maxFloor: '',
  bathrooms: '',
  balconies: '',
  elevator: '',
  mortgage: '',
  parking: ''
}

export default function App() {
  const [properties, setProperties] = useState([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [transactionFilter, setTransactionFilter] = useState('all')
  const [advancedFilters, setAdvancedFilters] = useState(emptyAdvancedFilters)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showTools, setShowTools] = useState(false)
  const importRef = useRef(null)

  async function reload() {
    setProperties(await getAllProperties())
  }

  useEffect(() => {
    reload()
  }, [])

  const manualFilterPayload = useMemo(() => ({
    ...advancedFilters,
    transaction: transactionFilter
  }), [advancedFilters, transactionFilter])

  const filtered = useMemo(() => {
    let base = properties

    if (statusFilter !== 'all') {
      base = base.filter(p => p.status === statusFilter)
    }

    return searchProperties(base, query, manualFilterPayload)
  }, [properties, query, statusFilter, manualFilterPayload])

  const parsedQuery = useMemo(() => parseNaturalQuery(query), [query])

  const activeAdvancedCount = useMemo(() => {
    return Object.entries(advancedFilters)
      .filter(([, value]) => value !== '' && value !== 'all')
      .length
  }, [advancedFilters])

  function updateFilter(name, value) {
    setAdvancedFilters(prev => ({ ...prev, [name]: value }))
  }

  function resetAdvanced() {
    setAdvancedFilters(emptyAdvancedFilters)
  }

  function resetEverything() {
    setQuery('')
    setStatusFilter('all')
    setTransactionFilter('all')
    resetAdvanced()
  }

  function addNew() {
    setEditing(null)
    setModalOpen(true)
  }

  function edit(property) {
    setEditing(property)
    setModalOpen(true)
  }

  async function remove(property) {
    if (!confirm(`Ta fshijmë "${property.title}"? Kjo heq edhe fotot dhe PDF-të.`)) return
    await deleteProperty(property.id)
    await reload()
  }

  async function toggleStatus(property) {
    const next = property.status === 'active' ? 'inactive' : 'active'
    await db.properties.update(property.id, {
      status: next,
      updatedAt: new Date().toISOString()
    })
    await reload()
  }

  async function backup() {
    const data = await exportDatabase()
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `illyrian-properties-backup-${date}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function restore(file) {
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const replace = confirm(
        'OK = zëvendëso databazën aktuale. Cancel = bashko me databazën aktuale.'
      )
      await importDatabase(data, replace)
      await reload()
      alert('Backup u importua me sukses.')
    } catch (err) {
      alert(err.message || 'Nuk u importua dot backup-i.')
    } finally {
      if (importRef.current) importRef.current.value = ''
    }
  }

  const interpretedParts = [
    parsedQuery.layout && `Tipologji ${parsedQuery.layout}`,
    parsedQuery.minPrice && `Min €${parsedQuery.minPrice.toLocaleString()}`,
    parsedQuery.maxPrice && `Max €${parsedQuery.maxPrice.toLocaleString()}`,
    parsedQuery.minArea && `Min ${parsedQuery.minArea} m²`,
    parsedQuery.maxArea && `Max ${parsedQuery.maxArea} m²`,
    parsedQuery.minFloor && `Nga kati ${parsedQuery.minFloor}`,
    parsedQuery.maxFloor && `Deri kati ${parsedQuery.maxFloor}`,
    parsedQuery.bathrooms && `${parsedQuery.bathrooms} tualete`,
    parsedQuery.balconies && `${parsedQuery.balconies} ballkone`,
    parsedQuery.elevator === true && 'Me ashensor',
    parsedQuery.elevator === false && 'Pa ashensor',
    parsedQuery.mortgage === true && 'Me hipotekë',
    parsedQuery.mortgage === false && 'Pa hipotekë',
    parsedQuery.parking === true && 'Me parkim',
    parsedQuery.parking === false && 'Pa parkim'
  ].filter(Boolean)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">ILLYRIAN REALTY · PRIVATE PROPERTY LIBRARY</div>
          <div className="title-row">
            <h1>Regjistri i Pronave</h1>
            <span className="count">
              {properties.length} {properties.length === 1 ? 'pronë' : 'prona'}
            </span>
          </div>
        </div>

        <button className="tools-button" onClick={() => setShowTools(v => !v)}>
          <Database size={17} /> Backup
        </button>
      </header>

      {showTools && (
        <div className="tools-panel">
          <div>
            <strong>Backup lokal</strong>
            <p>
              Eksporto pronat, fotot dhe PDF-të në një file JSON. Mund ta importosh në pajisje tjetër.
            </p>
          </div>

          <div className="tools-actions">
            <button className="btn secondary compact" onClick={backup}>
              <Download size={16} /> Eksporto
            </button>

            <button
              className="btn secondary compact"
              onClick={() => importRef.current?.click()}
            >
              <Upload size={16} /> Importo
            </button>

            <input
              ref={importRef}
              hidden
              type="file"
              accept=".json,application/json"
              onChange={e => restore(e.target.files?.[0])}
            />
          </div>
        </div>
      )}

      <section className="search-section">
        <div className="search-box">
          <Search size={19} />

          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="p.sh. 2+1 Paskuqan deri 130k, min 90m2, ashensor, 2 tualete..."
          />

          {query && (
            <button
              className="search-clear"
              onClick={() => setQuery('')}
              aria-label="Pastro kërkimin"
            >
              <X size={17} />
            </button>
          )}

          <button
            className={showAdvanced ? 'filter-toggle active' : 'filter-toggle'}
            onClick={() => setShowAdvanced(v => !v)}
            aria-label="Filtra të avancuar"
          >
            <SlidersHorizontal size={18} />
            {activeAdvancedCount > 0 && <span>{activeAdvancedCount}</span>}
          </button>
        </div>

        {query && (interpretedParts.length > 0 || parsedQuery.terms.length > 0) && (
          <div className="query-interpreter">
            <strong>E kuptova si:</strong>
            {interpretedParts.map(part => <span key={part}>{part}</span>)}
            {parsedQuery.terms.length > 0 && (
              <span>Keywords: {parsedQuery.terms.join(' ')}</span>
            )}
          </div>
        )}

        <div className="filter-row">
          <div className="filter-group">
            {statusFilters.map(([value, label]) => (
              <button
                key={value}
                className={statusFilter === value ? 'chip active' : 'chip'}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="filter-group">
            {[
              ['all', 'Shitje + Qira'],
              ['sale', 'Shitje'],
              ['rent', 'Qira']
            ].map(([value, label]) => (
              <button
                key={value}
                className={transactionFilter === value ? 'chip active' : 'chip'}
                onClick={() => setTransactionFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {showAdvanced && (
          <div className="advanced-panel">
            <div className="advanced-head">
              <div>
                <strong>Filtra të avancuar</strong>
                <p>Këto kombinohen me search-in.</p>
              </div>

              <button className="reset-btn" onClick={resetAdvanced}>
                <RotateCcw size={15} /> Pastro filtrat
              </button>
            </div>

            <div className="advanced-grid">
              <FilterField label="Zona / adresa">
                <input
                  value={advancedFilters.location}
                  onChange={e => updateFilter('location', e.target.value)}
                  placeholder="Paskuqan, Blloku, Liqeni..."
                />
              </FilterField>

              <FilterField label="Lloji i pronës">
                <select
                  value={advancedFilters.propertyType}
                  onChange={e => updateFilter('propertyType', e.target.value)}
                >
                  <option value="all">Të gjitha</option>
                  <option value="apartment">Apartament</option>
                  <option value="villa">Vilë</option>
                  <option value="land">Tokë</option>
                  <option value="commercial">Ambient biznesi</option>
                  <option value="other">Tjetër</option>
                </select>
              </FilterField>

              <FilterField label="Tipologjia">
                <input
                  value={advancedFilters.layout}
                  onChange={e => updateFilter('layout', e.target.value)}
                  placeholder="1+1, 2+1, 3+1..."
                />
              </FilterField>

              <FilterField label="Min. çmimi €">
                <input
                  type="number"
                  value={advancedFilters.minPrice}
                  onChange={e => updateFilter('minPrice', e.target.value)}
                  placeholder="100000"
                />
              </FilterField>

              <FilterField label="Max. çmimi €">
                <input
                  type="number"
                  value={advancedFilters.maxPrice}
                  onChange={e => updateFilter('maxPrice', e.target.value)}
                  placeholder="150000"
                />
              </FilterField>

              <FilterField label="Min. sipërfaqe m²">
                <input
                  type="number"
                  value={advancedFilters.minArea}
                  onChange={e => updateFilter('minArea', e.target.value)}
                  placeholder="80"
                />
              </FilterField>

              <FilterField label="Max. sipërfaqe m²">
                <input
                  type="number"
                  value={advancedFilters.maxArea}
                  onChange={e => updateFilter('maxArea', e.target.value)}
                  placeholder="130"
                />
              </FilterField>

              <FilterField label="Kati nga">
                <input
                  type="number"
                  value={advancedFilters.minFloor}
                  onChange={e => updateFilter('minFloor', e.target.value)}
                  placeholder="1"
                />
              </FilterField>

              <FilterField label="Kati deri">
                <input
                  type="number"
                  value={advancedFilters.maxFloor}
                  onChange={e => updateFilter('maxFloor', e.target.value)}
                  placeholder="8"
                />
              </FilterField>

              <FilterField label="Tualete">
                <select
                  value={advancedFilters.bathrooms}
                  onChange={e => updateFilter('bathrooms', e.target.value)}
                >
                  <option value="">Çdo numër</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3+</option>
                </select>
              </FilterField>

              <FilterField label="Ballkone">
                <select
                  value={advancedFilters.balconies}
                  onChange={e => updateFilter('balconies', e.target.value)}
                >
                  <option value="">Çdo numër</option>
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3+</option>
                </select>
              </FilterField>

              <TriState
                label="Ashensor"
                value={advancedFilters.elevator}
                onChange={v => updateFilter('elevator', v)}
              />

              <TriState
                label="Hipotekë"
                value={advancedFilters.mortgage}
                onChange={v => updateFilter('mortgage', v)}
              />

              <TriState
                label="Parkim"
                value={advancedFilters.parking}
                onChange={v => updateFilter('parking', v)}
              />
            </div>
          </div>
        )}
      </section>

      <section className="registry">
        {properties.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">+</div>
            <h2>Regjistri është bosh.</h2>
            <p>Shto pronën e parë.</p>
            <button className="btn primary" onClick={addNew}>
              Shto pronën e parë
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state compact-empty">
            <h2>Nuk u gjet asnjë përputhje.</h2>
            <p>Provo të rrisësh buxhetin ose të heqësh një filtër.</p>
          </div>
        ) : (
          <>
            <div className="results-line">
              <span><strong>{filtered.length}</strong> rezultate</span>

              {(query || activeAdvancedCount > 0 || transactionFilter !== 'all' || statusFilter !== 'all') && (
                <button onClick={resetEverything}>Pastro të gjitha</button>
              )}
            </div>

            <div className="cards-grid">
              {filtered.map(({ item, score }) => (
                <div key={item.id} className="card-wrap">
                  {query && parsedQuery.terms.length > 0 && (
                    <div className="match-badge">
                      {Math.max(1, Math.round((1 - score) * 100))}% match
                    </div>
                  )}

                  <PropertyCard
                    property={item}
                    onEdit={edit}
                    onDelete={remove}
                    onToggleStatus={toggleStatus}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <button className="fab" onClick={addNew} aria-label="Shto pronë">
        <Plus size={28} />
      </button>

      {modalOpen && (
        <PropertyModal
          property={editing}
          onClose={() => setModalOpen(false)}
          onSaved={reload}
        />
      )}
    </main>
  )
}

function FilterField({ label, children }) {
  return (
    <label className="advanced-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function TriState({ label, value, onChange }) {
  return (
    <label className="advanced-field">
      <span>{label}</span>
      <select
        value={String(value)}
        onChange={e => {
          const raw = e.target.value
          onChange(raw === '' ? '' : raw === 'true')
        }}
      >
        <option value="">Nuk ka rëndësi</option>
        <option value="true">Po</option>
        <option value="false">Jo</option>
      </select>
    </label>
  )
}