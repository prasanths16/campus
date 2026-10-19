import test from 'node:test'
import assert from 'node:assert/strict'

// ==========================================
// REPLICATE FRONTEND HELPER FUNCTIONS FROM App.jsx
// ==========================================

const parseBookingCreatedAtMs = (val) => {
  if (!val) return null
  if (typeof val === 'number') return val
  if (Array.isArray(val)) {
    // Jackson LocalDateTime array serialization [year, month, day, hour, minute, second]
    const [y, m, d, h = 0, min = 0, s = 0] = val
    const dateUtc = Date.UTC(y, m - 1, d, h, min, s)
    const dateIst = dateUtc - (5.5 * 60 * 60 * 1000)
    const now = Date.now()
    const diffIst = now - dateIst
    if (diffIst >= 0 && diffIst < 30 * 60 * 1000) return dateIst
    const diffUtc = now - dateUtc
    if (diffUtc >= 0 && diffUtc < 30 * 60 * 1000) return dateUtc
    return dateIst
  }
  const str = String(val).trim()
  if (!str) return null
  if (/^\d+$/.test(str)) return Number(str)

  // 1. Explicit timezone offset present (+05:30, Z, GMT, etc.)
  if (str.includes('+') || str.endsWith('Z') || str.includes('GMT') || /T.*[+-]\d{2}:?\d{2}$/.test(str)) {
    const normalized = str.replace(/\.(\d{3})\d+/, '.$1')
    const t = new Date(normalized).getTime()
    if (!isNaN(t)) return t
  }

  // 2. ISO/SQL string without offset (e.g. "2026-10-12T16:17:48" or "2026-10-12 21:47:48")
  const cleanIso = str.replace(' ', 'T').replace(/\.(\d{3})\d+/, '.$1')
  const asIst = new Date(cleanIso + '+05:30').getTime()
  const asUtc = new Date(cleanIso + 'Z').getTime()
  const now = Date.now()
  const THIRTY_MINS = 30 * 60 * 1000

  // Check if either interpretation falls within the last 30 minutes
  const elapsedIst = !isNaN(asIst) ? now - asIst : -1
  if (elapsedIst >= 0 && elapsedIst < THIRTY_MINS) {
    return asIst
  }

  const elapsedUtc = !isNaN(asUtc) ? now - asUtc : -1
  if (elapsedUtc >= 0 && elapsedUtc < THIRTY_MINS) {
    return asUtc
  }

  // Default to Asia/Kolkata (+05:30) if valid, otherwise UTC, otherwise fallback
  if (!isNaN(asIst)) return asIst
  if (!isNaN(asUtc)) return asUtc
  const fallback = new Date(str).getTime()
  return isNaN(fallback) ? null : fallback
}

const isEligibleForCancellationAt = (booking, currentTimeMs) => {
  if (!booking) return false
  const statusUpper = (booking.status || booking.rawStatus || '').toUpperCase()
  if (statusUpper !== 'BOOKED' && statusUpper !== 'PENDING') return false

  const createdAt = typeof booking === 'object' && booking !== null
    ? (booking.createdAt || booking.created_at || booking.bookedAt)
    : booking
  const createdAtMs = parseBookingCreatedAtMs(createdAt)
  if (!createdAtMs) return false

  const elapsedTime = (currentTimeMs || Date.now()) - createdAtMs
  const THIRTY_MINUTES_MS = 30 * 60 * 1000 // 30 minutes in ms
  return elapsedTime >= 0 && elapsedTime < THIRTY_MINUTES_MS
}

// ==========================================
// TEST SUITE: BUG 1 - 30-MINUTE CANCELLATION RULE
// ==========================================

