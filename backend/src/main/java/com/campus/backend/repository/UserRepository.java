package com.campus.backend.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.campus.backend.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByRegisterNumber(String registerNumber);
    boolean existsByCollegeEmail(String collegeEmail);
    Optional<User> findByRegisterNumber(String registerNumber);
    Optional<User> findByCollegeEmail(String collegeEmail);
}
