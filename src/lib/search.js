import Fuse from 'fuse.js'

export function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ë/g, 'e')
    .trim()
}

const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(String(value).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : null
}

function parseMoney(raw) {
  if (!raw) return null

  const clean = normalizeText(raw).replace(/,/g, '.')
  const match = clean.match(/(\d+(?:\.\d+)?)\s*(k|mij|mije)?/)

  if (!match) return null

  let value = Number(match[1])

  if (match[2]) {
    value *= 1000
  }

  return value
}

export function parseNaturalQuery(query = '') {
  let q = normalizeText(query)
    .replace(/€/g, ' euro ')
    .replace(/m²/g, 'm2')
    .replace(/\s+/g, ' ')
    .trim()

  const parsed = {
    minPrice: null,
    maxPrice: null,

    minArea: null,
    maxArea: null,

    minFloor: null,
    maxFloor: null,

    bathrooms: null,
    balconies: null,

    layout: '',

    elevator: null,
    mortgage: null,
    parking: null,

    transaction: '',
    propertyType: '',

    terms: []
  }

  const rules = [
    {
      regex:
        /(?:nga|midis)\s*(\d+(?:[.,]\d+)?\s*(?:k|mij|mije)?)\s*(?:deri|-)\s*(\d+(?:[.,]\d+)?\s*(?:k|mij|mije)?)\s*(?:euro|eur)?/g,

      handle: (m) => {
        parsed.minPrice = parseMoney(m[1])
        parsed.maxPrice = parseMoney(m[2])
      }
    },

    {
      regex:
        /(?:buxhet(?:i)?\s*)?(?:deri|max(?:imum)?|nen|me pak se|<=?)\s*(\d+(?:[.,]\d+)?\s*(?:k|mij|mije)?)(?:\s*(?:euro|eur))?(?!\s*m2)/g,

      handle: (m) => {
        parsed.maxPrice = parseMoney(m[1])
      }
    },

    {
      regex:
        /(?:buxhet(?:i)?\s*)?(?:nga|min(?:imum)?|mbi|me shume se|>=?)\s*(\d+(?:[.,]\d+)?\s*(?:k|mij|mije)?)\s*(?:euro|eur)/g,

      handle: (m) => {
        parsed.minPrice = parseMoney(m[1])
      }
    },

    {
      regex:
        /(?:min(?:imum)?|mbi|te pakten|>=?)\s*(\d+(?:[.,]\d+)?)\s*m2/g,

      handle: (m) => {
        parsed.minArea = Number(
          String(m[1]).replace(',', '.')
        )
      }
    },

    {
      regex:
        /(?:max(?:imum)?|nen|deri|<=?)\s*(\d+(?:[.,]\d+)?)\s*m2/g,

      handle: (m) => {
        parsed.maxArea = Number(
          String(m[1]).replace(',', '.')
        )
      }
    },

    {
      regex:
        /(?:kati|kat)\s*(\d+)\s*(?:deri|-)\s*(\d+)/g,

      handle: (m) => {
        parsed.minFloor = Number(m[1])
        parsed.maxFloor = Number(m[2])
      }
    },

    {
      regex:
        /(?:minimum|min|nga)\s*kati?\s*(\d+)/g,

      handle: (m) => {
        parsed.minFloor = Number(m[1])
      }
    },

    {
      regex:
        /(?:maksimum|max|deri)\s*kati?\s*(\d+)/g,

      handle: (m) => {
        parsed.maxFloor = Number(m[1])
      }
    },

    {
      regex: /(\d+)\s*(?:tualete?|banjo)/g,

      handle: (m) => {
        parsed.bathrooms = Number(m[1])
      }
    },

    {
      regex: /(\d+)\s*ballkone?/g,

      handle: (m) => {
        parsed.balconies = Number(m[1])
      }
    }
  ]

  for (const { regex, handle } of rules) {
    q = q.replace(regex, (...args) => {
      handle(args)
      return ' '
    })
  }

  const bareBudget = q.match(
    /\bbuxhet(?:i)?\s*(\d+(?:[.,]\d+)?\s*(?:k|mij|mije)?)(?:\s*(?:euro|eur))?\b/
  )

  if (bareBudget && !parsed.maxPrice) {
    parsed.maxPrice = parseMoney(bareBudget[1])
    q = q.replace(bareBudget[0], ' ')
  }

  const layoutMatch = q.match(
    /\b(garsoniere|studio|\d+\s*\+\s*\d+(?:\s*\+\s*\d+)?)\b/
  )

  if (layoutMatch) {
    parsed.layout = layoutMatch[1].replace(/\s+/g, '')
    q = q.replace(layoutMatch[0], ' ')
  }

  const boolPatterns = [
    [
      'elevator',
      /\b(me\s+)?ashensor\b/,
      /\bpa\s+ashensor\b/
    ],

    [
      'mortgage',
      /\b(me\s+)?hipoteke\b/,
      /\bpa\s+hipoteke\b/
    ],

    [
      'parking',
      /\b(me\s+)?parkim\b/,
      /\bpa\s+parkim\b/
    ]
  ]

  for (const [field, yesRegex, noRegex] of boolPatterns) {
    if (noRegex.test(q)) {
      parsed[field] = false
      q = q.replace(noRegex, ' ')
    } else if (yesRegex.test(q)) {
      parsed[field] = true
      q = q.replace(yesRegex, ' ')
    }
  }

  const transactionPatterns = [
    ['rent', /\b(qira|me qira|rent)\b/],
    ['sale', /\b(shitje|shitet|sale)\b/]
  ]

  for (const [value, regex] of transactionPatterns) {
    if (regex.test(q)) {
      parsed.transaction = value
      q = q.replace(regex, ' ')
      break
    }
  }

  const typePatterns = [
    [
      'apartment',
      /\b(apartament|ap)\b/
    ],

    [
      'villa',
      /\b(vile|villa)\b/
    ],

    [
      'land',
      /\b(toke|truall)\b/
    ],

    [
      'commercial',
      /\b(ambient biznesi|dyqan|zyre|komercial)\b/
    ]
  ]

  for (const [value, regex] of typePatterns) {
    if (regex.test(q)) {
      parsed.propertyType = value
      q = q.replace(regex, ' ')
      break
    }
  }

  parsed.terms = q
    .replace(
      /\b(euro|eur|buxhet|dua|kerkoj|prone|prona|me|dhe|ose|ne|tek|zona|zone)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)

  return parsed
}

