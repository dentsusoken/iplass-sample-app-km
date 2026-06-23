/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.common.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.iplass.mtp.command.RequestContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

@DisplayName("CommandRequestUtil")
class CommandRequestUtilTest {

	@Nested
	@DisplayName("getIntParam")
	class GetIntParam {

		@Test
		@DisplayName("null パラメータはデフォルト値を返す")
		void returnsDefaultForNull() {
			RequestContext request = mock(RequestContext.class);
			when(request.getParam("limit")).thenReturn(null);

			assertEquals(20, CommandRequestUtil.getIntParam(request, "limit", 20));
		}

		@Test
		@DisplayName("空文字パラメータはデフォルト値を返す")
		void returnsDefaultForEmpty() {
			RequestContext request = mock(RequestContext.class);
			when(request.getParam("limit")).thenReturn("");

			assertEquals(20, CommandRequestUtil.getIntParam(request, "limit", 20));
		}

		@Test
		@DisplayName("数値文字列はパースした int を返す")
		void returnsParsedValue() {
			RequestContext request = mock(RequestContext.class);
			when(request.getParam("limit")).thenReturn("50");

			assertEquals(50, CommandRequestUtil.getIntParam(request, "limit", 20));
		}

		@Test
		@DisplayName("非数値パラメータはデフォルト値を返す")
		void returnsDefaultForNonNumeric() {
			RequestContext request = mock(RequestContext.class);
			when(request.getParam("limit")).thenReturn("abc");

			assertEquals(20, CommandRequestUtil.getIntParam(request, "limit", 20));
		}
	}

	@Nested
	@DisplayName("getParam")
	class GetParam {

		@Test
		@DisplayName("null パラメータはデフォルト値を返す")
		void returnsDefaultForNull() {
			RequestContext request = mock(RequestContext.class);
			when(request.getParam("status")).thenReturn(null);

			assertEquals("Open", CommandRequestUtil.getParam(request, "status", "Open"));
		}

		@Test
		@DisplayName("値があればその値を返す")
		void returnsActualValue() {
			RequestContext request = mock(RequestContext.class);
			when(request.getParam("status")).thenReturn("Resolved");

			assertEquals("Resolved", CommandRequestUtil.getParam(request, "status", "Open"));
		}
	}
}
