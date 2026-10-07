package com.campus.backend.dto;

public class RoomRequest {

    private String roomName;
    private String block;
    private Integer capacity;
    private String status;
    private String image;

    public RoomRequest() {
    }

    public String getRoomName() { return roomName; }
    public void setRoomName(String roomName) { this.roomName = roomName; }

    public String getBlock() { return block; }
    public void setBlock(String block) { this.block = block; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }
}
