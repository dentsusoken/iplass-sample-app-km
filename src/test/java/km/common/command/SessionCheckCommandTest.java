/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.common.command;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.Map;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.test.MTPJUnitTestExtension;
import org.iplass.mtp.test.MTPTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;

@ExtendWith(MTPJUnitTestExtension.class)
@DisplayName("SessionCheckCommand")
class SessionCheckCommandTest {

	private SessionCheckCommand command;
	private RequestContext request;

	@BeforeEach
	void setUp() {
		command = new SessionCheckCommand();
		request = mock(RequestContext.class);
	}

	@Test
	@DisplayName("returns success response for authenticated session")
	@SuppressWarnings("unchecked")
	void returnsSuccess() {
		String result = MTPTest.invokeCommand(command, request);

		assertEquals("SUCCESS", result);

		ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
		verify(request).setAttribute(eq("result"), captor.capture());

		Map<String, Object> response = captor.getValue();
		assertEquals("SUCCESS", response.get("status"));
		assertNull(response.get("data"));
	}
}
