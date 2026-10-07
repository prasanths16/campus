package com.campus.backend.controller;

import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.campus.backend.repository.ValidStudentRepository;
import com.campus.backend.service.AuthService;

@RestController
@RequestMapping("/api/student")
@CrossOrigin(origins = "*")
public class StudentController {

    private final AuthService authService;
    private final ValidStudentRepository validStudentRepository;

    public StudentController(AuthService authService, ValidStudentRepository validStudentRepository) {
        this.authService = authService;
        this.validStudentRepository = validStudentRepository;
    }

    /** Returns COUNT(*) from valid_students table. Used by Admin Dashboard. */
    @GetMapping("/count")
    public ResponseEntity<?> getValidStudentCount() {
        return ResponseEntity.ok(Map.of("count", validStudentRepository.count()));
    }

    @GetMapping("/profile/{userId}")
    public ResponseEntity<?> getProfile(@PathVariable Long userId) {
        try {
            Map<String, Object> profile = authService.getStudentProfile(userId);
            return ResponseEntity.ok(profile);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error",
                    "message", "An unexpected error occurred: " + e.getMessage()
            ));
        }
    }
}