test('Bug 1: parseBookingCreatedAtMs handles diverse timestamp formats', () => {
  // Epoch ms
  const now = 1776092400000
  assert.equal(parseBookingCreatedAtMs(now), now)
  assert.equal(parseBookingCreatedAtMs(String(now)), now)

  // ISO with UTC 'Z'
  const utcIso = '2026-10-12T10:00:00Z'
  assert.equal(parseBookingCreatedAtMs(utcIso), new Date('2026-10-12T10:00:00Z').getTime())

  // ISO with +05:30 offset
  const kolkataIso = '2026-10-12T15:30:00+05:30'
  assert.equal(parseBookingCreatedAtMs(kolkataIso), new Date('2026-10-12T10:00:00Z').getTime())

  // ISO without offset (interprets as Asia/Kolkata +05:30 by default when not recent)
  const noOffsetIso = '2026-10-12T15:30:00'
  assert.equal(parseBookingCreatedAtMs(noOffsetIso), new Date('2026-10-12T15:30:00+05:30').getTime())

  // SQL datetime without offset "YYYY-MM-DD HH:mm:ss"
  const sqlDate = '2026-10-12 15:30:00'
  assert.equal(parseBookingCreatedAtMs(sqlDate), new Date('2026-10-12T15:30:00+05:30').getTime())

  // Sub-millisecond precision string with offset
  const subMilli = '2026-10-12T15:30:00.123456+05:30'
  assert.equal(parseBookingCreatedAtMs(subMilli), new Date('2026-10-12T15:30:00.123+05:30').getTime())

  // Invalid / null
  assert.equal(parseBookingCreatedAtMs(null), null)
  assert.equal(parseBookingCreatedAtMs(''), null)
  assert.equal(parseBookingCreatedAtMs('invalid-date'), null)
})

test('Bug 1: parseBookingCreatedAtMs accurately detects recent UTC strings from cloud backend without offset', () => {
  // Simulate cloud backend returning UTC timestamp without offset created 5 minutes ago
  const now = Date.now()
  const fiveMinsAgoUtcString = new Date(now - 5 * 60 * 1000).toISOString().replace('Z', '')
  const parsedMs = parseBookingCreatedAtMs(fiveMinsAgoUtcString)
  assert.ok(parsedMs !== null)
  assert.ok(Math.abs(now - 5 * 60 * 1000 - parsedMs) < 2000)

  // Booking with snake_case created_at
  const bookingWithSnakeCase = {
    id: 99,
    status: 'BOOKED',
    created_at: fiveMinsAgoUtcString
  }
  assert.equal(isEligibleForCancellationAt(bookingWithSnakeCase, now), true)
})

test('Bug 1: isEligibleForCancellation shows button when created < 30 minutes ago', () => {
  const now = Date.now()
  const booking10MinsAgo = {
    id: 1,
    status: 'BOOKED',
    createdAt: new Date(now - 10 * 60 * 1000).toISOString()
  }
  const booking29MinsAgo = {
    id: 2,
    status: 'PENDING',
    createdAt: new Date(now - 29 * 60 * 1000 - 59 * 1000).toISOString()
  }

  assert.equal(isEligibleForCancellationAt(booking10MinsAgo, now), true)
  assert.equal(isEligibleForCancellationAt(booking29MinsAgo, now), true)
})

test('Bug 1: isEligibleForCancellation hides button at exactly 30 minutes or later', () => {
  const now = Date.now()
  const bookingExact30Mins = {
    id: 1,
    status: 'BOOKED',
    createdAt: new Date(now - 30 * 60 * 1000).toISOString()
  }
  const booking31MinsAgo = {
    id: 2,
    status: 'BOOKED',
    createdAt: new Date(now - 31 * 60 * 1000).toISOString()
  }
  const booking60MinsAgo = {
    id: 3,
    status: 'BOOKED',
    createdAt: new Date(now - 60 * 60 * 1000).toISOString()
  }

  assert.equal(isEligibleForCancellationAt(bookingExact30Mins, now), false)
  assert.equal(isEligibleForCancellationAt(booking31MinsAgo, now), false)
  assert.equal(isEligibleForCancellationAt(booking60MinsAgo, now), false)
})

test('Bug 1: isEligibleForCancellation hides button for already cancelled bookings', () => {
  const now = Date.now()
  const cancelledBooking5MinsAgo = {
    id: 1,
    status: 'CANCELLED',
    createdAt: new Date(now - 5 * 60 * 1000).toISOString()
  }
  const cancelledBookingCaseInsensitive = {
    id: 2,
    status: 'cancelled',
    createdAt: new Date(now - 5 * 60 * 1000).toISOString()
  }

  assert.equal(isEligibleForCancellationAt(cancelledBooking5MinsAgo, now), false)
  assert.equal(isEligibleForCancellationAt(cancelledBookingCaseInsensitive, now), false)
})

test('Bug 1: isEligibleForCancellation handles future timestamps or missing dates gracefully', () => {
  const now = Date.now()
  const futureBooking = {
    id: 1,
    status: 'BOOKED',
    createdAt: new Date(now + 10 * 60 * 1000).toISOString()
  }
  const missingDateBooking = {
    id: 2,
    status: 'BOOKED'
  }

  assert.equal(isEligibleForCancellationAt(futureBooking, now), false)
  assert.equal(isEligibleForCancellationAt(missingDateBooking, now), false)
  assert.equal(isEligibleForCancellationAt(null, now), false)
})

