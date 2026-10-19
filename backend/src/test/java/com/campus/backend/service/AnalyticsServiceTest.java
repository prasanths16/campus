package com.campus.backend.service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.anyString;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import com.campus.backend.entity.Equipment;
import com.campus.backend.entity.EquipmentBooking;
import com.campus.backend.entity.Room;
import com.campus.backend.entity.RoomBooking;
import com.campus.backend.repository.EquipmentBookingRepository;
import com.campus.backend.repository.EquipmentRepository;
import com.campus.backend.repository.RoomBookingRepository;
import com.campus.backend.repository.RoomRepository;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AnalyticsServiceTest {

    @Mock
    private RoomBookingRepository roomBookingRepository;

    @Mock
    private EquipmentBookingRepository equipmentBookingRepository;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private EquipmentRepository equipmentRepository;

    private AnalyticsService analyticsService;

    @BeforeEach
    void setUp() {
        analyticsService = new AnalyticsService(
                roomBookingRepository,
                equipmentBookingRepository,
                roomRepository,
                equipmentRepository
        );

        Room room1 = new Room();
        room1.setId(101L);
        room1.setRoomName("Lecture Hall 101");

        Room room2 = new Room();
        room2.setId(102L);
        room2.setRoomName("Lab 102");

        when(roomRepository.findAll()).thenReturn(Arrays.asList(room1, room2));

        Equipment eq1 = new Equipment();
        eq1.setId(201L);
        eq1.setEquipmentName("Cricket Bat");

        Equipment eq2 = new Equipment();
        eq2.setId(202L);
        eq2.setEquipmentName("Football");

        when(equipmentRepository.findAll()).thenReturn(Arrays.asList(eq1, eq2));
    }

    @Test
    void getDailyAnalytics_returnsConsistentRequestedDate() {
        when(roomBookingRepository.findByBookingDate(anyString())).thenReturn(Collections.emptyList());
        when(equipmentBookingRepository.findByBookingDate(anyString())).thenReturn(Collections.emptyList());
        when(roomBookingRepository.findByBookingDateBetween(anyString(), anyString())).thenReturn(Collections.emptyList());
        when(equipmentBookingRepository.findByBookingDateBetween(anyString(), anyString())).thenReturn(Collections.emptyList());

        Map<String, Object> result = analyticsService.getDailyAnalytics("2026-10-11");

        assertNotNull(result);
        assertEquals("2026-10-11", result.get("date"));
        assertEquals(0, result.get("totalBookings"));
        assertEquals(0, result.get("roomBookings"));
        assertEquals(0, result.get("equipmentBookings"));
        assertEquals(0L, result.get("pendingBookings"));
        assertEquals(0L, result.get("cancelledBookings"));
    }

    @Test
    void getDailyAnalytics_correctlyDistinguishesActivePendingCancelled() {
        // Room bookings: 1 BOOKED, 1 PENDING, 1 CANCELLED
        RoomBooking rbBooked = new RoomBooking();
        rbBooked.setId(1L);
        rbBooked.setRoomId(101L);
        rbBooked.setBookingDate("2026-10-12");
        rbBooked.setTimeSlot("8:45 AM - 10:30 AM");
        rbBooked.setStatus("BOOKED");

        RoomBooking rbPending = new RoomBooking();
        rbPending.setId(2L);
        rbPending.setRoomId(102L);
        rbPending.setBookingDate("2026-10-12");
        rbPending.setTimeSlot("10:30 AM - 12:30 PM");
        rbPending.setStatus("PENDING");

        RoomBooking rbCancelled = new RoomBooking();
        rbCancelled.setId(3L);
        rbCancelled.setRoomId(101L);
        rbCancelled.setBookingDate("2026-10-12");
        rbCancelled.setTimeSlot("1:30 PM - 3:15 PM");
        rbCancelled.setStatus("CANCELLED");

        // Equipment bookings: 1 BOOKED, 1 CANCELLED
        EquipmentBooking ebBooked = new EquipmentBooking();
        ebBooked.setId(11L);
        ebBooked.setEquipmentId(201L);
        ebBooked.setBookingDate("2026-10-12");
        ebBooked.setTimeSlot("4:30 PM - 7:00 PM");
        ebBooked.setQuantity(2);
        ebBooked.setStatus("BOOKED");

        EquipmentBooking ebCancelled = new EquipmentBooking();
        ebCancelled.setId(12L);
        ebCancelled.setEquipmentId(202L);
        ebCancelled.setBookingDate("2026-10-12");
        ebCancelled.setTimeSlot("4:30 PM - 7:00 PM");
        ebCancelled.setQuantity(1);
        ebCancelled.setStatus("CANCELLED");

        when(roomBookingRepository.findByBookingDate("2026-10-12")).thenReturn(Arrays.asList(rbBooked, rbPending, rbCancelled));
        when(equipmentBookingRepository.findByBookingDate("2026-10-12")).thenReturn(Arrays.asList(ebBooked, ebCancelled));
        when(roomBookingRepository.findByBookingDateBetween(anyString(), anyString())).thenReturn(Arrays.asList(rbBooked, rbPending));
        when(equipmentBookingRepository.findByBookingDateBetween(anyString(), anyString())).thenReturn(Collections.singletonList(ebBooked));

        Map<String, Object> result = analyticsService.getDailyAnalytics("2026-10-12");

        assertNotNull(result);
        assertEquals("2026-10-12", result.get("date"));
        // Active room bookings = 2 (1 BOOKED + 1 PENDING)
        assertEquals(2, result.get("roomBookings"));
        // Active equipment bookings = 1 (1 BOOKED)
        assertEquals(1, result.get("equipmentBookings"));
        // Total active bookings = 2 + 1 = 3
        assertEquals(3, result.get("totalBookings"));
        // Pending bookings = 1 (1 room PENDING)
        assertEquals(1L, result.get("pendingBookings"));
        // Cancelled bookings = 2 (1 room CANCELLED + 1 equip CANCELLED)
        assertEquals(2L, result.get("cancelledBookings"));
    }

    @Test
    void getWeeklyAnalytics_thisWeek_parsesCorrectly() {
        when(roomBookingRepository.findByBookingDateBetween(anyString(), anyString())).thenReturn(Collections.emptyList());
        when(equipmentBookingRepository.findByBookingDateBetween(anyString(), anyString())).thenReturn(Collections.emptyList());

        Map<String, Object> result = analyticsService.getWeeklyAnalytics("this-week");

        assertNotNull(result);
        assertEquals("this-week", result.get("requestedWeek"));
        assertNotNull(result.get("from"));
        assertNotNull(result.get("to"));
        assertNotNull(result.get("dailyTrend"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> trend = (List<Map<String, Object>>) result.get("dailyTrend");
        assertEquals(7, trend.size());
    }

    @Test
    void getWeeklyAnalytics_previousWeek_parsesCorrectly() {
        when(roomBookingRepository.findByBookingDateBetween(anyString(), anyString())).thenReturn(Collections.emptyList());
        when(equipmentBookingRepository.findByBookingDateBetween(anyString(), anyString())).thenReturn(Collections.emptyList());

        Map<String, Object> result = analyticsService.getWeeklyAnalytics("previous-week");

        assertNotNull(result);
        assertEquals("previous-week", result.get("requestedWeek"));
        assertNotNull(result.get("from"));
        assertNotNull(result.get("to"));
    }

    @Test
    void getWeeklyAnalytics_isoWeek_correctBoundaries() {
        when(roomBookingRepository.findByBookingDateBetween(anyString(), anyString())).thenReturn(Collections.emptyList());
        when(equipmentBookingRepository.findByBookingDateBetween(anyString(), anyString())).thenReturn(Collections.emptyList());

        Map<String, Object> result = analyticsService.getWeeklyAnalytics("2026-W41");

        assertNotNull(result);
        assertEquals("2026-W41", result.get("week"));
        assertEquals("2026-W41", result.get("requestedWeek"));
        // Week 41 of 2026 is Monday Oct 5 to Sunday Oct 11
        assertEquals("2026-10-05", result.get("from"));
        assertEquals("2026-10-11", result.get("to"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void getWeeklyAnalytics_dailyBreakdownCalculatedCorrectly() {
        RoomBooking rb = new RoomBooking();
        rb.setId(1L);
        rb.setRoomId(101L);
        rb.setBookingDate("2026-10-07"); // Wednesday
        rb.setTimeSlot("8:45 AM - 10:30 AM");
        rb.setStatus("BOOKED");

        EquipmentBooking eb = new EquipmentBooking();
        eb.setId(2L);
        eb.setEquipmentId(201L);
        eb.setBookingDate("2026-10-07");
        eb.setTimeSlot("4:30 PM - 7:00 PM");
        eb.setQuantity(1);
        eb.setStatus("BOOKED");

        when(roomBookingRepository.findByBookingDateBetween("2026-10-05", "2026-10-11"))
                .thenReturn(Collections.singletonList(rb));
        when(equipmentBookingRepository.findByBookingDateBetween("2026-10-05", "2026-10-11"))
                .thenReturn(Collections.singletonList(eb));

        Map<String, Object> result = analyticsService.getWeeklyAnalytics("2026-W41");
        List<Map<String, Object>> trend = (List<Map<String, Object>>) result.get("dailyTrend");

        Map<String, Object> wednesday = trend.stream()
                .filter(d -> "2026-10-07".equals(d.get("date")))
                .findFirst()
                .orElse(null);

        assertNotNull(wednesday);
        assertEquals("WEDNESDAY", wednesday.get("dayOfWeek"));
        assertEquals(1L, wednesday.get("roomBookings"));
        assertEquals(1L, wednesday.get("equipmentBookings"));
        assertEquals(2L, wednesday.get("total"));
    }

    @Test
    void getRecentActivity_resolvesNamesWithoutNPlusOne() {
        RoomBooking rb = new RoomBooking();
        rb.setId(1L);
        rb.setRoomId(101L);
        rb.setStatus("BOOKED");
        rb.setCreatedAt(LocalDateTime.of(2026, 10, 12, 10, 0));

        EquipmentBooking eb = new EquipmentBooking();
        eb.setId(2L);
        eb.setEquipmentId(201L);
        eb.setStatus("CANCELLED");
        eb.setCreatedAt(LocalDateTime.of(2026, 10, 12, 11, 0));

        when(roomBookingRepository.findAll()).thenReturn(Collections.singletonList(rb));
        when(equipmentBookingRepository.findAll()).thenReturn(Collections.singletonList(eb));

        List<Map<String, Object>> activities = analyticsService.getRecentActivity();
        assertEquals(2, activities.size());

        // Sorted newest first -> equipment at 11:00 comes before room at 10:00
        assertEquals("Cricket Bat", activities.get(0).get("name"));
        assertEquals("cancelled", activities.get(0).get("action"));
        assertEquals("Lecture Hall 101", activities.get(1).get("name"));
        assertEquals("booked", activities.get(1).get("action"));
    }

    @Test
    void getAvailableWeeks_generatesWeekOptionsFromBookingHistory() {
        when(roomBookingRepository.findDistinctBookingDates()).thenReturn(Arrays.asList("2026-10-07", "2026-10-12"));
        when(equipmentBookingRepository.findDistinctBookingDates()).thenReturn(Collections.singletonList("2026-10-09"));

        List<Map<String, Object>> weeks = analyticsService.getAvailableWeeks();
        assertNotNull(weeks);
        assertTrue(weeks.size() >= 42, "Must contain Week 1 through at least Week 42");

        // First option must be Week 1
        assertEquals("2026-W01", weeks.get(0).get("value"));
        assertEquals("Week 1", weeks.get(0).get("label"));
        assertEquals(1, weeks.get(0).get("weekNumber"));
        assertEquals(false, weeks.get(0).get("hasBookings"));

        // Week 41 (contains 2026-10-07, 2026-10-09) must have hasBookings = true
        Map<String, Object> w41 = weeks.stream()
                .filter(w -> "2026-W41".equals(w.get("value")))
                .findFirst()
                .orElse(null);
        assertNotNull(w41);
        assertEquals("Week 41", w41.get("label"));
        assertEquals(true, w41.get("hasBookings"));
    }

    @Test
    void getAvailableWeeks_handlesYearBoundariesWithoutMixup() {
        when(roomBookingRepository.findDistinctBookingDates()).thenReturn(Arrays.asList("2025-01-05", "2026-10-12"));
        when(equipmentBookingRepository.findDistinctBookingDates()).thenReturn(Collections.emptyList());

        List<Map<String, Object>> weeks = analyticsService.getAvailableWeeks();
        assertNotNull(weeks);

        // Find Week 1 of 2025 and Week 1 of 2026
        Map<String, Object> w1_2025 = weeks.stream()
                .filter(w -> "2025-W01".equals(w.get("value")))
                .findFirst()
                .orElse(null);
        Map<String, Object> w1_2026 = weeks.stream()
                .filter(w -> "2026-W01".equals(w.get("value")))
                .findFirst()
                .orElse(null);

        assertNotNull(w1_2025, "Week 1 of 2025 must exist");
        assertNotNull(w1_2026, "Week 1 of 2026 must exist");

        assertEquals("2025-W01", w1_2025.get("value"));
        assertEquals("2026-W01", w1_2026.get("value"));
        assertEquals(2025, w1_2025.get("year"));
        assertEquals(2026, w1_2026.get("year"));
        // When multiple years are present, labels distinguish the years so they are not mixed up
        assertTrue(w1_2025.get("label").toString().contains("2025"));
        assertTrue(w1_2026.get("label").toString().contains("2026"));
    }

    @Test
    void getWeeklyAnalytics_weekWithZeroBookings_returnsZeroWithoutError() {
        when(roomBookingRepository.findByBookingDateBetween(anyString(), anyString())).thenReturn(Collections.emptyList());
        when(equipmentBookingRepository.findByBookingDateBetween(anyString(), anyString())).thenReturn(Collections.emptyList());

        Map<String, Object> result = analyticsService.getWeeklyAnalytics("2026-W01");
        assertNotNull(result);
        assertEquals("2026-W01", result.get("week"));
        assertEquals(0, result.get("totalBookings"));
        assertEquals(0, result.get("roomBookings"));
        assertEquals(0, result.get("equipmentBookings"));
        assertEquals(0L, result.get("pendingBookings"));
        assertEquals(0L, result.get("cancelledBookings"));
    }
}
