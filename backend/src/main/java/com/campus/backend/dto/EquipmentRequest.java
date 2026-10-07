package com.campus.backend.dto;

public class EquipmentRequest {

    private String equipmentName;
    private Integer totalQuantity;

    public EquipmentRequest() {
    }

    public String getEquipmentName() { return equipmentName; }
    public void setEquipmentName(String equipmentName) { this.equipmentName = equipmentName; }

    public Integer getTotalQuantity() { return totalQuantity; }
    public void setTotalQuantity(Integer totalQuantity) { this.totalQuantity = totalQuantity; }
}
