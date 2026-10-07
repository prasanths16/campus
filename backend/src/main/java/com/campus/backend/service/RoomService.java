package com.campus.backend.service;

import java.util.List;
import java.util.NoSuchElementException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.campus.backend.dto.RoomRequest;
import com.campus.backend.entity.Room;
import com.campus.backend.repository.RoomBookingRepository;
import com.campus.backend.repository.RoomRepository;

@Service
public class RoomService {

    private static final String STATUS_AVAILABLE = "AVAILABLE";
    private static final String STATUS_UNAVAILABLE = "UNAVAILABLE";

    private final RoomRepository roomRepository;
    private final RoomBookingRepository roomBookingRepository;

    public RoomService(RoomRepository roomRepository, RoomBookingRepository roomBookingRepository) {
        this.roomRepository = roomRepository;
        this.roomBookingRepository = roomBookingRepository;
    }

    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    public Room getRoomById(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Room not found with id: " + id));
    }

    @Transactional
    public Room addRoom(RoomRequest request) {
        validateRoomRequest(request, true);

        Room room = new Room();
        room.setRoomName(request.getRoomName().trim());
        room.setBlock(request.getBlock() != null ? request.getBlock().trim() : null);
        room.setCapacity(request.getCapacity());
        room.setStatus(request.getStatus().toUpperCase());
        room.setImage(request.getImage());

        return roomRepository.save(room);
    }

    @Transactional
    public Room updateRoom(Long id, RoomRequest request) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Room not found with id: " + id));

        if (request.getRoomName() != null && !request.getRoomName().trim().isEmpty()) {
            room.setRoomName(request.getRoomName().trim());
        }
        if (request.getBlock() != null) {
            room.setBlock(request.getBlock().trim());
        }
        if (request.getCapacity() != null) {
            if (request.getCapacity() <= 0) {
                throw new IllegalArgumentException("Capacity must be greater than 0");
            }
            room.setCapacity(request.getCapacity());
        }
        if (request.getStatus() != null) {
            String s = request.getStatus().toUpperCase();
            if (!STATUS_AVAILABLE.equals(s) && !STATUS_UNAVAILABLE.equals(s)) {
                throw new IllegalArgumentException("Status must be AVAILABLE or UNAVAILABLE");
            }
            room.setStatus(s);
        }
        if (request.getImage() != null) {
            room.setImage(request.getImage());
        }

        return roomRepository.save(room);
    }

    @Transactional
    public void deleteRoom(Long id) {
        if (!roomRepository.existsById(id)) {
            throw new NoSuchElementException("Room not found with id: " + id);
        }
        if (roomBookingRepository.existsByRoomId(id)) {
            throw new IllegalStateException("Room has existing bookings. Cannot delete.");
        }
        roomRepository.deleteById(id);
    }

    private void validateRoomRequest(RoomRequest request, boolean requireAll) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        if (requireAll) {
            if (request.getRoomName() == null || request.getRoomName().trim().isEmpty()) {
                throw new IllegalArgumentException("Room name is required");
            }
            if (request.getCapacity() == null) {
                throw new IllegalArgumentException("Capacity is required");
            }
            if (request.getStatus() == null || request.getStatus().trim().isEmpty()) {
                throw new IllegalArgumentException("Status is required");
            }
        }
        if (request.getCapacity() != null && request.getCapacity() <= 0) {
            throw new IllegalArgumentException("Capacity must be greater than 0");
        }
        if (request.getStatus() != null) {
            String s = request.getStatus().toUpperCase();
            if (!STATUS_AVAILABLE.equals(s) && !STATUS_UNAVAILABLE.equals(s)) {
                throw new IllegalArgumentException("Status must be AVAILABLE or UNAVAILABLE");
            }
        }
    }
}
