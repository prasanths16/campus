package com.campus.backend.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.IsoFields;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.campus.backend.entity.EquipmentBooking;
import com.campus.backend.entity.RoomBooking;
import com.campus.backend.repository.EquipmentBookingRepository;
import com.campus.backend.repository.EquipmentRepository;
import com.campus.backend.repository.RoomBookingRepository;
import com.campus.backend.repository.RoomRepository;

@Service
public class AnalyticsService {

    private static final List<String> ACTIVE_STATUSES = Arrays.asList("BOOKED", "PENDING");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE; // yyyy-MM-dd

    private final RoomBookingRepository roomBookingRepository;
    private final EquipmentBookingRepository equipmentBookingRepository;
    private final RoomRepository roomRepository;
    private final EquipmentRepository equipmentRepository;

    public AnalyticsService(RoomBookingRepository roomBookingRepository,
                            EquipmentBookingRepository equipmentBookingRepository,
                            RoomRepository roomRepository,
                            EquipmentRepository equipmentRepository) {
        this.roomBookingRepository = roomBookingRepository;
        this.equipmentBookingRepository = equipmentBookingRepository;
        this.roomRepository = roomRepository;
        this.equipmentRepository = equipmentRepository;
    }

    // ── Daily Analytics ───────────────────────────────────────────────────────

    public Map<String, Object> getDailyAnalytics(String date) {
        if (date != null) {
            date = date.trim();
        }
        List<RoomBooking> rbs = roomBookingRepository.findByBookingDateAndStatusIn(date, ACTIVE_STATUSES);
        List<EquipmentBooking> ebs = equipmentBookingRepository.findByBookingDateAndStatusIn(date, ACTIVE_STATUSES);

        // AI Recommendations use all available booking data from the start of the week (Monday)
        // up to the target date (Monday -> Monday; Tuesday -> Monday+Tuesday; Wednesday -> Monday+Tuesday+Wednesday, etc.)
        LocalDate targetDate = LocalDate.parse(date, DATE_FMT);
        LocalDate monday = targetDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        String fromDate = monday.format(DATE_FMT);
        String toDate = targetDate.format(DATE_FMT);

        List<RoomBooking> recRbs = roomBookingRepository.findByBookingDateBetweenAndStatusIn(
                fromDate, toDate, ACTIVE_STATUSES);
        List<EquipmentBooking> recEbs = equipmentBookingRepository.findByBookingDateBetweenAndStatusIn(
                fromDate, toDate, ACTIVE_STATUSES);

        List<Map<String, Object>> recDailyTrend = new ArrayList<>();
        LocalDate cur = monday;
        while (!cur.isAfter(targetDate)) {
            String d = cur.format(DATE_FMT);
            long roomCount = recRbs.stream().filter(rb -> rb.getBookingDate().equals(d)).count();
            long eqCount = recEbs.stream().filter(eb -> eb.getBookingDate().equals(d)).count();
            Map<String, Object> day = new LinkedHashMap<>();
            day.put("date", d);
            day.put("dayOfWeek", cur.getDayOfWeek().name());
            day.put("roomBookings", roomCount);
            day.put("equipmentBookings", eqCount);
            day.put("total", roomCount + eqCount);
            recDailyTrend.add(day);
            cur = cur.plusDays(1);
        }

        long pendingRooms = rbs.stream().filter(rb -> "PENDING".equalsIgnoreCase(rb.getStatus())).count();
        long pendingEquips = ebs.stream().filter(eb -> "PENDING".equalsIgnoreCase(eb.getStatus())).count();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date", date);
        result.put("totalBookings", rbs.size() + ebs.size());
        result.put("roomBookings", rbs.size());
        result.put("equipmentBookings", ebs.size());
        result.put("pendingBookings", pendingRooms + pendingEquips);
        result.put("roomUsage", buildRoomUsage(rbs));
        result.put("equipmentUsage", buildEquipmentUsage(ebs));
        result.put("bookingTrend", buildHourlyTrend(rbs, ebs));
        result.put("recommendations", buildRecommendations(recRbs, recEbs, recDailyTrend));
        return result;
    }

    // ── Weekly Analytics ──────────────────────────────────────────────────────

