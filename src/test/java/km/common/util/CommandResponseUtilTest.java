/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.common.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

@DisplayName("CommandResponseUtil")
class CommandResponseUtilTest {

	@Nested
	@DisplayName("successResponse")
	class SuccessResponse {

		@Test
		@DisplayName("returns map with status=SUCCESS and data")
		void returnsSuccessWithData() {
			Map<String, Object> result = CommandResponseUtil.successResponse("testData");
			assertEquals("SUCCESS", result.get("status"));
			assertEquals("testData", result.get("data"));
		}

		@Test
		@DisplayName("handles null data")
		void handlesNullData() {
			Map<String, Object> result = CommandResponseUtil.successResponse(null);
			assertEquals("SUCCESS", result.get("status"));
			assertNull(result.get("data"));
		}
	}

	@Nested
	@DisplayName("successListResponse")
	class SuccessListResponse {

		@Test
		@DisplayName("returns map with pagination fields")
		void returnsPaginatedResponse() {
			List<String> data = List.of("a", "b");
			Map<String, Object> result = CommandResponseUtil.successListResponse(data, 100, 20, 10);
			assertEquals("SUCCESS", result.get("status"));
			assertEquals(data, result.get("data"));
			assertEquals(100, result.get("totalCount"));
			assertEquals(20, result.get("offset"));
			assertEquals(10, result.get("limit"));
		}
	}

	@Nested
	@DisplayName("errorResponse")
	class ErrorResponse {

		@Test
		@DisplayName("returns map with status=ERROR, errorCode and message")
		void returnsErrorWithCode() {
			Map<String, Object> result = CommandResponseUtil.errorResponse("NOT_FOUND", "Item not found");
			assertEquals("ERROR", result.get("status"));
			assertEquals("NOT_FOUND", result.get("errorCode"));
			assertEquals("Item not found", result.get("message"));
		}
	}
}
