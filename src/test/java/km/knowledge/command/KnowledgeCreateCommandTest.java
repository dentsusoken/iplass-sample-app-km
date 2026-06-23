/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.knowledge.command;

import static km.common.command.CommandTestHelper.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.Map;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.SelectValue;
import org.iplass.mtp.test.AuthUser;
import org.iplass.mtp.test.MTPJUnitTestExtension;
import org.iplass.mtp.test.MTPTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;

@ExtendWith(MTPJUnitTestExtension.class)
@DisplayName("KnowledgeCreateCommand")
class KnowledgeCreateCommandTest {

	private KnowledgeCreateCommand command;
	private RequestContext request;
	private EntityManager em;

	@BeforeEach
	void setUp() {
		command = new KnowledgeCreateCommand();
		request = mock(RequestContext.class);
		em = mock(EntityManager.class);
	}

	@Nested
	@DisplayName("validation")
	class Validation {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("returns VALIDATION_ERROR when name is empty")
		void errorWhenNameEmpty() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("name")).thenReturn("  ");
				when(request.getParam("content")).thenReturn("some content");
				when(request.getParam("visibility")).thenReturn("public");

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("ERROR", result);
				verifyErrorResponse(request, "VALIDATION_ERROR");
			}
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("returns VALIDATION_ERROR when content is empty")
		void errorWhenContentEmpty() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("name")).thenReturn("Test Knowledge");
				when(request.getParam("content")).thenReturn(null);
				when(request.getParam("visibility")).thenReturn("public");

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("ERROR", result);
				verifyErrorResponse(request, "VALIDATION_ERROR");
			}
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("returns VALIDATION_ERROR when visibility is invalid")
		void errorWhenVisibilityInvalid() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("name")).thenReturn("Test Knowledge");
				when(request.getParam("content")).thenReturn("some content");
				when(request.getParam("visibility")).thenReturn("unknown");

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("ERROR", result);
				verifyErrorResponse(request, "VALIDATION_ERROR");
			}
		}
	}

	@Nested
	@DisplayName("authorization")
	class Authorization {

		@Test
		@AuthUser(userId = "testuser", password = "testuser")
		@DisplayName("returns FORBIDDEN_NOT_RESPONDER when non-responder accesses")
		void errorWhenNotResponder() {
			try (var dao = mockEntityDaoHelper(em, false)) {
				String result = MTPTest.invokeCommand(command, request);

				assertEquals("ERROR", result);
				verifyErrorResponse(request, "FORBIDDEN_NOT_RESPONDER");
			}
		}
	}

	@Nested
	@DisplayName("successful creation")
	class SuccessfulCreation {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("creates knowledge with all fields and returns OID")
		@SuppressWarnings("unchecked")
		void createsWithAllFields() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("name")).thenReturn("Test Knowledge");
				when(request.getParam("content")).thenReturn("Knowledge content");
				when(request.getParam("visibility")).thenReturn("public");
				when(request.getParams("tagOids")).thenReturn(new String[] {"tag001", "tag002"});
				when(request.getParams("relatedInquiryOids")).thenReturn(new String[] {"inq001"});
				when(em.insert(any(Entity.class))).thenReturn("kb001");

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("SUCCESS", result);

				// 正しい値でエンティティが登録されたことを検証
				ArgumentCaptor<Entity> entityCaptor = ArgumentCaptor.forClass(Entity.class);
				verify(em).insert(entityCaptor.capture());

				Entity entity = entityCaptor.getValue();
				assertEquals("Test Knowledge", entity.getName());
				assertEquals("Knowledge content", entity.getValue("content"));
				SelectValue vis = entity.getValue("visibility");
				assertEquals("public", vis.getValue());

				Entity[] tags = entity.getValue("tags");
				assertNotNull(tags);
				assertEquals(2, tags.length);
				assertEquals("tag001", tags[0].getOid());
				assertEquals("tag002", tags[1].getOid());

				Entity[] inquiries = entity.getValue("relatedInquiries");
				assertNotNull(inquiries);
				assertEquals(1, inquiries.length);
				assertEquals("inq001", inquiries[0].getOid());

				// レスポンスに作成された OID が含まれることを検証
				ArgumentCaptor<Map<String, Object>> responseCaptor = ArgumentCaptor.forClass(Map.class);
				verify(request).setAttribute(eq("result"), responseCaptor.capture());
				Map<String, Object> response = responseCaptor.getValue();
				assertEquals("SUCCESS", response.get("status"));
				Map<String, Object> data = (Map<String, Object>) response.get("data");
				assertEquals("kb001", data.get("oid"));
			}
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("creates knowledge without optional fields")
		void createsWithoutOptionalFields() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("name")).thenReturn("Minimal Knowledge");
				when(request.getParam("content")).thenReturn("Minimal content");
				when(request.getParam("visibility")).thenReturn("internal");
				when(request.getParams("tagOids")).thenReturn(null);
				when(request.getParams("relatedInquiryOids")).thenReturn(null);
				when(em.insert(any(Entity.class))).thenReturn("kb002");

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("SUCCESS", result);

				ArgumentCaptor<Entity> entityCaptor = ArgumentCaptor.forClass(Entity.class);
				verify(em).insert(entityCaptor.capture());

				Entity entity = entityCaptor.getValue();
				assertEquals("Minimal Knowledge", entity.getName());
				SelectValue vis = entity.getValue("visibility");
				assertEquals("internal", vis.getValue());
				assertNull(entity.getValue("tags"));
				assertNull(entity.getValue("relatedInquiries"));
			}
		}
	}
}
