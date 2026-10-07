import React, { useState, useEffect, useMemo } from 'react'
import './index.css'

// Persistent Storage Keys
const STORAGE_KEY_BOOKINGS = 'campus_connect_my_bookings'
const STORAGE_KEY_USERS = 'campus_connect_users'
const STORAGE_KEY_CURRENT_USER = 'campus_connect_current_user'

// --------------------------------------------------------
// VALID STUDENTS DATABASE
// --------------------------------------------------------
const VALID_STUDENTS = [
  { regNumber: '7376242AD253', department: 'Artificial Intelligence and Data Science', year: '3rd Year' },
  { regNumber: '7376242AD254', department: 'Artificial Intelligence and Data Science', year: '1st Year' },
  { regNumber: '7376242AD256', department: 'Artificial Intelligence and Data Science', year: '1st Year' },
  { regNumber: '7376242AD101', department: 'Artificial Intelligence and Data Science', year: '1st Year' },
  { regNumber: '7376232AD102', department: 'Artificial Intelligence and Data Science', year: '2nd Year' },
  { regNumber: '7376231CS105', department: 'Computer Science and Engineering', year: '2nd Year' },
  { regNumber: '7376221IT201', department: 'Information Technology', year: '3rd Year' },
  { regNumber: '7376211EC301', department: 'Electronics and Communication Engineering', year: '4th Year' },
  { regNumber: '7376221CS142', department: 'Computer Science and Engineering', year: '3rd Year' },
  { regNumber: '7376231EE108', department: 'Electrical and Electronics Engineering', year: '2nd Year' },
  { regNumber: '7376221ME115', department: 'Mechanical Engineering', year: '3rd Year' },
]

// Helper to look up a student in valid_students records
const findValidStudent = (regNo) => {
  if (!regNo) return null
  const cleaned = regNo.trim().toUpperCase()
  const found = VALID_STUDENTS.find((s) => s.regNumber.toUpperCase() === cleaned)
  if (found) return found

  // Validate actual college register number format (e.g. 7376242AD253)
  // Format: 7376 + 2-digit batch year (21/22/23/24/25) + Stream/Dept code (e.g. 2AD, 1CS, 1IT, 1EC, 1EE, 1ME, 1CE, 1CB, 1AM, 1BM, 1BT, 1FT) + 3-digit roll number
  const collegeMatch = cleaned.match(/^7376(21|22|23|24|25)([0-9]?[A-Z]{2,4})(\d{3})$/i)
  if (collegeMatch) {
    const yrCode = collegeMatch[1]
    const deptCode = collegeMatch[2].toUpperCase()
    const yearMap = {
      '21': '4th Year',
      '22': '3rd Year',
      '23': '2nd Year',
      '24': '1st Year',
      '25': '1st Year',
    }
    const deptMap = {
      '2AD': 'Artificial Intelligence and Data Science',
      'AD': 'Artificial Intelligence and Data Science',
      'AIDS': 'Artificial Intelligence and Data Science',
      '1CS': 'Computer Science and Engineering',
      'CS': 'Computer Science and Engineering',
      'CSE': 'Computer Science and Engineering',
      '1IT': 'Information Technology',
      'IT': 'Information Technology',
      '1EC': 'Electronics and Communication Engineering',
      'EC': 'Electronics and Communication Engineering',
      'ECE': 'Electronics and Communication Engineering',
      '1EE': 'Electrical and Electronics Engineering',
      'EE': 'Electrical and Electronics Engineering',
      'EEE': 'Electrical and Electronics Engineering',
      '1ME': 'Mechanical Engineering',
      'ME': 'Mechanical Engineering',
      'MECH': 'Mechanical Engineering',
      '1CE': 'Civil Engineering',
      'CE': 'Civil Engineering',
      'CIVIL': 'Civil Engineering',
      '1CB': 'Computer Science and Business Systems',
      'CSBS': 'Computer Science and Business Systems',
      '1AM': 'Artificial Intelligence and Machine Learning',
      'AIML': 'Artificial Intelligence and Machine Learning',
      '1BM': 'Biomedical Engineering',
      '1BT': 'Biotechnology',
      '1FT': 'Food Technology',
      '1AG': 'Agriculture Engineering',
    }
    const dept = deptMap[deptCode] || 'Engineering'
    const yr = yearMap[yrCode] || '1st Year'
    return { regNumber: cleaned, department: dept, year: yr }
  }

  return null
}

const DEFAULT_USERS = [
  {
    fullName: 'Alex Morgan',
    email: '7376242ad253@campus.edu',
    regNumber: '7376242AD253',
    password: 'password123',
    department: 'Artificial Intelligence and Data Science',
    year: '1st Year',
  },
  {
    fullName: 'Rahul Sharma',
    email: '7376231cs105@campus.edu',
    regNumber: '7376231CS105',
    password: 'password123',
    department: 'Computer Science and Engineering',
    year: '2nd Year',
  },
  {
    fullName: 'Priya Patel',
    email: '7376221it201@campus.edu',
    regNumber: '7376221IT201',
    password: 'password123',
    department: 'Information Technology',
    year: '3rd Year',
  },
]

const getInitialUsers = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USERS)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (err) {
    console.error('Failed to load users from localStorage:', err)
  }
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USERS))
  } catch (e) { }
  return DEFAULT_USERS
}

const getInitialCurrentUser = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (err) { }
  return null
}

// --------------------------------------------------------
// DATE / TIME HELPER FUNCTIONS
// --------------------------------------------------------