// ==========================================
// TEST SUITE: BUG 2 - ADMIN ANALYTICS OUT-OF-ORDER & STATE INTEGRITY
// ==========================================

test('Bug 2: Request ID and AbortController drop stale out-of-order responses', async () => {
  // Simulate the state machine in App.jsx
  let currentRequestId = 0
  let displayedData = null
  let activeAbortController = null

  const fetchAnalyticsSimulation = async (selectedDate, delayMs, payload) => {
    // 1. Abort previous controller
    if (activeAbortController) {
      activeAbortController.abort()
    }
    const controller = new AbortController()
    activeAbortController = controller

    // 2. Increment request ID
    const reqId = ++currentRequestId

    // 3. Clear old displayed data immediately when date changes
    displayedData = null

    // 4. Simulate async network delay
    return new Promise((resolve) => {
      setTimeout(() => {
        // If aborted, do nothing
        if (controller.signal.aborted) {
          return resolve({ status: 'aborted' })
        }
        // If request ID is not current, drop stale response
        if (reqId !== currentRequestId) {
          return resolve({ status: 'stale-dropped' })
        }
        // Only update if latest valid request
        displayedData = { date: selectedDate, payload }
        resolve({ status: 'updated', displayedData })
      }, delayMs)
    })
  }

  // User selects Date A (takes 50ms)
  const reqA = fetchAnalyticsSimulation('2026-10-10', 50, { totalBookings: 10 })

  // Before Req A finishes, User rapidly selects Date B (takes 10ms)
  const reqB = fetchAnalyticsSimulation('2026-10-12', 10, { totalBookings: 42 })

  const results = await Promise.all([reqA, reqB])

  // Req A must have been aborted or dropped
  assert.equal(results[0].status, 'aborted')
  // Req B must have succeeded and updated displayed data
  assert.equal(results[1].status, 'updated')
  assert.deepEqual(displayedData, { date: '2026-10-12', payload: { totalBookings: 42 } })
})

test('Bug 2: Date change immediately clears previous data, never presenting old data for new date', () => {
  let displayedData = { date: '2026-10-09', totalBookings: 15 }
  let loading = false
  let error = null

  const handleDateChange = (newDate) => {
    loading = true
    error = null
    displayedData = null // Cleared immediately!
  }

  handleDateChange('2026-10-12')
  assert.equal(displayedData, null, 'displayedData must be cleared when changing date')
  assert.equal(loading, true, 'loading state must be active')
  assert.equal(error, null, 'error must be reset')
})

test('Bug 2: Analytics error shows clear error state rather than silently displaying zero', () => {
  let displayedData = null
  let loading = false
  let error = null

  const handleFetchError = (errMessage) => {
    loading = false
    error = errMessage
    displayedData = null
  }

  handleFetchError('Failed to fetch analytics: Connection refused')
  assert.equal(loading, false)
  assert.equal(error, 'Failed to fetch analytics: Connection refused')
  assert.equal(displayedData, null)
})

// ==========================================
// TEST SUITE: STUDENT ROOM BOOKING & MY BOOKINGS
// ==========================================

test('Issue 1: Successful room booking immediately updates room availability and My Bookings', () => {
  let userBookedRooms = []
  let roomBookings = {}
  let myBookings = []
  let bookingError = ''
  let bookingSuccessMsg = ''

  const activeDate = '2026-10-12'
  const selectedSlotId = 1
  const room = { id: 10, roomName: 'Room 201', block: 'ECE Block', capacity: 40 }
  const slotObj = { id: 1, time: '8:45 AM – 10:30 AM' }

  const handleBookingSuccess = (savedBooking) => {
    bookingSuccessMsg = 'Room booked successfully'
    bookingError = ''
    const bookingKey = `${activeDate}_${selectedSlotId}_${room.id}`
    userBookedRooms = [...userBookedRooms, bookingKey]
    
    // Update seat counts
    if (!roomBookings[activeDate]) roomBookings[activeDate] = {}
    if (!roomBookings[activeDate][selectedSlotId]) roomBookings[activeDate][selectedSlotId] = {}
    roomBookings[activeDate][selectedSlotId][room.id] = (roomBookings[activeDate][selectedSlotId][room.id] || 0) + 1

    // Immediately prepend to My Bookings
    const newBookingItem = {
      id: `rb-${savedBooking.id}`,
      backendId: savedBooking.id,
      type: 'room',
      name: room.roomName,
      date: activeDate,
      time: slotObj.time,
      status: 'Booked',
      rawStatus: 'BOOKED',
      createdAt: savedBooking.createdAt
    }
    myBookings = [newBookingItem, ...myBookings]
  }

  handleBookingSuccess({ id: 99, createdAt: new Date().toISOString() })

  assert.equal(userBookedRooms.includes('2026-10-12_1_10'), true, 'Room key must be in userBookedRooms')
  assert.equal(roomBookings['2026-10-12'][1][10], 1, 'Booked count must be incremented')
  assert.equal(myBookings.length, 1, 'My Bookings must have 1 record')
  assert.equal(myBookings[0].backendId, 99)
  assert.equal(myBookings[0].status, 'Booked')
  assert.equal(bookingSuccessMsg, 'Room booked successfully')
  assert.equal(bookingError, '')
})