    /**
     * Parse week string like "2026-W40" and return analytics for Mon–Sun of that week.
     */
    public Map<String, Object> getWeeklyAnalytics(String week) {
        // Parse year and week number
        String[] parts = week.split("-W");
        if (parts.length != 2) {
            throw new IllegalArgumentException("Invalid week format. Expected: YYYY-WWW, e.g. 2026-W40");
        }
        int year = Integer.parseInt(parts[0]);
        int weekNum = Integer.parseInt(parts[1]);

        // Determine Monday and Sunday of that ISO week
        LocalDate monday = LocalDate.of(year, 1, 4) // Jan 4 is always in week 1
                .with(IsoFields.WEEK_OF_WEEK_BASED_YEAR, weekNum)
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate sunday = monday.plusDays(6);

        String fromDate = monday.format(DATE_FMT);
        String toDate = sunday.format(DATE_FMT);

        List<RoomBooking> rbs = roomBookingRepository.findByBookingDateBetweenAndStatusIn(
                fromDate, toDate, ACTIVE_STATUSES);
        List<EquipmentBooking> ebs = equipmentBookingRepository.findByBookingDateBetweenAndStatusIn(
                fromDate, toDate, ACTIVE_STATUSES);

        // Build daily trend (Mon→Sun)
        List<Map<String, Object>> dailyTrend = new ArrayList<>();
        LocalDate cur = monday;
        while (!cur.isAfter(sunday)) {
            String d = cur.format(DATE_FMT);
            long roomCount = rbs.stream().filter(rb -> rb.getBookingDate().equals(d)).count();
            long eqCount = ebs.stream().filter(eb -> eb.getBookingDate().equals(d)).count();
            Map<String, Object> day = new LinkedHashMap<>();
            day.put("date", d);
            day.put("dayOfWeek", cur.getDayOfWeek().name());
            day.put("roomBookings", roomCount);
            day.put("equipmentBookings", eqCount);
            day.put("total", roomCount + eqCount);
            dailyTrend.add(day);
            cur = cur.plusDays(1);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("week", week);
        result.put("from", fromDate);
        result.put("to", toDate);
        result.put("totalBookings", rbs.size() + ebs.size());
        result.put("roomBookings", rbs.size());
        result.put("equipmentBookings", ebs.size());
        result.put("roomUsage", buildRoomUsage(rbs));
        result.put("equipmentUsage", buildEquipmentUsage(ebs));
        result.put("dailyTrend", dailyTrend);
        result.put("recommendations", buildRecommendations(rbs, ebs, dailyTrend));
        return result;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private List<Map<String, Object>> buildRoomUsage(List<RoomBooking> rbs) {
        // Group by roomId, count bookings
        Map<Long, Long> countByRoom = rbs.stream()
                .collect(Collectors.groupingBy(RoomBooking::getRoomId, Collectors.counting()));

        List<Map<String, Object>> list = new ArrayList<>();
        countByRoom.forEach((roomId, count) -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("roomId", roomId);
            roomRepository.findById(roomId).ifPresent(r -> entry.put("roomName", r.getRoomName()));
            entry.put("bookingCount", count);
            list.add(entry);
        });
        list.sort(Comparator.comparingLong(e -> -((Long) e.get("bookingCount"))));
        return list;
    }

    private List<Map<String, Object>> buildEquipmentUsage(List<EquipmentBooking> ebs) {
        // Group by equipmentId: count bookings and sum quantity
        Map<Long, List<EquipmentBooking>> grouped = ebs.stream()
                .collect(Collectors.groupingBy(EquipmentBooking::getEquipmentId));

        List<Map<String, Object>> list = new ArrayList<>();
        grouped.forEach((eqId, bookings) -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("equipmentId", eqId);
            equipmentRepository.findById(eqId).ifPresent(e -> entry.put("equipmentName", e.getEquipmentName()));
            entry.put("bookingCount", bookings.size());
            int totalQty = bookings.stream().mapToInt(EquipmentBooking::getQuantity).sum();
            entry.put("quantityUsed", totalQty);
            list.add(entry);
        });
        list.sort(Comparator.comparingLong(e -> -((Integer) e.get("bookingCount"))));
        return list;
    }

