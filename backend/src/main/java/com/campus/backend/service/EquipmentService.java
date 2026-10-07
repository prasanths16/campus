package com.campus.backend.service;

import java.util.Arrays;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.campus.backend.dto.EquipmentRequest;
import com.campus.backend.dto.EquipmentResponse;
import com.campus.backend.entity.Equipment;
import com.campus.backend.repository.EquipmentBookingRepository;
import com.campus.backend.repository.EquipmentRepository;

@Service
public class EquipmentService {

    // Active statuses that consume quantity
    private static final List<String> ACTIVE_STATUSES = Arrays.asList("BOOKED", "PENDING");

    private final EquipmentRepository equipmentRepository;
    private final EquipmentBookingRepository equipmentBookingRepository;

    public EquipmentService(EquipmentRepository equipmentRepository,
                            EquipmentBookingRepository equipmentBookingRepository) {
        this.equipmentRepository = equipmentRepository;
        this.equipmentBookingRepository = equipmentBookingRepository;
    }

    public List<EquipmentResponse> getAllEquipment() {
        return equipmentRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public EquipmentResponse addEquipment(EquipmentRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        if (request.getEquipmentName() == null || request.getEquipmentName().trim().isEmpty()) {
            throw new IllegalArgumentException("Equipment name is required");
        }
        if (request.getTotalQuantity() == null) {
            throw new IllegalArgumentException("Total quantity is required");
        }
        if (request.getTotalQuantity() <= 0) {
            throw new IllegalArgumentException("Total quantity must be greater than 0");
        }
        if (equipmentRepository.existsByEquipmentName(request.getEquipmentName().trim())) {
            throw new IllegalStateException("Equipment with this name already exists");
        }

        Equipment equipment = new Equipment();
        equipment.setEquipmentName(request.getEquipmentName().trim());
        equipment.setTotalQuantity(request.getTotalQuantity());

        return toResponse(equipmentRepository.save(equipment));
    }

    @Transactional
    public EquipmentResponse updateEquipment(Long id, EquipmentRequest request) {
        Equipment equipment = equipmentRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Equipment not found with id: " + id));

        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        if (request.getTotalQuantity() != null) {
            if (request.getTotalQuantity() <= 0) {
                throw new IllegalArgumentException("Total quantity must be greater than 0");
            }
            equipment.setTotalQuantity(request.getTotalQuantity());
        }
        if (request.getEquipmentName() != null && !request.getEquipmentName().trim().isEmpty()) {
            String newName = request.getEquipmentName().trim();
            if (!newName.equals(equipment.getEquipmentName())
                    && equipmentRepository.existsByEquipmentName(newName)) {
                throw new IllegalStateException("Equipment with this name already exists");
            }
            equipment.setEquipmentName(newName);
        }

        return toResponse(equipmentRepository.save(equipment));
    }

    @Transactional
    public void deleteEquipment(Long id) {
        if (!equipmentRepository.existsById(id)) {
            throw new NoSuchElementException("Equipment not found with id: " + id);
        }
        if (equipmentBookingRepository.existsByEquipmentId(id)) {
            throw new IllegalStateException("Equipment has existing bookings. Cannot delete.");
        }
        equipmentRepository.deleteById(id);
    }

    private EquipmentResponse toResponse(Equipment equipment) {
        int booked = equipmentBookingRepository.sumBookedQuantityByEquipmentIdAndStatusIn(
                equipment.getId(), ACTIVE_STATUSES);
        int available = Math.max(0, equipment.getTotalQuantity() - booked);
        return new EquipmentResponse(equipment.getId(), equipment.getEquipmentName(),
                equipment.getTotalQuantity(), available);
    }
}
