/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.knowledge.command;

import static km.common.command.CommandTestHelper.mockEntityDaoHelper;
import static km.common.command.CommandTestHelper.verifyErrorResponse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.SearchOption;
import org.iplass.mtp.entity.SearchResult;
import org.iplass.mtp.entity.query.Query;
import org.iplass.mtp.test.MTPJUnitTestExtension;
import org.iplass.mtp.test.MTPTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;

@ExtendWith(MTPJUnitTestExtension.class)
@DisplayName("KnowledgeManageListCommand")
class KnowledgeManageListCommandTest {

	private KnowledgeManageListCommand command;
	private RequestContext request;
	private EntityManager em;

	@BeforeEach
	void setUp() {
		command = new KnowledgeManageListCommand();
		request = mock(RequestContext.class);
		em = mock(EntityManager.class);
	}

	@Nested
	@DisplayName("authorization")
	class Authorization {

		@Test
		@DisplayName("非 responder は FORBIDDEN_NOT_RESPONDER")
		void forbiddenForNonResponder() {
			try (var dao = mockEntityDaoHelper(em, false)) {
				String result = MTPTest.invokeCommand(command, request);

				assertEquals("ERROR", result);
				verifyErrorResponse(request, "FORBIDDEN_NOT_RESPONDER");
				verify(em, never()).fulltextSearchEntity(any(Query.class), anyString(), any(SearchOption.class));
			}
		}
	}

	@Nested
	@DisplayName("full-text search")
	class FulltextSearch {

		@Test
		@DisplayName("キーワード指定時は全文検索 API を呼び、総件数は countTotal の結果を使う (前後空白は trim)")
		@SuppressWarnings("unchecked")
		void keywordUsesFulltext() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("q")).thenReturn("  ログイン  ");

				SearchResult<Entity> result = mock(SearchResult.class);
				when(result.getList()).thenReturn(List.of());
				when(result.getTotalCount()).thenReturn(7);
				when(em.fulltextSearchEntity(any(Query.class), anyString(), any(SearchOption.class)))
						.thenReturn(result);

				String res = MTPTest.invokeCommand(command, request);
				assertEquals("SUCCESS", res);

				ArgumentCaptor<String> kw = ArgumentCaptor.forClass(String.class);
				verify(em).fulltextSearchEntity(any(Query.class), kw.capture(), any(SearchOption.class));
				assertEquals("ログイン", kw.getValue());
				// キーワード検索時は countTotal を使うため別 count クエリは投げない
				verify(em, never()).count(any(Query.class));

				ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
				verify(request).setAttribute(eq("result"), captor.capture());
				assertEquals(7, captor.getValue().get("totalCount"));
			}
		}

		@Test
		@DisplayName("キーワード未指定時は全文検索を呼ばず searchEntity + count")
		@SuppressWarnings("unchecked")
		void noKeywordUsesSearchEntity() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				SearchResult<Entity> result = mock(SearchResult.class);
				when(result.getList()).thenReturn(List.of());
				when(em.searchEntity(any(Query.class))).thenReturn(result);
				when(em.count(any(Query.class))).thenReturn(3);

				String res = MTPTest.invokeCommand(command, request);
				assertEquals("SUCCESS", res);

				verify(em, never()).fulltextSearchEntity(any(Query.class), anyString(), any(SearchOption.class));

				ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
				verify(request).setAttribute(eq("result"), captor.capture());
				assertEquals(3, captor.getValue().get("totalCount"));
			}
		}
	}

	@Nested
	@DisplayName("validation")
	class Validation {

		@Test
		@DisplayName("不正な visibility は VALIDATION_ERROR")
		void invalidVisibility() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("visibility")).thenReturn("invalid");

				String res = MTPTest.invokeCommand(command, request);

				assertEquals("ERROR", res);
				verifyErrorResponse(request, "VALIDATION_ERROR");
			}
		}
	}
}
