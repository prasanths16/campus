package com.campus.backend.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.campus.backend.entity.ValidStudent;

@Repository
public interface ValidStudentRepository extends JpaRepository<ValidStudent, Long> {
    Optional<ValidStudent> findByRegisterNumber(String registerNumber);
    boolean existsByRegisterNumber(String registerNumber);
}
