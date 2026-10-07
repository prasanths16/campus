package com.campus.backend.dto;

public class EquipmentResponse {

    private Long id;
    private String equipmentName;
    private int totalQuantity;
    private int availableQuantity;

    public EquipmentResponse() {
    }

    public EquipmentResponse(Long id, String equipmentName, int totalQuantity, int availableQuantity) {
        this.id = id;
        this.equipmentName = equipmentName;
        this.totalQuantity = totalQuantity;
        this.availableQuantity = availableQuantity;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEquipmentName() { return equipmentName; }
    public void setEquipmentName(String equipmentName) { this.equipmentName = equipmentName; }

    public int getTotalQuantity() { return totalQuantity; }
    public void setTotalQuantity(int totalQuantity) { this.totalQuantity = totalQuantity; }

    public int getAvailableQuantity() { return availableQuantity; }
    public void setAvailableQuantity(int availableQuantity) { this.availableQuantity = availableQuantity; }
}
