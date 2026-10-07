package com.campus.backend.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.campus.backend.dto.EquipmentBookingRequest;
import com.campus.backend.dto.RoomBookingRequest;
import com.campus.backend.entity.Equipment;
import com.campus.backend.entity.EquipmentBooking;
import com.campus.backend.entity.Room;
import com.campus.backend.entity.RoomBooking;
import com.campus.backend.repository.EquipmentBookingRepository;
import com.campus.backend.repository.EquipmentRepository;
import com.campus.backend.repository.RoomBookingRepository;
import com.campus.backend.repository.RoomRepository;
import com.campus.backend.repository.UserRepository;

@Service
public class BookingService {

    private static final List<String> ACTIVE_STATUSES = Arrays.asList("BOOKED", "PENDING");

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final EquipmentRepository equipmentRepository;
    private final RoomBookingRepository roomBookingRepository;
    private final EquipmentBookingRepository equipmentBookingRepository;

    public BookingService(UserRepository userRepository,
                          RoomRepository roomRepository,
                          EquipmentRepository equipmentRepository,
                          RoomBookingRepository roomBookingRepository,
                          EquipmentBookingRepository equipmentBookingRepository) {
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
        this.equipmentRepository = equipmentRepository;
        this.roomBookingRepository = roomBookingRepository;
        this.equipmentBookingRepository = equipmentBookingRepository;
    }

    // ── Room Booking ──────────────────────────────────────────────────────────

    @Transactional
    public RoomBooking bookRoom(RoomBookingRequest request) {
        if (request == null) throw new IllegalArgumentException("Request body is required");
        if (request.getUserId() == null) throw new IllegalArgumentException("userId is required");
        if (request.getRoomId() == null) throw new IllegalArgumentException("roomId is required");
        if (request.getBookingDate() == null || request.getBookingDate().isBlank())
            throw new IllegalArgumentException("bookingDate is required");
        if (request.getTimeSlot() == null || request.getTimeSlot().isBlank())
            throw new IllegalArgumentException("timeSlot is required");

        // 1. User must exist
        if (!userRepository.existsById(request.getUserId())) {
            throw new NoSuchElementException("User not found with id: " + request.getUserId());
        }

        // 2. Room must exist
        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new NoSuchElementException("Room not found with id: " + request.getRoomId()));

        // 3. Room must be AVAILABLE
        if (!"AVAILABLE".equalsIgnoreCase(room.getStatus())) {
            throw new IllegalStateException("Room is not available for booking");
        }

        // 4. Capacity must be positive
        if (room.getCapacity() <= 0) {
            throw new IllegalStateException("Room has no capacity");
        }

        // 6. Count existing active bookings for same room + date + slot
        int bookedCount = roomBookingRepository.countByRoomIdAndBookingDateAndTimeSlotAndStatusIn(
                request.getRoomId(), request.getBookingDate(), request.getTimeSlot(), ACTIVE_STATUSES);

        // 7. Full check
        if (bookedCount >= room.getCapacity()) {
            throw new IllegalStateException("Room is full.");
        }

        // 8. Duplicate check for same student
        boolean alreadyBooked = roomBookingRepository
                .existsByUserIdAndRoomIdAndBookingDateAndTimeSlotAndStatusIn(
                        request.getUserId(), request.getRoomId(),
                        request.getBookingDate(), request.getTimeSlot(), ACTIVE_STATUSES);
        if (alreadyBooked) {
            throw new IllegalStateException("You have already booked this room for the selected date and time slot");
        }

        // 9–11. Save booking
        RoomBooking booking = new RoomBooking();
        booking.setUserId(request.getUserId());
        booking.setRoomId(request.getRoomId());
        booking.setBookingDate(request.getBookingDate());
        booking.setTimeSlot(request.getTimeSlot());
        booking.setStatus("BOOKED");
        booking.setCreatedAt(LocalDateTime.now());

