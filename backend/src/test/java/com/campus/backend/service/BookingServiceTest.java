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
    void cancelRoomBooking_within30Minutes_throwsException() {
        RoomBooking booking = new RoomBooking();
        booking.setId(1L);
        booking.setStatus("BOOKED");
        booking.setCreatedAt(LocalDateTime.now(campusZone).minusMinutes(10));

        when(roomBookingRepository.findById(1L)).thenReturn(Optional.of(booking));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                bookingService.cancelRoomBooking(1L)
        );
        assertEquals("Bookings cannot be cancelled within the first 30 minutes of creation.", ex.getMessage());
    }

    @Test
    void cancelRoomBooking_after30Minutes_succeeds() {
        RoomBooking booking = new RoomBooking();
        booking.setId(1L);
        booking.setRoomId(10L);
        booking.setStatus("BOOKED");
        booking.setCreatedAt(LocalDateTime.now(campusZone).minusMinutes(35));

        when(roomBookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(roomBookingRepository.save(any(RoomBooking.class))).thenAnswer(i -> i.getArgument(0));

        RoomBooking result = bookingService.cancelRoomBooking(1L);

        assertEquals("CANCELLED", result.getStatus());
        verify(roomBookingRepository).save(booking);
    }

    @Test
    void cancelRoomBooking_alreadyCancelled_throwsException() {
        RoomBooking booking = new RoomBooking();
        booking.setId(1L);
        booking.setStatus("CANCELLED");
        booking.setCreatedAt(LocalDateTime.now(campusZone).minusMinutes(40));

        when(roomBookingRepository.findById(1L)).thenReturn(Optional.of(booking));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                bookingService.cancelRoomBooking(1L)
        );
        assertEquals("Booking is already cancelled.", ex.getMessage());
    }

    @Test
    void cancelEquipmentBooking_within30Minutes_throwsException() {
        EquipmentBooking booking = new EquipmentBooking();
        booking.setId(2L);
        booking.setStatus("PENDING");
        booking.setCreatedAt(LocalDateTime.now(campusZone).minusMinutes(5));

        when(equipmentBookingRepository.findById(2L)).thenReturn(Optional.of(booking));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                bookingService.cancelEquipmentBooking(2L)
        );
        assertEquals("Bookings cannot be cancelled within the first 30 minutes of creation.", ex.getMessage());
    }

    @Test
    void cancelEquipmentBooking_after30Minutes_succeeds() {
        EquipmentBooking booking = new EquipmentBooking();
        booking.setId(2L);
        booking.setEquipmentId(20L);
        booking.setStatus("BOOKED");
        booking.setCreatedAt(LocalDateTime.now(campusZone).minusMinutes(31));

        when(equipmentBookingRepository.findById(2L)).thenReturn(Optional.of(booking));
        when(equipmentBookingRepository.save(any(EquipmentBooking.class))).thenAnswer(i -> i.getArgument(0));

        EquipmentBooking result = bookingService.cancelEquipmentBooking(2L);

        assertEquals("CANCELLED", result.getStatus());
        verify(equipmentBookingRepository).save(booking);
    }
}
