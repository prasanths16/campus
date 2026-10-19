package com.campus.backend.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.IsoFields;
import java.time.temporal.TemporalAdjusters;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.campus.backend.entity.Equipment;
import com.campus.backend.entity.EquipmentBooking;
import com.campus.backend.entity.Room;
import com.campus.backend.entity.RoomBooking;
import com.campus.backend.repository.EquipmentBookingRepository;
import com.campus.backend.repository.EquipmentRepository;
import com.campus.backend.repository.RoomBookingRepository;
import java.time.ZoneId;
import com.campus.backend.repository.RoomRepository;

@Service
public class AnalyticsService {

    private static final List<String> ACTIVE_STATUSES = Arrays.asList("BOOKED", "PENDING");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE; // yyyy-MM-dd
    private static final ZoneId CAMPUS_ZONE = ZoneId.of("Asia/Kolkata");

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

    // ── Pre-fetching helpers to prevent N+1 queries ─────────────────────────

    private Map<Long, String> getRoomNameMap() {
        return roomRepository.findAll().stream()
                .collect(Collectors.toMap(Room::getId, Room::getRoomName, (a, b) -> a));
    }

    private Map<Long, String> getEquipmentNameMap() {
        return equipmentRepository.findAll().stream()
                .collect(Collectors.toMap(Equipment::getId, Equipment::getEquipmentName, (a, b) -> a));
    }

    // ── Daily Analytics ───────────────────────────────────────────────────────

    public Map<String, Object> getDailyAnalytics(String date) {
        if (date != null) {
            date = date.trim();
        }
        if (date == null || date.isEmpty() || "today".equalsIgnoreCase(date)) {
            date = LocalDate.now(CAMPUS_ZONE).format(DATE_FMT);
        }

        LocalDate targetDate;
        try {
            targetDate = LocalDate.parse(date, DATE_FMT);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid date format. Expected: YYYY-MM-DD, e.g. 2026-10-11");
        }
        String cleanDate = targetDate.format(DATE_FMT);

        Map<Long, String> roomNames = getRoomNameMap();
        Map<Long, String> equipNames = getEquipmentNameMap();

        List<RoomBooking> allRbs = roomBookingRepository.findByBookingDate(cleanDate);
        List<EquipmentBooking> allEbs = equipmentBookingRepository.findByBookingDate(cleanDate);

        List<RoomBooking> activeRbs = allRbs.stream()
                .filter(rb -> ACTIVE_STATUSES.contains(rb.getStatus().toUpperCase()))
                .collect(Collectors.toList());
        List<EquipmentBooking> activeEbs = allEbs.stream()
                .filter(eb -> ACTIVE_STATUSES.contains(eb.getStatus().toUpperCase()))
                .collect(Collectors.toList());

        long pendingRooms = allRbs.stream().filter(rb -> "PENDING".equalsIgnoreCase(rb.getStatus())).count();
        long pendingEquips = allEbs.stream().filter(eb -> "PENDING".equalsIgnoreCase(eb.getStatus())).count();
        long cancelledRooms = allRbs.stream().filter(rb -> "CANCELLED".equalsIgnoreCase(rb.getStatus())).count();
        long cancelledEquips = allEbs.stream().filter(eb -> "CANCELLED".equalsIgnoreCase(eb.getStatus())).count();

        // AI Recommendations use active booking data from the start of the week (Monday)
        // up to the target date (inclusive)
        LocalDate monday = targetDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        String fromDate = monday.format(DATE_FMT);
        String toDate = targetDate.format(DATE_FMT);

        List<RoomBooking> recRbs = roomBookingRepository.findByBookingDateBetween(fromDate, toDate).stream()
                .filter(rb -> ACTIVE_STATUSES.contains(rb.getStatus().toUpperCase()))
                .collect(Collectors.toList());
        List<EquipmentBooking> recEbs = equipmentBookingRepository.findByBookingDateBetween(fromDate, toDate).stream()
                .filter(eb -> ACTIVE_STATUSES.contains(eb.getStatus().toUpperCase()))
                .collect(Collectors.toList());

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

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date", cleanDate);
        result.put("totalBookings", activeRbs.size() + activeEbs.size());
        result.put("roomBookings", activeRbs.size());
        result.put("equipmentBookings", activeEbs.size());
        result.put("pendingBookings", pendingRooms + pendingEquips);
        result.put("cancelledBookings", cancelledRooms + cancelledEquips);
        result.put("roomUsage", buildRoomUsage(activeRbs, roomNames));
        result.put("equipmentUsage", buildEquipmentUsage(activeEbs, equipNames));
        result.put("bookingTrend", buildHourlyTrend(activeRbs, activeEbs));
        result.put("recommendations", buildRecommendations(recRbs, recEbs, recDailyTrend, roomNames, equipNames));
        return result;
    }

