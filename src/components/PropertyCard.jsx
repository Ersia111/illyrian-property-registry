import { useEffect, useState } from 'react'
import { FileText, Image as ImageIcon, MapPin, Ruler, Pencil, Archive, Trash2 } from 'lucide-react'
import { getPropertyMedia } from '../lib/db'

const statusMap = {
  active: ['Aktive', 'status active'],
  reserved: ['Rezervuar', 'status reserved'],
  negotiation: ['Në negocim', 'status negotiation'],
  inactive: ['Jo aktive', 'status inactive'],
}

export default function PropertyCard({ property, onEdit, onDelete, onToggleStatus }) {
  const [media, setMedia] = useState([])
  const [cover, setCover] = useState(null)

  useEffect(() => {
    let urls = []
    getPropertyMedia(property.id).then(items => {
      setMedia(items)
      const img = items.find(m => m.kind === 'image')
      if (img) {
        const url = URL.createObjectURL(img.blob)
        urls.push(url)
        setCover(url)
      }
    })
    return () => urls.forEach(URL.revokeObjectURL)
  }, [property.id, property.updatedAt])

  const [label, klass] = statusMap[property.status] || statusMap.active
  const pdf = media.find(m => m.kind === 'pdf')

  function openPdf() {
    if (!pdf) return
    const url = URL.createObjectURL(pdf.blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  return (
    <article className="property-card">
      <div className="property-cover">
        {cover ? <img src={cover} alt="" /> : <div className="cover-placeholder"><ImageIcon size={26} /></div>}
        <span className={klass}>{label}</span>
      </div>

      <div className="property-body">
        <div className="property-topline">
          <span className="property-code">{property.code || `PR-${String(property.id).padStart(4,'0')}`}</span>
          <span>{property.transaction === 'rent' ? 'Qira' : 'Shitje'}</span>
        </div>

        <h3>{property.title}</h3>

        <div className="property-meta">
          {(property.area || property.address) && <span><MapPin size={14} /> {[property.area, property.address].filter(Boolean).join(' · ')}</span>}
          {(property.grossArea || property.netArea) && <span><Ruler size={14} /> {property.grossArea || property.netArea} m²</span>}
        </div>

        <div className="price">
          {property.price ? new Intl.NumberFormat('en-US').format(property.price) : 'Pa çmim'}
          {property.price && <small> {property.currency || 'EUR'}</small>}
        </div>

        <div className="tags">
          {property.layout && <span>{property.layout}</span>}
          {property.floor !== '' && property.floor != null && <span>Kati {property.floor}</span>}
          {property.elevator && <span>Ashensor</span>}
          {property.mortgage && <span>Hipotekë</span>}
        </div>

        <div className="card-actions">
          <button className="card-btn" onClick={() => onEdit(property)}><Pencil size={15} /> Ndrysho</button>
          {pdf && <button className="card-btn" onClick={openPdf}><FileText size={15} /> PDF</button>}
          <button className="card-btn" onClick={() => onToggleStatus(property)}>
            <Archive size={15} /> {property.status === 'active' ? 'Çaktivizo' : 'Aktivizo'}
          </button>
          <button className="card-btn danger" onClick={() => onDelete(property)}><Trash2 size={15} /></button>
        </div>
      </div>
    </article>
  )
}
