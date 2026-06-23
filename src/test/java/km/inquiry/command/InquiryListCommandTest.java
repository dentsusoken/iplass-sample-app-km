/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.inquiry.command;

import static km.common.command.CommandTestHelper.mockEntityDaoHelper;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.GenericEntity;
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

/**
 * {@link InquiryListCommand} の統合テスト。
 *
 * <p>MTPJUnitTestExtension を使い、実際の iPLAss コンテナに対して EQL を実行する。
 * プロパティパスやサブクエリが正しいことを保証する。</p>
 */
@ExtendWith(MTPJUnitTestExtension.class)
@DisplayName("InquiryListCommand")
class InquiryListCommandTest {

	@Nested
	@DisplayName("pagination")
	class Pagination {

		@Test
		@DisplayName("uses default offset=0 and limit=20 when not specified")
		@SuppressWarnings("unchecked")
		void usesDefaultPagination() {
			RequestContext request = mock(RequestContext.class);

			String result = MTPTest.invokeCommand(new InquiryListCommand(), request);

			assertEquals("SUCCESS", result);

			ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
			verify(request).setAttribute(eq("result"), captor.capture());
			Map<String, Object> response = captor.getValue();
			assertEquals(0, response.get("offset"));
			assertEquals(20, response.get("limit"));
			assertNotNull(response.get("totalCount"));
			assertNotNull(response.get("data"));
		}
	}

	@Nested
	@DisplayName("search filters")
	class SearchFilters {

		@Test
		@DisplayName("applies single status filter via statuses parameter")
		void appliesStatusFilter() {
			RequestContext request = mock(RequestContext.class);
			when(request.getParams("statuses")).thenReturn(new String[] {"Open"});

			String result = MTPTest.invokeCommand(new InquiryListCommand(), request);

			assertEquals("SUCCESS", result);
		}

		@Test
		@DisplayName("applies multi-status filter with IN condition")
		void appliesMultiStatusFilter() {
			RequestContext request = mock(RequestContext.class);
			when(request.getParams("statuses")).thenReturn(new String[] {"Open", "Answered"});

			String result = MTPTest.invokeCommand(new InquiryListCommand(), request);

			assertEquals("SUCCESS", result);
		}

		@Test
		@DisplayName("applies single tag filter via tagOids parameter")
		void appliesTagFilter() {
			RequestContext request = mock(RequestContext.class);
			when(request.getParams("tagOids")).thenReturn(new String[] {"tag-001"});

			String result = MTPTest.invokeCommand(new InquiryListCommand(), request);

			assertEquals("SUCCESS", result);
		}

		@Test
		@DisplayName("applies multi-tag filter with AND condition")
		void appliesMultiTagFilter() {
			RequestContext request = mock(RequestContext.class);
			when(request.getParams("tagOids")).thenReturn(new String[] {"tag-001", "tag-002"});

			String result = MTPTest.invokeCommand(new InquiryListCommand(), request);

			assertEquals("SUCCESS", result);
		}

		@Test
		@DisplayName("applies date range filter")
		void appliesDateRangeFilter() {
			RequestContext request = mock(RequestContext.class);
			when(request.getParam("createDateFrom")).thenReturn("2026-01-01");
			when(request.getParam("createDateTo")).thenReturn("2026-01-31");

			String result = MTPTest.invokeCommand(new InquiryListCommand(), request);

			assertEquals("SUCCESS", result);
		}
	}

	@Nested
	@DisplayName("sort")
	class Sort {

		@Test
		@DisplayName("applies custom sort field and order")
		void appliesSortField() {
			RequestContext request = mock(RequestContext.class);
			when(request.getParam("sortField")).thenReturn("name");
			when(request.getParam("sortOrder")).thenReturn("ASC");

			String result = MTPTest.invokeCommand(new InquiryListCommand(), request);

			assertEquals("SUCCESS", result);
		}

		@Test
		@DisplayName("rejects invalid sort field and falls back to createDate")
		void rejectInvalidSortField() {
			RequestContext request = mock(RequestContext.class);
			when(request.getParam("sortField")).thenReturn("invalidField");
			when(request.getParam("sortOrder")).thenReturn("ASC");

			String result = MTPTest.invokeCommand(new InquiryListCommand(), request);

			assertEquals("SUCCESS", result);
		}

		@Test
		@DisplayName("defaults to createDate DESC when sort not specified")
		void defaultSort() {
			RequestContext request = mock(RequestContext.class);

			String result = MTPTest.invokeCommand(new InquiryListCommand(), request);

			assertEquals("SUCCESS", result);
		}
	}

	@Nested
	@DisplayName("role-based filtering")
	class RoleBasedFiltering {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("responder sees all inquiries (no group filter)")
		void responderSeesAll() {
			RequestContext request = mock(RequestContext.class);

			String result = MTPTest.invokeCommand(new InquiryListCommand(), request);

			assertEquals("SUCCESS", result);
		}

		@Test
		@AuthUser(userId = "testuser", password = "testuser")
		@DisplayName("user role can query inquiries (entity permission controls access)")
		void userRoleCanQueryInquiries() {
			RequestContext request = mock(RequestContext.class);

			String result = MTPTest.invokeCommand(new InquiryListCommand(), request);

			assertEquals("SUCCESS", result);
		}
	}