        return roomBookingRepository.save(booking);
    }

    // ── Equipment Booking ─────────────────────────────────────────────────────

    @Transactional
    public EquipmentBooking bookEquipment(EquipmentBookingRequest request) {
        if (request == null) throw new IllegalArgumentException("Request body is required");
        if (request.getUserId() == null) throw new IllegalArgumentException("userId is required");
        if (request.getEquipmentId() == null) throw new IllegalArgumentException("equipmentId is required");
        if (request.getBookingDate() == null || request.getBookingDate().isBlank())
            throw new IllegalArgumentException("bookingDate is required");
        if (request.getTimeSlot() == null || request.getTimeSlot().isBlank())
            throw new IllegalArgumentException("timeSlot is required");
        if (request.getQuantity() == null) throw new IllegalArgumentException("quantity is required");
        if (request.getQuantity() <= 0) throw new IllegalArgumentException("quantity must be positive");

        // 1. User must exist
        if (!userRepository.existsById(request.getUserId())) {
            throw new NoSuchElementException("User not found with id: " + request.getUserId());
        }

        // 2. Equipment must exist
        Equipment equipment = equipmentRepository.findById(request.getEquipmentId())
                .orElseThrow(() -> new NoSuchElementException("Equipment not found with id: " + request.getEquipmentId()));

        // 4. Calculate available quantity for this slot
        int bookedForSlot = equipmentBookingRepository.sumBookedQuantityBySlot(
                request.getEquipmentId(), request.getBookingDate(), request.getTimeSlot(), ACTIVE_STATUSES);
        int available = equipment.getTotalQuantity() - bookedForSlot;

        // 5. Reject if requested quantity > available
        if (request.getQuantity() > available) {
            throw new IllegalStateException(
                    "Insufficient quantity. Available: " + available + ", Requested: " + request.getQuantity());
        }

        // 6. One student can book only 1 unit of the same equipment for the same slot
        boolean alreadyBooked = equipmentBookingRepository
                .existsByUserIdAndEquipmentIdAndBookingDateAndTimeSlotAndStatusIn(
                        request.getUserId(), request.getEquipmentId(),
                        request.getBookingDate(), request.getTimeSlot(), ACTIVE_STATUSES);
        if (alreadyBooked) {
            throw new IllegalStateException("You have already booked this equipment for the selected date and time slot");
        }

        // 8–10. Save booking
        EquipmentBooking booking = new EquipmentBooking();
        booking.setUserId(request.getUserId());
        booking.setEquipmentId(request.getEquipmentId());
        booking.setBookingDate(request.getBookingDate());
        booking.setTimeSlot(request.getTimeSlot());
        booking.setQuantity(request.getQuantity());
        booking.setStatus("BOOKED");
        booking.setCreatedAt(LocalDateTime.now());

        return equipmentBookingRepository.save(booking);
    }

    // ── Cancellation ──────────────────────────────────────────────────────────

    @Transactional
    public RoomBooking cancelRoomBooking(Long id) {
        RoomBooking booking = roomBookingRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Room booking not found with id: " + id));

        if (LocalDateTime.now().isAfter(booking.getCreatedAt().plusMinutes(30))) {
            throw new IllegalStateException("Cancellation period has expired.");
        }

        booking.setStatus("CANCELLED");
        return roomBookingRepository.save(booking);
    }

    @Transactional
    public EquipmentBooking cancelEquipmentBooking(Long id) {
        EquipmentBooking booking = equipmentBookingRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Equipment booking not found with id: " + id));

        if (LocalDateTime.now().isAfter(booking.getCreatedAt().plusMinutes(30))) {
            throw new IllegalStateException("Cancellation period has expired.");
        }

        booking.setStatus("CANCELLED");
        return equipmentBookingRepository.save(booking);
    }

    // ── My Bookings ───────────────────────────────────────────────────────────

    public Map<String, Object> getUserBookings(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new NoSuchElementException("User not found with id: " + userId);
        }

        List<RoomBooking> roomBookings = roomBookingRepository.findByUserId(userId);
        List<EquipmentBooking> equipmentBookings = equipmentBookingRepository.findByUserId(userId);

        List<Map<String, Object>> roomList = new ArrayList<>();
        for (RoomBooking rb : roomBookings) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", rb.getId());
            entry.put("type", "ROOM");
            entry.put("bookingDate", rb.getBookingDate());
            entry.put("timeSlot", rb.getTimeSlot());
            entry.put("status", rb.getStatus());
            entry.put("createdAt", rb.getCreatedAt());
            entry.put("roomId", rb.getRoomId());
            roomRepository.findById(rb.getRoomId()).ifPresent(room -> {
                entry.put("roomName", room.getRoomName());
                entry.put("block", room.getBlock());
                entry.put("capacity", room.getCapacity());
                entry.put("roomStatus", room.getStatus());
            });
            roomList.add(entry);
        }

        List<Map<String, Object>> equipmentList = new ArrayList<>();
        for (EquipmentBooking eb : equipmentBookings) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", eb.getId());
            entry.put("type", "EQUIPMENT");
            entry.put("bookingDate", eb.getBookingDate());
            entry.put("timeSlot", eb.getTimeSlot());
            entry.put("quantity", eb.getQuantity());
            entry.put("status", eb.getStatus());
            entry.put("createdAt", eb.getCreatedAt());
            entry.put("equipmentId", eb.getEquipmentId());
            equipmentRepository.findById(eb.getEquipmentId()).ifPresent(eq -> {
                entry.put("equipmentName", eq.getEquipmentName());
                entry.put("totalQuantity", eq.getTotalQuantity());
            });
            equipmentList.add(entry);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("userId", userId);
        result.put("roomBookings", roomList);
        result.put("equipmentBookings", equipmentList);
        return result;
    }
}