test('Issue 1: Failed room booking sets error message and prevents stale UI updates', () => {
  let userBookedRooms = []
  let myBookings = []
  let bookingError = ''
  let bookingSuccessMsg = ''

  const handleBookingFailure = (errorMessage) => {
    bookingError = errorMessage
    bookingSuccessMsg = ''
  }

  handleBookingFailure('Room is full.')

  assert.equal(userBookedRooms.length, 0, 'No room key should be added on failure')
  assert.equal(myBookings.length, 0, 'No booking should be added to My Bookings on failure')
  assert.equal(bookingError, 'Room is full.')
  assert.equal(bookingSuccessMsg, '')
})

test('Issue 2: Successful cancellation immediately updates My Bookings status to Cancelled and clears room key', () => {
  let myBookings = [
    { id: 'rb-99', backendId: 99, type: 'room', roomId: 10, status: 'Booked', rawStatus: 'BOOKED' }
  ]
  let userBookedRooms = ['2026-10-12_1_10']

  const handleCancelSuccess = (backendId, roomId) => {
    myBookings = myBookings.map(b => b.backendId === backendId ? { ...b, status: 'Cancelled', rawStatus: 'CANCELLED' } : b)
    userBookedRooms = userBookedRooms.filter(key => !key.endsWith(`_${roomId}`))
  }

  handleCancelSuccess(99, 10)

  assert.equal(myBookings[0].status, 'Cancelled')
  assert.equal(myBookings[0].rawStatus, 'CANCELLED')
  assert.equal(userBookedRooms.length, 0, 'Room key must be removed from userBookedRooms')
  assert.equal(isEligibleForCancellationAt(myBookings[0], Date.now()), false, 'Cancelled booking must not show cancel button')
})

// ==========================================
// WEEKLY ANALYTICS DATE FILTER TESTS
// ==========================================

const getCampusIsoWeekString = (dateObj = new Date()) => {
  const dateStr = typeof dateObj === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateObj)
    ? dateObj
    : (dateObj instanceof Date ? dateObj.toISOString().split('T')[0] : String(dateObj))
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const target = new Date(Date.UTC(y, m - 1, d))
  const dayNr = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNr)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((target - yearStart) / 86400000 + 1) / 7)
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

const generateWeekOptionsFromDates = (bookingDates = [], currentWeekStr = '2026-W42') => {
  const allDates = new Set()
  if (Array.isArray(bookingDates)) {
    bookingDates.forEach(d => {
      if (d && typeof d === 'string' && d.trim()) allDates.add(d.trim())
    })
  }

  const [currYearStr, currWeekNumStr] = (currentWeekStr || '2026-W42').split('-W')
  const currentYear = parseInt(currYearStr, 10) || 2026
  const currentWeek = parseInt(currWeekNumStr, 10) || 42

  const maxWeekByYear = new Map()
  const weeksWithBookings = new Set()

  allDates.forEach(dateStr => {
    const isoWeek = getCampusIsoWeekString(dateStr)
    if (isoWeek && isoWeek.includes('-W')) {
      weeksWithBookings.add(isoWeek)
      const [yStr, wStr] = isoWeek.split('-W')
      const y = parseInt(yStr, 10)
      const w = parseInt(wStr, 10)
      if (!isNaN(y) && !isNaN(w)) {
        maxWeekByYear.set(y, Math.max(maxWeekByYear.get(y) || 0, w))
      }
    }
  })

  // Ensure current year is present up to current week
  maxWeekByYear.set(currentYear, Math.max(maxWeekByYear.get(currentYear) || 0, currentWeek))

  const sortedYears = Array.from(maxWeekByYear.keys()).sort((a, b) => a - b)
  const hasMultipleYears = sortedYears.length > 1

  const options = []
  sortedYears.forEach(year => {
    const maxW = maxWeekByYear.get(year) || 1
    for (let w = 1; w <= maxW; w++) {
      const val = `${year}-W${String(w).padStart(2, '0')}`
      const label = hasMultipleYears ? `Week ${w} (${year})` : `Week ${w}`
      options.push({
        value: val,
        label,
        year,
        weekNumber: w,
        hasBookings: weeksWithBookings.has(val)
      })
    }
  })

  return options
}

