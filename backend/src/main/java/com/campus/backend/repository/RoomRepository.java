package com.campus.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.campus.backend.entity.Room;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
}
