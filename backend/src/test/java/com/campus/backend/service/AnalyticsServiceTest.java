package com.campus.backend.service;

import java.util.Collections;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import com.campus.backend.repository.EquipmentBookingRepository;
import com.campus.backend.repository.EquipmentRepository;
import com.campus.backend.repository.RoomBookingRepository;
import com.campus.backend.repository.RoomRepository;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AnalyticsServiceTest {

    @Mock
    private RoomBookingRepository roomBookingRepository;

    @Mock
    private EquipmentBookingRepository equipmentBookingRepository;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private EquipmentRepository equipmentRepository;

    private AnalyticsService analyticsService;

    @BeforeEach
    void setUp() {
        analyticsService = new AnalyticsService(
                roomBookingRepository,
                equipmentBookingRepository,
                roomRepository,
                equipmentRepository
        );
    }

    @Test
    void getDailyAnalytics_returnsConsistentRequestedDate() {
        when(roomBookingRepository.findByBookingDateAndStatusIn(anyString(), anyList())).thenReturn(Collections.emptyList());
        when(equipmentBookingRepository.findByBookingDateAndStatusIn(anyString(), anyList())).thenReturn(Collections.emptyList());
        when(roomBookingRepository.findByBookingDateBetweenAndStatusIn(anyString(), anyString(), anyList())).thenReturn(Collections.emptyList());
        when(equipmentBookingRepository.findByBookingDateBetweenAndStatusIn(anyString(), anyString(), anyList())).thenReturn(Collections.emptyList());

        Map<String, Object> result = analyticsService.getDailyAnalytics("2026-10-11");

        assertNotNull(result);
        assertEquals("2026-10-11", result.get("date"));
    }

    @Test
    void getWeeklyAnalytics_thisWeek_parsesCorrectly() {
        when(roomBookingRepository.findByBookingDateBetweenAndStatusIn(anyString(), anyString(), anyList())).thenReturn(Collections.emptyList());
        when(equipmentBookingRepository.findByBookingDateBetweenAndStatusIn(anyString(), anyString(), anyList())).thenReturn(Collections.emptyList());

        Map<String, Object> result = analyticsService.getWeeklyAnalytics("this-week");

        assertNotNull(result);
        assertEquals("this-week", result.get("requestedWeek"));
        assertNotNull(result.get("from"));
        assertNotNull(result.get("to"));
    }

    @Test
    void getWeeklyAnalytics_previousWeek_parsesCorrectly() {
        when(roomBookingRepository.findByBookingDateBetweenAndStatusIn(anyString(), anyString(), anyList())).thenReturn(Collections.emptyList());
        when(equipmentBookingRepository.findByBookingDateBetweenAndStatusIn(anyString(), anyString(), anyList())).thenReturn(Collections.emptyList());

        Map<String, Object> result = analyticsService.getWeeklyAnalytics("previous-week");

        assertNotNull(result);
        assertEquals("previous-week", result.get("requestedWeek"));
        assertNotNull(result.get("from"));
        assertNotNull(result.get("to"));
    }
}
