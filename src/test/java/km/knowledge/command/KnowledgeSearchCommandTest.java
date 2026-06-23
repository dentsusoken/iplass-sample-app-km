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
import org.iplass.mtp.entity.SearchOption;
import org.iplass.mtp.entity.SearchResult;
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
@DisplayName("KnowledgeSearchCommand")
class KnowledgeSearchCommandTest {

	private KnowledgeSearchCommand command;
	private RequestContext request;
	private EntityManager em;

	@BeforeEach
	void setUp() {
		command = new KnowledgeSearchCommand();
		request = mock(RequestContext.class);
		em = mock(EntityManager.class);
	}

	/** 全文検索 API が指定の Entity リストを返すようモックする。 */
	@SuppressWarnings("unchecked") // Mockito の mock() は型消去により raw 型を返すため不可避
	private void stubFulltextResult(List<Entity> entities) {
		SearchResult<Entity> searchResult = mock(SearchResult.class);
		when(searchResult.getList()).thenReturn(entities);
		when(em.fulltextSearchEntity(any(Query.class), anyString(), any(SearchOption.class)))
				.thenReturn(searchResult);
	}

	@Nested
	@DisplayName("validation")
	class Validation {

		@Test
		@DisplayName("returns VALIDATION_ERROR when q is null")
		void errorWhenQNull() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("q")).thenReturn(null);
			when(request.getParam("limit")).thenReturn(null);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "VALIDATION_ERROR");
			// 入力不正時は全文検索 API を呼ばない
			verify(em, never()).fulltextSearchEntity(any(Query.class), anyString(), any(SearchOption.class));
		}

		@Test
		@DisplayName("returns VALIDATION_ERROR when q is empty")
		void errorWhenQEmpty() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("q")).thenReturn("  ");
			when(request.getParam("limit")).thenReturn(null);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "VALIDATION_ERROR");
		}
	}

	@Nested
	@DisplayName("full-text search")
	class FulltextSearch {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("キーワードを全文検索 API の引数として渡す（前後空白は trim）")
		void passesKeywordToFulltextSearch() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("q")).thenReturn("  basic operation  ");
			when(request.getParam("limit")).thenReturn(null);
			stubFulltextResult(List.of());

			MTPTest.invokeCommand(command, request);

			ArgumentCaptor<String> keywordCaptor = ArgumentCaptor.forClass(String.class);
			verify(em).fulltextSearchEntity(any(Query.class), keywordCaptor.capture(), any(SearchOption.class));
			assertEquals("basic operation", keywordCaptor.getValue());
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("returns matching knowledge articles for responder")
		@SuppressWarnings("unchecked") // Mockito の mock()/forClass() は型消去により raw 型を返すため不可避
		void returnsResultsForResponder() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("q")).thenReturn("basic operation");
			when(request.getParam("limit")).thenReturn(null);

			Entity knowledge = new GenericEntity("km.knowledge.Knowledge");
			knowledge.setOid("know001");
			knowledge.setName("Basic Operation Guide");
			knowledge.setValue("content", "Guide for basic operations...");
			knowledge.setValue("visibility", "internal");
			stubFulltextResult(List.of(knowledge));

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);

			ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
			verify(request).setAttribute(eq("result"), captor.capture());
			Map<String, Object> response = captor.getValue();

			List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
			assertEquals(1, data.size());
			assertEquals("know001", data.get(0).get("oid"));
			assertEquals("Basic Operation Guide", data.get(0).get("name"));
			assertEquals("internal", data.get(0).get("visibility"));
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("returns empty list when no matches")
		@SuppressWarnings("unchecked") // Mockito の mock()/forClass() は型消去により raw 型を返すため不可避
		void returnsEmptyList() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("q")).thenReturn("nonexistent");
			when(request.getParam("limit")).thenReturn(null);
			stubFulltextResult(List.of());

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);

			ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
			verify(request).setAttribute(eq("result"), captor.capture());
			Map<String, Object> response = captor.getValue();

			List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
			assertTrue(data.isEmpty());
		}
	}

	@Nested
	@DisplayName("visibility filtering")
	class VisibilityFiltering {

		@Test
		@DisplayName("一般ユーザは public のナレッジのみが検索対象になる")
		void userSeesOnlyPublic() {
			// mock EM 環境ではロール解決ができないため、EntityDaoHelper を直接 mock して isResponder を確定させる
			try (var dao = mockEntityDaoHelper(em, false)) {
				when(request.getParam("q")).thenReturn("test");
				when(request.getParam("limit")).thenReturn(null);
				stubFulltextResult(List.of());

				MTPTest.invokeCommand(command, request);

				ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
				verify(em).fulltextSearchEntity(queryCaptor.capture(), anyString(), any(SearchOption.class));
				String queryString = queryCaptor.getValue().toString();
				assertTrue(
						queryString.contains("visibility") && queryString.contains("public"),
						"user role の Query には visibility=public フィルタが含まれる: " + queryString);
			}
		}

		@Test
		@DisplayName("responder は公開範囲フィルタなしで全件が検索対象になる")
		void responderSeesAll() {
			// mock EM 環境ではロール解決ができないため、EntityDaoHelper を直接 mock して isResponder を確定させる
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("q")).thenReturn("test");
				when(request.getParam("limit")).thenReturn(null);
				stubFulltextResult(List.of());

				MTPTest.invokeCommand(command, request);

				ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
				verify(em).fulltextSearchEntity(queryCaptor.capture(), anyString(), any(SearchOption.class));
				String queryString = queryCaptor.getValue().toString();
				assertFalse(
						queryString.contains("public"),
						"responder の Query には visibility=public フィルタが含まれない: " + queryString);
			}
		}
	}

	@Nested
	@DisplayName("merged exclusion")
	class MergedExclusion {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("検索 Query の Where 句に mergedTo IS NULL 条件が含まれる")
		void queryContainsMergedToIsNull() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("q")).thenReturn("test");
			when(request.getParam("limit")).thenReturn(null);
			stubFulltextResult(List.of());

			MTPTest.invokeCommand(command, request);

			ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
			verify(em).fulltextSearchEntity(queryCaptor.capture(), anyString(), any(SearchOption.class));
			// Query の toString() で IS NULL 条件と対象プロパティ名が出力される
			String queryString = queryCaptor.getValue().toString();
			assertTrue(
					queryString.contains("mergedTo")
							&& queryString.toLowerCase().contains("is null"),
					"Query should contain mergedTo IS NULL filter, but was: " + queryString);
		}
	}

	@Nested
	@DisplayName("limit parameter")
	class LimitParameter {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("uses custom limit when specified")
		void usesCustomLimit() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("q")).thenReturn("test");
			when(request.getParam("limit")).thenReturn("5");
			stubFulltextResult(List.of());

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);
		}
	}
}