    // ── Weekly Analytics ──────────────────────────────────────────────────────

    /**
     * Parse week string (supports "2026-W40", "this-week", "previous-week", etc.)
     * and return analytics for Mon–Sun of that week calculated from actual DB records.
     */
    public Map<String, Object> getWeeklyAnalytics(String week) {
        if (week != null) {
            week = week.trim();
        }
        if (week == null || week.isEmpty()) {
            week = "this-week";
        }

        LocalDate monday;
        LocalDate sunday;
        String resolvedIsoWeek;

        LocalDate today = LocalDate.now(CAMPUS_ZONE);

        if ("this-week".equalsIgnoreCase(week) || "this_week".equalsIgnoreCase(week)
                || "current".equalsIgnoreCase(week) || "current-week".equalsIgnoreCase(week)) {
            monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            sunday = monday.plusDays(6);
            int wNum = monday.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
            int yNum = monday.get(IsoFields.WEEK_BASED_YEAR);
            resolvedIsoWeek = String.format("%04d-W%02d", yNum, wNum);
        } else if ("previous-week".equalsIgnoreCase(week) || "prev-week".equalsIgnoreCase(week)
                || "previous_week".equalsIgnoreCase(week) || "last-week".equalsIgnoreCase(week)) {
            monday = today.minusWeeks(1).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            sunday = monday.plusDays(6);
            int wNum = monday.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
            int yNum = monday.get(IsoFields.WEEK_BASED_YEAR);
            resolvedIsoWeek = String.format("%04d-W%02d", yNum, wNum);
        } else {
            // Parse year and week number e.g. "2026-W41"
            String[] parts = week.toUpperCase().split("-W");
            if (parts.length != 2) {
                throw new IllegalArgumentException("Invalid week format. Expected: YYYY-WWW, 'this-week', or 'previous-week'. Received: " + week);
            }
            int year = Integer.parseInt(parts[0]);
            int weekNum = Integer.parseInt(parts[1]);

            // Determine Monday and Sunday of that ISO week
            monday = LocalDate.of(year, 1, 4)
                    .with(IsoFields.WEEK_BASED_YEAR, year)
                    .with(IsoFields.WEEK_OF_WEEK_BASED_YEAR, weekNum)
                    .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            sunday = monday.plusDays(6);
            resolvedIsoWeek = String.format("%04d-W%02d", year, weekNum);
        }

        String fromDate = monday.format(DATE_FMT);
        String toDate = sunday.format(DATE_FMT);

        Map<Long, String> roomNames = getRoomNameMap();
        Map<Long, String> equipNames = getEquipmentNameMap();

        List<RoomBooking> allRbs = roomBookingRepository.findByBookingDateBetween(fromDate, toDate);
        List<EquipmentBooking> allEbs = equipmentBookingRepository.findByBookingDateBetween(fromDate, toDate);

        List<RoomBooking> activeRbs = allRbs.stream()
                .filter(rb -> ACTIVE_STATUSES.contains(rb.getStatus().toUpperCase()))
                .collect(Collectors.toList());
        List<EquipmentBooking> activeEbs = allEbs.stream()
                .filter(eb -> ACTIVE_STATUSES.contains(eb.getStatus().toUpperCase()))
                .collect(Collectors.toList());

        long pendingRooms = allRbs.stream().filter(rb -> "PENDING".equalsIgnoreCase(rb.getStatus())).count();
        long pendingEquips = allEbs.stream().filter(eb -> "PENDING".equalsIgnoreCase(eb.getStatus())).count();
        long cancelledRooms = allRbs.stream().filter(rb -> "CANCELLED".equalsIgnoreCase(rb.getStatus())).count();
        long cancelledEquips = allEbs.stream().filter(eb -> "CANCELLED".equalsIgnoreCase(eb.getStatus())).count();

        // Build daily trend (Mon→Sun)
        List<Map<String, Object>> dailyTrend = new ArrayList<>();
        LocalDate cur = monday;
        while (!cur.isAfter(sunday)) {
            String d = cur.format(DATE_FMT);
            long roomCount = activeRbs.stream().filter(rb -> rb.getBookingDate().equals(d)).count();
            long eqCount = activeEbs.stream().filter(eb -> eb.getBookingDate().equals(d)).count();
            long dayPending = allRbs.stream().filter(rb -> rb.getBookingDate().equals(d) && "PENDING".equalsIgnoreCase(rb.getStatus())).count()
                    + allEbs.stream().filter(eb -> eb.getBookingDate().equals(d) && "PENDING".equalsIgnoreCase(eb.getStatus())).count();
            long dayCancelled = allRbs.stream().filter(rb -> rb.getBookingDate().equals(d) && "CANCELLED".equalsIgnoreCase(rb.getStatus())).count()
                    + allEbs.stream().filter(eb -> eb.getBookingDate().equals(d) && "CANCELLED".equalsIgnoreCase(eb.getStatus())).count();

            Map<String, Object> day = new LinkedHashMap<>();
            day.put("date", d);
            day.put("dayOfWeek", cur.getDayOfWeek().name());
            day.put("roomBookings", roomCount);
            day.put("equipmentBookings", eqCount);
            day.put("pendingBookings", dayPending);
            day.put("cancelledBookings", dayCancelled);
            day.put("total", roomCount + eqCount);
            dailyTrend.add(day);
            cur = cur.plusDays(1);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("week", resolvedIsoWeek);
        result.put("requestedWeek", week);
        result.put("from", fromDate);
        result.put("to", toDate);
        result.put("totalBookings", activeRbs.size() + activeEbs.size());
        result.put("roomBookings", activeRbs.size());
        result.put("equipmentBookings", activeEbs.size());
        result.put("pendingBookings", pendingRooms + pendingEquips);
        result.put("cancelledBookings", cancelledRooms + cancelledEquips);
        result.put("roomUsage", buildRoomUsage(activeRbs, roomNames));
        result.put("equipmentUsage", buildEquipmentUsage(activeEbs, equipNames));
        result.put("dailyTrend", dailyTrend);
        result.put("recommendations", buildRecommendations(activeRbs, activeEbs, dailyTrend, roomNames, equipNames));
        return result;
    }

    /**
     * Automatically generate week options based on the booking history available in the database.
     * Uses each booking's actual date to calculate its week and handles year boundaries.
     * Generates Week 1, Week 2, Week 3, Week 4, and so on.
     */
    public List<Map<String, Object>> getAvailableWeeks() {
        List<String> roomDates = roomBookingRepository.findDistinctBookingDates();
        List<String> equipDates = equipmentBookingRepository.findDistinctBookingDates();

        Set<String> allDates = new LinkedHashSet<>();
        if (roomDates != null) {
            for (String d : roomDates) {
                if (d != null && !d.trim().isEmpty()) {
                    allDates.add(d.trim());
                }
            }
        }
        if (equipDates != null) {
            for (String d : equipDates) {
                if (d != null && !d.trim().isEmpty()) {
                    allDates.add(d.trim());
                }
            }
        }

        LocalDate today = LocalDate.now(CAMPUS_ZONE);
        int currentYear = today.get(IsoFields.WEEK_BASED_YEAR);
        int currentWeek = today.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);

        Map<Integer, Integer> maxWeekByYear = new LinkedHashMap<>();
        Set<String> weeksWithBookings = new LinkedHashSet<>();

        for (String dateStr : allDates) {
            try {
                LocalDate d = LocalDate.parse(dateStr, DATE_FMT);
                int y = d.get(IsoFields.WEEK_BASED_YEAR);
                int w = d.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
                String isoWeek = String.format("%04d-W%02d", y, w);
                weeksWithBookings.add(isoWeek);
                maxWeekByYear.put(y, Math.max(maxWeekByYear.getOrDefault(y, 0), w));
            } catch (Exception ignored) {
            }
        }

        // Always include current year up to current week
        maxWeekByYear.put(currentYear, Math.max(maxWeekByYear.getOrDefault(currentYear, 0), currentWeek));

        List<Integer> sortedYears = new ArrayList<>(maxWeekByYear.keySet());
        Collections.sort(sortedYears);
        boolean hasMultipleYears = sortedYears.size() > 1;

        List<Map<String, Object>> result = new ArrayList<>();
        for (int y : sortedYears) {
            int maxW = maxWeekByYear.get(y);
            for (int w = 1; w <= maxW; w++) {
                String isoWeek = String.format("%04d-W%02d", y, w);
                String label = hasMultipleYears ? String.format("Week %d (%d)", w, y) : String.format("Week %d", w);

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("value", isoWeek);
                item.put("label", label);
                item.put("weekNumber", w);
                item.put("year", y);
                item.put("hasBookings", weeksWithBookings.contains(isoWeek));
                result.add(item);
            }
        }

        return result;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private List<Map<String, Object>> buildRoomUsage(List<RoomBooking> rbs, Map<Long, String> roomNames) {
        // Group by roomId, count bookings
        Map<Long, Long> countByRoom = rbs.stream()
                .collect(Collectors.groupingBy(RoomBooking::getRoomId, Collectors.counting()));

        List<Map<String, Object>> list = new ArrayList<>();
        countByRoom.forEach((roomId, count) -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("roomId", roomId);
            entry.put("roomName", roomNames.getOrDefault(roomId, "Room #" + roomId));
            entry.put("bookingCount", count);
            list.add(entry);
        });
        list.sort(Comparator.comparingLong(e -> -((Long) e.get("bookingCount"))));
        return list;
    }

