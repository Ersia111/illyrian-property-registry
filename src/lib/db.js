import Dexie from 'dexie'

export const db = new Dexie('IllyrianPropertyRegistry')

db.version(1).stores({
  properties: '++id, code, title, status, transaction, propertyType, layout, city, area, price, createdAt, updatedAt',
  media: '++id, propertyId, kind, createdAt'
})

export async function getAllProperties() {
  return db.properties.orderBy('updatedAt').reverse().toArray()
}

export async function addProperty(property, mediaFiles = []) {
  const now = new Date().toISOString()
  const id = await db.properties.add({
    ...property,
    createdAt: now,
    updatedAt: now
  })

  for (const item of mediaFiles) {
    await db.media.add({
      propertyId: id,
      kind: item.kind,
      name: item.file.name,
      type: item.file.type,
      size: item.file.size,
      blob: item.file,
      createdAt: now
    })
  }
  return id
}

export async function updateProperty(id, property, mediaFiles = []) {
  const now = new Date().toISOString()
  await db.properties.update(id, { ...property, updatedAt: now })
  for (const item of mediaFiles) {
    await db.media.add({
      propertyId: id,
      kind: item.kind,
      name: item.file.name,
      type: item.file.type,
      size: item.file.size,
      blob: item.file,
      createdAt: now
    })
  }
}

export async function deleteProperty(id) {
  await db.transaction('rw', db.properties, db.media, async () => {
    await db.properties.delete(id)
    await db.media.where('propertyId').equals(id).delete()
  })
}

export async function getPropertyMedia(propertyId) {
  return db.media.where('propertyId').equals(propertyId).toArray()
}

export async function deleteMedia(mediaId) {
  return db.media.delete(mediaId)
}

export async function exportDatabase() {
  const properties = await db.properties.toArray()
  const media = await db.media.toArray()

  const serializedMedia = await Promise.all(
    media.map(async (m) => ({
      ...m,
      blob: await blobToDataURL(m.blob)
    }))
  )

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    properties,
    media: serializedMedia
  }
}

export async function importDatabase(data, replace = false) {
  if (!data || data.version !== 1 || !Array.isArray(data.properties)) {
    throw new Error('Backup i pavlefshëm.')
  }

  await db.transaction('rw', db.properties, db.media, async () => {
    if (replace) {
      await db.properties.clear()
      await db.media.clear()
    }

    for (const p of data.properties) {
      await db.properties.put(p)
    }

    for (const m of data.media || []) {
      const blob = dataURLToBlob(m.blob)
      await db.media.put({ ...m, blob })
    }
  })
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function dataURLToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta.match(/:(.*?);/)[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}