function propertyArea(p) {
  return (
    toNumber(p.grossArea) ??
    toNumber(p.netArea) ??
    0
  )
}

function boolMatch(value, wanted) {
  if (
    wanted === null ||
    wanted === '' ||
    wanted === undefined
  ) {
    return true
  }

  return Boolean(value) === Boolean(wanted)
}

export function applyAdvancedFilters(
  properties,
  filters = {}
) {

  return properties.filter((p) => {

    const price = toNumber(p.price)

    const area = propertyArea(p)

    const floor = toNumber(p.floor)

    const bathrooms = toNumber(p.bathrooms)

    const balconies = toNumber(p.balconies)

    /* PRICE */

    if (
      filters.minPrice !== null &&
      filters.minPrice !== '' &&
      (price === null ||
        price < Number(filters.minPrice))
    ) {
      return false
    }

    if (
      filters.maxPrice !== null &&
      filters.maxPrice !== '' &&
      (price === null ||
        price > Number(filters.maxPrice))
    ) {
      return false
    }

    /* AREA */

    if (
      filters.minArea !== null &&
      filters.minArea !== '' &&
      area < Number(filters.minArea)
    ) {
      return false
    }

    if (
      filters.maxArea !== null &&
      filters.maxArea !== '' &&
      area > Number(filters.maxArea)
    ) {
      return false
    }

    /* FLOOR */

    if (
      filters.minFloor !== null &&
      filters.minFloor !== '' &&
      (
        floor === null ||
        floor < Number(filters.minFloor)
      )
    ) {
      return false
    }

    if (
      filters.maxFloor !== null &&
      filters.maxFloor !== '' &&
      (
        floor === null ||
        floor > Number(filters.maxFloor)
      )
    ) {
      return false
    }

    /* BATHROOMS */

    if (
      filters.bathrooms !== null &&
      filters.bathrooms !== ''
    ) {

      const wanted =
        Number(filters.bathrooms)

      if (
        wanted >= 3
          ? bathrooms < 3
          : bathrooms !== wanted
      ) {
        return false
      }
    }

    /* BALCONIES */

    if (
      filters.balconies !== null &&
      filters.balconies !== ''
    ) {

      const wanted =
        Number(filters.balconies)

      if (
        wanted >= 3
          ? balconies < 3
          : balconies !== wanted
      ) {
        return false
      }
    }

    /* TYPOLOGY */

    if (
      filters.layout &&
      normalizeText(p.layout)
        .replace(/\s+/g, '') !==
      normalizeText(filters.layout)
        .replace(/\s+/g, '')
    ) {
      return false
    }

    /* PROPERTY TYPE */

    if (
      filters.propertyType &&
      filters.propertyType !== 'all' &&
      p.propertyType !== filters.propertyType
    ) {
      return false
    }

    /* RENT / SALE */

    if (
      filters.transaction &&
      filters.transaction !== 'all' &&
      p.transaction !== filters.transaction
    ) {
      return false
    }

    /* BOOLEAN */

    if (
      !boolMatch(
        p.elevator,
        filters.elevator
      )
    ) {
      return false
    }

    if (
      !boolMatch(
        p.mortgage,
        filters.mortgage
      )
    ) {
      return false
    }

    if (
      !boolMatch(
        p.parking,
        filters.parking
      )
    ) {
      return false
    }

    /* LOCATION */

    const location = normalizeText([
      p.city,
      p.area,
      p.address
    ]
      .filter(Boolean)
      .join(' ')
    )

    if (
      filters.location &&
      !location.includes(
        normalizeText(filters.location)
      )
    ) {
      return false
    }

    return true
  })
}