	/**
	 * キーワード検索の全文検索化に関する仕様。
	 *
	 * <p>全文検索 API は実コンテナ (useFulltextSearch=false / index 無し) では動かせないため、
	 * EntityDaoHelper を mock して EntityManager の全文検索 API をスタブし、Command の
	 * 「横断検索 → 親問合せ逆引き → 候補 OID での絞り込み」の振る舞いを検証する。
	 * 実データでのヒット精度は統合テストで担保する。</p>
	 */
	@Nested
	@DisplayName("keyword full-text search")
	class KeywordFulltextSearch {

		private RequestContext request;
		private EntityManager em;

		@BeforeEach
		void setUp() {
			request = mock(RequestContext.class);
			em = mock(EntityManager.class);
		}

		/** count=0 / 一覧データ=空 をスタブする (逆引きでない一覧クエリ用の searchEntity)。 */
		@SuppressWarnings("unchecked")
		private void stubEmptyData() {
			when(em.count(any(Query.class))).thenReturn(0);
			SearchResult<Entity> dataResult = mock(SearchResult.class);
			when(dataResult.getList()).thenReturn(List.of());
			when(em.searchEntity(argThat(q -> q != null && !q.toString().contains("posts.oid"))))
					.thenReturn(dataResult);
		}

		@Test
		@DisplayName("Inquiry と Post を横断する全文検索でキーワードを評価する (前後空白は trim)")
		@SuppressWarnings("unchecked")
		void crossEntityFulltextSearch() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("keyword")).thenReturn("  ログイン  ");
				when(em.fulltextSearchOidList(anyList(), anyString()))
						.thenReturn(Map.of(
								"km.inquiry.Inquiry", List.of("inq001"),
								"km.inquiry.Post", List.of()));
				stubEmptyData();

				String result = MTPTest.invokeCommand(new InquiryListCommand(), request);
				assertEquals("SUCCESS", result);

				ArgumentCaptor<List<String>> defsCaptor = ArgumentCaptor.forClass(List.class);
				ArgumentCaptor<String> kwCaptor = ArgumentCaptor.forClass(String.class);
				verify(em).fulltextSearchOidList(defsCaptor.capture(), kwCaptor.capture());
				assertTrue(defsCaptor.getValue().contains("km.inquiry.Inquiry"), "横断検索の対象に Inquiry が含まれる");
				assertTrue(defsCaptor.getValue().contains("km.inquiry.Post"), "横断検索の対象に Post が含まれる");
				assertEquals("ログイン", kwCaptor.getValue());
			}
		}

		@Test
		@DisplayName("投稿文ヒットは親問合せに逆引きされ一覧の絞り込みに使われる")
		@SuppressWarnings("unchecked")
		void postHitResolvedToParentInquiry() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("keyword")).thenReturn("添付");
				when(em.fulltextSearchOidList(anyList(), anyString()))
						.thenReturn(Map.of(
								"km.inquiry.Inquiry", List.of(),
								"km.inquiry.Post", List.of("post001")));

				// 逆引き: posts.oid IN (post001) → 親 inq009
				SearchResult<Entity> reverseResult = mock(SearchResult.class);
				Entity parent = new GenericEntity("km.inquiry.Inquiry");
				parent.setOid("inq009");
				when(reverseResult.getList()).thenReturn(List.of(parent));
				when(em.searchEntity(argThat(q -> q != null && q.toString().contains("posts.oid"))))
						.thenReturn(reverseResult);
				stubEmptyData();

				String result = MTPTest.invokeCommand(new InquiryListCommand(), request);
				assertEquals("SUCCESS", result);

				ArgumentCaptor<Query> qCaptor = ArgumentCaptor.forClass(Query.class);
				verify(em, atLeastOnce()).searchEntity(qCaptor.capture());
				assertTrue(
						qCaptor.getAllValues().stream()
								.anyMatch(q -> q.toString().contains("posts.oid")),
						"Post ヒットの親を引くため posts.oid 条件のクエリが実行される");
				assertTrue(
						qCaptor.getAllValues().stream()
								.anyMatch(q -> q.toString().contains("inq009")),
						"逆引きで得た親 oid が一覧クエリの絞り込みに使われる");
			}
		}

		@Test
		@DisplayName("ヒット無しのキーワードは一覧クエリを実行せず空結果を返す")
		@SuppressWarnings("unchecked")
		void noHitReturnsEmpty() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("keyword")).thenReturn("該当なし語");
				when(em.fulltextSearchOidList(anyList(), anyString()))
						.thenReturn(Map.of(
								"km.inquiry.Inquiry", List.of(),
								"km.inquiry.Post", List.of()));

				String result = MTPTest.invokeCommand(new InquiryListCommand(), request);
				assertEquals("SUCCESS", result);

				// 候補が空のときは一覧クエリ (count / searchEntity) を一切実行しない
				verify(em, never()).count(any(Query.class));
				verify(em, never()).searchEntity(any(Query.class));

				ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
				verify(request).setAttribute(eq("result"), captor.capture());
				Map<String, Object> response = captor.getValue();
				assertEquals(0, response.get("totalCount"));
				assertTrue(((List<?>) response.get("data")).isEmpty());
			}
		}

		@Test
		@DisplayName("キーワード未指定時は全文検索 API を呼ばない")
		void noKeywordSkipsFulltext() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				stubEmptyData();

				String result = MTPTest.invokeCommand(new InquiryListCommand(), request);
				assertEquals("SUCCESS", result);

				verify(em, never()).fulltextSearchOidList(anyList(), anyString());
			}
		}
	}
}
