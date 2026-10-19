package com.campus.backend.service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.campus.backend.entity.EquipmentBooking;
import com.campus.backend.entity.RoomBooking;
import com.campus.backend.repository.EquipmentBookingRepository;
import com.campus.backend.repository.EquipmentRepository;
import com.campus.backend.repository.RoomBookingRepository;
import com.campus.backend.repository.RoomRepository;
import com.campus.backend.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private EquipmentRepository equipmentRepository;

    @Mock
    private RoomBookingRepository roomBookingRepository;

    @Mock
    private EquipmentBookingRepository equipmentBookingRepository;

    private BookingService bookingService;

    private final ZoneId campusZone = ZoneId.of("Asia/Kolkata");

    @BeforeEach
    void setUp() {
        bookingService = new BookingService(
                userRepository,
                roomRepository,
                equipmentRepository,
                roomBookingRepository,
                equipmentBookingRepository
        );
    }

    @Test
    void cancelRoomBooking_within30Minutes_succeeds() {
        RoomBooking booking = new RoomBooking();
        booking.setId(1L);
        booking.setRoomId(10L);
        booking.setStatus("BOOKED");
        booking.setCreatedAt(LocalDateTime.now(campusZone).minusMinutes(10));

        when(roomBookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(roomBookingRepository.save(any(RoomBooking.class))).thenAnswer(i -> i.getArgument(0));

        RoomBooking result = bookingService.cancelRoomBooking(1L);

        assertEquals("CANCELLED", result.getStatus());
        verify(roomBookingRepository).save(booking);
    }

    @Test
    void cancelRoomBooking_atExactly30Minutes_throwsException() {
        RoomBooking booking = new RoomBooking();
        booking.setId(1L);
        booking.setStatus("BOOKED");
        booking.setCreatedAt(LocalDateTime.now(campusZone).minusMinutes(30));

        when(roomBookingRepository.findById(1L)).thenReturn(Optional.of(booking));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                bookingService.cancelRoomBooking(1L)
        );
        assertEquals("Bookings can only be cancelled within 30 minutes of creation.", ex.getMessage());
    }

    @Test
    void cancelRoomBooking_after30Minutes_throwsException() {
        RoomBooking booking = new RoomBooking();
        booking.setId(1L);
        booking.setStatus("BOOKED");
        booking.setCreatedAt(LocalDateTime.now(campusZone).minusMinutes(35));

        when(roomBookingRepository.findById(1L)).thenReturn(Optional.of(booking));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                bookingService.cancelRoomBooking(1L)
        );
        assertEquals("Bookings can only be cancelled within 30 minutes of creation.", ex.getMessage());
    }

    @Test
    void cancelRoomBooking_alreadyCancelled_throwsException() {
        RoomBooking booking = new RoomBooking();
        booking.setId(1L);
        booking.setStatus("CANCELLED");
        booking.setCreatedAt(LocalDateTime.now(campusZone).minusMinutes(10));

        when(roomBookingRepository.findById(1L)).thenReturn(Optional.of(booking));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                bookingService.cancelRoomBooking(1L)
        );
        assertEquals("Booking is already cancelled.", ex.getMessage());
    }

    @Test
    void cancelEquipmentBooking_within30Minutes_succeeds() {
        EquipmentBooking booking = new EquipmentBooking();
        booking.setId(2L);
        booking.setEquipmentId(20L);
        booking.setStatus("PENDING");
        booking.setCreatedAt(LocalDateTime.now(campusZone).minusMinutes(5));

        when(equipmentBookingRepository.findById(2L)).thenReturn(Optional.of(booking));
        when(equipmentBookingRepository.save(any(EquipmentBooking.class))).thenAnswer(i -> i.getArgument(0));

        EquipmentBooking result = bookingService.cancelEquipmentBooking(2L);

        assertEquals("CANCELLED", result.getStatus());
        verify(equipmentBookingRepository).save(booking);
    }

    @Test
    void cancelEquipmentBooking_atExactly30Minutes_throwsException() {
        EquipmentBooking booking = new EquipmentBooking();
        booking.setId(2L);
        booking.setStatus("BOOKED");
        booking.setCreatedAt(LocalDateTime.now(campusZone).minusMinutes(30));

        when(equipmentBookingRepository.findById(2L)).thenReturn(Optional.of(booking));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                bookingService.cancelEquipmentBooking(2L)
        );
        assertEquals("Bookings can only be cancelled within 30 minutes of creation.", ex.getMessage());
    }

    @Test
    void cancelEquipmentBooking_after30Minutes_throwsException() {
        EquipmentBooking booking = new EquipmentBooking();
        booking.setId(2L);
        booking.setStatus("BOOKED");
        booking.setCreatedAt(LocalDateTime.now(campusZone).minusMinutes(31));

        when(equipmentBookingRepository.findById(2L)).thenReturn(Optional.of(booking));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                bookingService.cancelEquipmentBooking(2L)
        );
        assertEquals("Bookings can only be cancelled within 30 minutes of creation.", ex.getMessage());
    }

    @Test
    void cancelEquipmentBooking_alreadyCancelled_throwsException() {
        EquipmentBooking booking = new EquipmentBooking();
        booking.setId(2L);
        booking.setStatus("CANCELLED");
        booking.setCreatedAt(LocalDateTime.now(campusZone).minusMinutes(5));

        when(equipmentBookingRepository.findById(2L)).thenReturn(Optional.of(booking));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                bookingService.cancelEquipmentBooking(2L)
        );
        assertEquals("Booking is already cancelled.", ex.getMessage());
    }

    @Test
    void bookRoom_validRequest_savesAndReturnsBooking() {
        com.campus.backend.dto.RoomBookingRequest req = new com.campus.backend.dto.RoomBookingRequest();
        req.setUserId(1L);
        req.setRoomId(10L);
        req.setBookingDate("2026-10-12");
        req.setTimeSlot("8:45 AM – 10:30 AM");

        com.campus.backend.entity.Room room = new com.campus.backend.entity.Room();
        room.setId(10L);
        room.setRoomName("Room 201");
        room.setStatus("AVAILABLE");
        room.setCapacity(40);

        when(userRepository.existsById(1L)).thenReturn(true);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(roomBookingRepository.countByRoomIdAndBookingDateAndTimeSlotAndStatusIn(any(), any(), any(), any())).thenReturn(0);
        when(roomBookingRepository.existsByUserIdAndRoomIdAndBookingDateAndTimeSlotAndStatusIn(any(), any(), any(), any(), any())).thenReturn(false);
        when(roomBookingRepository.save(any(RoomBooking.class))).thenAnswer(i -> {
            RoomBooking b = i.getArgument(0);
            b.setId(101L);
            return b;
        });

        RoomBooking result = bookingService.bookRoom(req);

        assertEquals(101L, result.getId());
        assertEquals("BOOKED", result.getStatus());
        assertEquals(1L, result.getUserId());
        assertEquals(10L, result.getRoomId());
        assertEquals("2026-10-12", result.getBookingDate());
        verify(roomBookingRepository).save(any(RoomBooking.class));
    }

    @Test
    void bookRoom_roomFull_throwsIllegalStateException() {
        com.campus.backend.dto.RoomBookingRequest req = new com.campus.backend.dto.RoomBookingRequest();
        req.setUserId(1L);
        req.setRoomId(10L);
        req.setBookingDate("2026-10-12");
        req.setTimeSlot("8:45 AM – 10:30 AM");

        com.campus.backend.entity.Room room = new com.campus.backend.entity.Room();
        room.setId(10L);
        room.setRoomName("Room 201");
        room.setStatus("AVAILABLE");
        room.setCapacity(2);

        when(userRepository.existsById(1L)).thenReturn(true);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(roomBookingRepository.countByRoomIdAndBookingDateAndTimeSlotAndStatusIn(any(), any(), any(), any())).thenReturn(2);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                bookingService.bookRoom(req)
        );
        assertEquals("Room is full.", ex.getMessage());
    }

    @Test
    void bookRoom_alreadyBooked_throwsIllegalStateException() {
        com.campus.backend.dto.RoomBookingRequest req = new com.campus.backend.dto.RoomBookingRequest();
        req.setUserId(1L);
        req.setRoomId(10L);
        req.setBookingDate("2026-10-12");
        req.setTimeSlot("8:45 AM – 10:30 AM");

        com.campus.backend.entity.Room room = new com.campus.backend.entity.Room();
        room.setId(10L);
        room.setRoomName("Room 201");
        room.setStatus("AVAILABLE");
        room.setCapacity(40);

        when(userRepository.existsById(1L)).thenReturn(true);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(roomBookingRepository.countByRoomIdAndBookingDateAndTimeSlotAndStatusIn(any(), any(), any(), any())).thenReturn(5);
        when(roomBookingRepository.existsByUserIdAndRoomIdAndBookingDateAndTimeSlotAndStatusIn(any(), any(), any(), any(), any())).thenReturn(true);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                bookingService.bookRoom(req)
        );
        assertEquals("You have already booked this room for the selected date and time slot", ex.getMessage());
    }
}
