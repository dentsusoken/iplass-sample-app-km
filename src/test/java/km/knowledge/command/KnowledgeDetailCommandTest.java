/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.knowledge.command;

import static km.common.command.CommandTestHelper.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Map;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.GenericEntity;
import org.iplass.mtp.entity.SearchResult;
import org.iplass.mtp.entity.SelectValue;
import org.iplass.mtp.entity.query.Query;
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
@DisplayName("KnowledgeDetailCommand")
class KnowledgeDetailCommandTest {

	private KnowledgeDetailCommand command;
	private RequestContext request;
	private EntityManager em;

	@BeforeEach
	void setUp() {
		command = new KnowledgeDetailCommand();
		request = mock(RequestContext.class);
		em = mock(EntityManager.class);
	}

	@Nested
	@DisplayName("エラー条件")
	class ErrorConditions {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("存在しないナレッジはKNOWLEDGE_NOT_FOUND")
		@SuppressWarnings("unchecked")
		void errorWhenNotFound() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("know999");

			SearchResult<Entity> emptyResult = mock(SearchResult.class);
			when(emptyResult.getList()).thenReturn(List.of());
			when(em.searchEntity(any(Query.class))).thenReturn(emptyResult);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "KNOWLEDGE_NOT_FOUND");
		}
	}

	@Nested
	@DisplayName("公開範囲制御")
	class VisibilityControl {

		@Test
		@AuthUser(userId = "testuser", password = "testuser")
		@DisplayName("質問者は非公開ナレッジを参照できない")
		@SuppressWarnings("unchecked")
		void userCannotAccessInternalKnowledge() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("know001");

			// 利用者ロールは visibility=public フィルタを足すため、internal のナレッジは見つからない
			SearchResult<Entity> emptyResult = mock(SearchResult.class);
			when(emptyResult.getList()).thenReturn(List.of());
			when(em.searchEntity(any(Query.class))).thenReturn(emptyResult);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "KNOWLEDGE_NOT_FOUND");
		}

		@Test
		@AuthUser(userId = "testuser", password = "testuser")
		@DisplayName("質問者は公開ナレッジを参照できる")
		@SuppressWarnings("unchecked")
		void userCanAccessPublicKnowledge() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("know001");

			Entity knowledge = createKnowledge("know001", "public", "Public Knowledge");
			SearchResult<Entity> knowledgeResult = mock(SearchResult.class);
			when(knowledgeResult.getList()).thenReturn(List.of(knowledge));
			when(knowledgeResult.getFirst()).thenReturn(knowledge);

			SearchResult<Entity> tagResult = mock(SearchResult.class);
			when(tagResult.getList()).thenReturn(List.of());

			SearchResult<Entity> relResult = mock(SearchResult.class);
			when(relResult.getList()).thenReturn(List.of());

			when(em.searchEntity(any(Query.class)))
					.thenReturn(knowledgeResult)
					.thenReturn(tagResult)
					.thenReturn(relResult);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("回答者は非公開ナレッジも参照できる")
		@SuppressWarnings("unchecked")
		void responderCanAccessInternalKnowledge() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("know001");

			Entity knowledge = createKnowledge("know001", "internal", "Internal Knowledge");
			SearchResult<Entity> knowledgeResult = mock(SearchResult.class);
			when(knowledgeResult.getList()).thenReturn(List.of(knowledge));
			when(knowledgeResult.getFirst()).thenReturn(knowledge);

			SearchResult<Entity> tagResult = mock(SearchResult.class);
			when(tagResult.getList()).thenReturn(List.of());

			SearchResult<Entity> relResult = mock(SearchResult.class);
			when(relResult.getList()).thenReturn(List.of());

			when(em.searchEntity(any(Query.class)))
					.thenReturn(knowledgeResult)
					.thenReturn(tagResult)
					.thenReturn(relResult);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);
		}
	}

	@Nested
	@DisplayName("レスポンス検証")
	class ResponseVerification {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("基本フィールドが返却される")
		@SuppressWarnings("unchecked")
		void returnsBasicFields() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("know001");

			Entity knowledge = createKnowledge("know001", "public", "My Knowledge");
			knowledge.setValue("content", "Knowledge content text");
			SearchResult<Entity> knowledgeResult = mock(SearchResult.class);
			when(knowledgeResult.getList()).thenReturn(List.of(knowledge));
			when(knowledgeResult.getFirst()).thenReturn(knowledge);

			SearchResult<Entity> tagResult = mock(SearchResult.class);
			when(tagResult.getList()).thenReturn(List.of());

			SearchResult<Entity> relResult = mock(SearchResult.class);
			when(relResult.getList()).thenReturn(List.of());

			when(em.searchEntity(any(Query.class)))
					.thenReturn(knowledgeResult)
					.thenReturn(tagResult)
					.thenReturn(relResult);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);

			ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
			verify(request).setAttribute(eq("result"), captor.capture());
			Map<String, Object> response = captor.getValue();
			assertEquals("SUCCESS", response.get("status"));

			Map<String, Object> data = (Map<String, Object>) response.get("data");
			assertEquals("know001", data.get("oid"));
			assertEquals("My Knowledge", data.get("name"));
			assertEquals("Knowledge content text", data.get("content"));
			assertEquals("public", data.get("visibility"));
			assertTrue(data.containsKey("createBy"));
			assertTrue(data.containsKey("createDate"));
			assertTrue(data.containsKey("updateDate"));
			assertTrue(data.containsKey("tags"));
			assertTrue(data.containsKey("relatedInquiries"));
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("タグが返却される")
		@SuppressWarnings("unchecked")
		void returnsTags() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("know001");

			Entity knowledge = createKnowledge("know001", "public", "Tagged Knowledge");
			SearchResult<Entity> knowledgeResult = mock(SearchResult.class);
			when(knowledgeResult.getList()).thenReturn(List.of(knowledge));
			when(knowledgeResult.getFirst()).thenReturn(knowledge);

			// タグクエリは 2 行返す
			Entity tagRow1 = new GenericEntity("km.knowledge.Knowledge");
			tagRow1.setValue("tags.oid", "tag001");
			tagRow1.setValue("tags.tagName", "Java");
			Entity tagRow2 = new GenericEntity("km.knowledge.Knowledge");
			tagRow2.setValue("tags.oid", "tag002");
			tagRow2.setValue("tags.tagName", "iPLAss");
			SearchResult<Entity> tagResult = mock(SearchResult.class);
			when(tagResult.getList()).thenReturn(List.of(tagRow1, tagRow2));

			SearchResult<Entity> relResult = mock(SearchResult.class);
			when(relResult.getList()).thenReturn(List.of());

			when(em.searchEntity(any(Query.class)))
					.thenReturn(knowledgeResult)
					.thenReturn(tagResult)
					.thenReturn(relResult);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);

			ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
			verify(request).setAttribute(eq("result"), captor.capture());
			Map<String, Object> response = captor.getValue();

			Map<String, Object> data = (Map<String, Object>) response.get("data");
			List<Map<String, String>> tags = (List<Map<String, String>>) data.get("tags");
			assertEquals(2, tags.size());
			assertEquals("tag001", tags.get(0).get("oid"));
			assertEquals("Java", tags.get(0).get("tagName"));
			assertEquals("tag002", tags.get(1).get("oid"));
			assertEquals("iPLAss", tags.get(1).get("tagName"));
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("関連問合せが返却される")
		@SuppressWarnings("unchecked")
		void returnsRelatedInquiries() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("oid")).thenReturn("know001");

			Entity knowledge = createKnowledge("know001", "public", "Related Knowledge");
			SearchResult<Entity> knowledgeResult = mock(SearchResult.class);
			when(knowledgeResult.getList()).thenReturn(List.of(knowledge));
			when(knowledgeResult.getFirst()).thenReturn(knowledge);

			SearchResult<Entity> tagResult = mock(SearchResult.class);
			when(tagResult.getList()).thenReturn(List.of());

			// 関連問合せクエリは 2 行返す
			Entity relRow1 = new GenericEntity("km.knowledge.Knowledge");
			relRow1.setValue("relatedInquiries.oid", "inq001");
			relRow1.setValue("relatedInquiries.name", "How to use search?");
			relRow1.setValue("relatedInquiries.summaryShort", "Search usage guide");
			relRow1.setValue("relatedInquiries.status", new SelectValue("Resolved"));
			Entity relRow2 = new GenericEntity("km.knowledge.Knowledge");
			relRow2.setValue("relatedInquiries.oid", "inq002");
			relRow2.setValue("relatedInquiries.name", "Login issue");
			relRow2.setValue("relatedInquiries.summaryShort", "Cannot login");
			relRow2.setValue("relatedInquiries.status", new SelectValue("Open"));
			SearchResult<Entity> relResult = mock(SearchResult.class);
			when(relResult.getList()).thenReturn(List.of(relRow1, relRow2));

			when(em.searchEntity(any(Query.class)))
					.thenReturn(knowledgeResult)
					.thenReturn(tagResult)
					.thenReturn(relResult);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);

			ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
			verify(request).setAttribute(eq("result"), captor.capture());
			Map<String, Object> response = captor.getValue();

			Map<String, Object> data = (Map<String, Object>) response.get("data");
			List<Map<String, String>> relatedInquiries = (List<Map<String, String>>) data.get("relatedInquiries");
			assertEquals(2, relatedInquiries.size());
			assertEquals("inq001", relatedInquiries.get(0).get("oid"));
			assertEquals("How to use search?", relatedInquiries.get(0).get("name"));
			assertEquals("Search usage guide", relatedInquiries.get(0).get("summaryShort"));
			assertEquals("Resolved", relatedInquiries.get(0).get("status"));
			assertEquals("inq002", relatedInquiries.get(1).get("oid"));
			assertEquals("Login issue", relatedInquiries.get(1).get("name"));
			assertEquals("Cannot login", relatedInquiries.get(1).get("summaryShort"));
			assertEquals("Open", relatedInquiries.get(1).get("status"));
		}
	}
}