// Returns 'YYYY-MM-DD' for today using local browser time
const getTodayDate = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Returns 'YYYY-MM-DD' for tomorrow using local browser time
const getTomorrowDate = () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const y = tomorrow.getFullYear()
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const d = String(tomorrow.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Returns 'YYYY-Www' for current date using ISO-8601 week definition
const getCurrentIsoWeekString = (dateObj = new Date()) => {
  const d = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Formats date → '29 Sep 2026', '1 Oct 2026'
const formatBookingDate = (dateVal) => {
  if (!dateVal) return ''
  const str = String(dateVal).trim()

  // Match already formatted "29 Sep 2026" or "1 Oct 2026"
  const dMmmYMatch = str.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/)
  if (dMmmYMatch) {
    const day = parseInt(dMmmYMatch[1], 10)
    const month = dMmmYMatch[2].slice(0, 3)
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase()
    const year = dMmmYMatch[3]
    return `${day} ${capitalizedMonth} ${year}`
  }

  // Match ISO 'YYYY-MM-DD'
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    const year = isoMatch[1]
    const monthIdx = parseInt(isoMatch[2], 10) - 1
    const day = parseInt(isoMatch[3], 10)
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${MONTH_NAMES[monthIdx]} ${year}`
    }
  }

  // Parse generic Date string (e.g. 'September 29, 2026')
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    return `${parsed.getDate()} ${MONTH_NAMES[parsed.getMonth()]} ${parsed.getFullYear()}`
  }

  return str
}

// Returns true if current time is at or after 8:00 PM (20:00 - 23:59)
const isAtOrAfter8PM = () => {
  const now = new Date()
  return now.getHours() >= 20
}

// Returns true if booking is currently open
const isBookingOpen = () => {
  return true
}

// Helper to resolve room image URL or fallback to standard rooms/classroom, computer-lab, library
const getRoomImageUrl = (room) => {
  if (!room) return ''
  if (room.image && typeof room.image === 'string' && room.image.trim()) {
    return room.image.trim()
  }
  const nameLower = ((room.roomName || room.name) || '').toLowerCase()
  if (nameLower.includes('computer') || nameLower.includes('lab')) {
    return '/rooms/computer-lab.jpg'
  }
  if (nameLower.includes('library')) {
    return '/rooms/library.jpg'
  }
  return '/rooms/classroom.jpg'
}

// Returns true if a room time slot can still be booked (cutoff is 30 min before slot start)
// slot.cutoff is like '8:15 AM'
const isRoomSlotOpen = (slot) => {
  // When next day's booking cycle opens at 8:00 PM, all slots for tomorrow are open
  if (isAtOrAfter8PM()) {
    return true
  }

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  // Parse cutoff string e.g. '8:15 AM'
  const cutoffParts = slot.cutoff.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!cutoffParts) return true
  let cutoffH = parseInt(cutoffParts[1], 10)
  const cutoffM = parseInt(cutoffParts[2], 10)
  const cutoffPeriod = cutoffParts[3].toUpperCase()
  if (cutoffPeriod === 'PM' && cutoffH !== 12) cutoffH += 12
  if (cutoffPeriod === 'AM' && cutoffH === 12) cutoffH = 0
  const cutoffMinutes = cutoffH * 60 + cutoffM

  // Open if current time < cutoff time
  return currentMinutes < cutoffMinutes
}

// Returns true if equipment booking is open (before 4:00 PM cutoff on active booking day)
const isEquipmentBookingOpen = () => {
  // When next day's booking cycle opens at 8:00 PM, tomorrow's equipment booking is open
  if (isAtOrAfter8PM()) {
    return true
  }

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const cutoffMinutes = 16 * 60 // 4:00 PM
  return currentMinutes < cutoffMinutes
}

// Returns the active booking date as 'YYYY-MM-DD':
// - At/after 8:00 PM (20:00-23:59): tomorrow's date (next day's cycle opens)
// - Before 8:00 PM (00:00-19:59): today's date (today's cycle continues through midnight and the daytime)
// Does NOT change the active booking date at midnight
const getActiveBookingDate = () => {
  if (isAtOrAfter8PM()) {
    return getTomorrowDate()
  }
  return getTodayDate()
}

// Resolves the exact booking date returned by backend for display.
// Never displays "Today", "Tomorrow", or "Yesterday" in My Bookings, and never recalculates old booking dates.
const getDisplayBookingDate = (booking) => {
  if (!booking) return ''
  const bDate = booking.bookingDate || booking.date || ''
  if (typeof bDate === 'string') {
    const trimmed = bDate.trim()
    const cleaned = trimmed.replace(/^(today|tomorrow|yesterday)[,\s\-:]*/i, '').trim()
    if (cleaned) return cleaned
  }
  return bDate
}

const normalizeSlot = (str) => (str || '').replace(/[\u2013\u2014]/g, '-').replace(/\s*-\s*/g, ' - ').trim()

// My Bookings are fetched from backend - no local demo data needed

// Room Booking Constants
const TIME_SLOTS = [
  { id: 1, time: '8:45 AM – 10:30 AM', cutoff: '8:15 AM', isCutoff: false },
  { id: 2, time: '10:30 AM – 12:30 PM', cutoff: '10:00 AM', isCutoff: false },
  { id: 3, time: '1:30 PM – 3:15 PM', cutoff: '1:00 PM', isCutoff: false },
  { id: 4, time: '3:15 PM – 5:00 PM', cutoff: '2:45 PM', isCutoff: false },
]

const ROOMS_DATA = [
  {
    id: 'room-201',
    name: 'Room 201',
    block: 'ECE Block',
    capacity: 40,
    image: '/rooms/classroom.jpg',
    status: 'Available',
  },
  {
    id: 'room-305',
    name: 'Room 305',
    block: 'CSE Block',
    capacity: 50,
    image: '/rooms/classroom.jpg',
    status: 'Available',
  },
  {
    id: 'comp-lab-1',
    name: 'Computer Lab 1',
    block: 'ECE Block',
    capacity: 60,
    image: '/rooms/computer-lab.jpg',
    status: 'Available',
  },
  {
    id: 'library',
    name: 'Library',
    block: 'Main Block',
    capacity: 100,
    image: '/rooms/library.jpg',
    status: 'Available',
  },
]

// Sports Equipment Constants
const SPORTS_EQUIPMENT_DATA = [
  { id: 'cricket-bat', name: 'Cricket Bat', totalQuantity: 10, icon: 'cricket-bat', accent: 'amber' },
  { id: 'cricket-ball', name: 'Cricket Ball', totalQuantity: 15, icon: 'cricket-ball', accent: 'red' },
  { id: 'football', name: 'Football', totalQuantity: 8, icon: 'football', accent: 'blue' },
  { id: 'basketball', name: 'Basketball', totalQuantity: 6, icon: 'basketball', accent: 'orange' },
  { id: 'volleyball', name: 'Volleyball', totalQuantity: 6, icon: 'volleyball', accent: 'indigo' },
  { id: 'badminton-racket', name: 'Badminton Racket', totalQuantity: 12, icon: 'badminton-racket', accent: 'purple' },
  { id: 'shuttlecock', name: 'Shuttlecock', totalQuantity: 20, icon: 'shuttlecock', accent: 'emerald' },
]

// Analytics data is fetched dynamically from backend API (/api/admin/analytics/daily and /api/admin/analytics/weekly)

// Crisp sports visual SVGs
const renderSportsIcon = (type) => {
  switch (type) {
    case 'cricket-bat':
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 4l6 6-9 9-4-1-1-4 8-10z" />
          <line x1="4" y1="20" x2="7" y2="17" />
        </svg>
      )
    case 'cricket-ball':
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M5.5 8.5c4 2 8 2 13 0" />
          <path d="M5.5 15.5c4-2 8-2 13 0" />
        </svg>
      )
    case 'football':
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <polygon points="12 8 14.5 10 13.5 13 10.5 13 9.5 10" />
          <line x1="12" y1="3" x2="12" y2="8" />
          <line x1="20.5" y1="9" x2="14.5" y2="10" />
          <line x1="18" y1="18" x2="13.5" y2="13" />
          <line x1="6" y1="18" x2="10.5" y2="13" />
          <line x1="3.5" y1="9" x2="9.5" y2="10" />
        </svg>
      )
    case 'basketball':
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="12" y1="3" x2="12" y2="21" />
          <path d="M5.5 5.5c3.5 3.5 3.5 9.5 0 13" />
          <path d="M18.5 5.5c-3.5 3.5-3.5 9.5 0 13" />
        </svg>
      )
    case 'volleyball':
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 12c0-5 3.5-8.5 7-8.5" />
          <path d="M12 12c-4.5 2-8 0-10-3" />
          <path d="M12 12c-1 5 1.5 8.5 4 9" />
        </svg>
      )
    case 'badminton-racket':
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="15" cy="9" rx="6" ry="6" />
          <line x1="10.8" y1="13.2" x2="4" y2="20" />
          <line x1="11" y1="9" x2="19" y2="9" />
          <line x1="15" y1="5" x2="15" y2="13" />
        </svg>
      )
    case 'shuttlecock':
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 18a2 2 0 0 0 4 0v-2h-4v2z" />
          <path d="M8 16l-3-9h14l-3 9" />
          <line x1="12" y1="7" x2="12" y2="16" />
        </svg>
      )
    default:
      return null
  }
}

// Helper to determine icon and color accent for equipment cards
const resolveEquipmentIconAndAccent = (item) => {
  if (item.icon && item.accent) {
    return { icon: item.icon, accent: item.accent }
  }
  const name = (item.equipmentName || item.name || '').toLowerCase()
  if (name.includes('cricket') && name.includes('bat')) return { icon: 'cricket-bat', accent: 'amber' }
  if (name.includes('cricket') && name.includes('ball')) return { icon: 'cricket-ball', accent: 'red' }
  if (name.includes('football')) return { icon: 'football', accent: 'blue' }
  if (name.includes('basketball')) return { icon: 'basketball', accent: 'orange' }
  if (name.includes('volleyball')) return { icon: 'volleyball', accent: 'indigo' }
  if (name.includes('badminton') || name.includes('racket') || name.includes('racquet')) return { icon: 'badminton-racket', accent: 'purple' }
  if (name.includes('shuttle')) return { icon: 'shuttlecock', accent: 'emerald' }
  return { icon: 'volleyball', accent: 'blue' }
}

function App() {
  const [currentPage, setCurrentPage] = useState('welcome')

  // Registered users and active student profile state
  const [users, setUsers] = useState(getInitialUsers)
  const [currentUser, setCurrentUser] = useState(getInitialCurrentUser)

  // Student Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginRegNumber, setLoginRegNumber] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  // Student Profile state (fetched from backend)
  const [profileData, setProfileData] = useState(null)
  const [profileError, setProfileError] = useState('')

  // Fetch Student Profile from backend when navigating to profile page
  useEffect(() => {
    if (currentPage === 'student-profile') {
      let userId = currentUser?.id
      if (!userId) {
        try {
          const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER)
          if (saved) {
            const parsed = JSON.parse(saved)
            userId = parsed?.id
          }
        } catch (e) { }
      }

      if (userId) {
        setProfileError('')
        fetch(`http://localhost:8080/api/student/profile/${userId}`)
          .then(async (res) => {
            const data = await res.json()
            if (!res.ok) {
              throw new Error(data.message || 'Failed to fetch profile')
            }
            return data
          })
          .then((data) => {
            setProfileData(data)
          })
          .catch((err) => {
            setProfileError(err.message || 'Failed to fetch profile')
          })
      }
    }
  }, [currentPage, currentUser?.id])

  // Student Registration state
  const [regFullName, setRegFullName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regNumber, setRegNumber] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState('')

  // Admin Login state
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')

  // Admin Dashboard: total students fetched from valid_students table via backend
  const [totalStudentsCount, setTotalStudentsCount] = useState(0)

  // Admin Dashboard: recent booking/cancellation activity fetched from backend
  const [recentActivity, setRecentActivity] = useState([])

  const fetchRecentActivity = () => {
    fetch('http://localhost:8080/api/admin/analytics/recent-activity')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setRecentActivity(data)
        }
      })
      .catch(() => { })
  }

  useEffect(() => {
    if (currentPage === 'admin-dashboard') {
      fetch('http://localhost:8080/api/student/count')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data.count === 'number') {
            setTotalStudentsCount(data.count)
          }
        })
        .catch(() => { })
      fetchRecentActivity()
    }
  }, [currentPage])

  // Shared Rooms State (Admin & Student) - fetched from backend
  const [rooms, setRooms] = useState([])
  const [roomsLoading, setRoomsLoading] = useState(false)
  const [roomsError, setRoomsError] = useState('')

  const fetchRooms = () => {
    setRoomsLoading(true)
    setRoomsError('')
    fetch('http://localhost:8080/api/rooms')
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message || 'Failed to fetch rooms')
        }
        return res.json()
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setRooms(
            data.map((r) => ({
              ...r,
              name: r.roomName || r.name,
              roomName: r.roomName || r.name,
            }))
          )
        }
      })
      .catch((err) => {
        console.error('Error fetching rooms:', err)
        setRoomsError(err.message || 'Unable to load rooms from server')
      })
      .finally(() => {
        setRoomsLoading(false)
      })
  }

  // Admin Room Management Edit & Add & Delete Modal state
  const [editingRoom, setEditingRoom] = useState(null)
  const [editCapacity, setEditCapacity] = useState('')
  const [editStatus, setEditStatus] = useState('Available')
  const [editError, setEditError] = useState('')
  const [roomSuccessMsg, setRoomSuccessMsg] = useState('')
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomBlock, setNewRoomBlock] = useState('')
  const [newRoomCapacity, setNewRoomCapacity] = useState('')
  const [newRoomStatus, setNewRoomStatus] = useState('Available')
  const [newRoomImage, setNewRoomImage] = useState('')
  const [addRoomError, setAddRoomError] = useState('')
  const [deletingRoom, setDeletingRoom] = useState(null)
  const [deleteRoomError, setDeleteRoomError] = useState('')

  // Room Booking state
  const [selectedSlotId, setSelectedSlotId] = useState(null)
  const [bookingModalRoom, setBookingModalRoom] = useState(null)
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('')
  // Track room IDs booked by this student per date+slot: array of `${bookingDate}_${slotId}_${roomId}`
  const [userBookedRooms, setUserBookedRooms] = useState([])

  // Frontend booked seats: keyed by bookingDate → slotId → roomId (populated from backend)
  const [roomBookings, setRoomBookings] = useState({})

  // Equipment Booking state: keyed by bookingDate → equipmentId (populated from backend)
  const [equipmentBookings, setEquipmentBookings] = useState({})

  // Track equipment IDs booked by this student per date: array of `${bookingDate}_${equipmentId}`
  const [userBookedEquipment, setUserBookedEquipment] = useState([])
  const [equipModalItem, setEquipModalItem] = useState(null)
  const [equipSuccessMsg, setEquipSuccessMsg] = useState('')
  // Admin & Student Equipment Management state - fetched from backend
  const [equipment, setEquipment] = useState([])
  const [equipLoading, setEquipLoading] = useState(false)
  const [equipError, setEquipError] = useState('')

  const fetchEquipment = () => {
    setEquipLoading(true)
    setEquipError('')
    fetch('http://localhost:8080/api/equipment')
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message || 'Failed to fetch equipment')
        }
        return res.json()
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setEquipment(
            data.map((item) => ({
              ...item,
              name: item.equipmentName || item.name,
              equipmentName: item.equipmentName || item.name,
            }))
          )
        }
      })
      .catch((err) => {
        console.error('Error fetching equipment:', err)
        setEquipError(err.message || 'Unable to load equipment from server')
      })
      .finally(() => {
        setEquipLoading(false)
      })
  }

  useEffect(() => {
    fetchRooms()
    fetchEquipment()
    let userId = currentUser?.id
    if (!userId) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER)
        if (saved) {
          const parsed = JSON.parse(saved)
          userId = parsed?.id || parsed?.userId
        }
      } catch (e) { }
    }
    if (userId) {
      fetchMyBookings(userId)
    }
  }, [])

  // Auto-refresh when navigating to room or equipment pages
  useEffect(() => {
    let userId = currentUser?.id
    if (!userId) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER)
        if (saved) {
          const parsed = JSON.parse(saved)
          userId = parsed?.id || parsed?.userId
        }
      } catch (e) { }
    }
    if (userId) {
      fetchMyBookings(userId)
    }
    if (currentPage === 'room-booking' || currentPage === 'admin-rooms' || currentPage === 'admin-dashboard') {
      fetchRooms()
    }
    if (currentPage === 'equipment-booking' || currentPage === 'admin-equipment' || currentPage === 'admin-dashboard') {
      fetchEquipment()
    }
  }, [currentPage])
  const [addEquipModalOpen, setAddEquipModalOpen] = useState(false)
  const [newEquipName, setNewEquipName] = useState('')
  const [newEquipQty, setNewEquipQty] = useState('')
  const [addEquipError, setAddEquipError] = useState('')
  const [editEquip, setEditEquip] = useState(null)
  const [editEquipQty, setEditEquipQty] = useState('')
  const [editEquipError, setEditEquipError] = useState('')
  const [deleteEquip, setDeleteEquip] = useState(null)
  const [deleteEquipError, setDeleteEquipError] = useState('')
  const [equipAdminSuccessMsg, setEquipAdminSuccessMsg] = useState('')

  // Analytics state
  const [viewMode, setViewMode] = useState('daily') // 'daily' | 'weekly'
  const [selectedDate, setSelectedDate] = useState(() => getTodayDate())
  const [selectedWeek, setSelectedWeek] = useState(() => getCurrentIsoWeekString())
  const [analyticsRefreshTrigger, setAnalyticsRefreshTrigger] = useState(0)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const analyticsMode = viewMode
  const setAnalyticsMode = setViewMode
  const analyticsDate = selectedDate
  const setAnalyticsDate = setSelectedDate
  const analyticsWeek = selectedWeek
  const setAnalyticsWeek = setSelectedWeek

  // Fetch analytics from backend whenever on analytics page and filters change or bookings update
  useEffect(() => {
    if (currentPage === 'admin-analytics') {
      setAnalyticsLoading(true)
      setAnalyticsError('')
      const url =
        viewMode === 'daily'
          ? `http://localhost:8080/api/admin/analytics/daily?date=${selectedDate}`
          : `http://localhost:8080/api/admin/analytics/weekly?week=${selectedWeek}`

      fetch(url)
        .then(async (res) => {
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            throw new Error(data.message || 'Failed to fetch analytics')
          }
          return data
        })
        .then((data) => {
          setAnalyticsData(data)
        })
        .catch((err) => {
          setAnalyticsError(err.message || 'Unable to load analytics data')
        })
        .finally(() => {
          setAnalyticsLoading(false)
        })
    }
  }, [currentPage, viewMode, selectedDate, selectedWeek, analyticsRefreshTrigger])

  // Poll for analytics updates every 4s while viewing analytics so external/new bookings refresh dynamically
  useEffect(() => {
    if (currentPage !== 'admin-analytics') return
    const timer = setInterval(() => {
      setAnalyticsRefreshTrigger((prev) => prev + 1)
    }, 4000)
    return () => clearInterval(timer)
  }, [currentPage])

  // Helper to retrieve logged-in student id from currentUser or localStorage
  const getStoredUserId = () => {
    let userId = currentUser?.id
    if (!userId) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER)
        if (saved) {
          const parsed = JSON.parse(saved)
          userId = parsed?.id || parsed?.userId
        }
      } catch (e) { }
    }
    return userId
  }

  // My Bookings state (fetched from backend)
  const [myBookings, setMyBookings] = useState([])
  const [myBookingsLoading, setMyBookingsLoading] = useState(false)
  const [cancelModalBooking, setCancelModalBooking] = useState(null)
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('')
  const [cancelErrorMsg, setCancelErrorMsg] = useState('')

  // Fetch My Bookings from backend and also rebuild local tracking state
  const fetchMyBookings = (userId) => {
    const idToFetch = userId || getStoredUserId()
    if (!idToFetch) return
    setMyBookingsLoading(true)
    fetch(`http://localhost:8080/api/bookings/user/${idToFetch}`)
      .then(async (res) => {
        let data = null
        try {
          data = await res.json()
        } catch (e) { }
        if (!res.ok) throw new Error((data && data.message) || 'Failed to fetch bookings')
        return data || {}
      })
      .then((data) => {
        let roomList = []
        let equipList = []
        if (Array.isArray(data)) {
          roomList = data.filter((b) => b.type === 'ROOM' || b.roomId)
          equipList = data.filter((b) => b.type === 'EQUIPMENT' || b.equipmentId)
        } else if (data && typeof data === 'object') {
          roomList = Array.isArray(data.roomBookings) ? data.roomBookings : []
          equipList = Array.isArray(data.equipmentBookings) ? data.equipmentBookings : []
        }

        // Rebuild tracking arrays from backend data (only BOOKED/PENDING count as active)
        const newUserBookedRooms = []
        const newRoomBookings = {}
        roomList.forEach((rb) => {
          const bDate = rb.bookingDate || ''
          const slot = rb.timeSlot || ''
          const rId = rb.roomId
          const status = (rb.status || '').toUpperCase()
          if (status === 'BOOKED' || status === 'PENDING') {
            // Find the slot id from TIME_SLOTS by matching normalized time string
            const slotObj = TIME_SLOTS.find((s) => normalizeSlot(s.time) === normalizeSlot(slot))
            const slotId = slotObj ? slotObj.id : slot
            newUserBookedRooms.push(`${bDate}_${slotId}_${rId}`)
            if (!newRoomBookings[bDate]) newRoomBookings[bDate] = {}
            if (!newRoomBookings[bDate][slotId]) newRoomBookings[bDate][slotId] = {}
            newRoomBookings[bDate][slotId][rId] = (newRoomBookings[bDate][slotId][rId] || 0) + 1
          }
        })

        const newUserBookedEquipment = []
        const newEquipmentBookings = {}
        equipList.forEach((eb) => {
          const bDate = eb.bookingDate || ''
          const eId = eb.equipmentId
          const status = (eb.status || '').toUpperCase()
          if (status === 'BOOKED' || status === 'PENDING') {
            newUserBookedEquipment.push(`${bDate}_${eId}`)
            if (!newEquipmentBookings[bDate]) newEquipmentBookings[bDate] = {}
            newEquipmentBookings[bDate][eId] = (newEquipmentBookings[bDate][eId] || 0) + (eb.quantity || 1)
          }
        })

        setUserBookedRooms(newUserBookedRooms)
        setRoomBookings(newRoomBookings)
        setUserBookedEquipment(newUserBookedEquipment)
        setEquipmentBookings(newEquipmentBookings)

        // Combine and sort all bookings newest first without removing any history
        const combined = [
          ...roomList.map((rb) => ({
            id: `rb-${rb.id}`,
            backendId: rb.id,
            type: 'room',
            typeName: 'Room Booking',
            name: rb.roomName || `Room ${rb.roomId}`,
            roomName: rb.roomName || `Room ${rb.roomId}`,
            block: rb.block || '',
            capacity: rb.capacity || 0,
            date: rb.bookingDate,
            bookingDate: rb.bookingDate,
            time: rb.timeSlot || '',
            timeSlot: rb.timeSlot || '',
            slotId: (() => {
              const s = TIME_SLOTS.find((sl) => normalizeSlot(sl.time) === normalizeSlot(rb.timeSlot))
              return s ? s.id : rb.timeSlot
            })(),
            roomId: rb.roomId,
            status: rb.status ? (rb.status.charAt(0).toUpperCase() + rb.status.slice(1).toLowerCase()) : 'Booked',
            rawStatus: rb.status || 'BOOKED',
            createdAt: rb.createdAt,
            bookedAt: rb.createdAt,
          })),
          ...equipList.map((eb) => ({
            id: `eb-${eb.id}`,
            backendId: eb.id,
            type: 'equipment',
            typeName: 'Equipment Booking',
            name: eb.equipmentName || `Equipment ${eb.equipmentId}`,
            equipmentName: eb.equipmentName || `Equipment ${eb.equipmentId}`,
            quantity: eb.quantity || 1,
            date: eb.bookingDate,
            bookingDate: eb.bookingDate,
            time: '4:30 PM - 7:00 PM',
            timeSlot: '4:30 PM - 7:00 PM',
            equipmentId: eb.equipmentId,
            status: eb.status ? (eb.status.charAt(0).toUpperCase() + eb.status.slice(1).toLowerCase()) : 'Booked',
            rawStatus: eb.status || 'BOOKED',
            createdAt: eb.createdAt,
            bookedAt: eb.createdAt,
          }))
        ].sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return timeB - timeA
        })

        setMyBookings(combined)
      })
      .catch((err) => {
        console.error('Failed to fetch my bookings:', err)
      })
      .finally(() => {
        setMyBookingsLoading(false)
      })
  }

  // Fetch My Bookings when navigating to the page
  useEffect(() => {
    if (currentPage === 'my-bookings') {
      const userId = getStoredUserId()
      if (userId) fetchMyBookings(userId)
    }
  }, [currentPage])

  // Real-time browser clock ticker that updates the UI as time passes without requiring manual actions
  const [, setTicker] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Helper to check 30-minute cancellation eligibility using current real browser time
  // Handles both ISO datetime strings (from backend) and JS timestamps (legacy)
  const isWithin30Mins = (booking) => {
    const createdAt = typeof booking === 'object' && booking !== null
      ? (booking.createdAt ?? booking.bookedAt)
      : booking
    if (!createdAt) return false
    // Parse ISO datetime string from backend (e.g. '2026-10-01T10:30:00')
    const createdAtMs = typeof createdAt === 'string' ? new Date(createdAt).getTime() : Number(createdAt)
    if (isNaN(createdAtMs)) return false
    const elapsedTime = Date.now() - createdAtMs
    const THIRTY_MINUTES_MS = 30 * 60 * 1000 // 30 minutes in ms
    return elapsedTime >= 0 && elapsedTime < THIRTY_MINUTES_MS
  }

  // Student logout handler: clears user info and cached bookings, returns to Home
  const handleStudentLogout = () => {
    setCurrentUser(null)
    setProfileData(null)
    setMyBookings([])
    setUserBookedRooms([])
    setUserBookedEquipment([])
    try {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER)
    } catch (e) { }
    setCurrentPage('welcome')
  }

  const handleStudentLoginSubmit = async (e) => {
    e.preventDefault()
    setLoginError('')

    const cleanRegNumber = (loginRegNumber || loginEmail).trim()
    if (!cleanRegNumber) {
      setLoginError('Register number is required.')
      return
    }
    if (!loginPassword) {
      setLoginError('Password is required.')
      return
    }

    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registerNumber: cleanRegNumber,
          password: loginPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Backend returns: id, fullName, collegeEmail, registerNumber, department, year, role
        const studentInfo = {
          id: data.id,
          fullName: data.fullName,
          collegeEmail: data.collegeEmail,
          email: data.collegeEmail,
          registerNumber: data.registerNumber,
          regNumber: data.registerNumber,
          department: data.department,
          year: data.year,
          role: data.role,
        }
        setCurrentUser(studentInfo)
        try {
          localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(studentInfo))
        } catch (err) { }
        fetchMyBookings(studentInfo.id)
        setCurrentPage('student-dashboard')
      } else {
        setLoginError(data.message || 'Invalid register number or password.')
      }
    } catch (err) {
      setLoginError('Unable to connect to backend server at http://localhost:8080.')
    }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setRegError('')
    setRegSuccess('')

    // Basic frontend validation
    if (!regFullName.trim() || !regEmail.trim() || !regNumber.trim() || !regPassword || !regConfirmPassword) {
      setRegError('All fields are required.')
      return
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Password and Confirm Password do not match.')
      return
    }

    try {
      const response = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: regFullName.trim(),
          collegeEmail: regEmail.trim(),
          registerNumber: regNumber.trim(),
          password: regPassword,
          confirmPassword: regConfirmPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setRegSuccess(data.message || 'User registered successfully')
        setRegFullName('')
        setRegEmail('')
        setRegNumber('')
        setRegPassword('')
        setRegConfirmPassword('')
        setTimeout(() => {
          setRegSuccess('')
          setLoginError('')
          setCurrentPage('student-login')
        }, 1200)
      } else {
        setRegError(data.message || 'Registration failed')
      }
    } catch (err) {
      setRegError('Unable to connect to backend server at http://localhost:8080.')
    }
  }

  const handleAdminClick = () => {
    setAdminError('')
    setAdminEmail('')
    setAdminPassword('')
    setCurrentPage('admin-login')
  }

  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault()
    setAdminError('')

    const cleanEmail = adminEmail.trim()
    if (!cleanEmail) {
      setAdminError('Admin email is required.')
      return
    }
    if (!adminPassword) {
      setAdminError('Password is required.')
      return
    }

    try {
      const response = await fetch('http://localhost:8080/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collegeEmail: cleanEmail,
          password: adminPassword,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        // Store returned admin information (never password)
        const adminInfo = {
          id: data.id,
          fullName: data.fullName,
          collegeEmail: data.collegeEmail,
          email: data.collegeEmail,
          role: data.role || 'ADMIN',
        }
        setCurrentUser(adminInfo)
        try {
          localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(adminInfo))
        } catch (err) { }
        fetchRooms()
        fetchEquipment()
        setCurrentPage('admin-dashboard')
      } else {
        setAdminError(data.message || 'Invalid email or password.')
      }
    } catch (err) {
      setAdminError('Unable to connect to backend server at http://localhost:8080.')
    }
  }

  const handleAdminLogout = () => {
    setAdminEmail('')
    setAdminPassword('')
    setAdminError('')
    setCurrentUser(null)
    try {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER)
    } catch (e) { }
    setCurrentPage('welcome')
  }

  const handlePlaceholderAction = (actionName) => {
    alert(`${actionName} feature is under construction`)
  }

  // Admin Room Edit Modal handlers
  const handleOpenEditRoom = (room) => {
    setEditingRoom(room)
    setEditCapacity(room.capacity)
    const normStatus = (room.status || '').toUpperCase() === 'UNAVAILABLE' ? 'Unavailable' : 'Available'
    setEditStatus(normStatus)
    setEditError('')
    setRoomSuccessMsg('')
  }

  const handleSaveRoomChanges = (e) => {
    e.preventDefault()
    setEditError('')

    const parsedCap = parseInt(editCapacity, 10)
    if (isNaN(parsedCap) || parsedCap <= 0 || String(editCapacity).trim() === '') {
      setEditError('Capacity must be greater than 0.')
      return
    }

    fetch(`http://localhost:8080/api/admin/rooms/${editingRoom.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: editingRoom.roomName || editingRoom.name,
        block: editingRoom.block,
        capacity: parsedCap,
        status: (editStatus || 'Available').toUpperCase(),
        image: editingRoom.image || null,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.message || 'Failed to update room')
        }
        return data
      })
      .then(() => {
        setEditingRoom(null)
        setRoomSuccessMsg('Room updated successfully')
        fetchRooms()
      })
      .catch((err) => {
        setEditError(err.message || 'Failed to update room')
      })
  }

  const handleOpenDeleteRoom = (room) => {
    setDeletingRoom(room)
    setDeleteRoomError('')
  }

  const handleConfirmDeleteRoom = () => {
    if (!deletingRoom) return
    setDeleteRoomError('')

    fetch(`http://localhost:8080/api/admin/rooms/${deletingRoom.id}`, {
      method: 'DELETE',
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (res.status === 409 || (data.message && data.message.toLowerCase().includes('booking'))) {
            throw new Error('Room has existing bookings. Cannot delete.')
          }
          throw new Error(data.message || 'Failed to delete room')
        }
        return data
      })
      .then(() => {
        setRoomSuccessMsg(`Room "${deletingRoom.roomName || deletingRoom.name}" deleted successfully`)
        setDeletingRoom(null)
        setDeleteRoomError('')
        fetchRooms()
      })
      .catch((err) => {
        setDeleteRoomError(err.message || 'Room has existing bookings. Cannot delete.')
      })
  }

  const handleConfirmAddRoom = () => {
    if (!newRoomName.trim()) {
      setAddRoomError('Room Name is required.')
      return
    }
    if (!newRoomBlock.trim()) {
      setAddRoomError('Block is required.')
      return
    }
    const parsedCap = Number(newRoomCapacity)
    if (
      !newRoomCapacity.trim() ||
      isNaN(parsedCap) ||
      !Number.isInteger(parsedCap) ||
      parsedCap <= 0
    ) {
      setAddRoomError('Capacity must be a positive integer.')
      return
    }
    if (!newRoomStatus) {
      setAddRoomError('Status is required.')
      return
    }

    setAddRoomError('')
    fetch('http://localhost:8080/api/admin/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: newRoomName.trim(),
        block: newRoomBlock.trim(),
        capacity: parsedCap,
        status: newRoomStatus.toUpperCase(),
        image: newRoomImage.trim() || null,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.message || 'Failed to add room')
        }
        return data
      })
      .then((data) => {
        setRoomSuccessMsg(`Room "${data.roomName || newRoomName.trim()}" added successfully.`)
        setNewRoomName('')
        setNewRoomBlock('')
        setNewRoomCapacity('')
        setNewRoomStatus('Available')
        setNewRoomImage('')
        setAddRoomError('')
        setAddRoomModalOpen(false)
        fetchRooms()
      })
      .catch((err) => {
        setAddRoomError(err.message || 'Failed to add room')
      })
  }

  const handleConfirmAddEquipment = () => {
    if (!newEquipName.trim()) {
      setAddEquipError('Equipment Name is required.')
      return
    }
    const parsedQty = Number(newEquipQty)
    if (
      !newEquipQty.trim() ||
      isNaN(parsedQty) ||
      !Number.isInteger(parsedQty) ||
      parsedQty <= 0
    ) {
      setAddEquipError('Total Quantity must be a positive integer.')
      return
    }

    setAddEquipError('')
    fetch('http://localhost:8080/api/admin/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipmentName: newEquipName.trim(),
        totalQuantity: parsedQty,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.message || 'Failed to add equipment')
        }
        return data
      })
      .then(() => {
        setEquipAdminSuccessMsg('Equipment added successfully')
        setNewEquipName('')
        setNewEquipQty('')
        setAddEquipError('')
        setAddEquipModalOpen(false)
        fetchEquipment()
      })
      .catch((err) => {
        setAddEquipError(err.message || 'Failed to add equipment')
      })
  }

  const handleOpenEditEquipment = (item) => {
    setEditEquip(item)
    setEditEquipQty(item.totalQuantity)
    setEditEquipError('')
  }

  const handleConfirmEditEquipment = () => {
    if (!editEquip) return
    const parsedQty = parseInt(editEquipQty, 10)
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setEditEquipError('Quantity must be greater than 0')
      return
    }

    setEditEquipError('')
    fetch(`http://localhost:8080/api/admin/equipment/${editEquip.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipmentName: editEquip.equipmentName || editEquip.name,
        totalQuantity: parsedQty,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.message || 'Failed to update equipment')
        }
        return data
      })
      .then(() => {
        setEquipAdminSuccessMsg('Equipment updated successfully')
        setEditEquip(null)
        setEditEquipError('')
        fetchEquipment()
      })
      .catch((err) => {
        setEditEquipError(err.message || 'Failed to update equipment')
      })
  }

  const handleOpenDeleteEquipment = (item) => {
    setDeleteEquip(item)
    setDeleteEquipError('')
  }

  const handleConfirmDeleteEquipment = () => {
    if (!deleteEquip) return
    setDeleteEquipError('')

    fetch(`http://localhost:8080/api/admin/equipment/${deleteEquip.id}`, {
      method: 'DELETE',
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.message || 'Equipment has existing bookings. Cannot delete.')
        }
        return data
      })
      .then(() => {
        setEquipAdminSuccessMsg('Equipment deleted successfully')
        setDeleteEquip(null)
        setDeleteEquipError('')
        fetchEquipment()
      })
      .catch((err) => {
        setDeleteEquipError(err.message || 'Failed to delete equipment')
      })
  }

  // Room status calculation following priority rules:
  // 1. If admin marked room as Unavailable -> "Unavailable"
  // 2. If student already booked this room in this slot -> "Booked"
  // 3. If cutoff passed -> "Booking Closed"
  // 4. If room is full -> "Full"
  // 5. Otherwise -> "Available"
  const getRoomStatus = (room, slot, bookingDate) => {
    if (!slot || !bookingDate) return 'Available'
    const rStatus = (room.status || '').toUpperCase()
    if (rStatus === 'UNAVAILABLE') {
      return 'Unavailable'
    }
    const bookingKey = `${bookingDate}_${slot.id}_${room.id}`
    if (userBookedRooms.includes(bookingKey)) {
      return 'Booked'
    }
    if (!isRoomSlotOpen(slot)) {
      return 'Booking Closed'
    }
    const booked = roomBookings[bookingDate]?.[slot.id]?.[room.id] || 0
    if (booked >= room.capacity) {
      return 'Full'
    }
    return 'Available'
  }

  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')

  const handleConfirmBooking = () => {
    if (!bookingModalRoom || !selectedSlotId) return

    const activeDate = getActiveBookingDate()
    const slotObj = TIME_SLOTS.find((s) => s.id === selectedSlotId)
    const userId = getStoredUserId()
    const numUserId = userId != null ? (isNaN(Number(userId)) ? userId : Number(userId)) : null
    const numRoomId = bookingModalRoom.id != null ? (isNaN(Number(bookingModalRoom.id)) ? bookingModalRoom.id : Number(bookingModalRoom.id)) : null

    setBookingLoading(true)
    setBookingError('')
    fetch('http://localhost:8080/api/bookings/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: numUserId,
        roomId: numRoomId,
        bookingDate: activeDate,
        timeSlot: slotObj ? slotObj.time : '',
      }),
    })
      .then(async (res) => {
        let data = null
        try {
          data = await res.json()
        } catch (e) { }
        if (!res.ok) {
          const errMsg = (data && data.message) || (data && data.error) || (typeof data === 'string' && data) || res.statusText || 'Booking failed'
          throw new Error(errMsg)
        }
        return data
      })
      .then(() => {
        setBookingModalRoom(null)
        setBookingError('')
        setBookingSuccessMsg('Room booked successfully')
        // Optimistically record booked room for instant UI feedback
        setUserBookedRooms((prev) => [...prev, `${activeDate}_${selectedSlotId}_${bookingModalRoom.id}`])
        setAnalyticsRefreshTrigger((prev) => prev + 1)
        fetchRooms()
        if (userId) fetchMyBookings(userId)
      })
      .catch((err) => {
        setBookingError(err.message || 'Booking failed. Please try again.')
      })
      .finally(() => {
        setBookingLoading(false)
      })
  }

  const [equipBookingLoading, setEquipBookingLoading] = useState(false)
  const [equipBookingError, setEquipBookingError] = useState('')

  const handleConfirmEquipmentBooking = () => {
    if (!equipModalItem) return

    const activeDate = getActiveBookingDate()
    const userId = getStoredUserId()
    const numUserId = userId != null ? (isNaN(Number(userId)) ? userId : Number(userId)) : null
    const numEquipId = equipModalItem.id != null ? (isNaN(Number(equipModalItem.id)) ? equipModalItem.id : Number(equipModalItem.id)) : null

    setEquipBookingLoading(true)
    setEquipBookingError('')
    fetch('http://localhost:8080/api/bookings/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: numUserId,
        equipmentId: numEquipId,
        bookingDate: activeDate,
        quantity: 1,
        timeSlot: '4:30 PM - 7:00 PM',
      }),
    })
      .then(async (res) => {
        let data = null
        try {
          data = await res.json()
        } catch (e) { }
        if (!res.ok) {
          const errMsg = (data && data.message) || (data && data.error) || (typeof data === 'string' && data) || res.statusText || 'Booking failed'
          throw new Error(errMsg)
        }
        return data
      })
      .then(() => {
        setEquipModalItem(null)
        setEquipBookingError('')
        setEquipSuccessMsg('Equipment booked successfully')
        // Optimistically record booked equipment for instant UI feedback
        setUserBookedEquipment((prev) => [...prev, `${activeDate}_${equipModalItem.id}`])
        setAnalyticsRefreshTrigger((prev) => prev + 1)
        fetchEquipment()
        if (userId) fetchMyBookings(userId)
      })
      .catch((err) => {
        setEquipBookingError(err.message || 'Booking failed. Please try again.')
      })
      .finally(() => {
        setEquipBookingLoading(false)
      })
  }

  const [cancelLoading, setCancelLoading] = useState(false)

  const handleConfirmCancelBooking = () => {
    if (!cancelModalBooking) return

    const rawId = cancelModalBooking.backendId || cancelModalBooking.id
    if (!rawId) {
      setCancelModalBooking(null)
      return
    }

    const numericId = typeof rawId === 'string' && rawId.includes('-')
      ? rawId.split('-')[1]
      : rawId

    const isRoom = cancelModalBooking.type === 'room'
    const url = isRoom
      ? `http://localhost:8080/api/bookings/room/${numericId}/cancel`
      : `http://localhost:8080/api/bookings/equipment/${numericId}/cancel`

    setCancelLoading(true)
    setCancelErrorMsg('')
    setCancelSuccessMsg('')

    fetch(url, { method: 'PUT' })
      .then(async (res) => {
        let data = null
        try {
          data = await res.json()
        } catch (e) { }
        if (!res.ok) {
          throw new Error((data && data.message) ? data.message : 'Cancellation failed')
        }
        return data
      })
      .then(() => {
        setCancelModalBooking(null)
        setCancelSuccessMsg('Booking cancelled successfully')
        setCancelErrorMsg('')
        // Refresh My Bookings and room/equipment availability
        const userId = getStoredUserId()
        if (userId) fetchMyBookings(userId)
        setAnalyticsRefreshTrigger((prev) => prev + 1)
        fetchRooms()
        fetchEquipment()
      })
      .catch((err) => {
        setCancelModalBooking(null)
        setCancelSuccessMsg('')
        setCancelErrorMsg(err.message || 'Cancellation failed. Please try again.')
      })
      .finally(() => {
        setCancelLoading(false)
      })
  }

  const selectedSlot = TIME_SLOTS.find((s) => s.id === selectedSlotId)

  // --------------------------------------------------
  // PAGE 6: STUDENT EQUIPMENT BOOKING
  // --------------------------------------------------
  if (currentPage === 'equipment-booking') {
    const equipCutoffOpen = isEquipmentBookingOpen()
    const activeDate = getActiveBookingDate()
    const activeDateLabel = formatBookingDate(activeDate)
    // Heading: 'TOMORROW\'S EQUIPMENT BOOKING' when at/after 8 PM, else 'TODAY\'S EQUIPMENT BOOKING'
    const equipHeading = isAtOrAfter8PM() ? "TOMORROW'S EQUIPMENT BOOKING" : "TODAY'S EQUIPMENT BOOKING"

    return (
      <div className="dashboard-container">
        {/* Left Sidebar (Equipment Booking Active) */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-brand">
            <h2>
              CAMPUS<br />CONNECT
            </h2>
          </div>

          <nav className="sidebar-menu">
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('student-dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => window.open('https://geobits.onrender.com/', '_blank')}
            >
              Navigation
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('room-booking')}
            >
              Room Booking
            </button>
            <button
              type="button"
              className="sidebar-item active"
              onClick={() => { }}
            >
              Equipment Booking
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('my-bookings')}
            >
              My Bookings
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('student-profile')}
            >
              Profile
            </button>
          </nav>

          <div className="sidebar-footer">
            <button
              type="button"
              className="sidebar-logout"
              onClick={handleStudentLogout}
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-main equipment-booking-main">
          {/* Page Header */}
          <header className="room-booking-header">
            <h1 className="room-booking-title">EQUIPMENT BOOKING</h1>
            <p className="room-booking-subtitle">
              Reserve sports equipment for your campus activities.
            </p>
          </header>

          {/* Success Banner */}
          {equipSuccessMsg && (
            <div className="booking-success-banner">
              <span>{equipSuccessMsg}</span>
              <button
                type="button"
                className="banner-close-btn"
                onClick={() => setEquipSuccessMsg('')}
              >
                &times;
              </button>
            </div>
          )}

          {/* Error Banner */}
          {equipBookingError && (
            <div className="booking-success-banner" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#b91c1c', marginBottom: '1.25rem' }}>
              <span>{equipBookingError}</span>
              <button
                type="button"
                className="banner-close-btn"
                style={{ color: '#b91c1c' }}
                onClick={() => setEquipBookingError('')}
              >
                &times;
              </button>
            </div>
          )}

          {/* Fixed Time Banner */}
          <section className="equipment-time-banner">
            <div className="time-banner-badge">{equipHeading}</div>
            <div className="equipment-actual-date">
              {activeDateLabel}
            </div>
            <div className="time-banner-clock">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="time-banner-hours">4:30 PM – 7:00 PM</span>
            </div>
            <p className="time-banner-note">Fixed booking period for all sports equipment. Booking closes at 4:00 PM.</p>
          </section>

          {/* Equipment Cards Grid — always shown; status reflects cutoff and availability */}
          <section className="equipment-grid-section">
            <div className="equipment-grid">
              {equipLoading && equipment.length === 0 && (
                <div className="select-slot-prompt" style={{ gridColumn: '1 / -1' }}>
                  <p>Loading equipment from server...</p>
                </div>
              )}
              {!equipLoading && equipment.length === 0 && (
                <div className="select-slot-prompt" style={{ gridColumn: '1 / -1' }}>
                  <p>No equipment available.</p>
                </div>
              )}
              {equipment.map((item) => {
                const equipName = item.equipmentName || item.name || `Equipment ${item.id}`
                const totalQty = item.totalQuantity ?? 0
                const availQty = item.availableQuantity !== undefined ? item.availableQuantity : totalQty
                const equipKey = `${activeDate}_${item.id}`
                const isUserBooked = userBookedEquipment.includes(equipKey)
                const cutoffOpen = equipCutoffOpen
                let status = 'Available'
                if (isUserBooked) {
                  status = 'Booked'
                } else if (!cutoffOpen) {
                  status = 'Booking Closed'
                } else if (availQty <= 0) {
                  status = 'Unavailable'
                }
                const canBook = cutoffOpen && availQty > 0 && !isUserBooked
                const { icon, accent } = resolveEquipmentIconAndAccent(item)

                return (
                  <div key={item.id} className="equip-card">
                    {/* Visual Sports Icon Box */}
                    <div className={`equip-icon-wrapper equip-${accent}`}>
                      {renderSportsIcon(icon)}
                    </div>

                    <div className="equip-card-body">
                      <div className="equip-header-row">
                        <h3 className="equip-name">{equipName}</h3>
                        <span className={`room-status-badge status-${status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {status}
                        </span>
                      </div>

                      <div className="equip-quantity-box">
                        <p className="equip-qty-text">
                          <span className="qty-label">Total Quantity:</span>{' '}
                          <span className="qty-val">{totalQty}</span>
                        </p>
                        <p className="equip-qty-text">
                          <span className="qty-label">Available Quantity:</span>{' '}
                          <span className={`qty-val ${availQty <= 0 ? 'qty-zero' : ''}`}>{availQty}</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        className={`room-book-action-btn ${isUserBooked
                          ? 'btn-booked'
                          : canBook
                            ? 'btn-can-book'
                            : 'btn-cannot-book'
                          }`}
                        disabled={!canBook}
                        onClick={() => {
                          setEquipSuccessMsg('')
                          setEquipModalItem({ ...item, name: equipName, equipmentName: equipName })
                        }}
                      >
                        {isUserBooked
                          ? 'Booked'
                          : !cutoffOpen
                            ? 'Booking Closed'
                            : availQty <= 0
                              ? 'Unavailable'
                              : 'Book'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Confirmation Modal */}
          {equipModalItem && (
            <div
              className="modal-backdrop"
              onClick={() => setEquipModalItem(null)}
            >
              <div
                className="booking-modal-card"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="modal-title">Confirm Equipment Booking</h3>

                <div className="modal-info-box">
                  <div className="modal-row">
                    <span className="modal-label">Equipment Name:</span>
                    <span className="modal-value">{equipModalItem.name}</span>
                  </div>
                  <div className="modal-row">
                    <span className="modal-label">Booking Date:</span>
                    <span className="modal-value">{activeDate}</span>
                  </div>
                  <div className="modal-row">
                    <span className="modal-label">Quantity:</span>
                    <span className="modal-value">1</span>
                  </div>
                  <div className="modal-row">
                    <span className="modal-label">Time Slot:</span>
                    <span className="modal-value">4:30 PM - 7:00 PM</span>
                  </div>
                </div>

                <div className="modal-actions-row">
                  {equipBookingError && (
                    <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.5rem', textAlign: 'center', width: '100%' }}>{equipBookingError}</p>
                  )}
                  <button
                    type="button"
                    className="modal-btn-confirm"
                    onClick={handleConfirmEquipmentBooking}
                    disabled={equipBookingLoading}
                  >
                    {equipBookingLoading ? 'Booking...' : 'Confirm Booking'}
                  </button>
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    onClick={() => { setEquipModalItem(null); setEquipBookingError('') }}
                    disabled={equipBookingLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // --------------------------------------------------
  // PAGE 5: STUDENT ROOM BOOKING
  // --------------------------------------------------
  if (currentPage === 'room-booking') {
    const activeDate = getActiveBookingDate()
    const activeDateLabel = formatBookingDate(activeDate)
    // Heading: 'TOMORROW\'S BOOKING' when at/after 8 PM, else 'TODAY\'S BOOKING'
    const roomHeading = isAtOrAfter8PM() ? "TOMORROW'S BOOKING" : "TODAY'S BOOKING"

    return (
      <div className="dashboard-container">
        {/* Left Sidebar (Same as Dashboard, Room Booking Active) */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-brand">
            <h2>
              CAMPUS<br />CONNECT
            </h2>
          </div>

          <nav className="sidebar-menu">
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('student-dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => window.open('https://geobits.onrender.com/', '_blank')}
            >
              Navigation
            </button>
            <button
              type="button"
              className="sidebar-item active"
              onClick={() => { }}
            >
              Room Booking
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('equipment-booking')}
            >
              Equipment Booking
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('my-bookings')}
            >
              My Bookings
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('student-profile')}
            >
              Profile
            </button>
          </nav>

          <div className="sidebar-footer">
            <button
              type="button"
              className="sidebar-logout"
              onClick={handleStudentLogout}
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-main room-booking-main">
          {/* Page Header */}
          <header className="room-booking-header">
            <h1 className="room-booking-title">ROOM BOOKING</h1>
            <p className="room-booking-subtitle">
              Find and reserve an available room on campus.
            </p>
          </header>

          {/* Success Banner */}
          {bookingSuccessMsg && (
            <div className="booking-success-banner">
              <span>{bookingSuccessMsg}</span>
              <button
                type="button"
                className="banner-close-btn"
                onClick={() => setBookingSuccessMsg('')}
              >
                &times;
              </button>
            </div>
          )}

          {/* Error Banner */}
          {bookingError && (
            <div className="booking-success-banner" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#b91c1c', marginBottom: '1.25rem' }}>
              <span>{bookingError}</span>
              <button
                type="button"
                className="banner-close-btn"
                style={{ color: '#b91c1c' }}
                onClick={() => setBookingError('')}
              >
                &times;
              </button>
            </div>
          )}

          {/* Time Slots Section */}
          <section className="booking-slots-section">
            <div className="slots-header">
              <h2 className="slots-section-title">{roomHeading}</h2>
              <div className="slots-actual-date">
                {activeDateLabel}
              </div>
              <p className="slots-instruction">
                Select a time slot to view available rooms:
              </p>
            </div>

            <div className="time-slots-grid">
              {TIME_SLOTS.map((slot) => {
                const isSelected = selectedSlotId === slot.id
                const slotOpen = isRoomSlotOpen(slot)
                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={`time-slot-card ${isSelected ? 'active-slot' : ''} ${!slotOpen ? 'slot-closed' : ''}`}
                    onClick={() => {
                      setSelectedSlotId(slot.id)
                      setBookingSuccessMsg('')
                    }}
                  >
                    <span className="slot-time-text">{slot.time}</span>
                    {!slotOpen && (
                      <span style={{ display: 'block', fontSize: '0.72rem', marginTop: '0.2rem', opacity: 0.75 }}>Booking Closed</span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Room Cards Section (shown when a slot is selected) */}
          <section className="rooms-display-section">
            {!selectedSlot ? (
              <div className="select-slot-prompt">
                <p>Please select a time slot above to view and book rooms.</p>
              </div>
            ) : (
              <div className="rooms-grid">
                {roomsLoading && rooms.length === 0 && (
                  <div className="select-slot-prompt" style={{ gridColumn: '1 / -1' }}>
                    <p>Loading rooms from server...</p>
                  </div>
                )}
                {!roomsLoading && rooms.length === 0 && (
                  <div className="select-slot-prompt" style={{ gridColumn: '1 / -1' }}>
                    <p>No rooms available.</p>
                  </div>
                )}
                {rooms.map((room) => {
                  const roomName = room.roomName || room.name || `Room ${room.id}`
                  const status = getRoomStatus(room, selectedSlot, activeDate)
                  const isUserBooked = status === 'Booked'
                  const isUnavailable = (room.status || '').toUpperCase() === 'UNAVAILABLE'
                  const isAvailable = !isUnavailable && status === 'Available'
                  const canBook = isAvailable && !isUserBooked
                  const imageUrl = getRoomImageUrl(room)

                  return (
                    <div key={room.id} className="room-card">
                      {/* Room Image with fallback */}
                      <div className="room-image-wrapper">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={roomName}
                            className="room-card-image"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              const placeholder = e.target.nextElementSibling
                              if (placeholder) placeholder.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div
                          className="room-image-fallback"
                          style={{ display: imageUrl ? 'none' : 'flex' }}
                        >
                          <span>{roomName}</span>
                        </div>
                        <span
                          className={`room-status-badge status-${status
                            .toLowerCase()
                            .replace(/\s+/g, '-')}`}
                        >
                          {status}
                        </span>
                      </div>

                      {/* Card Content */}
                      <div className="room-card-body">
                        <h3 className="room-card-name">{roomName}</h3>
                        <p className="room-card-detail">Block: {room.block}</p>
                        <p className="room-card-detail">
                          Capacity: {room.capacity}
                        </p>

                        <button
                          type="button"
                          className={`room-book-action-btn ${isUserBooked
                            ? 'btn-booked'
                            : canBook
                              ? 'btn-can-book'
                              : 'btn-cannot-book'
                            }`}
                          disabled={!canBook}
                          onClick={() => {
                            setBookingSuccessMsg('')
                            setBookingModalRoom({ ...room, name: roomName, roomName })
                          }}
                        >
                          {isUserBooked
                            ? 'Booked'
                            : status === 'Booking Closed'
                              ? 'Booking Closed'
                              : isUnavailable
                                ? 'Unavailable'
                                : 'Book'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Confirmation Modal */}
          {bookingModalRoom && (
            <div
              className="modal-backdrop"
              onClick={() => setBookingModalRoom(null)}
            >
              <div
                className="booking-modal-card"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="modal-title">Confirm Booking</h3>

                <div className="modal-info-box">
                  <div className="modal-row">
                    <span className="modal-label">Room:</span>
                    <span className="modal-value">
                      {bookingModalRoom.name}
                    </span>
                  </div>
                  <div className="modal-row">
                    <span className="modal-label">Booking Date:</span>
                    <span className="modal-value">{activeDate}</span>
                  </div>
                  <div className="modal-row">
                    <span className="modal-label">Time Slot:</span>
                    <span className="modal-value">{selectedSlot?.time}</span>
                  </div>
                </div>

                <div className="modal-actions-row">
                  {bookingError && (
                    <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.5rem', textAlign: 'center' }}>{bookingError}</p>
                  )}
                  <button
                    type="button"
                    className="modal-btn-confirm"
                    onClick={handleConfirmBooking}
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? 'Booking...' : 'Confirm Booking'}
                  </button>
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    onClick={() => { setBookingModalRoom(null); setBookingError('') }}
                    disabled={bookingLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // --------------------------------------------------
  // PAGE: ADMIN DASHBOARD
  // --------------------------------------------------
  if (currentPage === 'admin-dashboard') {
    return (
      <div className="dashboard-container">
        {/* Left Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-brand">
            <h2>
              CAMPUS<br />CONNECT
            </h2>
          </div>

          <nav className="sidebar-menu">
            <button
              type="button"
              className="sidebar-item active"
              onClick={() => { }}
            >
              Dashboard
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('admin-rooms')}
            >
              Room Management
            </button>
            <button
              type="button"
              className={"sidebar-item" + (currentPage === 'admin-equipment' ? ' active' : '')}
              onClick={() => setCurrentPage('admin-equipment')}
            >
              Sports Equipment
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('admin-analytics')}
            >
              Analytics
            </button>
          </nav>

          <div className="sidebar-footer">
            <button
              type="button"
              className="sidebar-logout"
              onClick={handleAdminLogout}
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-main admin-dashboard-main">
          {/* Page Header */}
          <header className="room-booking-header">
            <h1 className="room-booking-title">ADMIN DASHBOARD</h1>
            <p className="room-booking-subtitle">
              Manage campus rooms, sports equipment and booking activity.
            </p>
          </header>

          {/* 3 Summary Cards */}
          <section className="admin-summary-section">
            <div className="admin-summary-grid">
              {/* Card 1: Total Rooms */}
              <div className="admin-summary-card">
                <div className="summary-icon-box icon-blue">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div className="summary-info">
                  <span className="summary-label">TOTAL ROOMS</span>
                  <span className="summary-value">{rooms.length}</span>
                </div>
              </div>

              {/* Card 2: Total Sports Equipment */}
              <div className="admin-summary-card">
                <div className="summary-icon-box icon-emerald">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                    <path d="M2 12h20" />
                  </svg>
                </div>
                <div className="summary-info">
                  <span className="summary-label">TOTAL SPORTS EQUIPMENT</span>
                  <span className="summary-value">{equipment.length}</span>
                </div>
              </div>

              {/* Card 3: Total Users */}
              <div className="admin-summary-card">
                <div className="summary-icon-box icon-indigo">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="summary-info">
                  <span className="summary-label">TOTAL STUDENTS</span>
                  <span className="summary-value">{totalStudentsCount}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Actions (Exactly 2 Cards) */}
          <section className="admin-section">
            <h2 className="admin-section-title">QUICK ACTIONS</h2>
            <div className="admin-actions-grid">
              {/* Card 1: Manage Rooms */}
              <div className="admin-action-card card-accent-blue">
                <div>
                  <div className="action-card-header">
                    <div className="card-icon-box icon-blue">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                      </svg>
                    </div>
                    <h3 className="card-item-title">Manage Rooms</h3>
                  </div>
                  <p className="card-item-desc">
                    Manage room capacity and availability.
                  </p>
                </div>
                <button
                  type="button"
                  className="card-action-btn btn-blue"
                  onClick={() => setCurrentPage('admin-rooms')}
                >
                  Manage Rooms
                </button>
              </div>

              {/* Card 2: Manage Sports Equipment */}
              <div className="admin-action-card card-accent-purple">
                <div>
                  <div className="action-card-header">
                    <div className="card-icon-box icon-purple">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <h3 className="card-item-title">Manage Sports Equipment</h3>
                  </div>
                  <p className="card-item-desc">
                    Manage sports equipment quantities.
                  </p>
                </div>
                <button
                  type="button"
                  className="card-action-btn btn-purple"
                  onClick={() => setCurrentPage('admin-equipment')}
                >
                  Manage Sports Equipment
                </button>
              </div>
            </div>
          </section>

          {/* Recent Activity Section */}
          <section className="admin-section">
            <h2 className="admin-section-title">RECENT ACTIVITY</h2>
            <div className="recent-activity-card">
              <div className="activity-list">
                {recentActivity.length === 0 ? (
                  <div className="activity-item">
                    <div className="activity-content">
                      <span className="activity-text" style={{ color: 'var(--text-secondary, #888)' }}>No recent activity</span>
                    </div>
                  </div>
                ) : (
                  recentActivity.map((item, idx) => {
                    // Compute relative time from createdAt ISO string
                    const relTime = (() => {
                      if (!item.createdAt) return ''
                      const diff = Date.now() - new Date(item.createdAt).getTime()
                      const mins = Math.floor(diff / 60000)
                      if (mins < 1) return 'just now'
                      if (mins < 60) return `${mins} min ago`
                      const hrs = Math.floor(mins / 60)
                      if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
                      const days = Math.floor(hrs / 24)
                      return `${days} day${days > 1 ? 's' : ''} ago`
                    })()
                    const dotClass = item.action === 'cancelled' ? 'activity-dot dot-cancelled' : 'activity-dot dot-booked'
                    const label = item.action === 'cancelled'
                      ? <span className="activity-text">Student cancelled <strong>{item.name}</strong> booking</span>
                      : <span className="activity-text">Student booked <strong>{item.name}</strong></span>
                    return (
                      <div key={idx} className="activity-item">
                        <div className={dotClass}></div>
                        <div className="activity-content">
                          {label}
                          <span className="activity-time">{relTime}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // --------------------------------------------------
  // PAGE: ADMIN ROOM MANAGEMENT
  // --------------------------------------------------
  if (currentPage === 'admin-rooms') {
    return (
      <div className="dashboard-container">
        {/* Left Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-brand">
            <h2>
              CAMPUS<br />CONNECT
            </h2>
          </div>

          <nav className="sidebar-menu">
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('admin-dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className="sidebar-item active"
              onClick={() => { }}
            >
              Room Management
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('admin-equipment')}
            >
              Sports Equipment
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('admin-analytics')}
            >
              Analytics
            </button>
          </nav>

          <div className="sidebar-footer">
            <button
              type="button"
              className="sidebar-logout"
              onClick={handleAdminLogout}
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-main admin-dashboard-main">
          {/* Page Header */}
          <header className="room-booking-header">
            <h1 className="room-booking-title">ROOM MANAGEMENT</h1>
            <p className="room-booking-subtitle">
              Manage room capacity and availability.
            </p>
          </header>

          {/* Success Banner */}
          {roomSuccessMsg && (
            <div className="booking-success-banner">
              <span>{roomSuccessMsg}</span>
              <button
                type="button"
                className="banner-close-btn"
                onClick={() => setRoomSuccessMsg('')}
              >
                &times;
              </button>
            </div>
          )}

          {/* Add Room Action Button */}
          <section className="admin-actions-grid" style={{ marginBottom: '1.25rem' }}>
            <button
              type="button"
              className="admin-action-card"
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => {
                setAddRoomModalOpen(true)
                setAddRoomError('')
              }}
            >
              <div className="action-card-header">
                <div className="card-icon-box summary-icon-box icon-emerald">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <h3>Add New Room</h3>
              </div>
            </button>
          </section>

          {/* Rooms Table Card */}
          <section className="admin-table-card">
            <div className="admin-table-wrapper">
              <table className="admin-rooms-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Room / Hall / Lab</th>
                    <th>Block</th>
                    <th>Capacity</th>
                    <th>Status</th>
                    <th>Edit</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room, idx) => {
                    const isAvailable = room.status !== 'Unavailable'
                    return (
                      <tr key={room.id}>
                        <td className="cell-sno">{idx + 1}</td>
                        <td className="cell-room-name">
                          <strong>{room.name}</strong>
                        </td>
                        <td className="cell-block">{room.block}</td>
                        <td className="cell-capacity">{room.capacity}</td>
                        <td className="cell-status">
                          <span
                            className={`room-table-badge ${isAvailable
                              ? 'badge-available'
                              : 'badge-unavailable'
                              }`}
                          >
                            {isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                        <td className="cell-action">
                          <button
                            type="button"
                            className="btn-edit-room"
                            onClick={() => handleOpenEditRoom(room)}
                          >
                            Edit
                          </button>
                        </td>
                        <td className="cell-action">
                          <button
                            type="button"
                            className="btn-edit-room"
                            style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
                            onClick={() => handleOpenDeleteRoom(room)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Add Room Modal */}
          {addRoomModalOpen && (
            <div className="modal-backdrop" onClick={() => { setAddRoomModalOpen(false); setAddRoomError(''); }}>
              <div className="booking-modal-card admin-edit-modal" onClick={e => e.stopPropagation()}>
                <h3 className="modal-title">Add Room</h3>
                {addRoomError && (
                  <div className="form-error-msg" style={{ marginBottom: '1rem' }}>
                    {addRoomError}
                  </div>
                )}
                <div className="admin-edit-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-room-name">Room Name</label>
                    <input
                      id="new-room-name"
                      type="text"
                      className="form-input"
                      value={newRoomName}
                      onChange={e => {
                        setNewRoomName(e.target.value)
                        if (addRoomError) setAddRoomError('')
                      }}
                      placeholder="e.g. Room 305, Library 1"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-room-block">Block</label>
                    <input
                      id="new-room-block"
                      type="text"
                      className="form-input"
                      value={newRoomBlock}
                      onChange={e => {
                        setNewRoomBlock(e.target.value)
                        if (addRoomError) setAddRoomError('')
                      }}
                      placeholder="e.g. CSE Block, Main Block"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-room-capacity">Capacity</label>
                    <input
                      id="new-room-capacity"
                      type="number"
                      className="form-input"
                      value={newRoomCapacity}
                      onChange={e => {
                        setNewRoomCapacity(e.target.value)
                        if (addRoomError) setAddRoomError('')
                      }}
                      placeholder="e.g. 50"
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-room-status">Status</label>
                    <select
                      id="new-room-status"
                      className="form-input form-select"
                      value={newRoomStatus}
                      onChange={e => setNewRoomStatus(e.target.value)}
                    >
                      <option value="Available">Available</option>
                      <option value="Unavailable">Unavailable</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-room-image">Image (optional)</label>
                    <select
                      id="new-room-image"
                      className="form-input form-select"
                      value={newRoomImage}
                      onChange={e => setNewRoomImage(e.target.value)}
                    >
                      <option value="">No Image</option>
                      <option value="/rooms/classroom.jpg">Classroom</option>
                      <option value="/rooms/computer-lab.jpg">Computer Lab</option>
                      <option value="/rooms/library.jpg">Library</option>
                    </select>
                  </div>
                  <div className="modal-actions-row" style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="modal-btn-confirm"
                      onClick={handleConfirmAddRoom}
                    >
                      Add Room
                    </button>
                    <button
                      type="button"
                      className="modal-btn-cancel"
                      onClick={() => {
                        setAddRoomModalOpen(false)
                        setAddRoomError('')
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete Room Confirmation Modal */}
          {deletingRoom && (
            <div className="modal-backdrop" onClick={() => { setDeletingRoom(null); setDeleteRoomError(''); }}>
              <div className="booking-modal-card admin-edit-modal" onClick={e => e.stopPropagation()}>
                <h3 className="modal-title">Confirm Delete</h3>
                <p style={{ color: '#475569', fontSize: '0.98rem', marginBottom: '1.25rem', textAlign: 'center' }}>
                  Are you sure you want to delete <strong>{deletingRoom.name}</strong> ({deletingRoom.block})?
                </p>
                {deleteRoomError && (
                  <div className="form-error-msg" style={{ marginBottom: '1.25rem' }}>
                    {deleteRoomError}
                  </div>
                )}
                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="modal-btn-danger"
                    onClick={handleConfirmDeleteRoom}
                  >
                    Delete Room
                  </button>
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    onClick={() => {
                      setDeletingRoom(null)
                      setDeleteRoomError('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Room Modal */}
          {editingRoom && (
            <div
              className="modal-backdrop"
              onClick={() => setEditingRoom(null)}
            >
              <div
                className="booking-modal-card admin-edit-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="modal-title">Edit Room</h3>

                {editError && (
                  <div className="form-error-msg">{editError}</div>
                )}

                <form onSubmit={handleSaveRoomChanges} className="admin-edit-form">
                  <div className="form-group">
                    <label className="form-label">Room Name:</label>
                    <input
                      type="text"
                      className="form-input form-input-readonly"
                      value={editingRoom.name}
                      readOnly
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Block:</label>
                    <input
                      type="text"
                      className="form-input form-input-readonly"
                      value={editingRoom.block}
                      readOnly
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-capacity-input">
                      Capacity:
                    </label>
                    <input
                      id="edit-capacity-input"
                      type="number"
                      min="1"
                      className="form-input"
                      value={editCapacity}
                      onChange={(e) => {
                        setEditCapacity(e.target.value)
                        if (editError) setEditError('')
                      }}
                      placeholder="Enter capacity"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-status-select">
                      Status:
                    </label>
                    <select
                      id="edit-status-select"
                      className="form-input form-select"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      <option value="Available">Available</option>
                      <option value="Unavailable">Unavailable</option>
                    </select>
                  </div>

                  <div className="modal-actions-row">
                    <button type="submit" className="modal-btn-confirm">
                      Save Changes
                    </button>
                    <button
                      type="button"
                      className="modal-btn-cancel"
                      onClick={() => setEditingRoom(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // --------------------------------------------------
  // PAGE: ADMIN EQUIPMENT MANAGEMENT
  // --------------------------------------------------
  if (currentPage === 'admin-equipment') {
    return (
      <div className="dashboard-container">
        {/* Left Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-brand">
            <h2>
              CAMPUS<br />CONNECT
            </h2>
          </div>
          <nav className="sidebar-menu">
            <button type="button" className="sidebar-item" onClick={() => setCurrentPage('admin-dashboard')}>Dashboard</button>
            <button type="button" className="sidebar-item" onClick={() => setCurrentPage('admin-rooms')}>Room Management</button>
            <button type="button" className={"sidebar-item" + (currentPage === 'admin-equipment' ? ' active' : '')} onClick={() => setCurrentPage('admin-equipment')}>Sports Equipment</button>
            <button type="button" className="sidebar-item" onClick={() => setCurrentPage('admin-analytics')}>Analytics</button>
          </nav>
          <div className="sidebar-footer">
            <button type="button" className="sidebar-logout" onClick={handleAdminLogout}>Logout</button>
          </div>
        </aside>
        {/* Main Content Area */}
        <main className="dashboard-main admin-dashboard-main">
          <header className="room-booking-header">
            <h1 className="room-booking-title">SPORTS EQUIPMENT MANAGEMENT</h1>
            <p className="room-booking-subtitle">Manage campus sports equipment and available quantities.</p>
          </header>
          {equipAdminSuccessMsg && (
            <div className="booking-success-banner">
              <span>{equipAdminSuccessMsg}</span>
              <button type="button" className="banner-close-btn" onClick={() => setEquipAdminSuccessMsg('')}>&times;</button>
            </div>
          )}
          <section className="admin-actions-grid" style={{ marginBottom: '1rem' }}>
            <button type="button" className="admin-action-card" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setAddEquipModalOpen(true)}>
              <div className="action-card-header">
                <div className="card-icon-box summary-icon-box icon-emerald">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                </div>
                <h3>Add New Equipment</h3>
              </div>
            </button>
          </section>
          <section className="admin-table-card">
            <div className="admin-table-wrapper">
              <table className="admin-rooms-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Equipment Name</th>
                    <th>Total Quantity</th>
                    <th>Available Quantity</th>
                    <th>Edit</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((item, idx) => {
                    const available = item.availableQuantity != null ? item.availableQuantity : Math.max(0, item.totalQuantity - (equipmentBookings[item.id] || 0));
                    return (
                      <tr key={item.id}>
                        <td className="cell-sno">{idx + 1}</td>
                        <td className="cell-room-name"><strong>{item.equipmentName || item.name}</strong></td>
                        <td className="cell-capacity">{item.totalQuantity}</td>
                        <td className="cell-capacity">{available}</td>
                        <td className="cell-action">
                          <button type="button" className="btn-edit-room" onClick={() => handleOpenEditEquipment(item)}>Edit</button>
                        </td>
                        <td className="cell-action">
                          <button type="button" className="btn-edit-room" style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }} onClick={() => handleOpenDeleteEquipment(item)}>Delete</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
          {/* Add Equipment Modal */}
          {addEquipModalOpen && (
            <div className="modal-backdrop" onClick={() => { setAddEquipModalOpen(false); setAddEquipError(''); }}>
              <div className="booking-modal-card admin-edit-modal" onClick={e => e.stopPropagation()}>
                <h3 className="modal-title">Add Equipment</h3>
                {addEquipError && (
                  <div className="form-error-msg" style={{ marginBottom: '1rem' }}>
                    {addEquipError}
                  </div>
                )}
                <div className="admin-edit-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-equip-name">Equipment Name</label>
                    <input
                      id="new-equip-name"
                      type="text"
                      className="form-input"
                      value={newEquipName}
                      onChange={e => {
                        setNewEquipName(e.target.value)
                        if (addEquipError) setAddEquipError('')
                      }}
                      placeholder="Enter equipment name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-equip-qty">Total Quantity</label>
                    <input
                      id="new-equip-qty"
                      type="number"
                      className="form-input"
                      value={newEquipQty}
                      onChange={e => {
                        setNewEquipQty(e.target.value)
                        if (addEquipError) setAddEquipError('')
                      }}
                      placeholder="Enter quantity"
                      min="1"
                    />
                  </div>
                  <div className="modal-actions-row" style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="modal-btn-confirm"
                      onClick={handleConfirmAddEquipment}
                    >
                      Add Equipment
                    </button>
                    <button
                      type="button"
                      className="modal-btn-cancel"
                      onClick={() => {
                        setAddEquipModalOpen(false)
                        setAddEquipError('')
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Edit Equipment Modal */}
          {editEquip && (
            <div className="modal-backdrop" onClick={() => { setEditEquip(null); setEditEquipError(''); }}>
              <div className="booking-modal-card admin-edit-modal" onClick={e => e.stopPropagation()}>
                <h3 className="modal-title">Edit Equipment</h3>
                {editEquipError && (
                  <div className="form-error-msg" style={{ marginBottom: '1rem' }}>{editEquipError}</div>
                )}
                <div className="form-group">
                  <label className="form-label">Equipment Name</label>
                  <input type="text" className="form-input form-input-readonly" value={editEquip.equipmentName || editEquip.name} readOnly disabled />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-equip-qty">Total Quantity</label>
                  <input id="edit-equip-qty" type="number" className="form-input" value={editEquipQty} min="1" onChange={e => { setEditEquipQty(e.target.value); if (editEquipError) setEditEquipError(''); }} />
                </div>
                <div className="modal-actions-row">
                  <button type="button" className="modal-btn-confirm" onClick={handleConfirmEditEquipment}>Save Changes</button>
                  <button type="button" className="modal-btn-cancel" onClick={() => { setEditEquip(null); setEditEquipError(''); }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
          {/* Delete Confirmation Modal */}
          {deleteEquip && (
            <div className="modal-backdrop" onClick={() => { setDeleteEquip(null); setDeleteEquipError(''); }}>
              <div className="booking-modal-card admin-edit-modal" onClick={e => e.stopPropagation()}>
                <h3 className="modal-title">Confirm Delete</h3>
                <p className="modal-prompt">Are you sure you want to delete <strong>{deleteEquip.equipmentName || deleteEquip.name}</strong>?</p>
                {deleteEquipError && (
                  <div className="form-error-msg" style={{ marginBottom: '1rem' }}>{deleteEquipError}</div>
                )}
                <div className="modal-actions-row">
                  <button type="button" className="modal-btn-danger" onClick={handleConfirmDeleteEquipment}>Delete</button>
                  <button type="button" className="modal-btn-cancel" onClick={() => { setDeleteEquip(null); setDeleteEquipError(''); }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // --------------------------------------------------
  // PAGE: ADMIN ANALYTICS
  // --------------------------------------------------
  if (currentPage === 'admin-analytics') {
    const isDaily = viewMode === 'daily'

    // Metrics from backend response (analyticsData)
    const totalBookings = Number(analyticsData?.totalBookings ?? 0)
    const roomBookings = Number(analyticsData?.roomBookings ?? 0)
    const equipmentBookings = Number(analyticsData?.equipmentBookings ?? 0)
    const pendingBookings = Number(analyticsData?.pendingBookings ?? 0)

    // Room & Equipment usage lists from backend
    const roomUsageList = Array.isArray(analyticsData?.roomUsage) ? analyticsData.roomUsage : []
    const equipUsageList = Array.isArray(analyticsData?.equipmentUsage) ? analyticsData.equipmentUsage : []

    const maxRoom = roomUsageList.length > 0 ? Math.max(...roomUsageList.map(r => Number(r.bookingCount) || 0), 1) : 1
    const maxEquip = equipUsageList.length > 0 ? Math.max(...equipUsageList.map(e => Number(e.bookingCount) || 0), 1) : 1

    // Weekly daily breakdown from backend dailyTrend
    const dailyTrend = Array.isArray(analyticsData?.dailyTrend) ? analyticsData.dailyTrend : []
    const weeklyDays = dailyTrend.length > 0
      ? dailyTrend.map(d => {
        const rawDay = d.dayOfWeek || ''
        const dayName = rawDay ? (rawDay.charAt(0) + rawDay.slice(1).toLowerCase()) : (d.date || 'Day')
        return {
          day: dayName,
          rooms: Number(d.roomBookings || 0),
          equip: Number(d.equipmentBookings || 0),
          total: Number(d.total || 0),
        }
      })
      : [
        { day: 'Monday', rooms: 0, equip: 0, total: 0 },
        { day: 'Tuesday', rooms: 0, equip: 0, total: 0 },
        { day: 'Wednesday', rooms: 0, equip: 0, total: 0 },
        { day: 'Thursday', rooms: 0, equip: 0, total: 0 },
        { day: 'Friday', rooms: 0, equip: 0, total: 0 },
        { day: 'Saturday', rooms: 0, equip: 0, total: 0 },
        { day: 'Sunday', rooms: 0, equip: 0, total: 0 },
      ]

    const maxWeeklyDayTotal = Math.max(...weeklyDays.map(d => d.rooms + d.equip), 1)

    // AI Recommendations from backend
    const rec = analyticsData?.recommendations || {}
    const recTotal = Number(rec?.totalBookings ?? totalBookings)
    const hasRecBookings = recTotal > 0 || Boolean(rec.highDemandRoom || rec.highDemandEquipment || rec.expectedPeakBookingDay)

    const highDemandRoom = (hasRecBookings && rec.highDemandRoom) ? rec.highDemandRoom : 'No booking data'
    const highDemandRoomDesc = (hasRecBookings && rec.highDemandRoom)
      ? (rec.highDemandRoomMessage || `${rec.highDemandRoom} is expected to have high demand next week based on recent booking trends.`)
      : (rec.highDemandRoomMessage || 'No booking data')

    const highDemandEquip = (hasRecBookings && rec.highDemandEquipment) ? rec.highDemandEquipment : 'No booking data'
    const highDemandEquipDesc = (hasRecBookings && rec.highDemandEquipment)
      ? (rec.highDemandEquipmentMessage || `${rec.highDemandEquipment} is expected to have high demand next week based on recent usage trends.`)
      : (rec.highDemandEquipmentMessage || 'No booking data')

    const expectedPeakDay = (hasRecBookings && rec.expectedPeakBookingDay) ? rec.expectedPeakBookingDay : 'No booking data'
    const expectedPeakDayDesc = (hasRecBookings && rec.expectedPeakBookingDay)
      ? (rec.peakDayMessage || `${rec.expectedPeakBookingDay} had the highest recent booking activity. Monitor room and equipment availability on this day.`)
      : (rec.peakDayMessage || 'No booking data')

    const recommendedAction = (hasRecBookings && rec.recommendedAction && rec.recommendedAction !== 'No recent booking activity')
      ? rec.recommendedAction
      : 'No recent booking activity'

    const dailyDateOptions = (() => {
      const datesSet = new Set()
      const baseDate = new Date('2026-09-28T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const startTime = Math.min(baseDate.getTime(), today.getTime() - 14 * 24 * 60 * 60 * 1000)
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + 1)

      const cur = new Date(startTime)
      while (cur <= endDate) {
        const y = cur.getFullYear()
        const m = String(cur.getMonth() + 1).padStart(2, '0')
        const d = String(cur.getDate()).padStart(2, '0')
        datesSet.add(`${y}-${m}-${d}`)
        cur.setDate(cur.getDate() + 1)
      }

      datesSet.add(getTodayDate())
      datesSet.add(getTomorrowDate())
      datesSet.add(getActiveBookingDate())
      if (selectedDate) datesSet.add(selectedDate)

      return Array.from(datesSet).sort()
    })()

    return (
      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-brand"><h2>CAMPUS<br />CONNECT</h2></div>
          <nav className="sidebar-menu">
            <button type="button" className="sidebar-item" onClick={() => setCurrentPage('admin-dashboard')}>Dashboard</button>
            <button type="button" className="sidebar-item" onClick={() => setCurrentPage('admin-rooms')}>Room Management</button>
            <button type="button" className="sidebar-item" onClick={() => setCurrentPage('admin-equipment')}>Sports Equipment</button>
            <button type="button" className="sidebar-item active" onClick={() => { }}>Analytics</button>
          </nav>
          <div className="sidebar-footer">
            <button type="button" className="sidebar-logout" onClick={handleAdminLogout}>Logout</button>
          </div>
        </aside>

        {/* Main */}
        <main className="dashboard-main admin-dashboard-main">
          {/* Header Row */}
          <div className="ana-header-row">
            <div>
              <h1 className="room-booking-title">ANALYTICS</h1>
              <p className="room-booking-subtitle">Analyze room and sports equipment booking activity.</p>
            </div>
            <div className="ana-controls">
              <div className="ana-mode-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'daily'}
                  className={'ana-tab' + (viewMode === 'daily' ? ' ana-tab-active' : '')}
                  onClick={() => setViewMode('daily')}
                >Daily</button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'weekly'}
                  className={'ana-tab' + (viewMode === 'weekly' ? ' ana-tab-active' : '')}
                  onClick={() => setViewMode('weekly')}
                >Weekly</button>
              </div>

              {viewMode === 'daily' ? (
                <div className="ana-selector-wrapper">
                  <select
                    id="ana-date-selector"
                    aria-label="Select Date"
                    className="ana-date-input"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                  >
                    {dailyDateOptions.map(dateStr => (
                      <option key={dateStr} value={dateStr}>{dateStr}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    id="ana-date-native-input"
                    aria-label="Date Picker"
                    className="ana-date-hidden-input"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>
              ) : (
                <div className="ana-selector-wrapper">
                  <select
                    id="ana-week-selector"
                    aria-label="Select Week"
                    className="ana-date-input"
                    value={selectedWeek}
                    onChange={e => setSelectedWeek(e.target.value)}
                  >
                    {!['2026-W39', '2026-W40', '2026-W41', '2026-W42'].includes(selectedWeek) && (
                      <option value={selectedWeek}>{selectedWeek}</option>
                    )}
                    <option value="2026-W39">Week 39</option>
                    <option value="2026-W40">Week 40</option>
                    <option value="2026-W41">Week 41</option>
                    <option value="2026-W42">Week 42</option>
                  </select>
                  <input
                    type="week"
                    id="ana-week-native-input"
                    aria-label="Week Picker"
                    className="ana-week-hidden-input"
                    value={selectedWeek}
                    onChange={e => setSelectedWeek(e.target.value)}
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ========== DAILY MODE ========== */}
          {viewMode === 'daily' && (
            <>
              {/* Summary Cards */}
              <section className="ana-summary-grid">
                <div className="ana-stat-card">
                  <div className="ana-stat-icon ana-icon-indigo">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  </div>
                  <div className="ana-stat-info">
                    <span className="ana-stat-label">TOTAL BOOKINGS</span>
                    <span className="ana-stat-value">{totalBookings}</span>
                  </div>
                </div>
                <div className="ana-stat-card">
                  <div className="ana-stat-icon ana-icon-blue">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  </div>
                  <div className="ana-stat-info">
                    <span className="ana-stat-label">ROOM BOOKINGS</span>
                    <span className="ana-stat-value">{roomBookings}</span>
                  </div>
                </div>
                <div className="ana-stat-card">
                  <div className="ana-stat-icon ana-icon-emerald">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
                  </div>
                  <div className="ana-stat-info">
                    <span className="ana-stat-label">EQUIPMENT BOOKINGS</span>
                    <span className="ana-stat-value">{equipmentBookings}</span>
                  </div>
                </div>
                <div className="ana-stat-card">
                  <div className="ana-stat-icon ana-icon-amber">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  </div>
                  <div className="ana-stat-info">
                    <span className="ana-stat-label">PENDING BOOKINGS</span>
                    <span className="ana-stat-value">{pendingBookings}</span>
                  </div>
                </div>
              </section>

              {/* Room + Equipment Usage side by side */}
              <div className="ana-two-col">
                {/* Room Usage */}
                <div className="ana-card">
                  <h2 className="ana-card-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                    Room Usage
                  </h2>
                  <div className="ana-bar-list">
                    {roomUsageList.length > 0 ? (
                      roomUsageList.map(item => {
                        const name = item.roomName || `Room #${item.roomId}`
                        const count = Number(item.bookingCount) || 0
                        return (
                          <div key={item.roomId || name} className="ana-bar-row">
                            <span className="ana-bar-label">{name}</span>
                            <div className="ana-bar-track">
                              <div
                                className="ana-bar-fill ana-fill-blue"
                                style={{ width: `${maxRoom > 0 ? (count / maxRoom) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="ana-bar-count">{count}</span>
                          </div>
                        )
                      })
                    ) : (
                      <p style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                        No booking data
                      </p>
                    )}
                  </div>
                </div>

                {/* Equipment Usage */}
                <div className="ana-card">
                  <h2 className="ana-card-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
                    Equipment Usage
                  </h2>
                  <div className="ana-bar-list">
                    {equipUsageList.length > 0 ? (
                      equipUsageList.map(item => {
                        const name = item.equipmentName || `Equipment #${item.equipmentId}`
                        const count = Number(item.bookingCount) || 0
                        return (
                          <div key={item.equipmentId || name} className="ana-bar-row">
                            <span className="ana-bar-label">{name}</span>
                            <div className="ana-bar-track">
                              <div
                                className="ana-bar-fill ana-fill-emerald"
                                style={{ width: `${maxEquip > 0 ? (count / maxEquip) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="ana-bar-count">{count}</span>
                          </div>
                        )
                      })
                    ) : (
                      <p style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                        No booking data
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Daily Booking Trend */}
              <div className="ana-card">
                <div className="ana-card-header">
                  <h2 className="ana-card-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                    DAILY BOOKING TREND
                  </h2>
                  <span className="ana-trend-badge">{totalBookings} Total Today</span>
                </div>
                <div className="ana-trend-rows">
                  <div className="ana-trend-item">
                    <div className="ana-trend-meta">
                      <span className="ana-trend-label">Room Bookings</span>
                      <span className="ana-trend-percent">{totalBookings > 0 ? Math.round((roomBookings / totalBookings) * 100) : 0}%</span>
                    </div>
                    <div className="ana-bar-track">
                      <div
                        className="ana-bar-fill ana-fill-blue"
                        style={{ width: totalBookings > 0 ? `${(roomBookings / totalBookings) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="ana-bar-count">{roomBookings}</span>
                  </div>
                  <div className="ana-trend-item">
                    <div className="ana-trend-meta">
                      <span className="ana-trend-label">Equipment Bookings</span>
                      <span className="ana-trend-percent">{totalBookings > 0 ? Math.round((equipmentBookings / totalBookings) * 100) : 0}%</span>
                    </div>
                    <div className="ana-bar-track">
                      <div
                        className="ana-bar-fill ana-fill-emerald"
                        style={{ width: totalBookings > 0 ? `${(equipmentBookings / totalBookings) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="ana-bar-count">{equipmentBookings}</span>
                  </div>
                </div>
                {totalBookings === 0 && (
                  <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.875rem', marginTop: '0.75rem', paddingBottom: '0.5rem' }}>
                    No booking activity
                  </p>
                )}
              </div>
            </>
          )}

          {/* ========== WEEKLY MODE ========== */}
          {viewMode === 'weekly' && (
            <>
              {/* Weekly Summary Cards */}
              <section className="ana-summary-grid">
                <div className="ana-stat-card">
                  <div className="ana-stat-icon ana-icon-indigo">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  </div>
                  <div className="ana-stat-info">
                    <span className="ana-stat-label">TOTAL BOOKINGS</span>
                    <span className="ana-stat-value">{totalBookings}</span>
                  </div>
                </div>
                <div className="ana-stat-card">
                  <div className="ana-stat-icon ana-icon-blue">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  </div>
                  <div className="ana-stat-info">
                    <span className="ana-stat-label">ROOM BOOKINGS</span>
                    <span className="ana-stat-value">{roomBookings}</span>
                  </div>
                </div>
                <div className="ana-stat-card">
                  <div className="ana-stat-icon ana-icon-emerald">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
                  </div>
                  <div className="ana-stat-info">
                    <span className="ana-stat-label">EQUIPMENT BOOKINGS</span>
                    <span className="ana-stat-value">{equipmentBookings}</span>
                  </div>
                </div>
                <div className="ana-stat-card">
                  <div className="ana-stat-icon ana-icon-amber">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  </div>
                  <div className="ana-stat-info">
                    <span className="ana-stat-label">PENDING BOOKINGS</span>
                    <span className="ana-stat-value">{pendingBookings}</span>
                  </div>
                </div>
              </section>

              {/* Weekly Daily Breakdown */}
              <div className="ana-card">
                <div className="ana-card-header">
                  <h2 className="ana-card-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    Daily Breakdown
                  </h2>
                  <div className="ana-legend">
                    <span className="ana-legend-item"><span className="ana-legend-dot ana-dot-blue" /> Room</span>
                    <span className="ana-legend-item"><span className="ana-legend-dot ana-dot-emerald" /> Equipment</span>
                  </div>
                </div>
                <div className="ana-breakdown-list">
                  {weeklyDays.map(d => {
                    const total = d.rooms + d.equip
                    return (
                      <div key={d.day} className="ana-breakdown-row">
                        <span className="ana-breakdown-day">{d.day}</span>
                        <div className="ana-breakdown-bars">
                          <div className="ana-bar-track">
                            <div className="ana-bar-fill ana-fill-blue" style={{ width: `${maxWeeklyDayTotal > 0 ? (d.rooms / maxWeeklyDayTotal) * 100 : 0}%` }} />
                          </div>
                          <div className="ana-bar-track">
                            <div className="ana-bar-fill ana-fill-emerald" style={{ width: `${maxWeeklyDayTotal > 0 ? (d.equip / maxWeeklyDayTotal) * 100 : 0}%` }} />
                          </div>
                        </div>
                        <div className="ana-breakdown-nums">
                          <span className="ana-breakdown-room">Rooms: <strong>{d.rooms}</strong></span>
                          <span className="ana-breakdown-equip">Equip: <strong>{d.equip}</strong></span>
                          <span className="ana-breakdown-total">Total: <strong>{total}</strong></span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {totalBookings === 0 && (
                  <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.875rem', marginTop: '0.75rem', paddingBottom: '0.5rem' }}>
                    No booking activity
                  </p>
                )}
              </div>

              {/* Room + Equipment Usage side by side */}
              <div className="ana-two-col">
                <div className="ana-card">
                  <h2 className="ana-card-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                    Weekly Room Usage
                  </h2>
                  <div className="ana-bar-list">
                    {roomUsageList.length > 0 ? (
                      roomUsageList.map(item => {
                        const name = item.roomName || `Room #${item.roomId}`
                        const count = Number(item.bookingCount) || 0
                        return (
                          <div key={item.roomId || name} className="ana-bar-row">
                            <span className="ana-bar-label">{name}</span>
                            <div className="ana-bar-track">
                              <div className="ana-bar-fill ana-fill-blue" style={{ width: `${maxRoom > 0 ? (count / maxRoom) * 100 : 0}%` }} />
                            </div>
                            <span className="ana-bar-count">{count}</span>
                          </div>
                        )
                      })
                    ) : (
                      <p style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                        No booking data
                      </p>
                    )}
                  </div>
                </div>

                <div className="ana-card">
                  <h2 className="ana-card-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
                    Weekly Equipment Usage
                  </h2>
                  <div className="ana-bar-list">
                    {equipUsageList.length > 0 ? (
                      equipUsageList.map(item => {
                        const name = item.equipmentName || `Equipment #${item.equipmentId}`
                        const count = Number(item.bookingCount) || 0
                        return (
                          <div key={item.equipmentId || name} className="ana-bar-row">
                            <span className="ana-bar-label">{name}</span>
                            <div className="ana-bar-track">
                              <div className="ana-bar-fill ana-fill-emerald" style={{ width: `${maxEquip > 0 ? (count / maxEquip) * 100 : 0}%` }} />
                            </div>
                            <span className="ana-bar-count">{count}</span>
                          </div>
                        )
                      })
                    ) : (
                      <p style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                        No booking data
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========== AI RECOMMENDATIONS ========== */}
          <section className="ana-ai-section">
            <div className="ana-ai-header">
              <h2 className="ana-ai-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" /><path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93" /><path d="M8.56 13a8 8 0 0 0-2.3 3.08" /><path d="M15.44 13a8 8 0 0 1 2.3 3.08" /></svg>
                AI RECOMMENDATIONS
              </h2>
              <p className="ana-ai-subtitle">Expected demand for next week based on recent booking trends.</p>
            </div>
            <div className="ana-ai-grid">
              {/* Card 1: High-Demand Room */}
              <div className="ana-ai-card">
                <div className="ana-ai-card-top">
                  <div className="ana-ai-card-icon ana-icon-blue">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  </div>
                  <span className="ana-ai-card-badge">HIGH-DEMAND ROOM</span>
                </div>
                <div className="ana-ai-card-meta">Expected High-Demand Room:</div>
                <div className="ana-ai-card-highlight">{highDemandRoom}</div>
                <p className="ana-ai-card-desc">{highDemandRoomDesc}</p>
              </div>

              {/* Card 2: High-Demand Equipment */}
              <div className="ana-ai-card">
                <div className="ana-ai-card-top">
                  <div className="ana-ai-card-icon ana-icon-emerald">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
                  </div>
                  <span className="ana-ai-card-badge">HIGH-DEMAND EQUIPMENT</span>
                </div>
                <div className="ana-ai-card-meta">Expected High-Demand Equipment:</div>
                <div className="ana-ai-card-highlight">{highDemandEquip}</div>
                <p className="ana-ai-card-desc">{highDemandEquipDesc}</p>
              </div>

              {/* Card 3: Expected Peak Day */}
              <div className="ana-ai-card">
                <div className="ana-ai-card-top">
                  <div className="ana-ai-card-icon ana-icon-amber">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  </div>
                  <span className="ana-ai-card-badge">EXPECTED PEAK DAY</span>
                </div>
                <div className="ana-ai-card-meta">Highest Activity Day:</div>
                <div className="ana-ai-card-highlight">{expectedPeakDay}</div>
                <p className="ana-ai-card-desc">{expectedPeakDayDesc}</p>
              </div>

              {/* Card 4: Recommended Action */}
              <div className="ana-ai-card">
                <div className="ana-ai-card-top">
                  <div className="ana-ai-card-icon ana-icon-indigo">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                  </div>
                  <span className="ana-ai-card-badge">RECOMMENDED ACTION</span>
                </div>
                <div className="ana-ai-card-meta">Action Items:</div>
                <div className="ana-ai-card-highlight">{recommendedAction}</div>
                <div className="ana-ai-action-list">
                  <p className="ana-ai-card-desc">{recommendedAction}</p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }


  // --------------------------------------------------
  // PAGE 4: STUDENT DASHBOARD
  // --------------------------------------------------
  if (currentPage === 'student-dashboard') {
    return (
      <div className="dashboard-container">
        {/* Left Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-brand">
            <h2>
              CAMPUS<br />CONNECT
            </h2>
          </div>

          <nav className="sidebar-menu">
            <button
              type="button"
              className="sidebar-item active"
              onClick={() => { }}
            >
              Dashboard
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => window.open('https://geobits.onrender.com/', '_blank')}
            >
              Navigation
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('room-booking')}
            >
              Room Booking
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('equipment-booking')}
            >
              Equipment Booking
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('my-bookings')}
            >
              My Bookings
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('student-profile')}
            >
              Profile
            </button>
          </nav>

          <div className="sidebar-footer">
            <button
              type="button"
              className="sidebar-logout"
              onClick={handleStudentLogout}
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-main">
          {/* Hero / Banner Section */}
          <section className="dashboard-hero">
            <div className="hero-overlay"></div>
            <div className="hero-content">
              <span className="hero-tag">STUDENT DASHBOARD</span>
              <h1 className="hero-heading">Welcome Back!</h1>
              <p className="hero-subtext">
                Navigate, book and manage your campus facilities.
              </p>
            </div>
          </section>

          {/* Quick Action Cards (4 Cards in one clean row on desktop) */}
          <section className="dashboard-cards-section">
            <div className="dash-row-grid">
              {/* CARD 1: Navigation */}
              <div className="dash-action-card card-accent-blue">
                <div className="card-icon-box icon-blue">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                </div>
                <h3 className="card-item-title">Navigation</h3>
                <p className="card-item-desc">
                  Find your way around campus.
                </p>
                <button
                  type="button"
                  className="card-action-btn btn-blue"
                  onClick={() => window.open('https://geobits.onrender.com/', '_blank')}
                >
                  Explore Campus
                </button>
              </div>

              {/* CARD 2: Room Booking */}
              <div className="dash-action-card card-accent-purple">
                <div className="card-icon-box icon-purple">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <h3 className="card-item-title">Room Booking</h3>
                <p className="card-item-desc">
                  Find and reserve available rooms.
                </p>
                <button
                  type="button"
                  className="card-action-btn btn-purple"
                  onClick={() => setCurrentPage('room-booking')}
                >
                  Book a Room
                </button>
              </div>

              {/* CARD 3: Equipment Booking */}
              <div className="dash-action-card card-accent-green">
                <div className="card-icon-box icon-green">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                    <path d="M2 12h20" />
                  </svg>
                </div>
                <h3 className="card-item-title">Equipment Booking</h3>
                <p className="card-item-desc">
                  Reserve sports equipment easily.
                </p>
                <button
                  type="button"
                  className="card-action-btn btn-green"
                  onClick={() => setCurrentPage('equipment-booking')}
                >
                  Book Equipment
                </button>
              </div>

              {/* CARD 4: My Bookings */}
              <div className="dash-action-card card-accent-amber">
                <div className="card-icon-box icon-amber">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h3 className="card-item-title">My Bookings</h3>
                <p className="card-item-desc">
                  Track and manage your bookings.
                </p>
                <button
                  type="button"
                  className="card-action-btn btn-amber"
                  onClick={() => setCurrentPage('my-bookings')}
                >
                  View Bookings
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // --------------------------------------------------
  // PAGE 7: STUDENT MY BOOKINGS
  // --------------------------------------------------
  if (currentPage === 'my-bookings') {
    return (
      <div className="dashboard-container">
        {/* Left Sidebar (My Bookings Active) */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-brand">
            <h2>
              CAMPUS<br />CONNECT
            </h2>
          </div>

          <nav className="sidebar-menu">
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('student-dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => handlePlaceholderAction('Navigation')}
            >
              Navigation
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('room-booking')}
            >
              Room Booking
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('equipment-booking')}
            >
              Equipment Booking
            </button>
            <button
              type="button"
              className="sidebar-item active"
              onClick={() => { }}
            >
              My Bookings
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('student-profile')}
            >
              Profile
            </button>
          </nav>

          <div className="sidebar-footer">
            <button
              type="button"
              className="sidebar-logout"
              onClick={handleStudentLogout}
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-main my-bookings-main">
          {/* Page Header */}
          <header className="room-booking-header">
            <h1 className="room-booking-title">MY BOOKINGS</h1>
            <p className="room-booking-subtitle">
              View and manage your campus bookings.
            </p>
          </header>

          {/* Cancellation Success Banner */}
          {cancelSuccessMsg && (
            <div className="booking-success-banner">
              <span>{cancelSuccessMsg}</span>
              <button
                type="button"
                className="banner-close-btn"
                onClick={() => setCancelSuccessMsg('')}
              >
                &times;
              </button>
            </div>
          )}

          {/* Cancellation Error Banner */}
          {cancelErrorMsg && (
            <div className="booking-success-banner" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#b91c1c', marginBottom: '1.25rem' }}>
              <span>{cancelErrorMsg}</span>
              <button
                type="button"
                className="banner-close-btn"
                style={{ color: '#b91c1c' }}
                onClick={() => setCancelErrorMsg('')}
              >
                &times;
              </button>
            </div>
          )}

          {/* Bookings Display Section */}
          <section className="my-bookings-section">
            {myBookings.length === 0 ? (
              <div className="empty-bookings-box">
                <div className="empty-bookings-icon">
                  <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h3 className="empty-bookings-title">No bookings yet</h3>
                <p className="empty-bookings-desc">
                  Your room and equipment bookings will appear here.
                </p>
                <div className="empty-bookings-actions">
                  <button
                    type="button"
                    className="empty-action-btn btn-primary"
                    onClick={() => setCurrentPage('room-booking')}
                  >
                    Book a Room
                  </button>
                  <button
                    type="button"
                    className="empty-action-btn btn-secondary"
                    onClick={() => setCurrentPage('equipment-booking')}
                  >
                    Book Equipment
                  </button>
                </div>
              </div>
            ) : (
              <div className="my-bookings-grid">
                {myBookings.map((booking) => {
                  const statusUpper = (booking.status || '').toUpperCase()
                  const isStatusActive = statusUpper === 'BOOKED' || statusUpper === 'PENDING'
                  const cancellable = isStatusActive && isWithin30Mins(booking)
                  const isRoom = booking.type === 'room'

                  return (
                    <div key={booking.id} className="my-booking-card">
                      {/* Card Top / Header */}
                      <div className="my-booking-card-header">
                        <span className={`booking-type-badge ${isRoom ? 'type-room' : 'type-equipment'}`}>
                          {isRoom ? 'Room Booking' : 'Equipment Booking'}
                        </span>
                        <span className={`room-status-badge status-${booking.status.toLowerCase()}`}>
                          {booking.status}
                        </span>
                      </div>

                      {/* Card Body */}
                      <div className="my-booking-card-body">
                        <h3 className="my-booking-name">{booking.name}</h3>

                        <div className="my-booking-details-box">
                          {isRoom ? (
                            <>
                              <div className="my-booking-row">
                                <span className="bk-label">Room:</span>
                                <span className="bk-value">{booking.name}</span>
                              </div>
                              <div className="my-booking-row">
                                <span className="bk-label">Block:</span>
                                <span className="bk-value">{booking.block}</span>
                              </div>
                              <div className="my-booking-row">
                                <span className="bk-label">Capacity:</span>
                                <span className="bk-value">{booking.capacity}</span>
                              </div>
                              <div className="my-booking-row">
                                <span className="bk-label">Booking Date:</span>
                                <span className="bk-value">{booking.bookingDate}</span>
                              </div>
                              <div className="my-booking-row">
                                <span className="bk-label">Time Slot:</span>
                                <span className="bk-value">{booking.timeSlot || booking.time}</span>
                              </div>
                              <div className="my-booking-row">
                                <span className="bk-label">Status:</span>
                                <span className="bk-value">{booking.status}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="my-booking-row">
                                <span className="bk-label">Equipment Name:</span>
                                <span className="bk-value">{booking.name}</span>
                              </div>
                              <div className="my-booking-row">
                                <span className="bk-label">Quantity:</span>
                                <span className="bk-value">{booking.quantity}</span>
                              </div>
                              <div className="my-booking-row">
                                <span className="bk-label">Booking Date:</span>
                                <span className="bk-value">{booking.bookingDate}</span>
                              </div>
                              <div className="my-booking-row">
                                <span className="bk-label">Time Slot:</span>
                                <span className="bk-value">4:30 PM - 7:00 PM</span>
                              </div>
                              <div className="my-booking-row">
                                <span className="bk-label">Status:</span>
                                <span className="bk-value">{booking.status}</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Cancel Button only when within 30 mins */}
                        {cancellable && (
                          <div className="my-booking-card-footer">
                            <button
                              type="button"
                              className="btn-cancel-booking"
                              onClick={() => {
                                setCancelSuccessMsg('')
                                setCancelErrorMsg('')
                                setCancelModalBooking(booking)
                              }}
                            >
                              Cancel Booking
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Cancellation Confirmation Modal */}
          {cancelModalBooking && (
            <div
              className="modal-backdrop"
              onClick={() => { if (!cancelLoading) setCancelModalBooking(null) }}
            >
              <div
                className="booking-modal-card"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="modal-title">Cancel Booking</h3>
                <p className="cancel-modal-prompt">
                  Are you sure you want to cancel this booking?
                </p>

                <div className="modal-info-box">
                  <div className="modal-row">
                    <span className="modal-label">
                      {cancelModalBooking.type === 'room' ? 'Room:' : 'Equipment Name:'}
                    </span>
                    <span className="modal-value">{cancelModalBooking.name}</span>
                  </div>
                  <div className="modal-row">
                    <span className="modal-label">Booking Date:</span>
                    <span className="modal-value">{cancelModalBooking.bookingDate}</span>
                  </div>
                  <div className="modal-row">
                    <span className="modal-label">Time Slot:</span>
                    <span className="modal-value">
                      {cancelModalBooking.type === 'equipment' ? '4:30 PM - 7:00 PM' : (cancelModalBooking.timeSlot || cancelModalBooking.time)}
                    </span>
                  </div>
                </div>

                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="modal-btn-danger"
                    onClick={handleConfirmCancelBooking}
                    disabled={cancelLoading}
                  >
                    {cancelLoading ? 'Cancelling...' : 'Yes, Cancel Booking'}
                  </button>
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    onClick={() => setCancelModalBooking(null)}
                    disabled={cancelLoading}
                  >
                    Keep Booking
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // --------------------------------------------------
  // PAGE 8: STUDENT PROFILE
  // --------------------------------------------------
  if (currentPage === 'student-profile') {
    return (
      <div className="dashboard-container">
        {/* Left Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-brand">
            <h2>
              CAMPUS<br />CONNECT
            </h2>
          </div>

          <nav className="sidebar-menu">
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('student-dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => handlePlaceholderAction('Navigation')}
            >
              Navigation
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('room-booking')}
            >
              Room Booking
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('equipment-booking')}
            >
              Equipment Booking
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setCurrentPage('my-bookings')}
            >
              My Bookings
            </button>
            <button
              type="button"
              className="sidebar-item active"
              onClick={() => { }}
            >
              Profile
            </button>
          </nav>

          <div className="sidebar-footer">
            <button
              type="button"
              className="sidebar-logout"
              onClick={handleStudentLogout}
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-main student-profile-main">
          {/* Page Header */}
          <header className="room-booking-header">
            <h1 className="room-booking-title">STUDENT PROFILE</h1>
            <p className="room-booking-subtitle">
              Your registered academic and account details.
            </p>
          </header>

          {/* Profile Card Section */}
          <section className="profile-card-section">
            <div className="profile-card">
              <div className="profile-card-header">
                <div className="profile-avatar">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="profile-header-info">
                  <h2 className="profile-name">{profileData?.fullName || currentUser?.fullName || 'Student Name'}</h2>
                  <span className="profile-year-badge">{profileData?.year || currentUser?.year || 'Student'}</span>
                </div>
              </div>

              {profileError && (
                <div className="form-error-msg" style={{ margin: '16px 24px 0' }}>
                  {profileError}
                </div>
              )}

              <div className="profile-details-grid">
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Full Name</span>
                  <span className="profile-detail-value">{profileData?.fullName || currentUser?.fullName || '—'}</span>
                </div>

                <div className="profile-detail-item">
                  <span className="profile-detail-label">College Email</span>
                  <span className="profile-detail-value">{profileData?.collegeEmail || currentUser?.collegeEmail || currentUser?.email || '—'}</span>
                </div>

                <div className="profile-detail-item">
                  <span className="profile-detail-label">Register Number</span>
                  <span className="profile-detail-value">{profileData?.registerNumber || currentUser?.registerNumber || currentUser?.regNumber || '—'}</span>
                </div>

                <div className="profile-detail-item">
                  <span className="profile-detail-label">Department</span>
                  <span className="profile-detail-value">{profileData?.department || currentUser?.department || '—'}</span>
                </div>

                <div className="profile-detail-item">
                  <span className="profile-detail-label">Year</span>
                  <span className="profile-detail-value">{profileData?.year || currentUser?.year || '—'}</span>
                </div>

                <div className="profile-detail-item">
                  <span className="profile-detail-label">Role</span>
                  <span className="profile-detail-value">{profileData?.role || currentUser?.role || 'STUDENT'}</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // --------------------------------------------------
  // PAGES 1, 2, 3: WELCOME, STUDENT LOGIN, REGISTRATION
  // (Designs remain untouched)
  // --------------------------------------------------
  return (
    <div className="welcome-container">
      {/* Subtle dark transparent overlay */}
      <div className="overlay"></div>

      {/* PAGE 1: WELCOME / HOME */}
      {currentPage === 'welcome' && (
        <div className="welcome-content">
          <h1 className="main-heading">
            WELCOME TO<br />YOUR SMART CAMPUS
          </h1>
          <p className="subtitle">
            Smart Campus Navigation & Facility Booking
          </p>

          <div className="cards-wrapper">
            {/* Card 1: Student */}
            <div
              className="glass-card"
              onClick={() => setCurrentPage('student-login')}
            >
              <h2 className="card-heading">STUDENT</h2>
              <button
                type="button"
                className="card-button"
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentPage('student-login')
                }}
              >
                STUDENT LOGIN
              </button>
            </div>

            {/* Card 2: Admin */}
            <div className="glass-card" onClick={handleAdminClick}>
              <h2 className="card-heading">ADMIN</h2>
              <button
                type="button"
                className="card-button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleAdminClick()
                }}
              >
                ADMIN LOGIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAGE 2: STUDENT LOGIN */}
      {currentPage === 'student-login' && (
        <div className="login-card">
          <h2 className="login-title">STUDENT LOGIN</h2>

          {loginError && <div className="form-error-msg">{loginError}</div>}

          <form onSubmit={handleStudentLoginSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="register-number">
                Register Number
              </label>
              <input
                id="register-number"
                name="registerNumber"
                type="text"
                className="form-input"
                placeholder="Enter your register number"
                value={loginRegNumber}
                onChange={(e) => {
                  setLoginRegNumber(e.target.value)
                  setLoginEmail(e.target.value)
                }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-button">
              LOGIN
            </button>
          </form>

          <p className="register-text">
            Don't have an account?{' '}
            <span
              className="register-link"
              onClick={() => {
                setRegError('')
                setRegSuccess('')
                setCurrentPage('student-register')
              }}
              role="button"
              tabIndex={0}
            >
              Register
            </span>
          </p>
        </div>
      )}

      {/* PAGE 3: STUDENT REGISTRATION */}
      {currentPage === 'student-register' && (
        <div className="login-card register-card">
          <h2 className="login-title">STUDENT REGISTRATION</h2>

          {regError && <div className="form-error-msg">{regError}</div>}
          {regSuccess && <div className="form-success-msg">{regSuccess}</div>}

          <form onSubmit={handleRegisterSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="full-name">
                Full Name
              </label>
              <input
                id="full-name"
                type="text"
                className="form-input"
                placeholder="Enter your full name"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="college-email">
                College Email
              </label>
              <input
                id="college-email"
                type="email"
                className="form-input"
                placeholder="Enter your college email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-number">
                Register Number
              </label>
              <input
                id="reg-number"
                type="text"
                className="form-input"
                placeholder="Enter your register number"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                className="form-input"
                placeholder="Create a password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                className="form-input"
                placeholder="Confirm your password"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-button">
              REGISTER
            </button>
          </form>

          <p className="register-text">
            Already have an account?{' '}
            <span
              className="register-link"
              onClick={() => {
                setRegError('')
                setRegSuccess('')
                setCurrentPage('student-login')
              }}
              role="button"
              tabIndex={0}
            >
              Login
            </span>
          </p>
        </div>
      )}

      {/* PAGE: ADMIN LOGIN */}
      {currentPage === 'admin-login' && (
        <div className="login-card">
          <h2 className="login-title">ADMIN LOGIN</h2>

          {adminError && <div className="form-error-msg">{adminError}</div>}

          <form onSubmit={handleAdminLoginSubmit} className="login-form" noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-email">
                Admin Email
              </label>
              <input
                id="admin-email"
                type="email"
                className="form-input"
                placeholder="Enter admin email"
                value={adminEmail}
                onChange={(e) => {
                  setAdminEmail(e.target.value)
                  if (adminError) setAdminError('')
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="admin-password">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value)
                  if (adminError) setAdminError('')
                }}
              />
            </div>

            <button type="submit" className="login-button">
              LOGIN
            </button>
          </form>

          <p className="back-home-text">
            <span
              className="back-home-link"
              onClick={() => {
                setAdminError('')
                setAdminEmail('')
                setAdminPassword('')
                setCurrentPage('welcome')
              }}
              role="button"
              tabIndex={0}
            >
              Back to Home
            </span>
          </p>
        </div>
      )}
    </div>
  )
}

export default App
