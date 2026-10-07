package com.campus.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.campus.backend.service.AnalyticsService;

@RestController
@RequestMapping("/api/admin/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    /**
     * GET /api/admin/analytics/daily?date=2026-10-01
     */
    @GetMapping("/daily")
    public ResponseEntity<?> getDailyAnalytics(@RequestParam String date) {
        try {
            return ResponseEntity.ok(analyticsService.getDailyAnalytics(date));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "status", "error", "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error", "message", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    /**
     * GET /api/admin/analytics/weekly?week=2026-W40
     */
    @GetMapping("/weekly")
    public ResponseEntity<?> getWeeklyAnalytics(@RequestParam String week) {
        try {
            return ResponseEntity.ok(analyticsService.getWeeklyAnalytics(week));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "status", "error", "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error", "message", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    /**
     * GET /api/admin/analytics/recent-activity
     * Returns the 10 most recent booking/cancellation events (room + equipment), newest first.
     */
    @GetMapping("/recent-activity")
    public ResponseEntity<?> getRecentActivity() {
        try {
            List<Map<String, Object>> activity = analyticsService.getRecentActivity();
            return ResponseEntity.ok(activity);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error", "message", "An unexpected error occurred: " + e.getMessage()));
        }
    }
}