    private List<Map<String, Object>> buildEquipmentUsage(List<EquipmentBooking> ebs, Map<Long, String> equipNames) {
        // Group by equipmentId: count bookings and sum quantity
        Map<Long, List<EquipmentBooking>> grouped = ebs.stream()
                .collect(Collectors.groupingBy(EquipmentBooking::getEquipmentId));

        List<Map<String, Object>> list = new ArrayList<>();
        grouped.forEach((eqId, bookings) -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("equipmentId", eqId);
            entry.put("equipmentName", equipNames.getOrDefault(eqId, "Equipment #" + eqId));
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

    private Map<String, Object> buildRecommendations(List<RoomBooking> rbs,
                                                      List<EquipmentBooking> ebs,
                                                      List<Map<String, Object>> dailyTrend,
                                                      Map<Long, String> roomNames,
                                                      Map<Long, String> equipNames) {
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
                    roomNames.getOrDefault(topRoomId, "Room #" + topRoomId);
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
                    equipNames.getOrDefault(topEqId, "Equipment #" + topEqId);
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
     * sorted newest-first, with names resolved via batch maps without N+1 queries.
     */
    public List<Map<String, Object>> getRecentActivity() {
        Map<Long, String> roomNames = getRoomNameMap();
        Map<Long, String> equipNames = getEquipmentNameMap();

        List<Map<String, Object>> activities = new ArrayList<>();

        // All room bookings
        List<RoomBooking> allRoom = roomBookingRepository.findAll();
        for (RoomBooking rb : allRoom) {
            Map<String, Object> entry = new LinkedHashMap<>();
            String roomName = roomNames.getOrDefault(rb.getRoomId(), "Room #" + rb.getRoomId());
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
            String equipName = equipNames.getOrDefault(eb.getEquipmentId(), "Equipment #" + eb.getEquipmentId());
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
