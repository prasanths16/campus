package com.campus.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.campus.backend.entity.EquipmentBooking;

@Repository
public interface EquipmentBookingRepository extends JpaRepository<EquipmentBooking, Long> {

    // Used by EquipmentService to guard deletion
    boolean existsByEquipmentId(Long equipmentId);

    // Used by EquipmentService.getAllEquipment() for global availability
    @Query("SELECT COALESCE(SUM(eb.quantity), 0) FROM EquipmentBooking eb " +
           "WHERE eb.equipmentId = :equipmentId AND eb.status IN :statuses")
    int sumBookedQuantityByEquipmentIdAndStatusIn(
            @Param("equipmentId") Long equipmentId,
            @Param("statuses") List<String> statuses);

    // Available quantity for a specific date + time slot (booking context)
    @Query("SELECT COALESCE(SUM(eb.quantity), 0) FROM EquipmentBooking eb " +
           "WHERE eb.equipmentId = :equipmentId AND eb.bookingDate = :bookingDate " +
           "AND eb.timeSlot = :timeSlot AND eb.status IN :statuses")
    int sumBookedQuantityBySlot(
            @Param("equipmentId") Long equipmentId,
            @Param("bookingDate") String bookingDate,
            @Param("timeSlot") String timeSlot,
            @Param("statuses") List<String> statuses);

    // Duplicate booking check for same student + same slot + same equipment
    boolean existsByUserIdAndEquipmentIdAndBookingDateAndTimeSlotAndStatusIn(
            Long userId, Long equipmentId, String bookingDate, String timeSlot, List<String> statuses);

    // My bookings
    List<EquipmentBooking> findByUserId(Long userId);

    // Analytics: all bookings for a specific date
    List<EquipmentBooking> findByBookingDateAndStatusIn(String bookingDate, List<String> statuses);

    // Analytics: all bookings for a date range
    @Query("SELECT eb FROM EquipmentBooking eb WHERE eb.bookingDate >= :fromDate " +
           "AND eb.bookingDate <= :toDate AND eb.status IN :statuses")
    List<EquipmentBooking> findByBookingDateBetweenAndStatusIn(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            @Param("statuses") List<String> statuses);
}
