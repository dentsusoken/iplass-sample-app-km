/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.knowledge.command;

import static km.common.command.CommandTestHelper.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.GenericEntity;
import org.iplass.mtp.entity.SelectValue;
import org.iplass.mtp.entity.UpdateOption;
import org.iplass.mtp.test.AuthUser;
import org.iplass.mtp.test.MTPJUnitTestExtension;
import org.iplass.mtp.test.MTPTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(MTPJUnitTestExtension.class)
@DisplayName("KnowledgeUpdateCommand")
class KnowledgeUpdateCommandTest {

	private KnowledgeUpdateCommand command;
	private RequestContext request;
	private EntityManager em;

	@BeforeEach
	void setUp() {
		command = new KnowledgeUpdateCommand();
		request = mock(RequestContext.class);
		em = mock(EntityManager.class);
	}

	@Nested
	@DisplayName("アクセス制御")
	class AccessControl {

		@Test
		@AuthUser(userId = "testuser", password = "testuser")
		@DisplayName("回答者以外はFORBIDDEN_NOT_RESPONDER")
		void errorWhenNotResponder() {
			try (var dao = mockEntityDaoHelper(em, false)) {
				String result = MTPTest.invokeCommand(command, request);

				assertEquals("ERROR", result);
				verifyErrorResponse(request, "FORBIDDEN_NOT_RESPONDER");
			}
		}
	}

	@Nested
	@DisplayName("エラー条件")
	class ErrorConditions {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("存在しないOIDはKNOWLEDGE_NOT_FOUND")
		void errorWhenNotFound() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("oid")).thenReturn("know999");
				when(em.loadAndLock("know999", "km.knowledge.Knowledge")).thenReturn(null);

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("ERROR", result);
				verifyErrorResponse(request, "KNOWLEDGE_NOT_FOUND");
			}
		}
	}

	@Nested
	@DisplayName("バリデーション")
	class Validation {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("name空はVALIDATION_ERROR")
		void errorWhenNameEmpty() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("oid")).thenReturn("know001");

				Entity knowledge = new GenericEntity("km.knowledge.Knowledge");
				knowledge.setOid("know001");
				when(em.loadAndLock("know001", "km.knowledge.Knowledge")).thenReturn(knowledge);

				when(request.getParam("name")).thenReturn("");
				when(request.getParam("content")).thenReturn("some content");
				when(request.getParam("visibility")).thenReturn("internal");

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("ERROR", result);
				verifyErrorResponse(request, "VALIDATION_ERROR");
			}
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("content空はVALIDATION_ERROR")
		void errorWhenContentEmpty() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("oid")).thenReturn("know001");

				Entity knowledge = new GenericEntity("km.knowledge.Knowledge");
				knowledge.setOid("know001");
				when(em.loadAndLock("know001", "km.knowledge.Knowledge")).thenReturn(knowledge);

				when(request.getParam("name")).thenReturn("Title");
				when(request.getParam("content")).thenReturn("");
				when(request.getParam("visibility")).thenReturn("internal");

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("ERROR", result);
				verifyErrorResponse(request, "VALIDATION_ERROR");
			}
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("visibility不正値はVALIDATION_ERROR")
		void errorWhenVisibilityInvalid() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("oid")).thenReturn("know001");

				Entity knowledge = new GenericEntity("km.knowledge.Knowledge");
				knowledge.setOid("know001");
				when(em.loadAndLock("know001", "km.knowledge.Knowledge")).thenReturn(knowledge);

				when(request.getParam("name")).thenReturn("Title");
				when(request.getParam("content")).thenReturn("some content");
				when(request.getParam("visibility")).thenReturn("unknown");

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("ERROR", result);
				verifyErrorResponse(request, "VALIDATION_ERROR");
			}
		}
	}

	@Nested
	@DisplayName("正常更新")
	class SuccessfulUpdate {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("全フィールド指定で正常更新")
		void successWithAllFields() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("oid")).thenReturn("know001");
				when(request.getParam("name")).thenReturn("Updated Title");
				when(request.getParam("content")).thenReturn("Updated content");
				when(request.getParam("visibility")).thenReturn("public");
				when(request.getParams("tagOids")).thenReturn(new String[] {"tag001", "tag002"});
				when(request.getParams("relatedInquiryOids")).thenReturn(new String[] {"inq001"});

				Entity knowledge = new GenericEntity("km.knowledge.Knowledge");
				knowledge.setOid("know001");
				when(em.loadAndLock("know001", "km.knowledge.Knowledge")).thenReturn(knowledge);

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("SUCCESS", result);
				verify(em)
						.update(
								argThat(e -> "know001".equals(e.getOid())
										&& "Updated Title".equals(e.getName())
										&& "Updated content".equals(e.getValue("content"))
										&& "public".equals(((SelectValue) e.getValue("visibility")).getValue())
										&& ((Entity[]) e.getValue("tags")).length == 2
										&& ((Entity[]) e.getValue("relatedInquiries")).length == 1),
								any(UpdateOption.class));
			}
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("タグ空配列でタグがクリアされる")
		void successClearsTagsWhenEmpty() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("oid")).thenReturn("know001");
				when(request.getParam("name")).thenReturn("Title");
				when(request.getParam("content")).thenReturn("content");
				when(request.getParam("visibility")).thenReturn("internal");
				when(request.getParams("tagOids")).thenReturn(new String[] {});
				when(request.getParams("relatedInquiryOids")).thenReturn(null);

				Entity knowledge = new GenericEntity("km.knowledge.Knowledge");
				knowledge.setOid("know001");
				when(em.loadAndLock("know001", "km.knowledge.Knowledge")).thenReturn(knowledge);

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("SUCCESS", result);
				verify(em)
						.update(
								argThat(e -> {
									Entity[] tags = e.getValue("tags");
									Entity[] inquiries = e.getValue("relatedInquiries");
									return tags == null && inquiries == null;
								}),
								any(UpdateOption.class));
			}
		}
	}
}
