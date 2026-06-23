/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.common.command;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import org.iplass.mtp.auth.AuthContext;
import org.iplass.mtp.auth.AuthManager;
import org.iplass.mtp.auth.User;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.test.MTPJUnitTestExtension;
import org.iplass.mtp.test.MTPTest;
import org.iplass.mtp.util.StringUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(MTPJUnitTestExtension.class)
@DisplayName("AuthSessionCommand")
class AuthSessionCommandTest {

	private AuthSessionCommand command;
	private RequestContext request;

	@BeforeEach
	void setUp() {
		command = new AuthSessionCommand();
		request = mock(RequestContext.class);
	}

	@Test
	@DisplayName("returns user info and inquiry_user role for non-responder")
	void returnsUserRole() {
		AuthManager mockAM = mock(AuthManager.class);
		AuthContext mockCtx = mock(AuthContext.class);
		User mockUser = mock(User.class);
		when(mockUser.getOid()).thenReturn("user001");
		when(mockUser.getName()).thenReturn("Tanaka Taro");
		when(mockCtx.getUser()).thenReturn(mockUser);
		when(mockCtx.userInRole("inquiry_responder")).thenReturn(false);
		when(mockAM.getContext()).thenReturn(mockCtx);
		MTPTest.setManagerMock(AuthManager.class, mockAM);

		String result = MTPTest.invokeCommand(command, request);

		assertEquals("SUCCESS", result);
		verify(request).setAttribute("userOid", "user001");
		verify(request).setAttribute("userName", StringUtil.escapeJavaScript("Tanaka Taro"));
		verify(request).setAttribute("roleName", "inquiry_user");
	}

	@Test
	@DisplayName("returns inquiry_responder role for responder user")
	void returnsResponderRole() {
		AuthManager mockAM = mock(AuthManager.class);
		AuthContext mockCtx = mock(AuthContext.class);
		User mockUser = mock(User.class);
		when(mockUser.getOid()).thenReturn("resp001");
		when(mockUser.getName()).thenReturn("Support Staff");
		when(mockCtx.getUser()).thenReturn(mockUser);
		when(mockCtx.userInRole("inquiry_responder")).thenReturn(true);
		when(mockAM.getContext()).thenReturn(mockCtx);
		MTPTest.setManagerMock(AuthManager.class, mockAM);

		String result = MTPTest.invokeCommand(command, request);

		assertEquals("SUCCESS", result);
		verify(request).setAttribute("userOid", "resp001");
		verify(request).setAttribute("userName", StringUtil.escapeJavaScript("Support Staff"));
		verify(request).setAttribute("roleName", "inquiry_responder");
	}

	@Test
	@DisplayName("escapes JavaScript special characters in user name")
	void escapesUserName() {
		AuthManager mockAM = mock(AuthManager.class);
		AuthContext mockCtx = mock(AuthContext.class);
		User mockUser = mock(User.class);
		when(mockUser.getOid()).thenReturn("user002");
		when(mockUser.getName()).thenReturn("O'Brien");
		when(mockCtx.getUser()).thenReturn(mockUser);
		when(mockCtx.userInRole("inquiry_responder")).thenReturn(false);
		when(mockAM.getContext()).thenReturn(mockCtx);
		MTPTest.setManagerMock(AuthManager.class, mockAM);

		MTPTest.invokeCommand(command, request);

		verify(request).setAttribute("userName", StringUtil.escapeJavaScript("O'Brien"));
	}
}
