package feri.um.si.omreznina.config;

import feri.um.si.omreznina.service.UserService;
import feri.um.si.omreznina.service.WeatherService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class LocalConfigurationTest {
    @Test
    void locationUsesConfiguredCoordinatesWithoutExternalRequest() {
        UserService service = new UserService(null, null);
        ReflectionTestUtils.setField(service, "defaultLatitude", 46.55);
        ReflectionTestUtils.setField(service, "defaultLongitude", 15.65);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.10");
        request.addHeader("X-Forwarded-For", "8.8.8.8");

        assertEquals(Map.of("latitude", 46.55, "longitude", 15.65), service.getClientLocation(request));
    }

    @Test
    void weatherWithoutOptionalApiKeyReturnsNoReading() {
        assertNull(new WeatherService().getWeatherInfo(46.05, 14.5));
    }
}
