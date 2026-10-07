package com.campus.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.campus.backend.entity.RoomBooking;

@Repository
public interface RoomBookingRepository extends JpaRepository<RoomBooking, Long> {

    // Used by RoomService to guard deletion
    boolean existsByRoomId(Long roomId);

    // Count active bookings for a specific slot (capacity check)
    @Query("SELECT COUNT(rb) FROM RoomBooking rb " +
           "WHERE rb.roomId = :roomId AND rb.bookingDate = :bookingDate " +
           "AND rb.timeSlot = :timeSlot AND rb.status IN :statuses")
    int countByRoomIdAndBookingDateAndTimeSlotAndStatusIn(
            @Param("roomId") Long roomId,
            @Param("bookingDate") String bookingDate,
            @Param("timeSlot") String timeSlot,
            @Param("statuses") List<String> statuses);

    // Duplicate booking check for same student
    boolean existsByUserIdAndRoomIdAndBookingDateAndTimeSlotAndStatusIn(
            Long userId, Long roomId, String bookingDate, String timeSlot, List<String> statuses);

    // My bookings
    List<RoomBooking> findByUserId(Long userId);

    // Analytics: all bookings for a specific date with given statuses
    List<RoomBooking> findByBookingDateAndStatusIn(String bookingDate, List<String> statuses);

    // Analytics: all bookings for a date range
    @Query("SELECT rb FROM RoomBooking rb WHERE rb.bookingDate >= :fromDate " +
           "AND rb.bookingDate <= :toDate AND rb.status IN :statuses")
    List<RoomBooking> findByBookingDateBetweenAndStatusIn(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            @Param("statuses") List<String> statuses);
}
