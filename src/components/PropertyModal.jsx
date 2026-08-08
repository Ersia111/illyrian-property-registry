import { useEffect, useMemo, useState } from 'react'
import { X, Camera, ImagePlus, FileText, Trash2 } from 'lucide-react'
import { addProperty, updateProperty, getPropertyMedia, deleteMedia } from '../lib/db'

const emptyForm = {
  code: '',
  title: '',
  status: 'active',
  transaction: 'sale',
  propertyType: 'apartment',
  layout: '',
  city: 'Tiranë',
  area: '',
  address: '',
  price: '',
  currency: 'EUR',
  grossArea: '',
  netArea: '',
  floor: '',
  bathrooms: '',
  balconies: '',
  elevator: false,
  mortgage: false,
  parking: false,
  orientation: '',
  condition: '',
  ownerName: '',
  ownerPhone: '',
  commission: '',
  keywords: '',
  description: '',
  notes: ''
}

export default function PropertyModal({ property, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [newMedia, setNewMedia] = useState([])
  const [savedMedia, setSavedMedia] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (property) {
      setForm({ ...emptyForm, ...property })
      getPropertyMedia(property.id).then(setSavedMedia)
    } else {
      setForm(emptyForm)
      setSavedMedia([])
    }
    setNewMedia([])
  }, [property])

  const imageCount = useMemo(
    () => savedMedia.filter(m => m.kind === 'image').length + newMedia.filter(m => m.kind === 'image').length,
    [savedMedia, newMedia]
  )

  function change(name, value) {
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function addFiles(files, kind) {
    const arr = Array.from(files || [])
    setNewMedia(prev => [...prev, ...arr.map(file => ({ kind, file }))])
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) return alert('Vendos titullin e pronës.')
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: form.price ? Number(form.price) : '',
        grossArea: form.grossArea ? Number(form.grossArea) : '',
        netArea: form.netArea ? Number(form.netArea) : '',
        floor: form.floor ? Number(form.floor) : '',
        bathrooms: form.bathrooms ? Number(form.bathrooms) : '',
        balconies: form.balconies ? Number(form.balconies) : ''
      }
      if (property?.id) {
        await updateProperty(property.id, payload, newMedia)
      } else {
        await addProperty(payload, newMedia)
      }
      await onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function removeSavedMedia(id) {
    if (!confirm('Ta heq këtë file?')) return
    await deleteMedia(id)
    setSavedMedia(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{property ? 'PËRDITËSO KARTELËN' : 'SHTO NË REGJISTËR'}</div>
            <h2>{property ? 'Ndrysho pronën' : 'Pronë e re'}</h2>
          </div>
          <button className="icon-button" onClick={onClose}><X size={23} /></button>
        </div>

        <form onSubmit={submit}>
          <section className="form-section">
            <div className="section-title">Informacioni bazë</div>

            <div className="grid two">
              <Field label="Titulli *">
                <input value={form.title} onChange={e => change('title', e.target.value)} placeholder="p.sh. Apartament 2+1, Park Avenue" />
              </Field>
              <Field label="Kodi">
                <input value={form.code} onChange={e => change('code', e.target.value)} placeholder="p.sh. IR-0027" />
              </Field>
            </div>

            <div className="grid four">
              <Field label="Statusi">
                <select value={form.status} onChange={e => change('status', e.target.value)}>
                  <option value="active">Aktive</option>
                  <option value="reserved">Rezervuar</option>
                  <option value="negotiation">Në negocim</option>
                  <option value="inactive">Jo aktive</option>
                </select>
              </Field>
              <Field label="Transaksioni">
                <select value={form.transaction} onChange={e => change('transaction', e.target.value)}>
                  <option value="sale">Shitje</option>
                  <option value="rent">Qira</option>
                </select>
              </Field>
              <Field label="Lloji">
                <select value={form.propertyType} onChange={e => change('propertyType', e.target.value)}>
                  <option value="apartment">Apartament</option>
                  <option value="villa">Vilë</option>
                  <option value="land">Tokë</option>
                  <option value="commercial">Ambient biznesi</option>
                  <option value="other">Tjetër</option>
                </select>
              </Field>
              <Field label="Tipologjia">
                <input value={form.layout} onChange={e => change('layout', e.target.value)} placeholder="2+1" />
              </Field>
            </div>
          </section>

          <section className="form-section">
            <div className="section-title">Vendndodhja & çmimi</div>
            <div className="grid three">
              <Field label="Qyteti">
                <input value={form.city} onChange={e => change('city', e.target.value)} />
              </Field>
              <Field label="Zona">
                <input value={form.area} onChange={e => change('area', e.target.value)} placeholder="p.sh. Bulevardi i Ri" />
              </Field>
              <Field label="Adresa / Rezidenca">
                <input value={form.address} onChange={e => change('address', e.target.value)} placeholder="Park Avenue" />
              </Field>
            </div>

            <div className="grid four">
              <Field label="Çmimi">
                <input type="number" value={form.price} onChange={e => change('price', e.target.value)} placeholder="171000" />
              </Field>
              <Field label="Monedha">
                <select value={form.currency} onChange={e => change('currency', e.target.value)}>
                  <option>EUR</option>
                  <option>ALL</option>
                  <option>USD</option>
                </select>
              </Field>
              <Field label="m² bruto">
                <input type="number" value={form.grossArea} onChange={e => change('grossArea', e.target.value)} />
              </Field>
              <Field label="m² neto">
                <input type="number" value={form.netArea} onChange={e => change('netArea', e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="form-section">
            <div className="section-title">Detajet</div>
            <div className="grid four">
              <Field label="Kati"><input type="number" value={form.floor} onChange={e => change('floor', e.target.value)} /></Field>
              <Field label="Tualete"><input type="number" value={form.bathrooms} onChange={e => change('bathrooms', e.target.value)} /></Field>
              <Field label="Ballkone"><input type="number" value={form.balconies} onChange={e => change('balconies', e.target.value)} /></Field>
              <Field label="Orientimi"><input value={form.orientation} onChange={e => change('orientation', e.target.value)} placeholder="Jug-Lindje" /></Field>
            </div>

            <div className="checks">
              <Check label="Ashensor" checked={form.elevator} onChange={v => change('elevator', v)} />
              <Check label="Hipotekë" checked={form.mortgage} onChange={v => change('mortgage', v)} />
              <Check label="Parkim" checked={form.parking} onChange={v => change('parking', v)} />
            </div>

            <div className="grid two">
              <Field label="Gjendja">
                <input value={form.condition} onChange={e => change('condition', e.target.value)} placeholder="E re / e restauruar / fazë murature..." />
              </Field>
              <Field label="Keywords">
                <input value={form.keywords} onChange={e => change('keywords', e.target.value)} placeholder="investim, familje, autostradë, diell..." />
              </Field>
            </div>
          </section>

          <section className="form-section">
            <div className="section-title">Kontakt & shënime</div>
            <div className="grid three">
              <Field label="Pronari / Kontakti">
                <input value={form.ownerName} onChange={e => change('ownerName', e.target.value)} />
              </Field>
              <Field label="Telefon">
                <input value={form.ownerPhone} onChange={e => change('ownerPhone', e.target.value)} />
              </Field>
              <Field label="Komision">
                <input value={form.commission} onChange={e => change('commission', e.target.value)} placeholder="p.sh. 2%" />
              </Field>
            </div>

            <Field label="Përshkrimi">
              <textarea rows="4" value={form.description} onChange={e => change('description', e.target.value)} placeholder="Shkruaj informacionin e pronës..." />
            </Field>
            <Field label="Shënime private">
              <textarea rows="3" value={form.notes} onChange={e => change('notes', e.target.value)} placeholder="Oferta e pronarit, telefonata, klientë potencialë..." />
            </Field>
          </section>

          <section className="form-section">
            <div className="section-title">Foto / Prezantime</div>
            <div className="upload-grid">
              <label className="upload-box">
                <Camera size={18} />
                <span>Bëj / ngarko foto</span>
                <small>{imageCount} foto</small>
                <input hidden type="file" accept="image/*" capture="environment" multiple onChange={e => addFiles(e.target.files, 'image')} />
              </label>
              <label className="upload-box">
                <ImagePlus size={18} />
                <span>Zgjidh nga galeria</span>
                <small>JPG, PNG, WEBP</small>
                <input hidden type="file" accept="image/*" multiple onChange={e => addFiles(e.target.files, 'image')} />
              </label>
              <label className="upload-box">
                <FileText size={18} />
                <span>Ngarko PDF</span>
                <small>Prezantimi i pronës</small>
                <input hidden type="file" accept="application/pdf" onChange={e => addFiles(e.target.files, 'pdf')} />
              </label>
            </div>

            {(savedMedia.length > 0 || newMedia.length > 0) && (
              <div className="media-list">
                {savedMedia.map(m => (
                  <div className="media-row" key={`saved-${m.id}`}>
                    <span>{m.kind === 'pdf' ? 'PDF' : 'FOTO'} · {m.name}</span>
                    <button type="button" onClick={() => removeSavedMedia(m.id)}><Trash2 size={15} /></button>
                  </div>
                ))}
                {newMedia.map((m, idx) => (
                  <div className="media-row" key={`new-${idx}`}>
                    <span>E RE · {m.file.name}</span>
                    <button type="button" onClick={() => setNewMedia(prev => prev.filter((_, i) => i !== idx))}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>Anulo</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Duke ruajtur...' : 'Ruaj pronën'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function Check({ label, checked, onChange }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}