function makeSearchText(p) {

  return normalizeText([
    p.code,

    p.title,

    p.status,

    p.transaction,

    p.propertyType,

    p.layout,

    p.city,

    p.area,

    p.address,

    p.description,

    p.keywords,

    p.orientation,

    p.notes,

    p.condition,

    p.mortgage
      ? 'hipoteke me hipoteke'
      : 'pa hipoteke',

    p.elevator
      ? 'ashensor me ashensor'
      : 'pa ashensor',

    p.parking
      ? 'parkim me parkim'
      : 'pa parkim',

    p.bathrooms
      ? `${p.bathrooms} tualete banjo`
      : '',

    p.balconies
      ? `${p.balconies} ballkone`
      : '',

    p.grossArea
      ? `${p.grossArea} m2`
      : '',

    p.netArea
      ? `${p.netArea} m2 neto`
      : '',

    p.price
      ? `${p.price} euro`
      : ''

  ]
    .filter(Boolean)
    .join(' ')
  )
}

export function searchProperties(
  properties,
  query,
  manualFilters = {}
) {

  const parsed =
    parseNaturalQuery(query)

  const naturalFilters = {

    minPrice:
      parsed.minPrice,

    maxPrice:
      parsed.maxPrice,

    minArea:
      parsed.minArea,

    maxArea:
      parsed.maxArea,

    minFloor:
      parsed.minFloor,

    maxFloor:
      parsed.maxFloor,

    bathrooms:
      parsed.bathrooms,

    balconies:
      parsed.balconies,

    layout:
      parsed.layout,

    elevator:
      parsed.elevator,

    mortgage:
      parsed.mortgage,

    parking:
      parsed.parking,

    transaction:
      parsed.transaction,

    propertyType:
      parsed.propertyType
  }

  const mergedFilters = {
    ...naturalFilters
  }

  for (
    const [key, value]
    of Object.entries(manualFilters)
  ) {

    if (
      value !== '' &&
      value !== null &&
      value !== undefined &&
      value !== 'all'
    ) {
      mergedFilters[key] = value
    }
  }

  const candidates =
    applyAdvancedFilters(
      properties,
      mergedFilters
    )

  const terms =
    parsed.terms
      .join(' ')
      .trim()

  if (!terms) {

    return candidates.map(
      p => ({
        item: p,
        score: 0
      })
    )
  }

  const indexed =
    candidates.map(
      p => ({
        ...p,

        _search:
          makeSearchText(p)
      })
    )

  const fuse =
    new Fuse(indexed, {

      keys: [

        {
          name: '_search',
          weight: 0.35
        },

        {
          name: 'area',
          weight: 0.18
        },

        {
          name: 'address',
          weight: 0.15
        },

        {
          name: 'title',
          weight: 0.12
        },

        {
          name: 'keywords',
          weight: 0.12
        },

        {
          name: 'description',
          weight: 0.08
        }
      ],

      threshold: 0.42,

      distance: 120,

      ignoreLocation: true,

      includeScore: true,

      minMatchCharLength: 2
    })

  return fuse
    .search(terms)
    .map(r => ({
      item: r.item,
      score: r.score ?? 1
    }))
}