    private Map<String, Object> buildHourlyTrend(List<RoomBooking> rbs, List<EquipmentBooking> ebs) {
        // Trend by time slot
        Map<String, Long> roomSlots = rbs.stream()
                .collect(Collectors.groupingBy(RoomBooking::getTimeSlot, Collectors.counting()));
        Map<String, Long> eqSlots = ebs.stream()
                .collect(Collectors.groupingBy(EquipmentBooking::getTimeSlot, Collectors.counting()));

        // Merge all slots
        Map<String, Object> trend = new LinkedHashMap<>();
        List<String> allSlots = new ArrayList<>();
        allSlots.addAll(roomSlots.keySet());
        eqSlots.keySet().forEach(s -> { if (!allSlots.contains(s)) allSlots.add(s); });

        List<Map<String, Object>> slotList = new ArrayList<>();
        for (String slot : allSlots) {
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("timeSlot", slot);
            s.put("roomBookings", roomSlots.getOrDefault(slot, 0L));
            s.put("equipmentBookings", eqSlots.getOrDefault(slot, 0L));
            slotList.add(s);
        }
        trend.put("byTimeSlot", slotList);
        return trend;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildRecommendations(List<RoomBooking> rbs,
                                                      List<EquipmentBooking> ebs,
                                                      List<Map<String, Object>> dailyTrend) {
        Map<String, Object> rec = new LinkedHashMap<>();

        // High demand room
        Map<Long, Long> roomCount = rbs.stream()
                .collect(Collectors.groupingBy(RoomBooking::getRoomId, Collectors.counting()));
        if (!roomCount.isEmpty()) {
            Long topRoomId = roomCount.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse(null);
            String roomName = topRoomId == null ? "N/A" :
                    roomRepository.findById(topRoomId).map(r -> r.getRoomName()).orElse("Room #" + topRoomId);
            rec.put("highDemandRoom", roomName);
            rec.put("highDemandRoomMessage", "High demand for " + roomName + ".");
        } else {
            rec.put("highDemandRoom", null);
            rec.put("highDemandRoomMessage", "No room bookings in this period.");
        }

        // High demand equipment
        Map<Long, Long> eqCount = ebs.stream()
                .collect(Collectors.groupingBy(EquipmentBooking::getEquipmentId, Collectors.counting()));
        if (!eqCount.isEmpty()) {
            Long topEqId = eqCount.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse(null);
            String eqName = topEqId == null ? "N/A" :
                    equipmentRepository.findById(topEqId).map(e -> e.getEquipmentName()).orElse("Equipment #" + topEqId);
            rec.put("highDemandEquipment", eqName);
            rec.put("highDemandEquipmentMessage", "High demand for " + eqName + ".");
        } else {
            rec.put("highDemandEquipment", null);
            rec.put("highDemandEquipmentMessage", "No equipment bookings in this period.");
        }

        // Peak day (weekly only)
        if (dailyTrend != null && !dailyTrend.isEmpty()) {
            long maxTotal = dailyTrend.stream().mapToLong(d -> (Long) d.get("total")).max().orElse(0L);
            if (maxTotal > 0) {
                Optional<Map<String, Object>> peakDay = dailyTrend.stream()
                        .max(Comparator.comparingLong(d -> (Long) d.get("total")));
                if (peakDay.isPresent()) {
                    String day = (String) peakDay.get().get("dayOfWeek");
                    String date = (String) peakDay.get().get("date");
                    rec.put("expectedPeakBookingDay", capitalize(day));
                    rec.put("peakDayMessage", "Expect higher booking activity on " + capitalize(day) + " (" + date + ").");
                }
            } else {
                rec.put("expectedPeakBookingDay", null);
                rec.put("peakDayMessage", "No booking data");
            }
        } else {
            rec.put("expectedPeakBookingDay", null);
            rec.put("peakDayMessage", "No booking data");
        }

        // Recommended action
        int total = rbs.size() + ebs.size();
        rec.put("totalBookings", total);
        String action;
        if (total == 0) {
            action = "No recent booking activity";
        } else if (total > 20) {
            action = "High booking activity detected. Ensure all resources are available and maintained.";
        } else if (total > 10) {
            action = "Moderate booking activity. Monitor room and equipment availability.";
        } else {
            action = "Low booking activity. Resources are comfortably available.";
        }
        rec.put("recommendedAction", action);

        return rec;
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return s.charAt(0) + s.substring(1).toLowerCase();
    }

    // ── Recent Activity ───────────────────────────────────────────────────────

    /**
     * Returns the most recent 10 booking/cancellation events (room + equipment),
     * sorted newest-first, with names resolved.
     */
    public List<Map<String, Object>> getRecentActivity() {
        List<Map<String, Object>> activities = new ArrayList<>();

        // All room bookings
        List<RoomBooking> allRoom = roomBookingRepository.findAll();
        for (RoomBooking rb : allRoom) {
            Map<String, Object> entry = new LinkedHashMap<>();
            String roomName = roomRepository.findById(rb.getRoomId())
                    .map(r -> r.getRoomName()).orElse("Room #" + rb.getRoomId());
            String action = "CANCELLED".equalsIgnoreCase(rb.getStatus()) ? "cancelled" : "booked";
            entry.put("type", "room");
            entry.put("action", action);
            entry.put("name", roomName);
            entry.put("status", rb.getStatus());
            entry.put("createdAt", rb.getCreatedAt() != null ? rb.getCreatedAt().toString() : "");
            activities.add(entry);
        }

        // All equipment bookings
        List<EquipmentBooking> allEquip = equipmentBookingRepository.findAll();
        for (EquipmentBooking eb : allEquip) {
            Map<String, Object> entry = new LinkedHashMap<>();
            String equipName = equipmentRepository.findById(eb.getEquipmentId())
                    .map(e -> e.getEquipmentName()).orElse("Equipment #" + eb.getEquipmentId());
            String action = "CANCELLED".equalsIgnoreCase(eb.getStatus()) ? "cancelled" : "booked";
            entry.put("type", "equipment");
            entry.put("action", action);
            entry.put("name", equipName);
            entry.put("status", eb.getStatus());
            entry.put("createdAt", eb.getCreatedAt() != null ? eb.getCreatedAt().toString() : "");
            activities.add(entry);
        }

        // Sort by createdAt descending (newest first)
        activities.sort((a, b) -> {
            String ta = (String) a.get("createdAt");
            String tb = (String) b.get("createdAt");
            if (ta == null || ta.isEmpty()) return 1;
            if (tb == null || tb.isEmpty()) return -1;
            return tb.compareTo(ta);
        });

        // Return top 10
        return activities.stream().limit(10).collect(Collectors.toList());
    }
}
