package com.campus.backend.controller;

import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.campus.backend.dto.EquipmentBookingRequest;
import com.campus.backend.dto.RoomBookingRequest;
import com.campus.backend.service.BookingService;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    // ── Room Booking ──────────────────────────────────────────────────────────

    @PostMapping("/room")
    public ResponseEntity<?> bookRoom(@RequestBody RoomBookingRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.bookRoom(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "status", "error", "message", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "status", "error", "message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "status", "error", "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error", "message", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    @PutMapping("/room/{id}/cancel")
    public ResponseEntity<?> cancelRoomBooking(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(bookingService.cancelRoomBooking(id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "status", "error", "message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "status", "error", "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error", "message", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    // ── Equipment Booking ─────────────────────────────────────────────────────

    @PostMapping("/equipment")
    public ResponseEntity<?> bookEquipment(@RequestBody EquipmentBookingRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.bookEquipment(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "status", "error", "message", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "status", "error", "message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "status", "error", "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error", "message", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    @PutMapping("/equipment/{id}/cancel")
    public ResponseEntity<?> cancelEquipmentBooking(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(bookingService.cancelEquipmentBooking(id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "status", "error", "message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "status", "error", "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error", "message", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    // ── My Bookings ───────────────────────────────────────────────────────────

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserBookings(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(bookingService.getUserBookings(userId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "status", "error", "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error", "message", "An unexpected error occurred: " + e.getMessage()));
        }
    }
}
