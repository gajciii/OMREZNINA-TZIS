package feri.um.si.omreznina.prediction;

import feri.um.si.omreznina.exceptions.UserException;
import feri.um.si.omreznina.service.PredictionService;
import feri.um.si.omreznina.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.*;
import org.springframework.web.client.RestTemplate;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import java.util.HashMap;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PredictionServiceTest {

    @InjectMocks
    private PredictionService predictionService;

    @Mock
    private UserService userService;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(restTemplate.postForObject(
            eq("http://127.0.0.1:8003/detailed_stats"),
            any(), 
            eq(Object.class))
        ).thenReturn("MOCKED_RESPONSE");
    }

    @Test
    void testSuccess() throws UserException {
        when(userService.getClientLocation(request)).thenReturn(Map.of("latitude", 1.0, "longitude", 2.0));
        Map<String, Object> monthMap = Map.of("a", 1);
        Map<String, Object> yearMap = Map.of("06", monthMap);
        Map<String, Object> prekor = Map.of("2024", yearMap);
        when(userService.getUserDataForML("u", request)).thenReturn(Map.of("prekoracitve", prekor));
        Object result = predictionService.getMonthlyOverrunPrediction("u", "2025", "06", request);
        assertEquals("MOCKED_RESPONSE", result);
        verify(restTemplate).postForObject(eq("http://127.0.0.1:8003/detailed_stats"),
                argThat(body -> body instanceof Map<?, ?> payload && Double.valueOf(1.0).equals(payload.get("lat"))
                        && Double.valueOf(2.0).equals(payload.get("lon"))), eq(Object.class));
    }

    @Test
    void testNoData() throws UserException {
        when(userService.getClientLocation(request)).thenReturn(null);
        Map<String, Object> map = new HashMap<>();
        map.put("prekoracitve", null);
        when(userService.getUserDataForML("u", request)).thenReturn(map);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                predictionService.getMonthlyOverrunPrediction("u", "2025", "06", request)
        );
        assertEquals("Ni podatkov o prekorčitvah.", ex.getMessage());
    }

    @Test
    void testUserException() throws UserException {
        when(userService.getClientLocation(request)).thenReturn(null);
        when(userService.getUserDataForML("u", request)).thenThrow(new UserException("no user"));

        UserException ex = assertThrows(UserException.class, () ->
                predictionService.getMonthlyOverrunPrediction("u", "2025", "06", request)
        );
        assertEquals("no user", ex.getMessage());
    }
}
