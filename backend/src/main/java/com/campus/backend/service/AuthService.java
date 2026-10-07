package com.campus.backend.service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.campus.backend.dto.LoginRequest;
import com.campus.backend.dto.RegisterRequest;
import com.campus.backend.entity.User;
import com.campus.backend.entity.ValidStudent;
import com.campus.backend.repository.UserRepository;
import com.campus.backend.repository.ValidStudentRepository;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final ValidStudentRepository validStudentRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, ValidStudentRepository validStudentRepository) {
        this.userRepository = userRepository;
        this.validStudentRepository = validStudentRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    @Transactional
    public User registerStudent(RegisterRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Registration request cannot be empty");
        }

        // 1. Validate all required fields
        if (request.getFullName() == null || request.getFullName().trim().isEmpty()) {
            throw new IllegalArgumentException("Full name is required");
        }
        if (request.getCollegeEmail() == null || request.getCollegeEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("College email is required");
        }
        if (request.getRegisterNumber() == null || request.getRegisterNumber().trim().isEmpty()) {
            throw new IllegalArgumentException("Register number is required");
        }
        if (request.getPassword() == null || request.getPassword().isEmpty()) {
            throw new IllegalArgumentException("Password is required");
        }
        if (request.getConfirmPassword() == null || request.getConfirmPassword().isEmpty()) {
            throw new IllegalArgumentException("Confirm password is required");
        }

        // 2. Password and confirmPassword must match
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        String regNumber = request.getRegisterNumber().trim();
        String collegeEmail = request.getCollegeEmail().trim();

        // 3. Check registerNumber exists in valid_students
        ValidStudent validStudent = validStudentRepository.findByRegisterNumber(regNumber)
                .orElseThrow(() -> new IllegalArgumentException("Invalid Register Number. Not found in university student records."));

        // 6. Reject duplicate registerNumber
        if (userRepository.existsByRegisterNumber(regNumber)) {
            throw new IllegalStateException("Register number is already registered");
        }

        // 7. Reject duplicate collegeEmail
        if (userRepository.existsByCollegeEmail(collegeEmail)) {
            throw new IllegalStateException("College email is already registered");
        }

        // 8. Hash password using BCrypt
        String hashedPassword = passwordEncoder.encode(request.getPassword());

        // 4, 5, 9, 10. Retrieve department and year strictly from valid_students, set role STUDENT, save user
        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setCollegeEmail(collegeEmail);
        user.setRegisterNumber(regNumber);
        user.setPassword(hashedPassword);
        user.setDepartment(validStudent.getDepartment());
        user.setYear(validStudent.getYear());
        user.setRole("STUDENT");

        return userRepository.save(user);
    }

    public Map<String, Object> login(LoginRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Login request cannot be empty");
        }
        if (request.getPassword() == null || request.getPassword().isEmpty()) {
            throw new IllegalArgumentException("Password is required");
        }

        User user = null;
        if (request.getRegisterNumber() != null && !request.getRegisterNumber().trim().isEmpty()) {
            String regNum = request.getRegisterNumber().trim();
            user = userRepository.findByRegisterNumber(regNum)
                    .orElseThrow(() -> new SecurityException("Invalid register number or password"));
        } else if (request.getCollegeEmail() != null && !request.getCollegeEmail().trim().isEmpty()) {
            String email = request.getCollegeEmail().trim();
            user = userRepository.findByCollegeEmail(email)
                    .orElseThrow(() -> new SecurityException("Invalid email or password"));
        } else {
            throw new IllegalArgumentException("Register number is required");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new SecurityException("Invalid register number or password");
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", user.getId());
        response.put("fullName", user.getFullName());
        response.put("collegeEmail", user.getCollegeEmail());
        response.put("registerNumber", user.getRegisterNumber());
        response.put("department", user.getDepartment());
        response.put("year", user.getYear());
        response.put("role", user.getRole());

        return response;
    }

    public Map<String, Object> adminLogin(LoginRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Login request cannot be empty");
        }
        if (request.getCollegeEmail() == null || request.getCollegeEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("College email is required");
        }
        if (request.getPassword() == null || request.getPassword().isEmpty()) {
            throw new IllegalArgumentException("Password is required");
        }

        String email = request.getCollegeEmail().trim();
        User user = userRepository.findByCollegeEmail(email)
                .orElseThrow(() -> new SecurityException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new SecurityException("Invalid email or password");
        }

        if (user.getRole() == null || !"ADMIN".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Admin role required");
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", user.getId());
        response.put("fullName", user.getFullName());
        response.put("collegeEmail", user.getCollegeEmail());
        response.put("role", user.getRole());

        return response;
    }

    public Map<String, Object> getStudentProfile(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID is required");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found with id: " + userId));

        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("fullName", user.getFullName());
        profile.put("collegeEmail", user.getCollegeEmail());
        profile.put("registerNumber", user.getRegisterNumber());
        profile.put("department", user.getDepartment());
        profile.put("year", user.getYear());

        return profile;
    }
}