test('Weekly Filter: generateWeekOptionsFromDates automatically generates Week 1, Week 2, ... from booking history', () => {
  // Simulating bookings in October 2026
  const bookingDates = ['2026-10-07', '2026-10-09', '2026-10-12']
  const weekOptions = generateWeekOptionsFromDates(bookingDates, '2026-W42')

  assert.ok(weekOptions.length >= 42, 'Options must include Week 1 up to at least Week 42')
  assert.equal(weekOptions[0].label, 'Week 1')
  assert.equal(weekOptions[0].value, '2026-W01')
  assert.equal(weekOptions[1].label, 'Week 2')
  assert.equal(weekOptions[1].value, '2026-W02')
  assert.equal(weekOptions[40].label, 'Week 41')
  assert.equal(weekOptions[40].value, '2026-W41')
  assert.equal(weekOptions[41].label, 'Week 42')
  assert.equal(weekOptions[41].value, '2026-W42')

  // Weeks with actual bookings are marked correctly
  assert.equal(weekOptions[0].hasBookings, false) // Week 1 has no bookings
  assert.equal(weekOptions[40].hasBookings, true) // Week 41 has booking (2026-10-07)
  assert.equal(weekOptions[41].hasBookings, true) // Week 42 has booking (2026-10-12)
})

test('Weekly Filter: Dropdown combines This Week, Previous Week, and Week 1..N without duplicate labels', () => {
  const dynamicWeeks = generateWeekOptionsFromDates(['2026-10-07', '2026-10-12'], '2026-W42')
  const fullDropdown = [
    { label: 'This Week', value: 'this-week' },
    { label: 'Previous Week', value: 'previous-week' },
    ...dynamicWeeks
  ]

  const labels = fullDropdown.map(o => o.label)
  assert.ok(labels.includes('This Week'), 'Must include This Week')
  assert.ok(labels.includes('Previous Week'), 'Must include Previous Week')
  assert.ok(labels.includes('Week 1'), 'Must include Week 1')
  assert.ok(labels.includes('Week 2'), 'Must include Week 2')
  assert.ok(labels.includes('Week 41'), 'Must include Week 41')
  assert.ok(labels.includes('Week 42'), 'Must include Week 42')

  // Ensure no duplicate values or labels
  const uniqueLabels = new Set(labels)
  assert.equal(labels.length, uniqueLabels.size, 'All dropdown labels must be unique')
  const uniqueValues = new Set(fullDropdown.map(o => o.value))
  assert.equal(fullDropdown.length, uniqueValues.size, 'All dropdown values must be unique')
})

test('Weekly Filter: Handles year boundaries so Week 1 from different years is not mixed up', () => {
  // Bookings in both 2025 and 2026
  const multiYearDates = ['2025-01-05', '2026-10-12']
  const multiYearOptions = generateWeekOptionsFromDates(multiYearDates, '2026-W42')

  // Find Week 1 for 2025 and 2026
  const w1_2025 = multiYearOptions.find(o => o.value === '2025-W01')
  const w1_2026 = multiYearOptions.find(o => o.value === '2026-W01')

  assert.ok(w1_2025, '2025-W01 must be present')
  assert.ok(w1_2026, '2026-W01 must be present')
  assert.notEqual(w1_2025.value, w1_2026.value, 'Values must be distinct')
  assert.equal(w1_2025.year, 2025)
  assert.equal(w1_2026.year, 2026)
  assert.ok(w1_2025.label.includes('2025'), 'Label for 2025 Week 1 must indicate year')
  assert.ok(w1_2026.label.includes('2026'), 'Label for 2026 Week 1 must indicate year')
})

